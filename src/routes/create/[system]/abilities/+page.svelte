<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import { ABILITY_IDS, ABILITY_NAMES, type AbilityId } from '$lib/types/common.js';
	import type { AbilityScoreMethod, ClassDefinition, PointBuyConfig } from '$lib/types/content-pack.js';
	import {
		abilityModifier,
		formatModifier,
		isValidPointBuy,
		isValidStandardArray,
		pointBuyCost,
		STANDARD_POINT_BUY_COSTS
	} from '$lib/engine/ability-scores.js';
	import { rollAbilityScores } from '$lib/utils/dice.js';
	import type { AbilityBonus } from '$lib/types/character.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Minus, Plus, Dice5, Wand2, Check } from 'lucide-svelte';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const methods: AbilityScoreMethod[] = $derived(pack?.abilityScoreMethods ?? []);

	const savedMethod = wizardStore.getCharacter()?.abilityScores?.method || '';
	let selectedMethod = $state(savedMethod);

	// Default to first method once data loads (if nothing was saved)
	$effect(() => {
		if (!selectedMethod && methods.length > 0) {
			selectedMethod = methods[0].id;
		}
	});
	let scores = $state<Record<AbilityId, number>>(
		wizardStore.getCharacter()?.abilityScores?.base ?? {
			str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
		}
	);
	let rolledSets = $state<{ rolls: number[]; kept: number[]; total: number }[]>([]);
	let shaking = $state(false);

	// Pool-based assignment: each ability maps to a chosen value string ("" = unassigned)
	let poolPicks = $state<Record<AbilityId, string>>(initPoolPicks());

	function initPoolPicks(): Record<AbilityId, string> {
		const p = {} as Record<AbilityId, string>;
		for (const ab of ABILITY_IDS) p[ab] = '';

		// Restore from existing data (back-nav)
		const existing = wizardStore.getCharacter()?.abilityScores;
		if (!existing || existing.method !== 'standard-array') return p;
		// Tag each picked value with an index to allow duplicate values in rolling
		const m = methods.find((m) => m.id === existing.method);
		if (m?.type === 'standard-array' && m.standardArray) {
			const pool = [...m.standardArray].sort((a, b) => b - a);
			const used = new Set<string>();
			for (const ab of ABILITY_IDS) {
				const val = existing.base[ab];
				const tag = pool.map((v, i) => `${i}:${v}`).find(
					(t) => Number(t.split(':')[1]) === val && !used.has(t)
				);
				if (tag) {
					p[ab] = tag;
					used.add(tag);
				}
			}
		}
		return p;
	}

	const currentMethod = $derived(methods.find((m) => m.id === selectedMethod));

	// Whether a method uses pool-based assignment (dropdowns)
	const isPoolMethod = $derived(
		currentMethod?.type === 'standard-array' ||
		(currentMethod?.type === 'rolling' && rolledSets.length > 0)
	);

	// Tagged pool: each entry is "index:value" to handle duplicate roll values
	const taggedPool = $derived.by(() => {
		if (currentMethod?.type === 'standard-array' && currentMethod.standardArray) {
			return [...currentMethod.standardArray].sort((a, b) => b - a).map((v, i) => `${i}:${v}`);
		}
		if (currentMethod?.type === 'rolling' && rolledSets.length > 0) {
			return rolledSets.map((r, i) => `${i}:${r.total}`);
		}
		return [] as string[];
	});

	function tagValue(tag: string): number {
		return Number(tag.split(':')[1]);
	}

	// Compute which tags are already picked by other abilities
	function availableTags(forAbility: AbilityId): string[] {
		const pickedByOthers = new Set(
			ABILITY_IDS.filter((ab) => ab !== forAbility && poolPicks[ab]).map((ab) => poolPicks[ab])
		);
		return taggedPool.filter((tag) => !pickedByOthers.has(tag));
	}

	// All picked?
	const allAssigned = $derived(
		isPoolMethod && ABILITY_IDS.every((ab) => poolPicks[ab] !== '')
	);

	// Sync scores from pool picks
	$effect(() => {
		if (!isPoolMethod) return;
		for (const ab of ABILITY_IDS) {
			scores[ab] = poolPicks[ab] ? tagValue(poolPicks[ab]) : 10;
		}
	});

	const pointBuyValid = $derived(() => {
		if (currentMethod?.type !== 'point-buy' || !currentMethod.pointBuy) return null;
		return isValidPointBuy(scores, currentMethod.pointBuy);
	});

	const isValid = $derived(() => {
		if (!currentMethod) return false;
		switch (currentMethod.type) {
			case 'point-buy': {
				const result = pointBuyValid();
				return result?.valid ?? false;
			}
			case 'standard-array':
				return allAssigned;
			case 'rolling':
				return rolledSets.length > 0 && allAssigned;
			default:
				return false;
		}
	});

	function adjustScore(ability: AbilityId, delta: number) {
		const newScore = scores[ability] + delta;
		if (currentMethod?.type === 'point-buy' && currentMethod.pointBuy) {
			const { minimum, maximum, budget, costs } = currentMethod.pointBuy;
			if (newScore < minimum || newScore > maximum) return;
			const proposed = { ...scores, [ability]: newScore };
			const newCost = pointBuyCost(proposed, costs);
			if (newCost > budget) return;
		}
		scores = { ...scores, [ability]: newScore };
	}

	function doRoll() {
		shaking = true;
		setTimeout(() => shaking = false, 400);
		rolledSets = rollAbilityScores();
		// Reset picks so user assigns each roll
		const reset = {} as Record<AbilityId, string>;
		for (const ab of ABILITY_IDS) reset[ab] = '';
		poolPicks = reset;
	}

	function resetPoolPicks() {
		const reset = {} as Record<AbilityId, string>;
		for (const ab of ABILITY_IDS) reset[ab] = '';
		poolPicks = reset;
	}

	// Look up the selected class for suggested ability scores
	const selectedClass: ClassDefinition | undefined = $derived.by(() => {
		const classId = wizardStore.getCharacter()?.classes?.[0]?.classId;
		if (!classId || !pack?.classes) return undefined;
		return (pack.classes as ClassDefinition[]).find((c: ClassDefinition) => c.id === classId);
	});

	// Whether current picks match the suggested array for the selected class
	const suggestedMatchesCurrent = $derived.by(() => {
		const suggested = selectedClass?.suggestedAbilityScores;
		if (!suggested || !isPoolMethod) return false;
		return ABILITY_IDS.every((ab) => {
			const pick = poolPicks[ab];
			return pick !== '' && tagValue(pick) === suggested[ab];
		});
	});

	let suggestedShaking = $state(false);

	function applySuggestedArray() {
		const suggested = selectedClass?.suggestedAbilityScores;
		if (!suggested || taggedPool.length === 0) return;
		const newPicks = {} as Record<AbilityId, string>;
		const usedTags = new Set<string>();
		for (const ab of ABILITY_IDS) {
			const val = suggested[ab];
			const tag = taggedPool.find((t) => tagValue(t) === val && !usedTags.has(t));
			if (tag) {
				newPicks[ab] = tag;
				usedTags.add(tag);
			} else {
				newPicks[ab] = '';
			}
		}
		poolPicks = newPicks;
		suggestedShaking = true;
		setTimeout(() => suggestedShaking = false, 400);
	}

	function proceed() {
		if (!isValid()) return;
		wizardStore.updateCharacter({
			abilityScores: {
				method: selectedMethod,
				base: { ...scores },
				originBonuses: wizardStore.getCharacter()?.abilityScores?.originBonuses ?? ([] as AbilityBonus[]),
				levelUpBonuses: [] as AbilityBonus[],
				featBonuses: [] as AbilityBonus[]
			}
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/background`);
	}
</script>

<svelte:head>
	<title>Ability Scores - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Ability Scores"
		description="Choose your method and assign your ability scores."
	/>

	<WizardNav
		backHref="/create/{systemId}/origin"
		backLabel="Back"
		nextLabel="Next: Background"
		onNext={proceed}
		nextDisabled={!isValid()}
		compact
	/>

	<!-- Method selector -->
	<div class="mt-6">
		<ToggleGroup.Root
			type="single"
			value={selectedMethod}
			onValueChange={(val) => {
				if (val) {
					selectedMethod = val;
					const m = methods.find((m) => m.id === val);
					if (m?.type === 'standard-array') resetPoolPicks();
					if (m?.type === 'point-buy' && m.pointBuy) {
						const min = m.pointBuy.minimum;
						scores = { str: min, dex: min, con: min, int: min, wis: min, cha: min };
					}
					if (m?.type === 'rolling') {
						resetPoolPicks();
					}
				}
			}}
			class="flex-wrap justify-start"
		>
			{#each methods as method}
				<ToggleGroup.Item value={method.id} class="px-4">
					{method.name}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>

		{#if currentMethod}
			<p class="mt-2 text-sm text-muted-foreground">
				{#if currentMethod.type === 'standard-array'}
					Assign a fixed set of scores to your abilities. No randomness — great for new players.
				{:else if currentMethod.type === 'point-buy'}
					Spend points to customize each score. Lower scores cost less, higher scores cost more.
				{:else if currentMethod.type === 'rolling'}
					Roll 4d6, drop the lowest die for each score. More variance, more excitement.
				{/if}
			</p>
		{/if}
	</div>

	{#if currentMethod?.type === 'standard-array' && currentMethod.standardArray}
		<Card.Root class="mt-4">
			<Card.Content class="flex flex-wrap items-center gap-3 py-3">
				<span class="text-sm">Standard Array:</span>
				{#each [...currentMethod.standardArray].sort((a, b) => b - a) as val}
					<Badge variant="outline" class="text-sm font-mono font-bold">{val}</Badge>
				{/each}
				<span class="text-sm text-muted-foreground">— assign one to each ability</span>
			</Card.Content>
		</Card.Root>
		{#if selectedClass?.suggestedAbilityScores}
			<div class="mt-3">
				<Button
					variant={suggestedMatchesCurrent ? undefined : 'default'}
					size="sm"
					onclick={applySuggestedArray}
					class="{suggestedShaking ? 'animate-shake' : ''} {suggestedMatchesCurrent ? 'bg-success text-success-foreground hover:bg-success/90 shadow-xs' : ''}"
				>
					{#if suggestedMatchesCurrent}
						<Check class="size-4" />
						{selectedClass.name} Suggested Applied
					{:else}
						<Wand2 class="size-4" />
						Use {selectedClass.name} Suggested
					{/if}
				</Button>
			</div>
		{/if}
	{/if}

	{#if currentMethod?.type === 'point-buy'}
		{@const result = pointBuyValid()}
		{#if result}
			<Card.Root class="mt-4">
				<Card.Content class="flex flex-wrap items-center gap-4 py-3">
					<span class="text-sm">
						Points spent: <strong>{result.spent}</strong> / {currentMethod.pointBuy?.budget}
					</span>
					<Progress
						value={(result.spent / (currentMethod.pointBuy?.budget ?? 27)) * 100}
						class="h-2 w-32"
					/>
					<span class="text-sm text-muted-foreground">({result.remaining} remaining)</span>
					{#if result.errors.length > 0}
						<span class="text-sm text-destructive">{result.errors[0]}</span>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}

	{#if currentMethod?.type === 'rolling'}
		<div class="mt-4 flex flex-wrap items-center gap-4">
			<Button variant="outline" onclick={doRoll} class={shaking ? 'animate-shake' : ''}>
				<Dice5 class="size-4" />
				Roll 4d6 Drop Lowest (x6)
			</Button>
			{#if rolledSets.length > 0}
				<div class="flex flex-wrap gap-2 text-sm">
					{#each rolledSets as set}
						<Badge variant="secondary" class="font-mono">
							{set.rolls.join(', ')} &rarr; <strong>{set.total}</strong>
						</Badge>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if isPoolMethod}
		<Card.Root class="mt-4">
			<Card.Content class="flex flex-wrap items-center gap-2 py-3">
				<span class="text-sm text-muted-foreground">Values:</span>
				{#each taggedPool as tag}
					{@const picked = Object.values(poolPicks).includes(tag)}
					{#if !picked}
						<Badge variant="secondary" class="text-sm font-mono font-bold">{tagValue(tag)}</Badge>
					{:else}
						<Badge variant="outline" class="text-sm font-mono font-bold line-through opacity-40">{tagValue(tag)}</Badge>
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Score assignment grid -->
	<div class="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each ABILITY_IDS as ability}
			{@const score = scores[ability]}
			{@const mod = abilityModifier(score)}
			<div class="flex items-center justify-between rounded-lg border border-border p-4">
				<div>
					<div class="text-sm font-medium">{ABILITY_NAMES[ability]}</div>
					<div class="text-xs text-muted-foreground">{ability.toUpperCase()}</div>
				</div>
				<div class="flex items-center gap-2">
					{#if currentMethod?.type === 'point-buy'}
						<Button
							variant="outline"
							size="icon-sm"
							onclick={() => adjustScore(ability, -1)}
						>
							<Minus class="size-3" />
						</Button>
						<div class="w-14 text-center">
							<div class="text-2xl font-bold">{score}</div>
							<div class="text-xs text-muted-foreground">{formatModifier(mod)}</div>
						</div>
						<Button
							variant="outline"
							size="icon-sm"
							onclick={() => adjustScore(ability, 1)}
						>
							<Plus class="size-3" />
						</Button>
					{:else if isPoolMethod}
						{@const options = availableTags(ability)}
						<div class="flex items-center gap-2">
							<select
								class="h-10 w-20 rounded-md border border-border bg-background px-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
								value={poolPicks[ability]}
								onchange={(e) => { poolPicks[ability] = e.currentTarget.value; }}
							>
								<option value="">—</option>
								{#each options as tag}
									<option value={tag}>{tagValue(tag)}</option>
								{/each}
							</select>
							{#if poolPicks[ability]}
								<div class="w-10 text-center text-xs text-muted-foreground">
									{formatModifier(mod)}
								</div>
							{/if}
						</div>
					{:else}
						<div class="w-14 text-center">
							<div class="text-2xl font-bold">{score}</div>
							<div class="text-xs text-muted-foreground">{formatModifier(mod)}</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<WizardNav
		backHref="/create/{systemId}/origin"
		backLabel="Back"
		nextLabel="Next: Background"
		onNext={proceed}
		nextDisabled={!isValid()}
	/>
</div>
