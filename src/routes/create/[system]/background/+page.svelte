<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { BackgroundDefinition, SpellDefinition } from '$lib/types/content-pack.js';
	import type { AbilityBonus, FeatChoiceSelection } from '$lib/types/character.js';
	import type { AbilityId } from '$lib/types/common.js';
	import { ABILITY_NAMES } from '$lib/types/common.js';
	import { kebabToTitle } from '$lib/utils/format.js';
	import { allAbilityTotals, allAbilityModifiers } from '$lib/engine/ability-scores.js';
	import { formatModifier } from '$lib/utils/format.js';
	import { findFeatDef, parseFeatIdHint } from '$lib/engine/feats.js';
	import type { FeatSpellConfig } from '$lib/engine/feats.js';
	import type { ContentPack } from '$lib/types/content-pack.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/DetailPanel.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import MagicInitiateConfig from '$lib/components/wizard/MagicInitiateConfig.svelte';
	import SkilledConfig from '$lib/components/wizard/SkilledConfig.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const backgrounds: BackgroundDefinition[] = $derived(pack?.backgrounds ?? []);

	let selectedId = $state(wizardStore.getCharacter()?.background?.backgroundId ?? '');

	// The selected background definition
	const selectedBg = $derived(backgrounds.find((b) => b.id === selectedId) ?? null);

	// Extract the three eligible abilities from the background
	const eligibleAbilities = $derived(
		(selectedBg?.abilityScoreChanges ?? [])
			.map((c) => c.ability)
			.filter((a): a is AbilityId => a !== 'choice')
	);
	const hasAbilityChoice = $derived(eligibleAbilities.length === 3);

	// --- Ability score increase state ---
	// Restore from existing character data if navigating back
	function initFromExisting(): { mode: '+2+1' | '+1+1+1'; plus2: AbilityId | ''; plus1: AbilityId | '' } {
		const existing = wizardStore.getCharacter()?.abilityScores?.originBonuses?.filter(
			(b) => b.sourceType === 'background'
		) ?? [];
		if (existing.length === 3 && existing.every((b) => b.value === 1)) {
			return { mode: '+1+1+1', plus2: '', plus1: '' };
		}
		const two = existing.find((b) => b.value === 2);
		const one = existing.find((b) => b.value === 1);
		if (two && one) {
			return { mode: '+2+1', plus2: two.ability, plus1: one.ability };
		}
		return { mode: '+2+1', plus2: '', plus1: '' };
	}

	const init = initFromExisting();
	let asiMode = $state<'+2+1' | '+1+1+1'>(init.mode);
	let plus2Ability = $state<AbilityId | ''>(init.plus2);
	let plus1Ability = $state<AbilityId | ''>(init.plus1);

	// Reset ASI choices when background changes
	$effect(() => {
		// Track selectedId to reset when it changes
		if (selectedId) {
			// Only reset if the eligible abilities changed (different background)
			const existingBgId = wizardStore.getCharacter()?.background?.backgroundId;
			if (existingBgId !== selectedId) {
				plus2Ability = '';
				plus1Ability = '';
			}
		}
	});

	const asiComplete = $derived(() => {
		if (!hasAbilityChoice) return true;
		if (asiMode === '+1+1+1') return true;
		return plus2Ability !== '' && plus1Ability !== '' && plus2Ability !== plus1Ability;
	});

	function buildBackgroundBonuses(): AbilityBonus[] {
		if (!hasAbilityChoice) return [];
		const source = `background:${selectedId}`;
		if (asiMode === '+1+1+1') {
			return eligibleAbilities.map((ab) => ({
				ability: ab,
				value: 1,
				source,
				sourceType: 'background' as const
			}));
		}
		const bonuses: AbilityBonus[] = [];
		if (plus2Ability) {
			bonuses.push({ ability: plus2Ability, value: 2, source, sourceType: 'background' });
		}
		if (plus1Ability) {
			bonuses.push({ ability: plus1Ability, value: 1, source, sourceType: 'background' });
		}
		return bonuses;
	}

	// Subscribe to wizard store reactively for live preview
	let wizChar = $state(wizardStore.getCharacter());
	const unsubWiz = wizardStore.subscribe((s) => { wizChar = s.character; });
	onDestroy(unsubWiz);

	// Non-background origin bonuses (from species etc — stable on this page)
	const nonBgOriginBonuses = $derived(
		(wizChar?.abilityScores?.originBonuses ?? []).filter((b) => b.sourceType !== 'background')
	);

	// Live preview: recompute ability scores whenever ASI choices change
	const previewAbilityScores = $derived.by(() => {
		const base = wizChar?.abilityScores;
		if (!base?.method) return null;

		// Build bonuses inline so Svelte tracks the reactive deps
		let bgBonuses: AbilityBonus[] = [];
		if (eligibleAbilities.length === 3 && selectedId) {
			const source = `background:${selectedId}`;
			if (asiMode === '+1+1+1') {
				bgBonuses = eligibleAbilities.map((ab) => ({
					ability: ab, value: 1, source, sourceType: 'background' as const
				}));
			} else {
				if (plus2Ability) bgBonuses.push({ ability: plus2Ability as AbilityId, value: 2, source, sourceType: 'background' });
				if (plus1Ability) bgBonuses.push({ ability: plus1Ability as AbilityId, value: 1, source, sourceType: 'background' });
			}
		}

		return {
			...base,
			originBonuses: [...nonBgOriginBonuses, ...bgBonuses]
		};
	});

	const previewTotals = $derived(previewAbilityScores ? allAbilityTotals(previewAbilityScores) : null);
	const previewModifiers = $derived(previewAbilityScores ? allAbilityModifiers(previewAbilityScores) : null);
	const previewAbilities: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

	// Resolve feat definition and hint from pack
	const resolvedFeat = $derived.by(() => {
		if (!selectedBg?.feat || !pack) return null;
		const p = pack as ContentPack;
		const { baseFeatId, hint } = parseFeatIdHint(p.feats ?? [], selectedBg.feat);
		const def = findFeatDef(p.feats ?? [], selectedBg.feat);
		return { def, baseFeatId, hint };
	});
	const resolvedFeatName = $derived(resolvedFeat?.def?.name ?? null);

	// Spells from pack (for Magic Initiate config)
	const packSpells: SpellDefinition[] = $derived((pack as ContentPack)?.spells ?? []);

	// --- Origin feat configuration state ---
	const featHasSpellChoices = $derived(
		resolvedFeat?.def?.choices?.some((c) => c.type === 'spell-list') ?? false
	);
	const featHasSkillChoices = $derived(
		resolvedFeat?.def?.choices?.some((c) => c.type === 'skill-or-tool') ?? false
	);
	const featNeedsConfig = $derived(featHasSpellChoices || featHasSkillChoices);

	// Initialize feat config from existing character data (for back-navigation)
	function initFeatConfig(): { mi: FeatSpellConfig; skilled: Set<string> } {
		const existingFeat = wizardStore.getCharacter()?.feats?.find((f) => f.source === 'background');
		if (!existingFeat?.choices?.length) {
			return { mi: { spellList: '', cantrips: new Set(), spell: '', spellcastingAbility: '' }, skilled: new Set() };
		}
		const choices = existingFeat.choices;
		const spellListChoice = choices.find((c) => c.choiceId === 'spell-list');
		if (spellListChoice) {
			return {
				mi: {
					spellList: spellListChoice.selectedValue,
					cantrips: new Set([choices.find((c) => c.choiceId === 'cantrip-1')?.selectedValue, choices.find((c) => c.choiceId === 'cantrip-2')?.selectedValue].filter(Boolean) as string[]),
					spell: choices.find((c) => c.choiceId === 'spell-1')?.selectedValue ?? '',
					spellcastingAbility: choices.find((c) => c.choiceId === 'spellcasting-ability')?.selectedValue ?? ''
				},
				skilled: new Set()
			};
		}
		const profChoices = choices.filter((c) => c.choiceId.startsWith('proficiency-'));
		if (profChoices.length) {
			return {
				mi: { spellList: '', cantrips: new Set(), spell: '', spellcastingAbility: '' },
				skilled: new Set(profChoices.map((c) => c.selectedValue).filter(Boolean))
			};
		}
		return { mi: { spellList: '', cantrips: new Set(), spell: '', spellcastingAbility: '' }, skilled: new Set() };
	}

	const initFeat = initFeatConfig();
	let miConfig = $state<FeatSpellConfig>(initFeat.mi);
	let skilledSelections = $state<Set<string>>(initFeat.skilled);

	// Reset feat config when user actively changes background (not on first render)
	let prevBgForFeat = $state('');
	let hasInitializedBgWatcher = $state(false);
	$effect(() => {
		if (!hasInitializedBgWatcher) {
			prevBgForFeat = selectedId;
			hasInitializedBgWatcher = true;
			return;
		}
		if (selectedId && selectedId !== prevBgForFeat) {
			miConfig = { spellList: '', cantrips: new Set(), spell: '', spellcastingAbility: '' };
			skilledSelections = new Set();
			prevBgForFeat = selectedId;
		}
	});

	function isFeatConfigComplete(): boolean {
		if (!featNeedsConfig) return true;
		if (featHasSpellChoices) {
			return !!miConfig.spellList && miConfig.cantrips.size === 2 && !!miConfig.spell && !!miConfig.spellcastingAbility;
		}
		if (featHasSkillChoices) {
			return skilledSelections.size === 3;
		}
		return true;
	}

	function buildOriginFeatChoices(): FeatChoiceSelection[] {
		if (featHasSpellChoices) {
			const cantrips = Array.from(miConfig.cantrips);
			return [
				{ choiceId: 'spell-list', selectedValue: miConfig.spellList },
				{ choiceId: 'cantrip-1', selectedValue: cantrips[0] ?? '' },
				{ choiceId: 'cantrip-2', selectedValue: cantrips[1] ?? '' },
				{ choiceId: 'spell-1', selectedValue: miConfig.spell },
				{ choiceId: 'spellcasting-ability', selectedValue: miConfig.spellcastingAbility }
			];
		}
		if (featHasSkillChoices) {
			const arr = Array.from(skilledSelections);
			return [
				{ choiceId: 'proficiency-1', selectedValue: arr[0] ?? '' },
				{ choiceId: 'proficiency-2', selectedValue: arr[1] ?? '' },
				{ choiceId: 'proficiency-3', selectedValue: arr[2] ?? '' }
			];
		}
		return [];
	}

	function proceed() {
		if (!selectedId || !asiComplete() || !isFeatConfigComplete()) return;

		// Store background bonuses in originBonuses (filter out old background bonuses first)
		const existingOriginBonuses = (wizardStore.getCharacter()?.abilityScores?.originBonuses ?? [])
			.filter((b) => b.sourceType !== 'background');
		const bgBonuses = buildBackgroundBonuses();

		// Assign background feat with populated choices
		const bgDef = backgrounds.find((b) => b.id === selectedId);
		const feats = bgDef?.feat
			? [{ featId: bgDef.feat, source: 'background', choices: buildOriginFeatChoices() }]
			: [];

		wizardStore.updateCharacter({
			background: {
				backgroundId: selectedId,
				choices: []
			},
			abilityScores: {
				...wizardStore.getCharacter()!.abilityScores,
				originBonuses: [...existingOriginBonuses, ...bgBonuses]
			},
			feats
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/skills`);
	}
</script>

<svelte:head>
	<title>Background - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Choose Your Background"
		description="Your background describes what your character did before becoming an adventurer."
	/>

	<WizardNav
		backHref="/create/{systemId}/abilities"
		backLabel="Back"
		nextLabel="Next: Skills"
		onNext={proceed}
		nextDisabled={!selectedId || !asiComplete() || !isFeatConfigComplete()}
		compact
	/>

	<div class="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2" role="listbox" aria-label="Backgrounds" use:rovingTabindex>
		{#each backgrounds as bg}
			<SelectionCard
				selected={selectedId === bg.id}
				onclick={() => (selectedId = bg.id)}
			>
				<h3 class="font-semibold">{bg.name}</h3>
				<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{bg.description}</p>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each bg.skillProficiencies as prof}
						<Badge variant="secondary" class="text-xs">{kebabToTitle(prof.value)}</Badge>
					{/each}
					{#if bg.abilityScoreChanges}
						{#each bg.abilityScoreChanges as asc}
							{#if asc.ability !== 'choice'}
								<Badge variant="outline" class="text-xs">{asc.ability.toUpperCase()}</Badge>
							{/if}
						{/each}
					{/if}
				</div>
			</SelectionCard>
		{/each}
	</div>

	{#if selectedBg}
		<div class="mt-6">
			<DetailPanel title={selectedBg.name}>
				<p class="text-sm text-muted-foreground">{selectedBg.description}</p>
				<div class="mt-4 space-y-2 text-sm">
					<p><span class="font-medium">Skills:</span> {selectedBg.skillProficiencies.map(p => kebabToTitle(p.value)).join(', ')}</p>
					{#if selectedBg.toolProficiencies.length > 0}
						<p><span class="font-medium">Tools:</span> {selectedBg.toolProficiencies.map(p => kebabToTitle(p.value)).join(', ')}</p>
					{/if}
					{#if selectedBg.languages.length > 0}
						<p><span class="font-medium">Languages:</span> {selectedBg.languages.map(l => kebabToTitle(l.value)).join(', ')}</p>
					{/if}
					{#if selectedBg.feature}
						<p><span class="font-medium">Feature:</span> {selectedBg.feature.name} - {selectedBg.feature.description}</p>
					{/if}
					{#if selectedBg.feat}
						<p><span class="font-medium">Origin Feat:</span> {resolvedFeatName}</p>
						{#if resolvedFeat?.def}
							<div class="mt-2 space-y-1">
								{#each resolvedFeat.def.effects as effect}
									<p class="text-xs text-muted-foreground">
										<span class="font-medium text-foreground/80">{effect.name}.</span> {effect.description}
									</p>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</DetailPanel>
		</div>

		<!-- Origin Feat Configuration -->
		{#if selectedBg.feat && featNeedsConfig}
			{#if featHasSpellChoices}
				<div class="mt-4">
					<MagicInitiateConfig
						spells={packSpells}
						spellListOptions={resolvedFeat?.def?.choices?.find((c) => c.type === 'spell-list')?.options ?? ['cleric', 'druid', 'wizard']}
						lockedSpellList={resolvedFeat?.hint ?? undefined}
						bind:config={miConfig}
					/>
				</div>
			{:else if featHasSkillChoices}
				<div class="mt-4">
					<SkilledConfig
						bind:selections={skilledSelections}
					/>
				</div>
			{/if}
		{/if}

		<!-- Ability Score Increases -->
		{#if hasAbilityChoice}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title class="text-base">Ability Score Increases</Card.Title>
					<p class="text-sm text-muted-foreground">
						Increase one of {eligibleAbilities.map(a => ABILITY_NAMES[a]).join(', ')} by 2 and another by 1,
						or increase all three by 1. No score can exceed 20.
					</p>
				</Card.Header>
				<Card.Content>
					<!-- Mode selector -->
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {asiMode === '+2+1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => { asiMode = '+2+1'; }}
						>
							+2 to one, +1 to another
						</button>
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {asiMode === '+1+1+1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => { asiMode = '+1+1+1'; plus2Ability = ''; plus1Ability = ''; }}
						>
							+1 to all three
						</button>
					</div>

					{#if asiMode === '+2+1'}
						<Separator class="my-3" />
						<div class="space-y-3">
							<div>
								<span class="mr-2 text-sm text-muted-foreground">+2 to:</span>
								<div class="mt-1 inline-flex flex-wrap gap-2">
									{#each eligibleAbilities as ab}
										{@const isOther = plus1Ability === ab}
										<button
											type="button"
											disabled={isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{plus2Ability === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { plus2Ability = ab; }}
										>
											{ABILITY_NAMES[ab]}
										</button>
									{/each}
								</div>
							</div>
							<div>
								<span class="mr-2 text-sm text-muted-foreground">+1 to:</span>
								<div class="mt-1 inline-flex flex-wrap gap-2">
									{#each eligibleAbilities as ab}
										{@const isOther = plus2Ability === ab}
										<button
											type="button"
											disabled={isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{plus1Ability === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { plus1Ability = ab; }}
										>
											{ABILITY_NAMES[ab]}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each eligibleAbilities as ab}
								<Badge variant="secondary" class="text-sm">
									{ABILITY_NAMES[ab]} +1
								</Badge>
							{/each}
						</div>
					{/if}
					<!-- Inline stats preview -->
					{#if previewTotals && previewModifiers}
						<Separator class="my-3" />
						<div class="grid grid-cols-6 gap-1.5 text-center">
							{#each previewAbilities as ability}
								<div class="flex flex-col items-center">
									<span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ability}</span>
									<span class="text-lg font-bold leading-tight">{formatModifier(previewModifiers[ability])}</span>
									<span class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{previewTotals[ability]}</span>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}

	<WizardNav
		backHref="/create/{systemId}/abilities"
		backLabel="Back"
		nextLabel="Next: Skills"
		onNext={proceed}
		nextDisabled={!selectedId || !asiComplete() || !isFeatConfigComplete()}
	/>
</div>
