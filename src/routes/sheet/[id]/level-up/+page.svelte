<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { ContentPack, ClassDefinition, SubclassDefinition, FeatDefinition, SpellDefinition } from '$lib/types/content-pack.js';
	import type { CharacterData, AbilityBonus, FeatSelection, SpellKnown, FeatureChoiceSelection } from '$lib/types/character.js';
	import type { AbilityId, SkillId } from '$lib/types/common.js';
	import { ABILITY_IDS, ABILITY_NAMES } from '$lib/types/common.js';
	import { computeLevelUpChoices } from '$lib/engine/level-up.js';
	import { averageHitDieRoll, parseDice } from '$lib/engine/hit-points.js';
	import { totalAbilityScore, abilityModifier } from '$lib/engine/ability-scores.js';
	import { calculateMaxHP } from '$lib/engine/hit-points.js';
	import { getMaxSpellLevel } from '$lib/engine/class-progression.js';
	import { formatSpellLevel, kebabToTitle } from '$lib/utils/format.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Dices, Heart, Shield, Sparkles, Star } from 'lucide-svelte';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { character, pack } = $derived($page.data as {
		character: { id: string; data: CharacterData };
		pack: ContentPack;
	});

	const data = $derived(character.data);
	const primaryClass = $derived(data.classes[0]);
	const classDef = $derived(
		pack.classes.find((c) => c.id === primaryClass?.classId) ?? null
	);

	const levelUp = $derived(
		classDef ? computeLevelUpChoices(data, classDef, pack) : null
	);

	// ─── HP Choice ──────────────────────────────────────────
	let hpMethod = $state<'average' | 'roll'>('average');
	let rolledHP = $state<number | null>(null);

	const avgHP = $derived(classDef ? averageHitDieRoll(classDef.hitDie) : 0);
	const conMod = $derived(abilityModifier(totalAbilityScore(data.abilityScores, 'con')));
	const hpGain = $derived(() => {
		const base = hpMethod === 'average' ? avgHP : (rolledHP ?? avgHP);
		return Math.max(base + conMod, 1);
	});

	function rollHitDie() {
		if (!classDef) return;
		const { sides } = parseDice(classDef.hitDie);
		rolledHP = Math.floor(Math.random() * sides) + 1;
		hpMethod = 'roll';
	}

	// ─── Subclass Choice ────────────────────────────────────
	let selectedSubclassId = $state('');
	const subclasses = $derived(classDef?.subclasses ?? []);

	// ─── ASI / Feat Choice ──────────────────────────────────
	let asiType = $state<'asi-2' | 'asi-1-1' | 'feat'>('asi-2');
	let asiAbility1 = $state<AbilityId | undefined>(undefined);
	let asiAbility2 = $state<AbilityId | undefined>(undefined);
	let asiFeatId = $state('');

	const currentScores = $derived(() => {
		const scores = {} as Record<AbilityId, number>;
		for (const ab of ABILITY_IDS) {
			scores[ab] = totalAbilityScore(data.abilityScores, ab);
		}
		return scores;
	});

	const feats: FeatDefinition[] = $derived(pack?.feats ?? []);

	// ─── Spell Choice ───────────────────────────────────────
	let open5eSpells = $state<SpellDefinition[]>([]);
	const allSpells: SpellDefinition[] = $derived.by(() => {
		const base: SpellDefinition[] = pack?.spells ?? [];
		if (open5eSpells.length === 0) return base;
		const baseNames = new Set(base.map((s) => s.name.toLowerCase()));
		return [...base, ...open5eSpells.filter((s: SpellDefinition) => !baseNames.has(s.name.toLowerCase()))];
	});

	onMount(async () => {
		const sources = data?.open5eSources;
		if (!sources?.length) return;
		try {
			const res = await fetch(`/api/open5e/spells?sources=${sources.join(',')}`);
			if (res.ok) open5eSpells = await res.json();
		} catch { /* graceful degradation */ }
	});

	let newSpellIds = $state<Set<string>>(new Set());
	let newCantripIds = $state<Set<string>>(new Set());

	const availableSpells = $derived(() => {
		if (!classDef?.spellcasting || !levelUp) return [];
		const maxLevel = levelUp.newMaxSpellLevel;
		const existingIds = new Set(data.spells.knownSpells.map((s) => s.spellId));
		return allSpells.filter(
			(s) =>
				s.lists.includes(classDef.spellcasting!.spellList) &&
				s.level > 0 &&
				s.level <= maxLevel &&
				!existingIds.has(s.id)
		);
	});

	const availableCantrips = $derived(() => {
		if (!classDef?.spellcasting || !levelUp) return [];
		const existingIds = new Set(data.spells.knownSpells.map((s) => s.spellId));
		return allSpells.filter(
			(s) =>
				s.lists.includes(classDef.spellcasting!.spellList) &&
				s.level === 0 &&
				!existingIds.has(s.id)
		);
	});

	function toggleNewSpell(spellId: string) {
		const newSet = new Set(newSpellIds);
		if (newSet.has(spellId)) {
			newSet.delete(spellId);
		} else {
			if (!levelUp || newSet.size >= levelUp.spellsKnownDelta) return;
			newSet.add(spellId);
		}
		newSpellIds = newSet;
	}

	function toggleNewCantrip(spellId: string) {
		const newSet = new Set(newCantripIds);
		if (newSet.has(spellId)) {
			newSet.delete(spellId);
		} else {
			if (!levelUp || newSet.size >= levelUp.cantripsKnownDelta) return;
			newSet.add(spellId);
		}
		newCantripIds = newSet;
	}

	// ─── Feature Choices ────────────────────────────────────
	const newFeaturesWithChoices = $derived(
		(levelUp?.newFeatures ?? []).filter((f) => f.choices && f.choices.length > 0)
	);

	let featureSelections = $state<Record<string, Record<string, string[]>>>({});

	function toggleFeatureOption(featureId: string, choiceId: string, optionId: string, maxCount: number) {
		const current = featureSelections[featureId]?.[choiceId] ?? [];
		const idx = current.indexOf(optionId);
		let updated: string[];
		if (idx >= 0) {
			updated = current.filter((id) => id !== optionId);
		} else if (current.length < maxCount) {
			updated = [...current, optionId];
		} else {
			updated = [...current.slice(1), optionId];
		}
		featureSelections = {
			...featureSelections,
			[featureId]: { ...featureSelections[featureId], [choiceId]: updated }
		};
	}

	function getSelectedOptions(featureId: string, choiceId: string): string[] {
		return featureSelections[featureId]?.[choiceId] ?? [];
	}

	function buildNewFeatureChoices(): FeatureChoiceSelection[] {
		const result: FeatureChoiceSelection[] = [];
		for (const [featureId, choices] of Object.entries(featureSelections)) {
			for (const [choiceId, selectedOptionIds] of Object.entries(choices)) {
				if (selectedOptionIds.length > 0) {
					result.push({ featureId, choiceId, selectedOptionIds });
				}
			}
		}
		return result;
	}

	// ─── Validation ─────────────────────────────────────────
	const isValid = $derived(() => {
		if (!levelUp) return false;
		if (levelUp.needsSubclass && !selectedSubclassId) return false;
		if (levelUp.needsASI) {
			if (asiType === 'asi-2' && !asiAbility1) return false;
			if (asiType === 'asi-1-1' && (!asiAbility1 || !asiAbility2)) return false;
			if (asiType === 'feat' && !asiFeatId) return false;
		}
		if (levelUp.spellsKnownDelta > 0 && newSpellIds.size < levelUp.spellsKnownDelta) return false;
		if (levelUp.cantripsKnownDelta > 0 && newCantripIds.size < levelUp.cantripsKnownDelta) return false;
		return true;
	});

	// ─── Apply Level Up ─────────────────────────────────────
	let saving = $state(false);
	let error = $state('');

	async function applyLevelUp() {
		if (!levelUp || !classDef || !isValid()) return;
		saving = true;
		error = '';

		const newLevel = levelUp.newLevel;

		// Update class (merge new feature choices)
		const newFeatureChoices = buildNewFeatureChoices();
		const updatedClasses = data.classes.map((c, i) => {
			if (i !== 0) return c;
			return {
				...c,
				level: newLevel,
				subclassId: selectedSubclassId || c.subclassId,
				featureChoices: [...(c.featureChoices ?? []), ...newFeatureChoices]
			};
		});

		// Update ASI/Feats
		const updatedLevelUpBonuses = [...data.abilityScores.levelUpBonuses];
		const updatedFeats = [...data.feats];

		if (levelUp.needsASI) {
			const source = `class:${primaryClass.classId}:${newLevel}`;
			if (asiType === 'asi-2' && asiAbility1) {
				updatedLevelUpBonuses.push({
					ability: asiAbility1,
					value: 2,
					source,
					sourceType: 'level-up'
				});
			} else if (asiType === 'asi-1-1') {
				if (asiAbility1) {
					updatedLevelUpBonuses.push({
						ability: asiAbility1,
						value: 1,
						source,
						sourceType: 'level-up'
					});
				}
				if (asiAbility2) {
					updatedLevelUpBonuses.push({
						ability: asiAbility2,
						value: 1,
						source,
						sourceType: 'level-up'
					});
				}
			} else if (asiType === 'feat' && asiFeatId) {
				updatedFeats.push({ featId: asiFeatId, source, choices: [] });
			}
		}

		// Update spells
		const updatedKnownSpells = [...data.spells.knownSpells];
		for (const spellId of newSpellIds) {
			updatedKnownSpells.push({ spellId, source: `class:${primaryClass.classId}` });
		}
		for (const spellId of newCantripIds) {
			updatedKnownSpells.push({ spellId, source: `class:${primaryClass.classId}` });
		}

		// Compute new HP
		const newHP = data.hitPoints.maximum + hpGain();

		const updatedData: CharacterData = {
			...data,
			level: newLevel,
			classes: updatedClasses,
			abilityScores: {
				...data.abilityScores,
				levelUpBonuses: updatedLevelUpBonuses
			},
			feats: updatedFeats,
			spells: {
				...data.spells,
				knownSpells: updatedKnownSpells
			},
			hitPoints: {
				...data.hitPoints,
				maximum: newHP,
				current: newHP,
				hitDice: data.hitPoints.hitDice.map((hd, i) => {
					if (i !== 0) return hd;
					return { ...hd, total: newLevel };
				})
			}
		};

		try {
			const res = await fetch(`/api/characters/${character.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData)
			});
			if (res.ok) {
				goto(`/sheet/${character.id}`);
			} else {
				const body = await res.json().catch(() => ({}));
				error = body.message ?? 'Failed to save. Please try again.';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Level Up - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6 animate-fade-in">
	<Button variant="ghost" href="/sheet/{character.id}" class="mb-4 gap-2">
		<ArrowLeft class="size-4" />
		Back to Character Sheet
	</Button>

	{#if levelUp && classDef}
		<PageHeader
			as="h1"
			title="Level Up to Level {levelUp.newLevel}"
			description="{data.name} — {classDef.name}"
		/>

		<div class="mt-6 space-y-6">
			<!-- 1. New Features -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base">
						<Star class="size-4" />
						New Features at Level {levelUp.newLevel}
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if levelUp.newFeatures.length > 0}
						<div class="space-y-3">
							{#each levelUp.newFeatures as feature}
								<div>
									<h4 class="font-medium">{feature.name}</h4>
									<p class="text-sm text-muted-foreground">{feature.description}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No new features at this level.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- 1b. Feature Choices (for new features that have them) -->
			{#if newFeaturesWithChoices.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<Star class="size-4" />
							Feature Choices
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each newFeaturesWithChoices as feature}
							{#each feature.choices ?? [] as choice}
								<div>
									<div class="mb-1.5 flex items-center gap-2">
										<span class="text-sm font-medium">{feature.name}: {choice.name}</span>
										<Badge variant="outline" class="text-xs">
											{getSelectedOptions(feature.id, choice.id).length}/{choice.count}
										</Badge>
									</div>
									<p class="mb-2 text-xs text-muted-foreground">{choice.description}</p>
									<div class="grid gap-1.5 sm:grid-cols-2">
										{#each choice.options as option}
											{@const isSelected = getSelectedOptions(feature.id, choice.id).includes(option.id)}
											<button
												class="rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors
													{isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/50'}"
												onclick={() => toggleFeatureOption(feature.id, choice.id, option.id, choice.count)}
											>
												<span class="font-medium">{option.name}</span>
												{#if option.description}
													<p class="mt-0.5 text-muted-foreground leading-relaxed">{option.description}</p>
												{/if}
											</button>
										{/each}
									</div>
								</div>
							{/each}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- 2. Hit Points -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base">
						<Heart class="size-4" />
						Hit Points
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							class="rounded-md border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {hpMethod === 'average' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => { hpMethod = 'average'; }}
						>
							Take Average ({avgHP})
						</button>
						<button
							type="button"
							class="flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {hpMethod === 'roll' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={rollHitDie}
						>
							<Dices class="size-4" />
							Roll {classDef.hitDie}
							{#if rolledHP !== null}
								— rolled {rolledHP}
							{/if}
						</button>
					</div>
					<p class="mt-3 text-sm text-muted-foreground">
						HP gain: {hpMethod === 'average' ? avgHP : (rolledHP ?? avgHP)} (die)
						+ {conMod} (CON)
						= <strong class="text-foreground">{hpGain()}</strong>
						&middot; New max: {data.hitPoints.maximum + hpGain()}
					</p>
				</Card.Content>
			</Card.Root>

			<!-- 3. Subclass (if needed) -->
			{#if levelUp.needsSubclass}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<Sparkles class="size-4" />
							Choose a Subclass
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-2 sm:grid-cols-2" role="listbox" aria-label="Subclasses" use:rovingTabindex>
							{#each subclasses as sub}
								<SelectionCard
									selected={selectedSubclassId === sub.id}
									onclick={() => (selectedSubclassId = sub.id)}
								>
									<h4 class="pr-6 font-semibold">{sub.name}</h4>
									<p class="mt-1 line-clamp-3 text-sm text-muted-foreground">{sub.description}</p>
								</SelectionCard>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- 4. ASI / Feat (if needed) -->
			{#if levelUp.needsASI}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<Shield class="size-4" />
							Ability Score Improvement
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<!-- Type selector -->
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {asiType === 'asi-2' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
								onclick={() => { asiType = 'asi-2'; asiAbility1 = undefined; asiAbility2 = undefined; asiFeatId = ''; }}
							>
								+2 to one ability
							</button>
							<button
								type="button"
								class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {asiType === 'asi-1-1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
								onclick={() => { asiType = 'asi-1-1'; asiAbility1 = undefined; asiAbility2 = undefined; asiFeatId = ''; }}
							>
								+1 to two abilities
							</button>
							<button
								type="button"
								class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {asiType === 'feat' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
								onclick={() => { asiType = 'feat'; asiAbility1 = undefined; asiAbility2 = undefined; asiFeatId = ''; }}
							>
								Take a feat
							</button>
						</div>

						<Separator class="my-3" />

						{#if asiType === 'asi-2'}
							<p class="mb-2 text-sm text-muted-foreground">Choose one ability to increase by 2 (max 20):</p>
							<div class="flex flex-wrap gap-2">
								{#each ABILITY_IDS as ab}
									{@const current = currentScores()[ab]}
									{@const capped = current >= 20}
									<button
										type="button"
										disabled={capped}
										class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
											{asiAbility1 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
											{capped ? 'opacity-40 cursor-not-allowed' : ''}"
										onclick={() => { asiAbility1 = ab; }}
									>
										{ABILITY_NAMES[ab]}
										<span class="ml-1 text-xs text-muted-foreground">{current}</span>
									</button>
								{/each}
							</div>
						{:else if asiType === 'asi-1-1'}
							<p class="mb-2 text-sm text-muted-foreground">Choose two different abilities to increase by 1 (max 20):</p>
							<div class="space-y-2">
								<div>
									<span class="mr-2 text-xs font-medium text-muted-foreground">First:</span>
									<div class="inline-flex flex-wrap gap-2">
										{#each ABILITY_IDS as ab}
											{@const current = currentScores()[ab]}
											{@const capped = current >= 20}
											{@const isOther = asiAbility2 === ab}
											<button
												type="button"
												disabled={capped || isOther}
												class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
													{asiAbility1 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
													{capped || isOther ? 'opacity-40 cursor-not-allowed' : ''}"
												onclick={() => { asiAbility1 = ab; }}
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
											{@const current = currentScores()[ab]}
											{@const capped = current >= 20}
											{@const isOther = asiAbility1 === ab}
											<button
												type="button"
												disabled={capped || isOther}
												class="rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
													{asiAbility2 === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
													{capped || isOther ? 'opacity-40 cursor-not-allowed' : ''}"
												onclick={() => { asiAbility2 = ab; }}
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
							<div class="grid gap-2 sm:grid-cols-2" role="listbox" aria-label="Feats" use:rovingTabindex>
								{#each feats as feat}
									<SelectionCard
										selected={asiFeatId === feat.id}
										onclick={() => { asiFeatId = feat.id; }}
										compact
									>
										<h4 class="pr-6 font-medium text-sm">{feat.name}</h4>
										<p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{feat.description}</p>
										<Badge variant="secondary" class="mt-1 text-xs capitalize">{feat.category}</Badge>
									</SelectionCard>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- 5. New Cantrips (if any) -->
			{#if levelUp.cantripsKnownDelta > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">
							Learn {levelUp.cantripsKnownDelta} New Cantrip{levelUp.cantripsKnownDelta > 1 ? 's' : ''}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<Badge variant="secondary" class="mb-3">
							Selected: {newCantripIds.size} / {levelUp.cantripsKnownDelta}
						</Badge>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each availableCantrips() as spell}
								<SelectionCard
									selected={newCantripIds.has(spell.id)}
									onclick={() => toggleNewCantrip(spell.id)}
									compact
								>
									<div class="flex items-center gap-2 pr-6">
										<span class="font-medium text-sm">{spell.name}</span>
										<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
									</div>
									<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{spell.description}</p>
								</SelectionCard>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- 6. New Spells (if any) -->
			{#if levelUp.spellsKnownDelta > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">
							Learn {levelUp.spellsKnownDelta} New Spell{levelUp.spellsKnownDelta > 1 ? 's' : ''}
							{#if levelUp.newMaxSpellLevel > 0}
								<Badge variant="outline" class="ml-2 text-xs">Up to {formatSpellLevel(levelUp.newMaxSpellLevel)} level</Badge>
							{/if}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<Badge variant="secondary" class="mb-3">
							Selected: {newSpellIds.size} / {levelUp.spellsKnownDelta}
						</Badge>
						<div class="space-y-2">
							{#each availableSpells() as spell}
								<SelectionCard
									selected={newSpellIds.has(spell.id)}
									onclick={() => toggleNewSpell(spell.id)}
									compact
								>
									<div class="flex items-center gap-2 pr-6">
										<span class="font-medium text-sm">{spell.name}</span>
										<Badge variant="secondary" class="text-xs">{formatSpellLevel(spell.level)}</Badge>
										<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
										{#if spell.concentration}
											<Badge variant="outline" class="text-xs">C</Badge>
										{/if}
									</div>
									<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{spell.description}</p>
								</SelectionCard>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Error display -->
			{#if error}
				<Alert.Root variant="destructive">
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- Apply button -->
			<div class="flex justify-end gap-3 pb-8">
				<Button variant="outline" href="/sheet/{character.id}">
					Cancel
				</Button>
				<Button
					onclick={applyLevelUp}
					disabled={!isValid() || saving}
					size="lg"
				>
					{saving ? 'Saving...' : `Apply Level Up to Level ${levelUp.newLevel}`}
				</Button>
			</div>
		</div>
	{:else}
		<Alert.Root>
			<Alert.Description>
				Unable to compute level-up data. Character may already be at max level.
			</Alert.Description>
		</Alert.Root>
	{/if}
</div>
