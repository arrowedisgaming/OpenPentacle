<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, FeatDefinition } from '$lib/types/content-pack.js';
	import type { AbilityBonus, FeatSelection } from '$lib/types/character.js';
	import type { AbilityId } from '$lib/types/common.js';
	import { ABILITY_IDS, ABILITY_NAMES } from '$lib/types/common.js';
	import { totalAbilityScore } from '$lib/engine/ability-scores.js';
	import { getASILevels, isEpicBoonLevel } from '$lib/engine/class-progression.js';
	import { getAvailableFeats, FEAT_CATEGORY_LABELS } from '$lib/engine/feats.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	const wizNav = getContext<any>('wizard-nav');
	const prevPath = $derived(wizNav.getPrevStepPath('feats'));
	const nextStepLabel = $derived(`Next: ${wizNav.getNextStepLabel('feats')}`);

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);
	const feats: FeatDefinition[] = $derived(pack?.feats ?? []);

	const character = $derived(wizardStore.getCharacter());
	const classId = $derived(character?.classes[0]?.classId ?? '');
	const charLevel = $derived(character?.level ?? 1);
	const classDef = $derived(classes.find((c) => c.id === classId));

	// Current ability scores for feat prerequisite checks
	const currentAbilityScores = $derived.by(() => {
		if (!character) return {} as Record<AbilityId, number>;
		const scores = {} as Record<AbilityId, number>;
		for (const ab of ABILITY_IDS) {
			scores[ab] = totalAbilityScore(character.abilityScores, ab);
		}
		return scores;
	});

	// Filter feats by category, level, prerequisites
	const availableFeats = $derived.by(() => {
		if (!character || !classDef) return feats;
		return getAvailableFeats(feats, character.level, classDef, character.feats ?? [], currentAbilityScores);
	});

	// Determine which ASI levels this character has reached
	const reachedASILevels = $derived(
		classDef ? getASILevels(classDef).filter((l) => l <= charLevel) : []
	);

	// Check if background grants a feat
	const backgroundDef = $derived(
		character?.background
			? pack?.backgrounds?.find((b: any) => b.id === character!.background!.backgroundId)
			: null
	);
	const backgroundGrantsFeat = $derived(!!backgroundDef?.feat);

	type ASIChoice = {
		level: number;
		source: string;
		type: 'asi-2' | 'asi-1-1' | 'feat';
		ability1?: AbilityId;
		ability2?: AbilityId;
		featId?: string;
	};

	// Initialize decisions from existing character data or defaults
	function initDecisions(): ASIChoice[] {
		const existing = character?.abilityScores?.levelUpBonuses ?? [];
		const existingFeats = character?.feats?.filter((f) => f.source.startsWith('class:')) ?? [];

		return reachedASILevels.map((level) => {
			const source = `class:${classId}:${level}`;
			// Check for existing feat choice at this level
			const existingFeat = existingFeats.find((f) => f.source === source);
			if (existingFeat) {
				return { level, source, type: 'feat' as const, featId: existingFeat.featId };
			}
			// Check for existing ASI bonuses at this level
			const bonuses = existing.filter((b) => b.source === source);
			if (bonuses.length === 1 && bonuses[0].value === 2) {
				return { level, source, type: 'asi-2' as const, ability1: bonuses[0].ability };
			}
			if (bonuses.length === 2) {
				return { level, source, type: 'asi-1-1' as const, ability1: bonuses[0].ability, ability2: bonuses[1].ability };
			}
			return { level, source, type: 'asi-2' as const };
		});
	}

	let decisions = $state<ASIChoice[]>(initDecisions());
	let expandedFeatId = $state<string | null>(null);

	function toggleFeatExpand(featId: string, event: MouseEvent) {
		event.stopPropagation();
		expandedFeatId = expandedFeatId === featId ? null : featId;
	}

	// Background feat is auto-assigned on the background step — just read it
	const backgroundFeatId = $derived(
		character?.feats?.find((f) => f.source === 'background')?.featId ?? ''
	);
	const backgroundFeatDef = $derived(
		backgroundFeatId ? feats.find((f) => f.id === backgroundFeatId) : null
	);

	// Recompute when reached ASI levels change (e.g. back-nav changed level)
	$effect(() => {
		if (decisions.length !== reachedASILevels.length) {
			decisions = initDecisions();
		}
	});

	// Force Epic Boon levels to feat type
	$effect(() => {
		if (!classDef) return;
		for (let i = 0; i < decisions.length; i++) {
			if (isEpicBoonLevel(classDef, decisions[i].level) && decisions[i].type !== 'feat') {
				decisions[i] = { ...decisions[i], type: 'feat', ability1: undefined, ability2: undefined };
			}
		}
	});

	// Compute current ability scores including prior ASI decisions (for cap enforcement)
	function getScoreWithPriorASIs(upToIndex: number): Record<AbilityId, number> {
		if (!character?.abilityScores) {
			return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
		}
		// Start with base + origin bonuses
		const scores = {} as Record<AbilityId, number>;
		for (const ab of ABILITY_IDS) {
			scores[ab] = totalAbilityScore(
				{ ...character.abilityScores, levelUpBonuses: [], featBonuses: [] },
				ab
			);
		}
		// Add prior ASI decisions
		for (let i = 0; i < upToIndex; i++) {
			const d = decisions[i];
			const cap = getAsiCap(d);
			if (d.type === 'asi-2' && d.ability1) {
				scores[d.ability1] = Math.min(scores[d.ability1] + 2, cap);
			} else if (d.type === 'asi-1-1') {
				if (d.ability1) scores[d.ability1] = Math.min(scores[d.ability1] + 1, cap);
				if (d.ability2) scores[d.ability2] = Math.min(scores[d.ability2] + 1, cap);
			}
		}
		return scores;
	}

	/** Get the ability score cap for a decision — 20 normally, but Epic Boon feats allow 30 */
	function getAsiCap(decision: ASIChoice): number {
		if (decision.type === 'feat' && decision.featId) {
			const featDef = feats.find((f) => f.id === decision.featId);
			return featDef?.abilityScoreIncrease?.max ?? 20;
		}
		if (classDef && isEpicBoonLevel(classDef, decision.level)) {
			return 30;
		}
		return 20;
	}

	function setDecisionType(index: number, type: 'asi-2' | 'asi-1-1' | 'feat') {
		decisions[index] = {
			...decisions[index],
			type,
			ability1: undefined,
			ability2: undefined,
			featId: undefined
		};
	}

	function isComplete(): boolean {
		for (const d of decisions) {
			if (d.type === 'asi-2' && !d.ability1) return false;
			if (d.type === 'asi-1-1' && (!d.ability1 || !d.ability2)) return false;
			if (d.type === 'feat' && !d.featId) return false;
		}
		return true;
	}

	function proceed() {
		// Build levelUpBonuses from ASI decisions
		const levelUpBonuses: AbilityBonus[] = [];
		// Preserve the background feat (auto-assigned on background step)
		const featSelections: FeatSelection[] = (character?.feats ?? [])
			.filter((f) => f.source === 'background');

		for (const d of decisions) {
			if (d.type === 'asi-2' && d.ability1) {
				levelUpBonuses.push({
					ability: d.ability1,
					value: 2,
					source: d.source,
					sourceType: 'level-up'
				});
			} else if (d.type === 'asi-1-1') {
				if (d.ability1) {
					levelUpBonuses.push({
						ability: d.ability1,
						value: 1,
						source: d.source,
						sourceType: 'level-up'
					});
				}
				if (d.ability2) {
					levelUpBonuses.push({
						ability: d.ability2,
						value: 1,
						source: d.source,
						sourceType: 'level-up'
					});
				}
			} else if (d.type === 'feat' && d.featId) {
				featSelections.push({
					featId: d.featId,
					source: d.source,
					choices: []
				});
			}
		}

		wizardStore.updateCharacter({
			abilityScores: {
				...character!.abilityScores,
				levelUpBonuses
			},
			feats: featSelections
		});
		const nextPath = wizNav.getNextStepPath('feats');
		wizardStore.completeStep();
		goto(`/create/${systemId}/${nextPath}`);
	}
