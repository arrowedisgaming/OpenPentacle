<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import { ABILITY_NAMES, type AbilityId } from '$lib/types/common.js';
	import { abilityModifier, formatModifier, totalAbilityScore } from '$lib/engine/ability-scores.js';
	import { calculateMaxHP } from '$lib/engine/hit-points.js';
	import { proficiencyBonus } from '$lib/engine/proficiency.js';
	import { getClassFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from '$lib/engine/class-progression.js';
	import { kebabToTitle } from '$lib/utils/format.js';
	import type { ContentPack } from '$lib/types/content-pack.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import StatBlock from '$lib/components/sheet/StatBlock.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Heart, Shield, Sparkles, Pencil, ChevronDown } from 'lucide-svelte';

	const wizNav = getContext<any>('wizard-nav');
	const { pack, systemId } = $derived($page.data as { pack: ContentPack; systemId: string });
	const character = $derived(wizardStore.getCharacter());

	let saving = $state(false);
	let error = $state('');

	// Merge Open5E spells for name resolution
	let open5eSpells = $state<SpellDefinition[]>([]);
	const mergedSpells: SpellDefinition[] = $derived.by(() => {
		const base: SpellDefinition[] = pack?.spells ?? [];
		if (open5eSpells.length === 0) return base;
		const baseNames = new Set(base.map((s) => s.name.toLowerCase()));
		return [...base, ...open5eSpells.filter((s: SpellDefinition) => !baseNames.has(s.name.toLowerCase()))];
	});

	onMount(async () => {
		const sources = wizardStore.getCharacter()?.open5eSources;
		if (!sources?.length) return;
		try {
			const res = await fetch(`/api/open5e/spells?sources=${sources.join(',')}`);
			if (res.ok) open5eSpells = await res.json();
		} catch { /* graceful degradation */ }
	});

	// Computed values for the review
	const classDef = $derived(
		character?.classes[0] ? pack.classes.find((c) => c.id === character.classes[0].classId) : null
	);
	const subclassDef = $derived(() => {
		const subId = character?.classes[0]?.subclassId;
		if (!subId || !classDef) return null;
		return classDef.subclasses.find((s) => s.id === subId) ?? null;
	});
	const originOption = $derived(() => {
		if (!character?.origins[0]) return null;
		for (const layer of pack.origins) {
			const opt = layer.options.find((o) => o.id === character.origins[0].optionId);
			if (opt) return opt;
		}
		return null;
	});
	const backgroundDef = $derived(
		character?.background ? pack.backgrounds.find((b) => b.id === character.background!.backgroundId) : null
	);

	const computedHP = $derived(() => {
		if (!character?.classes || !character.abilityScores) return 0;
		const conTotal = totalAbilityScore(character.abilityScores, 'con');
		return calculateMaxHP(character.classes, conTotal);
	});

	const profBonus = $derived(proficiencyBonus(character?.level ?? 1));

	// Class features up to character level
	const classFeatures = $derived(() => {
		if (!classDef || !character) return [];
		return getClassFeaturesUpToLevel(classDef, character.level);
	});

	// Subclass features up to character level
	const subclassFeatures = $derived(() => {
		const sub = subclassDef();
		if (!sub || !character) return [];
		return getSubclassFeaturesUpToLevel(sub, character.level);
	});

	// ASI/Feat summary
	const asiSummary = $derived(() => {
		if (!character) return [];
		const items: string[] = [];
		for (const bonus of character.abilityScores.levelUpBonuses) {
			items.push(`+${bonus.value} ${ABILITY_NAMES[bonus.ability]} (${bonus.source})`);
		}
		for (const feat of character.feats) {
			const def = pack.feats.find((f) => f.id === feat.featId);
			items.push(`${def?.name ?? feat.featId} (${feat.source})`);
		}
		return items;
	});

	async function saveCharacter() {
		if (!character) return;
		saving = true;
		error = '';

		// Finalize HP
		const maxHP = computedHP();
		const finalCharacter = {
			...character,
			contentPackIds: [pack.id],
			hitPoints: {
				maximum: maxHP,
				current: maxHP,
				temporary: 0,
				hitDice: character.classes.map((c) => ({
					die: c.hitDie,
					total: c.level,
					used: 0
				}))
			}
		};

		try {
			const res = await fetch('/api/characters', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(finalCharacter)
			});
			if (res.ok) {
				const { id } = await res.json();
				wizardStore.reset();
				goto(`/sheet/${id}`);
			} else if (res.status === 401) {
				// Not logged in - save to local storage and redirect
				localStorage.setItem('unsaved-character', JSON.stringify(finalCharacter));
				wizardStore.reset();
				goto('/characters?saved=local');
			} else {
				error = 'Failed to save character. Please try again.';
			}
		} catch {
			error = 'Network error. Character data saved locally.';
			localStorage.setItem('unsaved-character', JSON.stringify(character));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Review Character - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Review Your Character"
		description="Check everything looks right before saving."
	/>

	<WizardNav
		backHref="/create/{systemId}/{wizNav.getPrevStepPath('review')}"
		backLabel="Back"
		nextLabel={saving ? 'Saving...' : 'Save Character'}
		onNext={saveCharacter}
		nextDisabled={saving}
		{saving}
		compact
	/>

	{#if character}
		<div class="mt-6 space-y-6">
			<!-- Summary Card -->
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="text-2xl font-bold">{character.name || 'Unnamed Character'}</h3>
							<p class="text-muted-foreground">
								Level {character.level}
								{classDef?.name ?? ''}
								{#if subclassDef()}
									({subclassDef()!.name})
								{/if}
								{#if originOption()}
									&middot; {originOption()?.name}
								{/if}
							</p>
						</div>
						<div class="flex gap-3">
							<StatBlock label="HP" value={computedHP()} size="sm" icon={Heart} />
							<StatBlock label="Prof." value={formatModifier(profBonus)} size="sm" icon={Sparkles} />
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Ability Scores -->
			<div>
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold">Ability Scores</h3>
					<Button variant="ghost" size="icon-sm" href="/create/{systemId}/abilities" aria-label="Edit ability scores"><Pencil class="size-3.5" /></Button>
				</div>
				<div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
					{#each (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityId[]) as ability}
						{@const total = totalAbilityScore(character.abilityScores, ability)}
						{@const mod = abilityModifier(total)}
						<StatBlock
							label={ABILITY_NAMES[ability]}
							value={total}
							subValue={formatModifier(mod)}
							size="sm"
						/>
					{/each}
				</div>
			</div>

			<Separator />

			<!-- Class Info + Features -->
			{#if classDef}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">
							{classDef.name}
							{#if subclassDef()}
								— {subclassDef()!.name}
							{/if}
						</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/class" aria-label="Edit class"><Pencil class="size-3.5" /></Button>
					</div>
					<div class="mt-2 text-sm text-muted-foreground">
						<p>Hit Die: {classDef.hitDie}</p>
						<p>Saving Throws: {classDef.savingThrows.map(s => s.toUpperCase()).join(', ')}</p>
					</div>

					{#if classFeatures().length > 0}
						<h4 class="mt-3 text-sm font-medium">Class Features</h4>
						<div class="mt-1 space-y-1">
							{#each classFeatures() as feature}
								{#if feature.description}
									<Collapsible.Root>
										<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
											<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
											<span class="text-sm font-medium">{feature.name}</span>
											<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
										</Collapsible.Trigger>
										<Collapsible.Content>
											<p class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground whitespace-pre-line">{feature.description}</p>
										</Collapsible.Content>
									</Collapsible.Root>
								{:else}
									<div class="flex items-center gap-2 px-1 py-1">
										<span class="ml-5.5 text-sm font-medium">{feature.name}</span>
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					{#if subclassFeatures().length > 0}
						<h4 class="mt-3 text-sm font-medium">{subclassDef()!.name} Features</h4>
						<div class="mt-1 space-y-1">
							{#each subclassFeatures() as feature}
								{#if feature.description}
									<Collapsible.Root>
										<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
											<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
											<span class="text-sm font-medium">{feature.name}</span>
											<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
										</Collapsible.Trigger>
										<Collapsible.Content>
											<p class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground whitespace-pre-line">{feature.description}</p>
										</Collapsible.Content>
									</Collapsible.Root>
								{:else}
									<div class="flex items-center gap-2 px-1 py-1">
										<span class="ml-5.5 text-sm font-medium">{feature.name}</span>
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- ASI / Feat Summary -->
			{#if asiSummary().length > 0}
				<div>
					<h3 class="text-lg font-semibold">ASI & Feats</h3>
					<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
						{#each asiSummary() as item}
							<li>{item}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Background -->
			{#if backgroundDef}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Background: {backgroundDef.name}</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/background" aria-label="Edit background"><Pencil class="size-3.5" /></Button>
					</div>
					{#if backgroundDef.feature}
						<p class="mt-1 text-sm text-muted-foreground">{backgroundDef.feature.name}</p>
					{/if}
				</div>
			{/if}

			<!-- Skill Proficiencies -->
			{#if character.skills.length > 0}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Skill Proficiencies</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/skills" aria-label="Edit skills"><Pencil class="size-3.5" /></Button>
					</div>
					<div class="mt-2 flex flex-wrap gap-1">
						{#each character.skills as skill}
							<Badge variant={skill.source.startsWith('background') ? 'outline' : 'secondary'} class="text-xs">
								{kebabToTitle(skill.skillId)}
								<span class="ml-1 opacity-60">({skill.source.split(':')[0]})</span>
							</Badge>
						{/each}
					</div>
				</div>
			{/if}

			<Separator />

			<!-- Equipment -->
			{#if character.equipment.length > 0}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Equipment</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/equipment" aria-label="Edit equipment"><Pencil class="size-3.5" /></Button>
					</div>
					<ul class="mt-2 text-sm text-muted-foreground">
						{#each character.equipment as eq}
							{@const item = pack.equipment.find((e) => e.id === eq.equipmentId)}
							<li>{item?.name ?? eq.equipmentId} {eq.quantity > 1 ? `(x${eq.quantity})` : ''}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Spells -->
			{#if character.spells.knownSpells.length > 0}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Spells</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/spells" aria-label="Edit spells"><Pencil class="size-3.5" /></Button>
					</div>
					<ul class="mt-2 text-sm text-muted-foreground">
						{#each character.spells.knownSpells as known}
							{@const spell = mergedSpells.find((s) => s.id === known.spellId)}
							<li>{spell?.name ?? known.spellId}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Flavor -->
			{#if character.flavor.backstory}
				<Separator />
				<div>
					<h3 class="text-lg font-semibold">Backstory</h3>
					<p class="mt-1 whitespace-pre-line text-sm text-muted-foreground">{character.flavor.backstory}</p>
				</div>
			{/if}
		</div>

		{#if error}
			<Alert.Root variant="destructive" class="mt-4">
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		{/if}

		{@const prevPath = wizNav.getPrevStepPath('review')}
		<WizardNav
			backHref="/create/{systemId}/{prevPath}"
			backLabel="Back"
			nextLabel={saving ? 'Saving...' : 'Save Character'}
			onNext={saveCharacter}
			nextDisabled={saving}
			{saving}
		/>
	{:else}
		<div class="mt-8">
			<Alert.Root>
				<Alert.Description>
					No character data found. Please start from the beginning.
				</Alert.Description>
			</Alert.Root>
			<Button variant="link" href="/create/{systemId}/class" class="mt-4">
				Start over
			</Button>
		</div>
	{/if}
</div>
