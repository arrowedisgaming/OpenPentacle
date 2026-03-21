<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { SpellDefinition, ClassDefinition } from '$lib/types/content-pack.js';
	import type { SpellKnown } from '$lib/types/character.js';
	import { getMaxSpellLevel } from '$lib/engine/class-progression.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';


	const wizNav = getContext<any>('wizard-nav');

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const allSpells: SpellDefinition[] = $derived(pack?.spells ?? []);
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);

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

	// Read limits from progression data at the character's level
	const maxCantrips = $derived(classProgression()?.cantripsKnown ?? 0);
	const maxSpells = $derived(classProgression()?.spellsKnown ?? 0);
	const maxSpellLevelAvailable = $derived(() => {
		const cls = characterClass();
		if (!cls) return 0;
		return getMaxSpellLevel(cls, charLevel);
	});

	// Filter spells for this class's spell list AND within available spell levels
	const availableSpells = $derived(() => {
		const cls = characterClass();
		if (!cls?.spellcasting) return [];
		const maxLevel = maxSpellLevelAvailable();
		return allSpells.filter((s) =>
			s.lists.includes(cls.spellcasting!.spellList) && s.level <= maxLevel
		);
	});

	let selectedSpellIds = $state<Set<string>>(
		new Set(wizardStore.getCharacter()?.spells?.knownSpells.map((s) => s.spellId) ?? [])
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

	function toggleSpell(spellId: string) {
		const spell = allSpells.find((s) => s.id === spellId);
		if (!spell) return;

		const newSet = new Set(selectedSpellIds);
		if (newSet.has(spellId)) {
			newSet.delete(spellId);
		} else {
			// Check limits
			if (spell.level === 0 && selectedCantrips >= maxCantrips) return;
			if (spell.level > 0 && maxSpells > 0 && selectedLevelSpells >= maxSpells) return;
			newSet.add(spellId);
		}
		selectedSpellIds = newSet;
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

	const spellLevels = $derived([...spellsByLevel().entries()]);
	const defaultTab = $derived(spellLevels.length > 0 ? String(spellLevels[0][0]) : '0');

	const nextPath = $derived(wizNav.getNextStepPath('spells'));
	const nextLabel = $derived(`Next: ${wizNav.getNextStepLabel('spells')}`);
	const prevPath = $derived(wizNav.getPrevStepPath('spells'));

	function proceed() {
		const cls = characterClass();
		const knownSpells: SpellKnown[] = [...selectedSpellIds].map((id) => ({
			spellId: id,
			source: `class:${cls?.id ?? 'unknown'}`
		}));
		wizardStore.updateCharacter({
			spells: {
				knownSpells,
				preparedSpellIds: knownSpells.map((s) => s.spellId),
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
		title="Choose Spells"
		description="Select your cantrips and spells for level {charLevel}."
	/>

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
		compact
	/>

	<Card.Root class="mt-4">
		<Card.Content class="flex flex-wrap items-center gap-4 py-3">
			<Badge variant="secondary">
				Cantrips: <strong class="ml-1">{selectedCantrips}</strong> / {maxCantrips}
			</Badge>
			{#if maxSpells > 0}
				<Badge variant="secondary">
					Spells: <strong class="ml-1">{selectedLevelSpells}</strong> / {maxSpells}
				</Badge>
			{/if}
			{#if maxSpellLevelAvailable() > 0}
				<Badge variant="outline">
					Up to {formatSpellLevel(maxSpellLevelAvailable())} level
				</Badge>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if spellLevels.length > 0}
		<Tabs.Root value={defaultTab} class="mt-6" onValueChange={() => clearFilters()}>
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
								<SelectionCard
									selected={selectedSpellIds.has(spell.id)}
									onclick={() => toggleSpell(spell.id)}
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
									</div>
									<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{spell.description}</p>
									<div class="mt-1 text-xs text-muted-foreground">
										{spell.castingTime} &middot; {spell.range} &middot; {spell.duration}
									</div>
								</SelectionCard>
							{/each}
						</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
	/>
</div>
