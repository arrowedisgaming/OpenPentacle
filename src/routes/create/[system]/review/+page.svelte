<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { SpellDefinition, FeatDefinition } from '$lib/types/content-pack.js';
	import type { FeatChoiceSelection } from '$lib/types/character.js';
	import { ABILITY_NAMES, SKILL_ABILITIES, type AbilityId, type SkillId } from '$lib/types/common.js';
	import { abilityModifier, allAbilityModifiers, formatModifier, totalAbilityScore } from '$lib/engine/ability-scores.js';
	import { SKILL_EXAMPLES } from '$lib/engine/skills.js';
	import { calculateMaxHP } from '$lib/engine/hit-points.js';
	import { getOriginBonusHPPerLevel } from '$lib/engine/character-sheet.js';
	import type { OriginOption, OriginSubOption } from '$lib/types/content-pack.js';
	import { proficiencyBonus } from '$lib/engine/proficiency.js';
	import { getClassFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from '$lib/engine/class-progression.js';
	import { kebabToTitle } from '$lib/utils/format.js';
	import { findFeatDef as findFeatDefEngine } from '$lib/engine/feats.js';
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
	const originSubOption = $derived.by(() => {
		const opt = originOption();
		const subId = character?.origins[0]?.subOptionId;
		if (!opt || !subId) return null;
		return opt.subOptions?.find((s) => s.id === subId) ?? null;
	});
	const backgroundDef = $derived(
		character?.background ? pack.backgrounds.find((b) => b.id === character.background!.backgroundId) : null
	);

	const computedHP = $derived(() => {
		if (!character?.classes || !character.abilityScores) return 0;
		const conTotal = totalAbilityScore(character.abilityScores, 'con');
		const opt = originOption();
		const sub = originSubOption;
		const bonusHPPerLevel = getOriginBonusHPPerLevel(
			opt ?? undefined,
			sub ?? undefined
		);
		return calculateMaxHP(character.classes, conTotal, bonusHPPerLevel);
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

	// ASI level-up bonuses (human-readable)
	const asiBonuses = $derived(() => {
		if (!character) return [];
		return character.abilityScores.levelUpBonuses.map((bonus) => {
			const parts = bonus.source.split(':');
			const level = parts[2] ?? '';
			return `+${bonus.value} ${ABILITY_NAMES[bonus.ability]}${level ? ` (Level ${level})` : ''}`;
		});
	});

	// Feat selections with resolved definitions
	function findFeatDef(featId: string): FeatDefinition | undefined {
		return findFeatDefEngine(pack.feats ?? [], featId);
	}

	const featSelections = $derived(() => {
		if (!character) return [];
		return character.feats.map((feat) => {
			const def = findFeatDef(feat.featId);
			let sourceLabel = feat.source;
			if (feat.source === 'background') {
				sourceLabel = 'Background';
			} else if (feat.source.startsWith('class:')) {
				const parts = feat.source.split(':');
				sourceLabel = `${kebabToTitle(parts[1])} Lv${parts[2]}`;
			}
			return { feat, def, sourceLabel };
		});
	});

	function formatFeatChoice(choice: FeatChoiceSelection, featDef: FeatDefinition | undefined): string {
		const choiceDef = featDef?.choices?.find((c) => c.id === choice.choiceId);
		const label = choiceDef?.label ?? kebabToTitle(choice.choiceId);
		let value = choice.selectedValue;

		if (value.startsWith('skill:') || value.startsWith('tool:')) {
			value = kebabToTitle(value.replace(/^(skill:|tool:)/, ''));
		} else if (choiceDef?.type === 'cantrip' || choiceDef?.type === 'spell') {
			const spell = mergedSpells.find((s) => s.id === value);
			value = spell?.name ?? kebabToTitle(value);
		} else if (choice.choiceId === 'spellcasting-ability') {
			value = ABILITY_NAMES[value as AbilityId] ?? kebabToTitle(value);
		} else {
			value = kebabToTitle(value);
		}

		return `${label}: ${value}`;
	}

	const abilityMods = $derived(
		character?.abilityScores?.method ? allAbilityModifiers(character.abilityScores) : null
	);

	function skillBonus(skillId: SkillId): string {
		if (!abilityMods) return '';
		const ability = SKILL_ABILITIES[skillId];
		const mod = abilityMods[ability];
		return formatModifier(mod + profBonus);
	}

	const spellsByLevel = $derived.by(() => {
		if (!character) return [];
		const groups = new Map<number, { known: { spellId: string; source: string }; spell: SpellDefinition }[]>();
		const seenIds = new Set<string>();

		// Class spells
		for (const known of character.spells?.knownSpells ?? []) {
			const spell = mergedSpells.find((s) => s.id === known.spellId);
			if (!spell) continue;
			seenIds.add(spell.id);
			if (!groups.has(spell.level)) groups.set(spell.level, []);
			groups.get(spell.level)!.push({ known, spell });
		}

		// Feat spells (e.g., Magic Initiate cantrips + spell)
		for (const feat of character.feats ?? []) {
			if (feat.featId !== 'magic-initiate' && !feat.featId.startsWith('magic-initiate-')) continue;
			for (const choice of feat.choices) {
				if (!choice.choiceId.startsWith('cantrip-') && !choice.choiceId.startsWith('spell-')) continue;
				if (seenIds.has(choice.selectedValue)) continue;
				const spell = mergedSpells.find((s) => s.id === choice.selectedValue);
				if (!spell) continue;
				seenIds.add(spell.id);
				if (!groups.has(spell.level)) groups.set(spell.level, []);
				groups.get(spell.level)!.push({ known: { spellId: spell.id, source: 'feat' }, spell });
			}
		}

		return [...groups.entries()].sort((a, b) => a[0] - b[0]);
	});

	function spellLevelLabel(level: number): string {
		if (level === 0) return 'Cantrips';
		const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
		return `${level}${suffix}-Level Spells`;
	}

	function spellComponents(spell: SpellDefinition): string {
		const parts: string[] = [];
		if (spell.components.verbal) parts.push('V');
		if (spell.components.somatic) parts.push('S');
		if (spell.components.material) {
			parts.push(spell.components.materialDescription ? `M (${spell.components.materialDescription})` : 'M');
		}
		return parts.join(', ');
	}

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
				const errBody = await res.json().catch(() => null);
				const detail = errBody?.message ? `: ${errBody.message}` : '';
				error = `Failed to save character${detail}`;
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
									&middot; {originOption()?.name}{#if originSubOption} ({originSubOption?.name}){/if}
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
			{#if asiBonuses().length > 0 || featSelections().length > 0}
				<div>
					<h3 class="text-lg font-semibold">ASI & Feats</h3>
					{#if asiBonuses().length > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							{#each asiBonuses() as bonus}
								<Badge variant="secondary" class="text-xs">{bonus}</Badge>
							{/each}
						</div>
					{/if}
					{#if featSelections().length > 0}
						<div class="mt-2 space-y-1">
							{#each featSelections() as { feat, def, sourceLabel }}
								<Collapsible.Root>
									<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
										<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
										<span class="text-sm font-medium">{kebabToTitle(feat.featId)}</span>
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">{sourceLabel}</Badge>
									</Collapsible.Trigger>
									<Collapsible.Content>
										{#if def}
											<div class="mt-1 ml-5.5 mb-2 space-y-2">
												{#if def.description}
													<p class="text-xs text-muted-foreground">{def.description}</p>
												{/if}
												{#if def.effects && def.effects.length > 0}
													<ul class="space-y-1.5">
														{#each def.effects as effect}
															<li class="text-xs">
																<span class="font-medium">{effect.name}.</span>
																<span class="text-muted-foreground"> {effect.description}</span>
															</li>
														{/each}
													</ul>
												{/if}
												{#if feat.choices.length > 0}
													<div class="flex flex-wrap gap-1">
														{#each feat.choices as choice}
															<Badge variant="secondary" class="text-[10px]">{formatFeatChoice(choice, def)}</Badge>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Background -->
			{#if backgroundDef}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Background: {backgroundDef.name}</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/background" aria-label="Edit background"><Pencil class="size-3.5" /></Button>
					</div>

					{#if backgroundDef.description}
						<Collapsible.Root>
							<Collapsible.Trigger class="mt-1 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
								<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
								<span class="text-xs text-muted-foreground">Description</span>
							</Collapsible.Trigger>
							<Collapsible.Content>
								<p class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground whitespace-pre-line">{backgroundDef.description}</p>
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}

					<div class="mt-2 flex flex-wrap gap-2">
						{#each (character.abilityScores.originBonuses ?? []).filter(b => b.source.startsWith('background')) as bonus}
							{#if bonus.value !== 0}
								<Badge variant="secondary" class="text-xs">+{bonus.value} {ABILITY_NAMES[bonus.ability]}</Badge>
							{/if}
						{/each}

						{#if backgroundDef.feat}
							{@const featDef = findFeatDefEngine(pack.feats ?? [], backgroundDef.feat)}
							<Badge variant="outline" class="text-xs">Feat: {featDef?.name ?? kebabToTitle(backgroundDef.feat)}</Badge>
						{/if}
					</div>

					<div class="mt-2 flex flex-wrap gap-1">
						{#each backgroundDef.skillProficiencies as prof}
							<Badge variant="outline" class="text-[10px]">Skill: {kebabToTitle(prof.value)}</Badge>
						{/each}
						{#each backgroundDef.toolProficiencies as prof}
							<Badge variant="outline" class="text-[10px]">Tool: {kebabToTitle(prof.value)}</Badge>
						{/each}
					</div>

					{#if backgroundDef.startingGold}
						<p class="mt-1 text-xs text-muted-foreground">Starting Gold: {backgroundDef.startingGold} gp</p>
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
					<div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each character.skills as skill}
							{@const ability = SKILL_ABILITIES[skill.skillId]}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-center gap-2">
									<span class="font-medium text-sm">{kebabToTitle(skill.skillId)}</span>
									<span class="text-xs text-muted-foreground">({ability.toUpperCase()})</span>
									<span class="font-mono text-sm font-bold text-primary">{skillBonus(skill.skillId)}</span>
								</div>
								<p class="mt-0.5 text-xs text-muted-foreground">{SKILL_EXAMPLES[skill.skillId] ?? ''}</p>
								<Badge variant={skill.source.startsWith('background') ? 'outline' : 'secondary'} class="mt-1 text-[10px]">{skill.source.split(':')[0]}</Badge>
							</div>
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
					<div class="mt-2 space-y-1">
						{#each character.equipment as eq}
							{@const item = pack.equipment.find((e) => e.id === eq.equipmentId)}
							{#if item}
								<Collapsible.Root>
									<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
										<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
										<span class="text-sm font-medium">{item.name}</span>
										{#if eq.quantity > 1}
											<Badge variant="secondary" class="text-[10px] px-1.5 py-0">x{eq.quantity}</Badge>
										{/if}
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">{kebabToTitle(item.type)}</Badge>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<div class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground space-y-1">
											{#if item.weapon}
												<p>Damage: {item.weapon.damage} {item.weapon.damageType} &middot; {kebabToTitle(item.weapon.category)}</p>
												{#if item.weapon.properties.length > 0}
													<div class="flex flex-wrap gap-1">
														{#each item.weapon.properties as prop}
															<Badge variant="outline" class="text-[10px] px-1 py-0">{kebabToTitle(prop)}</Badge>
														{/each}
													</div>
												{/if}
												{#if item.weapon.range}
													<p>Range: {item.weapon.range.normal}/{item.weapon.range.long} ft</p>
												{/if}
											{:else if item.armor}
												<p>AC: {item.armor.baseAC}{item.armor.maxDexBonus !== undefined ? ` + DEX (max ${item.armor.maxDexBonus})` : item.armor.category !== 'shield' ? ' + DEX' : ''}</p>
												{#if item.armor.stealthDisadvantage}
													<p>Stealth: Disadvantage</p>
												{/if}
												{#if item.armor.strengthRequirement}
													<p>Requires: STR {item.armor.strengthRequirement}</p>
												{/if}
											{/if}
											{#if item.description}
												<p>{item.description}</p>
											{/if}
											<p>{item.cost.amount} {item.cost.currency} &middot; {item.weight} lb</p>
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							{:else}
								<div class="flex items-center gap-2 px-1 py-1">
									<span class="ml-5.5 text-sm">{eq.equipmentId}</span>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Spells -->
			{#if spellsByLevel.length > 0}
				<div>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Spells</h3>
						<Button variant="ghost" size="icon-sm" href="/create/{systemId}/spells" aria-label="Edit spells"><Pencil class="size-3.5" /></Button>
					</div>
					{#each spellsByLevel as [level, spells]}
						<h4 class="mt-3 text-sm font-medium">{spellLevelLabel(level)}</h4>
						<div class="mt-1 space-y-1">
							{#each spells as { spell }}
								<Collapsible.Root>
									<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
										<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
										<span class="text-sm font-medium">{spell.name}</span>
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">{level === 0 ? 'Cantrip' : `Lv${level}`}</Badge>
										<Badge variant="outline" class="text-[10px] px-1.5 py-0">{kebabToTitle(spell.school)}</Badge>
										{#if spell.concentration}
											<Badge variant="secondary" class="text-[10px] px-1.5 py-0">C</Badge>
										{/if}
										{#if spell.ritual}
											<Badge variant="secondary" class="text-[10px] px-1.5 py-0">R</Badge>
										{/if}
									</Collapsible.Trigger>
									<Collapsible.Content>
										<div class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground space-y-1">
											<p>
												<span class="font-medium">Casting Time:</span> {spell.castingTime} &middot;
												<span class="font-medium">Range:</span> {spell.range} &middot;
												<span class="font-medium">Duration:</span> {spell.duration}
											</p>
											<p><span class="font-medium">Components:</span> {spellComponents(spell)}</p>
											<p class="whitespace-pre-line">{spell.description}</p>
											{#if spell.higherLevels}
												<p><span class="font-medium">At Higher Levels:</span> {spell.higherLevels}</p>
											{/if}
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						</div>
					{/each}
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
