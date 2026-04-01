<script lang="ts">
	import { ABILITY_NAMES, SKILL_ABILITIES, type AbilityId, type SkillId } from '$lib/types/common.js';
	import { formatModifier, kebabToTitle } from '$lib/utils/format.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import { getClassFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from '$lib/engine/class-progression.js';
	import { FEAT_CATEGORY_LABELS, findFeatDef } from '$lib/engine/feats.js';
	import type { ComputedSheet } from '$lib/engine/character-sheet.js';
	import type { CharacterData } from '$lib/types/character.js';
	import type { ContentPack, ClassFeature } from '$lib/types/content-pack.js';
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import StatBlock from './StatBlock.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Shield, Heart, Zap, Footprints, CircleDot, Circle, Diamond, ChevronDown, Swords } from 'lucide-svelte';

	type Props = {
		sheet: ComputedSheet;
		data?: CharacterData;
		pack?: ContentPack;
		additionalSpells?: import('$lib/types/content-pack.js').SpellDefinition[];
	};

	let { sheet, data, pack, additionalSpells = [] }: Props = $props();

	// Resolve class/subclass definitions when data + pack available
	const classDef = $derived(
		data && pack ? pack.classes.find((c) => c.id === data.classes[0]?.classId) : null
	);
	const isPreparedCaster = $derived(classDef?.spellcasting?.preparedCaster ?? false);
	const isSpellbookCaster = $derived(classDef?.id === 'wizard');
	const preparedSpellIdSet = $derived(new Set(data?.spells.preparedSpellIds ?? []));
	const subclassDef = $derived.by(() => {
		const subId = data?.classes[0]?.subclassId;
		if (!subId || !classDef) return null;
		return classDef.subclasses.find((s) => s.id === subId) ?? null;
	});

	// Class features
	const classFeatures = $derived(
		classDef && data ? getClassFeaturesUpToLevel(classDef, data.level) : []
	);
	const subclassFeatures = $derived(
		subclassDef && data ? getSubclassFeaturesUpToLevel(subclassDef, data.level) : []
	);
	const allFeatures = $derived(
		[...classFeatures, ...subclassFeatures].sort((a, b) => a.level - b.level)
	);

	// Bug 2: Resolved feats list (includes unresolved legacy feats)
	const featsList = $derived.by(() => {
		if (!data || !pack) return null;
		if (data.feats.length === 0) return null;
		return data.feats.map((sel) => {
			const def = findFeatDef(pack.feats ?? [], sel.featId) ?? null;
			return { sel, def };
		});
	});

	// Bug 7: Get selected choice labels for a feature
	function getFeatureChoiceLabels(feature: ClassFeature): string[] {
		if (!data || !feature.choices) return [];
		const selections = data.classes[0]?.featureChoices ?? [];
		const labels: string[] = [];
		for (const choice of feature.choices) {
			const sel = selections.find((s) => s.featureId === feature.id && s.choiceId === choice.id);
			if (sel && sel.selectedOptionIds.length > 0) {
				const names = sel.selectedOptionIds
					.map((oid) => choice.options.find((o) => o.id === oid)?.name)
					.filter(Boolean);
				if (names.length > 0) {
					labels.push(`${choice.name}: ${names.join(', ')}`);
				}
			}
		}
		return labels;
	}

	// Bug 2: Format feat source for display
	function formatFeatSource(source: string): string {
		if (source === 'background') return 'Background';
		if (source === 'bonus') return 'Bonus';
		const classMatch = source.match(/^class:([^:]+):(\d+)$/);
		if (classMatch) return `Lv ${classMatch[2]}`;
		return kebabToTitle(source);
	}

	// Bug 3: Get what was chosen for an ASI/Epic Boon feature
	function getASIChoiceLabel(feature: ClassFeature): string | null {
		if (!data || !pack) return null;
		const classId = data.classes[0]?.classId;
		if (!classId) return null;
		const sourcePrefix = `class:${classId}:${feature.level}`;

		// Check if a feat was taken at this level
		const feat = data.feats.find((f) => f.source === sourcePrefix);
		if (feat) {
			const def = findFeatDef(pack.feats ?? [], feat.featId);
			return def ? `Feat: ${def.name}` : null;
		}

		// Check for ASI bonuses at this level
		const bonuses = data.abilityScores.levelUpBonuses.filter((b) => b.source === sourcePrefix);
		if (bonuses.length > 0) {
			const parts = bonuses.map((b) => `+${b.value} ${ABILITY_NAMES[b.ability]?.slice(0, 3).toUpperCase() ?? b.ability}`);
			return `ASI: ${parts.join(', ')}`;
		}

		return null;
	}

	// Get display name for subclass features (e.g., "Wizard Subclass: Evoker")
	function getFeatureDisplayName(feature: ClassFeature): string {
		if (!data || !subclassDef) return feature.name;
		if (feature.name.endsWith('Subclass') && feature.description?.includes('subclass')) {
			return `${feature.name}: ${subclassDef.name}`;
		}
		return feature.name;
	}

	// Replace generic subclass placeholder text with actual subclass description
	function getFeatureDescription(feature: ClassFeature): string {
		if (!data || !subclassDef) return feature.description;
		if (feature.name.endsWith('Subclass') && feature.description?.includes('subclass')) {
			return subclassDef.description;
		}
		return feature.description;
	}

	// Weapons with computed attack/damage + details for expanded view
	const weaponsList = $derived.by(() => {
		if (!data || !pack) return null;
		const weapons = data.equipment
			.map((eq) => {
				const def = pack.equipment.find((e) => e.id === eq.equipmentId);
				if (!def?.weapon) return null;
				const w = def.weapon;
				const isFinesse = w.properties.includes('finesse');
				const isRanged = w.range != null && !w.properties.includes('thrown');
				const strMod = sheet.abilityModifiers.str;
				const dexMod = sheet.abilityModifiers.dex;
				let abilityMod: number;
				if (isFinesse) {
					abilityMod = Math.max(strMod, dexMod);
				} else if (isRanged) {
					abilityMod = dexMod;
				} else {
					abilityMod = strMod;
				}
				const attackBonus = sheet.proficiencyBonus + abilityMod;
				const damageBonus = abilityMod;
				return {
					name: def.name,
					attackBonus,
					damage: w.damage,
					damageBonus,
					damageType: w.damageType,
					properties: w.properties,
					range: w.range,
					equipped: eq.equipped,
					category: w.category,
					cost: def.cost,
					weight: def.weight
				};
			})
			.filter((w): w is NonNullable<typeof w> => w !== null);
		return weapons.length > 0 ? weapons : null;
	});

	// Armor items (including shields) with full properties
	const armorItems = $derived.by(() => {
		if (!data || !pack) return null;
		const items = data.equipment
			.map((eq) => {
				const def = pack.equipment.find((e) => e.id === eq.equipmentId);
				if (!def?.armor) return null;
				return {
					name: def.name,
					quantity: eq.quantity,
					equipped: eq.equipped,
					armor: def.armor,
					cost: def.cost,
					weight: def.weight
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);
		return items.length > 0 ? items : null;
	});

	// Non-weapon, non-armor equipment
	const otherEquipment = $derived.by(() => {
		if (!data || !pack) return null;
		const items = data.equipment
			.filter((eq) => {
				const def = pack.equipment.find((e) => e.id === eq.equipmentId);
				return !def?.weapon && !def?.armor;
			})
			.map((eq) => {
				const def = pack.equipment.find((e) => e.id === eq.equipmentId);
				return {
					name: def?.name ?? kebabToTitle(eq.equipmentId),
					quantity: eq.quantity,
					equipped: eq.equipped,
					cost: def?.cost,
					weight: def?.weight,
					description: def?.description
				};
			});
		return items.length > 0 ? items : null;
	});

	// Proficiency categories
	const proficiencyGroups = $derived.by(() => {
		if (!data) return null;
		const groups: Record<string, string[]> = {};
		for (const p of data.proficiencies) {
			if (p.type === 'saving-throw') continue; // shown separately
			const label = p.type === 'armor' ? 'Armor' : p.type === 'weapon' ? 'Weapons' : p.type === 'tool' ? 'Tools' : 'Languages';
			if (!groups[label]) groups[label] = [];
			const title = kebabToTitle(p.value);
			if (!groups[label].includes(title)) groups[label].push(title);
		}
		return Object.keys(groups).length > 0 ? groups : null;
	});

	// Collect feat spell IDs (e.g., Magic Initiate cantrips + spell)
	const featSpellIds = $derived.by(() => {
		if (!data) return new Set<string>();
		const ids = new Set<string>();
		for (const feat of data.feats) {
			if (feat.featId !== 'magic-initiate' && !feat.featId.startsWith('magic-initiate-')) continue;
			for (const choice of feat.choices) {
				if (choice.choiceId.startsWith('cantrip-') || choice.choiceId.startsWith('spell-')) {
					ids.add(choice.selectedValue);
				}
			}
		}
		return ids;
	});

	// Collect origin/species spell IDs (level-gated by character level)
	const originSpellIds = $derived.by(() => {
		if (!data || !pack) return new Set<string>();
		const ids = new Set<string>();
		const originSel = data.origins[0];
		if (!originSel) return ids;
		const originOption = pack.origins.flatMap((l) => l.options).find((o) => o.id === originSel.optionId);
		if (!originOption) return ids;
		const subOption = originSel.subOptionId
			? originOption.subOptions?.find((s) => s.id === originSel.subOptionId)
			: null;
		// Sub-option spells (e.g., Drow, High Elf, Tiefling lineage)
		if (subOption?.spells) {
			for (const os of subOption.spells) {
				if (data.level >= os.level) {
					ids.add(os.spellId);
				}
			}
		}
		return ids;
	});

	// Known spells grouped by level (keep full definition for expandable details)
	// Includes class spells, feat spells (Magic Initiate), and origin/species spells
	const spellGroups = $derived.by(() => {
		if (!data || !pack) return null;
		const groups = new Map<number, { spell: SpellDefinition; source: 'class' | 'feat' | 'origin' }[]>();
		const seenIds = new Set<string>();

		// Class spells
		for (const known of data.spells.knownSpells) {
			const spell = pack.spells.find((s) => s.id === known.spellId)
				?? additionalSpells.find((s) => s.id === known.spellId);
			if (!spell) continue;
			seenIds.add(spell.id);
			const list = groups.get(spell.level) ?? [];
			list.push({ spell, source: 'class' });
			groups.set(spell.level, list);
		}

		// Feat spells (avoid duplicates)
		for (const spellId of featSpellIds) {
			if (seenIds.has(spellId)) continue;
			const spell = pack.spells.find((s) => s.id === spellId)
				?? additionalSpells.find((s) => s.id === spellId);
			if (!spell) continue;
			seenIds.add(spell.id);
			const list = groups.get(spell.level) ?? [];
			list.push({ spell, source: 'feat' });
			groups.set(spell.level, list);
		}

		// Origin/species spells (avoid duplicates)
		for (const spellId of originSpellIds) {
			if (seenIds.has(spellId)) continue;
			const spell = pack.spells.find((s) => s.id === spellId)
				?? additionalSpells.find((s) => s.id === spellId);
			if (!spell) continue;
			seenIds.add(spell.id);
			const list = groups.get(spell.level) ?? [];
			list.push({ spell, source: 'origin' });
			groups.set(spell.level, list);
		}

		return groups.size > 0 ? new Map([...groups.entries()].sort(([a], [b]) => a - b)) : null;
	});
</script>

<!-- Header -->
<Card.Root class="py-3 gap-2">
	<Card.Content class="px-4 pt-3">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-3xl font-bold">{sheet.name}</h1>
				<p class="text-lg text-muted-foreground">{sheet.classSummary}</p>
			</div>
			<div class="text-right">
				<div class="text-sm text-muted-foreground">Level</div>
				<div class="text-3xl font-bold">{sheet.level}</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>

<!-- Core stats -->
<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<StatBlock label="Armor Class" value={sheet.armorClass} icon={Shield} />
	<StatBlock label="Hit Points" value={sheet.maxHP} icon={Heart} />
	<StatBlock label="Initiative" value={formatModifier(sheet.initiative)} icon={Zap} />
	<StatBlock label="Speed" value="{sheet.speed} ft" icon={Footprints} />
</div>

<!-- Ability Scores - distinctive boxes -->
<div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
	{#each (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityId[]) as ability}
		<div class="flex flex-col items-center rounded-lg border border-border p-2 text-center">
			<span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ability}</span>
			<span class="text-2xl font-bold">{formatModifier(sheet.abilityModifiers[ability])}</span>
			<span class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">{sheet.abilityScores[ability]}</span>
		</div>
	{/each}
</div>

<!-- Proficiency Bonus & Passive Perception badges (full width) -->
<div class="mt-3 flex flex-wrap gap-3">
	<Badge variant="secondary">
		Proficiency Bonus: <strong class="ml-1">{formatModifier(sheet.proficiencyBonus)}</strong>
	</Badge>
	<Badge variant="secondary">
		Passive Perception: <strong class="ml-1">{sheet.passivePerception}</strong>
	</Badge>
</div>

<!-- Masonry-style two-column layout (CSS columns auto-balance height) -->
<div class="mt-3 sm:columns-2 gap-3">
	<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
		<Card.Header class="px-4 pb-1">
			<Card.Title class="text-sm">Saving Throws</Card.Title>
		</Card.Header>
		<Card.Content class="px-4">
			{#each (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityId[]) as ability}
				{@const save = sheet.savingThrows[ability]}
				<div class="flex items-center justify-between py-0.5 text-sm">
					<span class="flex items-center gap-1.5 {save.proficient ? 'font-medium' : 'text-muted-foreground'}">
						{#if save.proficient}
							<CircleDot class="size-3" />
						{:else}
							<Circle class="size-3" />
						{/if}
						{ABILITY_NAMES[ability]}
					</span>
					<span>{formatModifier(save.modifier)}</span>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
		<Card.Header class="px-4 pb-1">
			<Card.Title class="text-sm">Skills</Card.Title>
		</Card.Header>
		<Card.Content class="px-4">
			{#each (Object.keys(SKILL_ABILITIES) as SkillId[]) as skillId}
				{@const skill = sheet.skills[skillId]}
				<div class="flex items-center justify-between py-0.5 text-sm">
					<span class="flex items-center gap-1.5 {skill.proficiency !== 'none' ? 'font-medium' : 'text-muted-foreground'}">
						{#if skill.proficiency === 'expertise'}
							<Diamond class="size-3" />
						{:else if skill.proficiency === 'proficient'}
							<CircleDot class="size-3" />
						{:else}
							<Circle class="size-3" />
						{/if}
						{kebabToTitle(skillId)}
					</span>
					<span>{formatModifier(skill.modifier)}</span>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	<!-- Class Features -->
	{#if allFeatures.length > 0}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">Features & Traits</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-1">
				{#each allFeatures as feature}
					{#if feature.description}
						<Collapsible.Root>
							<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
								<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
								<span class="text-sm font-medium">{getFeatureDisplayName(feature)}</span>
								<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
							</Collapsible.Trigger>
							<Collapsible.Content>
								{#if feature.name === 'Ability Score Improvement' || feature.name === 'Epic Boon'}
									{@const choiceLabel = getASIChoiceLabel(feature)}
									{#if choiceLabel}
										<p class="mt-1 ml-5.5 text-xs font-medium text-primary">{choiceLabel}</p>
									{/if}
								{/if}
								{#each getFeatureChoiceLabels(feature) as label}
									<p class="mt-1 ml-5.5 text-xs font-medium text-primary">{label}</p>
								{/each}
								<p class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground whitespace-pre-line">{getFeatureDescription(feature)}</p>
							</Collapsible.Content>
						</Collapsible.Root>
					{:else}
						<div class="flex items-center gap-2 px-1 py-1">
							<span class="ml-5.5 text-sm font-medium">{getFeatureDisplayName(feature)}</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
						</div>
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Proficiencies -->
	{#if proficiencyGroups}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">Proficiencies</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-2">
				{#each Object.entries(proficiencyGroups) as [label, items]}
					<div>
						<span class="text-xs font-medium text-muted-foreground">{label}</span>
						<p class="text-sm">{items.join(', ')}</p>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Feats -->
	{#if featsList}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">Feats</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-1">
				{#each featsList as { sel, def: featDef }}
					{#if featDef}
						<Collapsible.Root>
							<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
								<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
								<span class="text-sm font-medium">{featDef.name}</span>
								<Badge variant="outline" class="text-[10px] px-1.5 py-0">{formatFeatSource(sel.source)}</Badge>
								{#if featDef.category && FEAT_CATEGORY_LABELS[featDef.category]}
									<Badge variant="outline" class="text-[10px] px-1.5 py-0 text-muted-foreground">{FEAT_CATEGORY_LABELS[featDef.category]}</Badge>
								{/if}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="mt-1 mb-2 ml-5.5 text-xs text-muted-foreground space-y-1">
									<p class="whitespace-pre-line">{featDef.description}</p>
									{#if featDef.effects.length > 0}
										<ul class="list-disc pl-4">
											{#each featDef.effects as effect}
												<li>{effect.description}</li>
											{/each}
										</ul>
									{/if}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
						{#if sel.choices && sel.choices.length > 0}
							<div class="mb-1 ml-5.5 text-xs text-muted-foreground">
								{#each sel.choices as choice}
									<span class="mr-2">{kebabToTitle(choice.choiceId)}: {kebabToTitle(choice.selectedValue.replace(/^(skill:|tool:)/, ''))}</span>
								{/each}
							</div>
						{/if}
					{:else}
						<div class="flex items-center gap-2 px-1.5 py-1">
							<span class="ml-5.5 text-sm font-medium">{kebabToTitle(sel.featId)}</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0">{formatFeatSource(sel.source)}</Badge>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400">Legacy</Badge>
						</div>
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Weapons -->
	{#if weaponsList}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="flex items-center gap-1.5 text-sm"><Swords class="size-3.5" /> Weapons</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-1">
				{#each weaponsList as weapon}
					<Collapsible.Root>
						<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md border border-border p-2 text-left hover:bg-muted/50 transition-colors {weapon.equipped ? '' : 'opacity-60'}">
							<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">{weapon.name}</span>
									<span class="text-sm font-mono">{formatModifier(weapon.attackBonus)} to hit</span>
								</div>
								<div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
									<span>{weapon.damage}{weapon.damageBonus !== 0 ? ` ${formatModifier(weapon.damageBonus)}` : ''} {weapon.damageType}</span>
									{#if weapon.range}
										<span>{weapon.range.normal}/{weapon.range.long} ft</span>
									{/if}
									{#if weapon.properties.length > 0}
										<span>{weapon.properties.map(kebabToTitle).join(', ')}</span>
									{/if}
								</div>
							</div>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="ml-5.5 mb-2 mt-1 text-xs text-muted-foreground space-y-0.5">
								<p><span class="font-medium text-foreground/70">Category:</span> {kebabToTitle(weapon.category)} Weapon</p>
								{#if weapon.cost}
									<p><span class="font-medium text-foreground/70">Cost:</span> {weapon.cost.amount} {weapon.cost.currency}</p>
								{/if}
								{#if weapon.weight}
									<p><span class="font-medium text-foreground/70">Weight:</span> {weapon.weight} lb.</p>
								{/if}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Armor -->
	{#if armorItems}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="flex items-center gap-1.5 text-sm"><Shield class="size-3.5" /> Armor</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-1">
				{#each armorItems as item}
					<Collapsible.Root>
						<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors {item.equipped ? '' : 'opacity-60'}">
							<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
							<span class="text-sm font-medium">{item.name}</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0">
								{#if item.armor.category === 'shield'}
									+{item.armor.baseAC} AC
								{:else if item.armor.maxDexBonus === 0}
									AC {item.armor.baseAC}
								{:else if item.armor.maxDexBonus !== undefined}
									AC {item.armor.baseAC} + DEX (max {item.armor.maxDexBonus})
								{:else}
									AC {item.armor.baseAC} + DEX
								{/if}
							</Badge>
							{#if item.armor.stealthDisadvantage}
								<Badge variant="outline" class="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400">Stealth Disadv.</Badge>
							{/if}
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="ml-5.5 mb-2 mt-1 text-xs text-muted-foreground space-y-0.5">
								<p><span class="font-medium text-foreground/70">Category:</span> {kebabToTitle(item.armor.category)}{item.armor.category !== 'shield' ? ' Armor' : ''}</p>
								{#if item.armor.strengthRequirement}
									<p><span class="font-medium text-foreground/70">Strength Required:</span> {item.armor.strengthRequirement}</p>
								{/if}
								<p><span class="font-medium text-foreground/70">Cost:</span> {item.cost.amount} {item.cost.currency}</p>
								{#if item.weight}
									<p><span class="font-medium text-foreground/70">Weight:</span> {item.weight} lb.</p>
								{/if}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Other Equipment -->
	{#if otherEquipment}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">Equipment</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-0.5">
				{#each otherEquipment as item}
					{#if item.cost || item.weight || item.description}
						<Collapsible.Root>
							<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
								<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
								<span class="text-sm {item.equipped ? '' : 'text-muted-foreground'}">{item.name}</span>
								{#if item.quantity > 1}
									<span class="text-xs text-muted-foreground">x{item.quantity}</span>
								{/if}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="ml-5.5 mb-2 mt-1 text-xs text-muted-foreground space-y-0.5">
									{#if item.description}
										<p>{item.description}</p>
									{/if}
									{#if item.cost && item.cost.amount > 0}
										<p><span class="font-medium text-foreground/70">Cost:</span> {item.cost.amount} {item.cost.currency}</p>
									{/if}
									{#if item.weight}
										<p><span class="font-medium text-foreground/70">Weight:</span> {item.weight} lb.</p>
									{/if}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{:else}
						<div class="flex items-center gap-1.5 px-1.5 py-1">
							<span class="ml-5.5 text-sm {item.equipped ? '' : 'text-muted-foreground'}">{item.name}</span>
							{#if item.quantity > 1}
								<span class="text-xs text-muted-foreground">x{item.quantity}</span>
							{/if}
						</div>
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

	<!-- Spell Slots (if any) -->
	{#if Object.keys(sheet.spellSlots).length > 0}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">Spell Slots</Card.Title>
			</Card.Header>
			<Card.Content class="px-4">
				<div class="flex flex-wrap gap-3">
					{#each Object.entries(sheet.spellSlots) as [level, count]}
						<StatBlock label="Level {level}" value={count} size="sm" />
					{/each}
				</div>
				{#each Object.entries(sheet.spellSaveDC) as [classId, dc]}
					<div class="mt-2 text-sm text-muted-foreground">
						Spell Save DC: {dc} &middot; Spell Attack: {formatModifier(sheet.spellAttackBonus[classId])}
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Spells -->
	{#if spellGroups}
		<Card.Root class="py-3 gap-2 mb-3 break-inside-avoid">
			<Card.Header class="px-4 pb-1">
				<Card.Title class="text-sm">{isSpellbookCaster ? 'Spellbook' : isPreparedCaster ? 'Prepared Spells' : 'Spells Known'}</Card.Title>
			</Card.Header>
			<Card.Content class="px-4 space-y-3">
				{#each [...spellGroups.entries()] as [level, spells]}
					<div>
						<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							{level === 0 ? 'Cantrips' : formatSpellLevel(level) + ' Level'}
						</h4>
						<div class="mt-1 space-y-0.5">
							{#each spells as { spell, source }}
								<Collapsible.Root>
									<Collapsible.Trigger class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors">
										<ChevronDown class="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 [[data-state=open]>&]:rotate-180" />
										<span class="text-sm font-medium">{spell.name}</span>
										{#if isSpellbookCaster && spell.level > 0 && preparedSpellIdSet.has(spell.id)}
											<Badge variant="default" class="text-[10px] px-1.5 py-0">Prepared</Badge>
										{/if}
										{#if source === 'feat'}
											<Badge variant="outline" class="text-[10px] px-1.5 py-0">Magic Initiate</Badge>
										{:else if source === 'origin'}
											<Badge variant="outline" class="text-[10px] px-1.5 py-0">Species</Badge>
										{/if}
										{#if spell.concentration}
											<span class="text-xs text-muted-foreground" title="Requires concentration">C</span>
										{/if}
										{#if spell.ritual}
											<span class="text-xs text-muted-foreground" title="Can be cast as a ritual">R</span>
										{/if}
									</Collapsible.Trigger>
									<Collapsible.Content>
										<div class="ml-5.5 mb-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs space-y-1.5">
											<div class="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
												<span><strong>Casting Time:</strong> {spell.castingTime}</span>
												<span><strong>Range:</strong> {spell.range}</span>
												<span><strong>Duration:</strong> {spell.duration}</span>
												<span><strong>Components:</strong> {[spell.components.verbal && 'V', spell.components.somatic && 'S', spell.components.material && (spell.components.materialDescription ? `M (${spell.components.materialDescription})` : 'M')].filter(Boolean).join(', ')}</span>
											</div>
											<Separator />
											<p class="whitespace-pre-line max-h-48 overflow-y-auto">{spell.description}</p>
											{#if spell.higherLevels}
												<p class="text-muted-foreground"><strong>At Higher Levels:</strong> {spell.higherLevels}</p>
											{/if}
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
