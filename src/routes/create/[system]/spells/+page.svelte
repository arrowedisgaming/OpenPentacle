<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { SpellDefinition, ClassDefinition } from '$lib/types/content-pack.js';
	import type { SpellKnown } from '$lib/types/character.js';
	import { getMaxSpellLevel } from '$lib/engine/class-progression.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { BookOpen, ChevronDown, ChevronUp } from 'lucide-svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import SourceSelector from '$lib/components/open5e/SourceSelector.svelte';


	const wizNav = getContext<any>('wizard-nav');

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);

	// ─── Open5E Spell Merging ───────────────────────────────
	const ALLOWED_SOURCES = new Set(['deepm', 'a5e-ag', 'toh']);

	let open5eSpells = $state<SpellDefinition[]>([]);
	let open5eLoading = $state(false);
	let showSourceSelector = $state(false);
	let selectedOpen5eSources = $state<string[]>(
		(wizardStore.getCharacter()?.open5eSources ?? []).filter((s) => ALLOWED_SOURCES.has(s))
	);

	const allSpells: SpellDefinition[] = $derived.by(() => {
		const base: SpellDefinition[] = pack?.spells ?? [];
		if (open5eSpells.length === 0) return base;
		const baseNames = new Set(base.map((s) => s.name.toLowerCase()));
		return [...base, ...open5eSpells.filter((s: SpellDefinition) => !baseNames.has(s.name.toLowerCase()))];
	});

	async function fetchOpen5eSpells() {
		if (!selectedOpen5eSources.length) {
			open5eSpells = [];
			return;
		}
		open5eLoading = true;
		try {
			const res = await fetch(`/api/open5e/spells?sources=${selectedOpen5eSources.join(',')}`);
			if (res.ok) {
				open5eSpells = await res.json();
			}
		} catch (err) {
			console.error('Failed to fetch Open5E spells:', err);
		} finally {
			open5eLoading = false;
		}
	}

	onMount(() => {
		fetchOpen5eSpells();
	});

	const character = $derived(wizardStore.getCharacter());
	const charLevel = $derived(character?.level ?? 1);

	const characterClass = $derived(() => {
		if (!character?.classes[0]) return null;
		return classes.find((c) => c.id === character.classes[0].classId) ?? null;
	});

	// Get progression row for the character's level
	const classProgression = $derived(() => {
		const cls = characterClass();
		if (!cls) return null;
		return cls.progression.find((p) => p.level === charLevel) ?? null;
	});

	// ─── Spellcasting type detection ────────────────────────
	const isPreparedCaster = $derived(characterClass()?.spellcasting?.preparedCaster ?? false);
	const isSpellbookCaster = $derived(isPreparedCaster && characterClass()?.id === 'wizard');

	// Read limits from progression data at the character's level
	const maxCantrips = $derived(classProgression()?.cantripsKnown ?? 0);
	// Wizard spellbook: starts with 6 spells at L1, +2 per level after
	const spellbookSize = $derived(isSpellbookCaster ? 4 + (charLevel * 2) : 0);
	const maxPrepared = $derived(classProgression()?.preparedSpells ?? 0);
	// Effective spell limit for the current phase
	const maxLevelSpells = $derived.by(() => {
		if (isSpellbookCaster) {
			return spellPhase === 'spellbook' ? spellbookSize : maxPrepared;
		}
		if (isPreparedCaster) return maxPrepared;
		return classProgression()?.spellsKnown ?? 0;
	});
	const maxSpellLevelAvailable = $derived(() => {
		const cls = characterClass();
		if (!cls) return 0;
		return getMaxSpellLevel(cls, charLevel);
	});

	// ─── Wizard two-phase state ─────────────────────────────
	let spellPhase = $state<'spellbook' | 'prepare'>('spellbook');

	// Filter spells for this class's spell list AND within available spell levels
	const availableSpells = $derived(() => {
		const cls = characterClass();
		if (!cls?.spellcasting) return [];
		const maxLevel = maxSpellLevelAvailable();
		const classSpells = allSpells.filter((s) =>
			s.lists.includes(cls.spellcasting!.spellList) && s.level <= maxLevel
		);
		// In prepare phase for wizard: only show spellbook spells (level 1+)
		if (isSpellbookCaster && spellPhase === 'prepare') {
			return classSpells.filter((s) => s.level === 0 || selectedSpellIds.has(s.id));
		}
		return classSpells;
	});

	// ─── Spell selection state ──────────────────────────────
	let selectedSpellIds = $state<Set<string>>(
		new Set(wizardStore.getCharacter()?.spells?.knownSpells.map((s) => s.spellId) ?? [])
	);
	let preparedSpellIdSet = $state<Set<string>>(
		new Set(wizardStore.getCharacter()?.spells?.preparedSpellIds ?? [])
	);

	const selectedCantrips = $derived(
		[...selectedSpellIds].filter((id) => allSpells.find((s) => s.id === id)?.level === 0).length
	);
	const selectedLevelSpells = $derived(
		[...selectedSpellIds].filter((id) => {
			const spell = allSpells.find((s) => s.id === id);
			return spell && spell.level > 0;
		}).length
	);
	const selectedPreparedCount = $derived(
		[...preparedSpellIdSet].filter((id) => {
			const spell = allSpells.find((s) => s.id === id);
			return spell && spell.level > 0;
		}).length
	);

	// For the active phase, which count matters?
	const activePhaseCount = $derived(
		isSpellbookCaster && spellPhase === 'prepare' ? selectedPreparedCount : selectedLevelSpells
	);

	// Spell counter label
	const spellCounterLabel = $derived.by(() => {
		if (isSpellbookCaster) {
			return spellPhase === 'spellbook' ? 'Spellbook' : 'Prepared';
		}
		if (isPreparedCaster) return 'Prepared Spells';
		return 'Spells Known';
	});

	function toggleSpell(spellId: string) {
		const spell = allSpells.find((s) => s.id === spellId);
		if (!spell) return;

		if (isSpellbookCaster && spellPhase === 'prepare') {
			// Phase 2: toggle prepared status (only level 1+ spells from spellbook)
			if (spell.level === 0) return; // Cantrips are always prepared
			const newSet = new Set(preparedSpellIdSet);
			if (newSet.has(spellId)) {
				newSet.delete(spellId);
			} else {
				if (selectedPreparedCount >= maxPrepared) return;
				newSet.add(spellId);
			}
			preparedSpellIdSet = newSet;
			return;
		}

		// Phase 1 (spellbook) or non-wizard: toggle known spells
		const newSet = new Set(selectedSpellIds);
		if (newSet.has(spellId)) {
			newSet.delete(spellId);
			// Also remove from prepared set if wizard
			if (isSpellbookCaster) {
				const newPrep = new Set(preparedSpellIdSet);
				newPrep.delete(spellId);
				preparedSpellIdSet = newPrep;
			}
		} else {
			// Check limits
			if (spell.level === 0 && selectedCantrips >= maxCantrips) return;
			if (spell.level > 0 && maxLevelSpells > 0 && selectedLevelSpells >= maxLevelSpells) return;
			newSet.add(spellId);
		}
		selectedSpellIds = newSet;
	}

	function goToPreparePhase() {
		spellPhase = 'prepare';
	}

	function goToSpellbookPhase() {
		spellPhase = 'spellbook';
	}

	// Filter state
	let schoolFilters = $state<Set<string>>(new Set());
	let concentrationFilter = $state<boolean | null>(null);
	let ritualFilter = $state<boolean | null>(null);

	const hasActiveFilters = $derived(schoolFilters.size > 0 || concentrationFilter !== null || ritualFilter !== null);

	function clearFilters() {
		schoolFilters = new Set();
		concentrationFilter = null;
		ritualFilter = null;
	}

	function toggleSchool(school: string) {
		const next = new Set(schoolFilters);
		if (next.has(school)) {
			next.delete(school);
		} else {
			next.add(school);
		}
		schoolFilters = next;
	}

	function toggleConcentration() {
		concentrationFilter = concentrationFilter === true ? null : true;
	}

	function toggleRitual() {
		ritualFilter = ritualFilter === true ? null : true;
	}

	// Group available spells by level
	const spellsByLevel = $derived(() => {
		const groups = new Map<number, SpellDefinition[]>();
		for (const spell of availableSpells()) {
			const list = groups.get(spell.level) ?? [];
			list.push(spell);
			groups.set(spell.level, list);
		}
		return new Map([...groups.entries()].sort(([a], [b]) => a - b));
	});

	// Get schools present in a given level's spells
	function getSchoolsForLevel(spells: SpellDefinition[]): string[] {
		const schools = new Set(spells.map((s) => s.school));
		return [...schools].sort();
	}

	// Apply filters to a list of spells
	function filterSpells(spells: SpellDefinition[]): SpellDefinition[] {
		return spells.filter((spell) => {
			if (schoolFilters.size > 0 && !schoolFilters.has(spell.school)) return false;
			if (concentrationFilter === true && !spell.concentration) return false;
			if (ritualFilter === true && !spell.ritual) return false;
			return true;
		});
	}

	// Source labels for Open5E spells (derived from spell ID prefix)
	const SOURCE_LABELS: Record<string, string> = {
		deepm: 'Deep Magic',
		'a5e-ag': 'A5E',
		toh: 'Tome of Heroes'
	};

	function getSpellSource(spellId: string): string | null {
		const underscoreIdx = spellId.indexOf('_');
		if (underscoreIdx === -1) return null; // Built-in SRD spell
		const prefix = spellId.substring(0, underscoreIdx);
		return SOURCE_LABELS[prefix] ?? prefix;
	}

	let expandedSpellId = $state<string | null>(null);

	function toggleExpand(spellId: string, event: MouseEvent) {
		event.stopPropagation();
		expandedSpellId = expandedSpellId === spellId ? null : spellId;
	}

	const spellLevels = $derived([...spellsByLevel().entries()]);
	const defaultTab = $derived(spellLevels.length > 0 ? String(spellLevels[0][0]) : '0');

	const nextPath = $derived(wizNav.getNextStepPath('spells'));
	const nextLabel = $derived(`Next: ${wizNav.getNextStepLabel('spells')}`);
	const prevPath = $derived(wizNav.getPrevStepPath('spells'));

	function handleSourcesChange(sources: string[]) {
		selectedOpen5eSources = sources.filter((s) => ALLOWED_SOURCES.has(s));
		wizardStore.updateCharacter({ open5eSources: selectedOpen5eSources });
		fetchOpen5eSpells();
	}

	function proceed() {
		const cls = characterClass();
		const classSource = `class:${cls?.id ?? 'unknown'}`;
		const knownSpells: SpellKnown[] = [...selectedSpellIds].map((id) => ({
			spellId: id,
			source: classSource
		}));

		let preparedIds: string[];
		if (isSpellbookCaster) {
			// Wizard: cantrips are always prepared, plus explicitly prepared level 1+ spells
			const cantripIds = [...selectedSpellIds].filter((id) => {
				const spell = allSpells.find((s) => s.id === id);
				return spell && spell.level === 0;
			});
			preparedIds = [...cantripIds, ...preparedSpellIdSet];
		} else {
			// All others: known = prepared
			preparedIds = knownSpells.map((s) => s.spellId);
		}

		wizardStore.updateCharacter({
			spells: {
				knownSpells,
				preparedSpellIds: preparedIds,
				spellSlots: {},
				pactSlots: undefined
			}
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/${nextPath}`);
	}
</script>

<svelte:head>
	<title>Spells - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title={isSpellbookCaster && spellPhase === 'prepare' ? 'Prepare Spells' : 'Choose Spells'}
		description={isSpellbookCaster && spellPhase === 'prepare'
			? `Choose which spells from your spellbook to prepare (${maxPrepared} max).`
			: isPreparedCaster
				? `Select spells to prepare for level ${charLevel}.`
				: `Select your cantrips and spells for level ${charLevel}.`}
	/>

	<WizardNav
		backHref={isSpellbookCaster && spellPhase === 'prepare' ? '' : `/create/${systemId}/${prevPath}`}
		backLabel={isSpellbookCaster && spellPhase === 'prepare' ? 'Back to Spellbook' : 'Back'}
		nextLabel={isSpellbookCaster && spellPhase === 'spellbook' ? 'Next: Prepare Spells' : nextLabel}
		onNext={isSpellbookCaster && spellPhase === 'spellbook' ? goToPreparePhase : proceed}
		onBack={isSpellbookCaster && spellPhase === 'prepare' ? goToSpellbookPhase : undefined}
		compact
	/>

	<!-- Top bar: steps + sources -->
	<div class="mt-4 flex flex-wrap items-center gap-3">
		{#if isSpellbookCaster}
			<button onclick={goToSpellbookPhase}>
				<Badge variant={spellPhase === 'spellbook' ? 'default' : 'outline'} class="cursor-pointer text-xs">
					Step 1: Spellbook
				</Badge>
			</button>
			<button onclick={goToPreparePhase}>
				<Badge variant={spellPhase === 'prepare' ? 'default' : 'outline'} class="cursor-pointer text-xs">
					Step 2: Prepare
				</Badge>
			</button>
		{/if}
		{#if maxSpellLevelAvailable() > 0}
			<Badge variant="outline">
				Up to {formatSpellLevel(maxSpellLevelAvailable())} level
			</Badge>
		{/if}
		<div class="ml-auto">
			<Button variant="outline" size="sm" onclick={() => (showSourceSelector = true)}>
				<BookOpen class="mr-1.5 size-3.5" />
				Spell Sources
				{#if open5eLoading}
					<span class="ml-1.5 size-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				{:else if selectedOpen5eSources.length}
					<Badge variant="secondary" class="ml-1.5 px-1.5 py-0 text-xs">
						{selectedOpen5eSources.length}
					</Badge>
				{/if}
			</Button>
		</div>
	</div>

	<!-- Sticky spell counter bar (top-14 = below h-14 header) -->
	<div class="sticky top-14 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border/50 mt-4">
		<div class="flex items-center justify-center gap-6">
			{#if !(isSpellbookCaster && spellPhase === 'prepare')}
				<div class="text-center">
					<div class="text-xs text-muted-foreground">Cantrips</div>
					<div class="text-lg font-bold tabular-nums {selectedCantrips >= maxCantrips ? 'text-primary' : ''}">
						{selectedCantrips}<span class="text-muted-foreground font-normal text-sm">/{maxCantrips}</span>
					</div>
				</div>
			{/if}
			{#if maxLevelSpells > 0}
				<div class="text-center">
					<div class="text-xs text-muted-foreground">{spellCounterLabel}</div>
					<div class="text-lg font-bold tabular-nums {activePhaseCount >= maxLevelSpells ? 'text-primary' : ''}">
						{activePhaseCount}<span class="text-muted-foreground font-normal text-sm">/{maxLevelSpells}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if spellLevels.length > 0}
		<Tabs.Root value={defaultTab} class="mt-4" onValueChange={() => clearFilters()}>
			<Tabs.List class="w-max">
				{#each spellLevels as [level]}
					<Tabs.Trigger value={String(level)}>
						{formatSpellLevel(level)}{level > 0 ? ' Level' : 's'}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
			{#each spellLevels as [level, spells]}
				<Tabs.Content value={String(level)}>
					{@const schools = getSchoolsForLevel(spells)}
					{@const hasConcentration = spells.some((s) => s.concentration)}
					{@const hasRitual = spells.some((s) => s.ritual)}
					{@const filtered = filterSpells(spells)}
					<div class="mb-3 flex flex-wrap items-center gap-2">
						{#each schools as school}
							<button onclick={() => toggleSchool(school)}>
								<Badge
									variant={schoolFilters.has(school) ? 'default' : 'outline'}
									class="cursor-pointer capitalize"
								>
									{school}
								</Badge>
							</button>
						{/each}
						{#if hasConcentration}
							<button onclick={toggleConcentration}>
								<Badge
									variant={concentrationFilter === true ? 'default' : 'outline'}
									class="cursor-pointer"
								>
									Concentration
								</Badge>
							</button>
						{/if}
						{#if hasRitual}
							<button onclick={toggleRitual}>
								<Badge
									variant={ritualFilter === true ? 'default' : 'outline'}
									class="cursor-pointer"
								>
									Ritual
								</Badge>
							</button>
						{/if}
						{#if hasActiveFilters}
							<button
								onclick={clearFilters}
								class="text-xs text-muted-foreground underline hover:text-foreground"
							>
								Clear
							</button>
						{/if}
					</div>
					<div class="space-y-2">
							{#each filtered as spell}
								{@const source = getSpellSource(spell.id)}
								{@const isExpanded = expandedSpellId === spell.id}
								<SelectionCard
									selected={isSpellbookCaster && spellPhase === 'prepare'
										? (spell.level === 0 || preparedSpellIdSet.has(spell.id))
										: selectedSpellIds.has(spell.id)}
									onclick={() => toggleSpell(spell.id)}
									disabled={isSpellbookCaster && spellPhase === 'prepare' && spell.level === 0}
								>
									<div class="flex items-center gap-2 pr-6">
										<span class="font-medium">{spell.name}</span>
										<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
										{#if spell.concentration}
											<Badge variant="outline" class="text-xs">C</Badge>
										{/if}
										{#if spell.ritual}
											<Badge variant="outline" class="text-xs">R</Badge>
										{/if}
										{#if source}
											<Badge variant="outline" class="text-xs text-primary/70">{source}</Badge>
										{/if}
									</div>
									<p class="{isExpanded ? '' : 'line-clamp-2'} mt-1 text-sm text-muted-foreground">{spell.description}</p>
									{#if spell.higherLevels && isExpanded}
										<p class="mt-1 text-sm text-muted-foreground italic">{spell.higherLevels}</p>
									{/if}
									<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
										<span>
											{spell.castingTime} &middot; {spell.range} &middot; {spell.duration}
											&middot; {[
												spell.components.verbal ? 'V' : '',
												spell.components.somatic ? 'S' : '',
												spell.components.material ? 'M' : ''
											].filter(Boolean).join(', ') || '—'}{#if spell.components.materialCost}&nbsp;({spell.components.materialCost} gp){/if}
										</span>
										<button
											onclick={(e) => toggleExpand(spell.id, e)}
											class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
										>
											{#if isExpanded}
												<ChevronUp class="size-3.5" />
											{:else}
												<ChevronDown class="size-3.5" />
											{/if}
										</button>
									</div>
								</SelectionCard>
							{/each}
						</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}

	<WizardNav
		backHref={isSpellbookCaster && spellPhase === 'prepare' ? '' : `/create/${systemId}/${prevPath}`}
		backLabel={isSpellbookCaster && spellPhase === 'prepare' ? 'Back to Spellbook' : 'Back'}
		nextLabel={isSpellbookCaster && spellPhase === 'spellbook' ? 'Next: Prepare Spells' : nextLabel}
		onNext={isSpellbookCaster && spellPhase === 'spellbook' ? goToPreparePhase : proceed}
		onBack={isSpellbookCaster && spellPhase === 'prepare' ? goToSpellbookPhase : undefined}
	/>
</div>

<Sheet.Root bind:open={showSourceSelector}>
	<Sheet.Content side="right" class="w-full sm:max-w-lg overflow-y-auto">
		<Sheet.Header>
			<Sheet.Title>Open5E Spell Sources</Sheet.Title>
			<Sheet.Description>
				Add third-party spell sources to expand your options. Changes apply to this character only.
			</Sheet.Description>
		</Sheet.Header>
		<div class="mt-4 px-1">
			<SourceSelector
				selected={selectedOpen5eSources}
				onchange={handleSourcesChange}
			/>
		</div>
	</Sheet.Content>
</Sheet.Root>