</script>

<svelte:head>
	<title>ASI & Feats - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Ability Score Improvements & Feats"
		description="At certain levels, you can increase your ability scores or take a feat."
	/>

	<!-- Background Feat (read-only — auto-assigned on background step) -->
	{#if backgroundFeatDef}
		<Card.Root class="mt-6">
			<Card.Header>
				<Card.Title class="text-base">Background Feat</Card.Title>
				<p class="text-sm text-muted-foreground">Granted by your background.</p>
			</Card.Header>
			<Card.Content>
				<div class="rounded-md border border-primary/20 bg-accent p-3">
					<h4 class="font-medium text-sm">{backgroundFeatDef.name}</h4>
					<p class="mt-0.5 text-xs text-muted-foreground">{backgroundFeatDef.description}</p>
					<Badge variant="secondary" class="mt-1 text-xs capitalize">{FEAT_CATEGORY_LABELS[backgroundFeatDef.category] ?? backgroundFeatDef.category}</Badge>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- ASI Choices -->
	{#each decisions as decision, i}
		{@const scores = getScoreWithPriorASIs(i)}
		{@const isEpicBoon = classDef ? isEpicBoonLevel(classDef, decision.level) : false}
		{@const cap = getAsiCap(decision)}
		<Card.Root class="mt-4">
			<Card.Header>
				<Card.Title class="text-base">
					{#if isEpicBoon}
						Level {decision.level} — Epic Boon
					{:else}
						Level {decision.level} — Ability Score Improvement
					{/if}
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if isEpicBoon}
					<!-- Epic Boon level: feat picker only (no ASI toggle) -->
					<p class="mb-2 text-sm text-muted-foreground">Choose an Epic Boon or another feat:</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each availableFeats as feat}
							{@const isFeatExpanded = expandedFeatId === feat.id}
							<SelectionCard
								selected={decision.featId === feat.id}
								onclick={() => { decisions[i].featId = feat.id; }}
								compact
							>
								<h4 class="pr-6 font-medium text-sm">{feat.name}</h4>
								<p class="mt-0.5 text-xs text-muted-foreground {isFeatExpanded ? '' : 'line-clamp-2'}">{feat.description}</p>
								{#if isFeatExpanded}
									{#if feat.abilityScoreIncrease}
										<p class="mt-1.5 text-xs font-medium text-primary">
											+{feat.abilityScoreIncrease.value} to {feat.abilityScoreIncrease.abilities.map((a) => ABILITY_NAMES[a]).join(' or ')} (choose {feat.abilityScoreIncrease.count})
										</p>
									{/if}
									{#if feat.effects.length > 0}
										<ul class="mt-1.5 space-y-1">
											{#each feat.effects as effect}
												<li class="text-xs text-muted-foreground">
													<span class="font-medium text-foreground/80">{effect.name}.</span> {effect.description}
												</li>
											{/each}
										</ul>
									{/if}
								{/if}
								<div class="mt-1 flex items-center gap-2">
									<Badge variant="secondary" class="text-xs capitalize">{FEAT_CATEGORY_LABELS[feat.category] ?? feat.category}</Badge>
									{#if feat.abilityScoreIncrease && !isFeatExpanded}
										<Badge variant="outline" class="text-xs">+{feat.abilityScoreIncrease.value} {feat.abilityScoreIncrease.abilities.map((a) => ABILITY_NAMES[a]?.slice(0, 3).toUpperCase()).join('/')}</Badge>
									{/if}
									<button
										onclick={(e) => toggleFeatExpand(feat.id, e)}
										class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
									>
										{#if isFeatExpanded}
											<ChevronUp class="size-3.5" />
										{:else}
											<ChevronDown class="size-3.5" />
										{/if}
									</button>
								</div>
							</SelectionCard>
						{/each}
					</div>
				{:else}
					<!-- Regular ASI level: toggle between ASI and feat -->
					<!-- Choice type selector -->
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {decision.type === 'asi-2' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => setDecisionType(i, 'asi-2')}
						>
							+2 to one ability
						</button>
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {decision.type === 'asi-1-1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => setDecisionType(i, 'asi-1-1')}
						>
							+1 to two abilities
						</button>
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {decision.type === 'feat' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => setDecisionType(i, 'feat')}
						>
							Take a feat
						</button>
					</div>

					<Separator class="my-3" />

					{#if decision.type === 'asi-2'}
						<p class="mb-2 text-sm text-muted-foreground">Choose one ability to increase by 2 (max {cap}):</p>
						<div class="flex flex-wrap gap-2">
							{#each ABILITY_IDS as ab}
								{@const current = scores[ab]}
								{@const capped = current >= cap}
								<button
									type="button"
									disabled={capped}
									class="rounded-md border px-3 py-1.5 text-sm transition-colors
										{decision.ability1 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
										{capped ? 'opacity-40 cursor-not-allowed' : ''}"
									onclick={() => { decisions[i].ability1 = ab; }}
								>
									{ABILITY_NAMES[ab]}
									<span class="ml-1 text-xs text-muted-foreground">{current}</span>
								</button>
							{/each}
						</div>
					{:else if decision.type === 'asi-1-1'}
						<p class="mb-2 text-sm text-muted-foreground">Choose two different abilities to increase by 1 (max {cap}):</p>
						<div class="space-y-2">
							<div>
								<span class="mr-2 text-xs font-medium text-muted-foreground">First:</span>
								<div class="inline-flex flex-wrap gap-2">
									{#each ABILITY_IDS as ab}
										{@const current = scores[ab]}
										{@const capped = current >= cap}
										{@const isOther = decision.ability2 === ab}
										<button
											type="button"
											disabled={capped || isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{decision.ability1 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{capped || isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { decisions[i].ability1 = ab; }}
										>
											{ABILITY_NAMES[ab]}
											<span class="ml-1 text-xs text-muted-foreground">{current}</span>
										</button>
									{/each}
								</div>
							</div>
							<div>
								<span class="mr-2 text-xs font-medium text-muted-foreground">Second:</span>
								<div class="inline-flex flex-wrap gap-2">
									{#each ABILITY_IDS as ab}
										{@const current = scores[ab]}
										{@const capped = current >= cap}
										{@const isOther = decision.ability1 === ab}
										<button
											type="button"
											disabled={capped || isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{decision.ability2 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{capped || isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { decisions[i].ability2 = ab; }}
										>
											{ABILITY_NAMES[ab]}
											<span class="ml-1 text-xs text-muted-foreground">{current}</span>
										</button>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<p class="mb-2 text-sm text-muted-foreground">Choose a feat:</p>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each availableFeats as feat}
								{@const isFeatExpanded = expandedFeatId === feat.id}
								<SelectionCard
									selected={decision.featId === feat.id}
									onclick={() => { decisions[i].featId = feat.id; }}
									compact
								>
									<h4 class="pr-6 font-medium text-sm">{feat.name}</h4>
									<p class="mt-0.5 text-xs text-muted-foreground {isFeatExpanded ? '' : 'line-clamp-2'}">{feat.description}</p>
									{#if isFeatExpanded}
										{#if feat.abilityScoreIncrease}
											<p class="mt-1.5 text-xs font-medium text-primary">
												+{feat.abilityScoreIncrease.value} to {feat.abilityScoreIncrease.abilities.map((a) => ABILITY_NAMES[a]).join(' or ')} (choose {feat.abilityScoreIncrease.count})
											</p>
										{/if}
										{#if feat.effects.length > 0}
											<ul class="mt-1.5 space-y-1">
												{#each feat.effects as effect}
													<li class="text-xs text-muted-foreground">
														<span class="font-medium text-foreground/80">{effect.name}.</span> {effect.description}
													</li>
												{/each}
											</ul>
										{/if}
									{/if}
									<div class="mt-1 flex items-center gap-2">
										<Badge variant="secondary" class="text-xs capitalize">{FEAT_CATEGORY_LABELS[feat.category] ?? feat.category}</Badge>
										{#if feat.abilityScoreIncrease && !isFeatExpanded}
											<Badge variant="outline" class="text-xs">+{feat.abilityScoreIncrease.value} {feat.abilityScoreIncrease.abilities.map((a) => ABILITY_NAMES[a]?.slice(0, 3).toUpperCase()).join('/')}</Badge>
										{/if}
										<button
											onclick={(e) => toggleFeatExpand(feat.id, e)}
											class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
										>
											{#if isFeatExpanded}
												<ChevronUp class="size-3.5" />
											{:else}
												<ChevronDown class="size-3.5" />
											{/if}
										</button>
									</div>
								</SelectionCard>
							{/each}
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>
	{/each}

	{#if reachedASILevels.length === 0 && !backgroundGrantsFeat}
		<Card.Root class="mt-6">
			<Card.Content class="py-8 text-center text-muted-foreground">
				No ASI levels or feat opportunities at level {charLevel}.
			</Card.Content>
		</Card.Root>
	{/if}

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel={nextStepLabel}
		onNext={proceed}
		nextDisabled={reachedASILevels.length > 0 && !isComplete()}
	/>
</div>
