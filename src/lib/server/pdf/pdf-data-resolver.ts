/**
 * Resolves display data from CharacterData + ContentPack + ComputedSheet
 * into a flat structure suitable for PDF rendering.
 *
 * This is a pure-function port of the $derived logic in CharacterSheetView.svelte.
 */
import type { CharacterData, CurrencyData, FlavorData } from '$lib/types/character.js';
import type {
	ContentPack,
	ClassFeature,
	SpellDefinition,
	EquipmentCost
} from '$lib/types/content-pack.js';
import type { ComputedSheet } from '$lib/engine/character-sheet.js';
import type { AbilityId, SkillId } from '$lib/types/common.js';
import { ABILITY_NAMES, SKILL_ABILITIES } from '$lib/types/common.js';
import { getClassFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from '$lib/engine/class-progression.js';
import { findFeatDef, FEAT_CATEGORY_LABELS } from '$lib/engine/feats.js';
import { formatModifier, kebabToTitle } from '$lib/utils/format.js';

// ─── Resolved Types ─────────────────────────────────────────

export interface ResolvedWeapon {
	name: string;
	attackBonus: number;
	damage: string;
	damageBonus: number;
	damageType: string;
	properties: string[];
	range?: { normal: number; long: number };
	equipped: boolean;
}

export interface ResolvedArmor {
	name: string;
	equipped: boolean;
	category: string;
	baseAC: number;
}

export interface ResolvedItem {
	name: string;
	quantity: number;
	equipped: boolean;
}

export interface ResolvedFeat {
	name: string;
	source: string;
	description: string;
	category?: string;
	effects: { description: string }[];
	choices: { label: string; value: string }[];
}

export interface ResolvedSpell {
	spell: SpellDefinition;
	source: 'class' | 'feat' | 'origin';
	prepared: boolean;
}

export interface ResolvedSheetData {
	sheet: ComputedSheet;
	originName: string;
	backgroundName: string;
	className: string;
	subclassName: string | null;
	weapons: ResolvedWeapon[];
	armorItems: ResolvedArmor[];
	otherEquipment: ResolvedItem[];
	classFeatures: ClassFeature[];
	feats: ResolvedFeat[];
	speciesTraits: { name: string; description: string }[];
	spellGroups: Map<number, ResolvedSpell[]>;
	spellcastingAbility: string | null;
	proficiencyGroups: Record<string, string[]>;
	hitDiceSummary: string;
	flavor: FlavorData;
	currency: CurrencyData;
	featureChoiceLabels: Map<string, string[]>;
	asiChoiceLabels: Map<string, string | null>;
	featureDisplayNames: Map<string, string>;
	featureDescriptions: Map<string, string>;
}

/** Resolve all display data from raw character + content pack + computed sheet */
export function resolveSheetData(
	data: CharacterData,
	pack: ContentPack,
	sheet: ComputedSheet,
	additionalSpells: SpellDefinition[] = []
): ResolvedSheetData {
	// Origin/Species name
	const originSel = data.origins[0];
	const originOption = originSel
		? pack.origins.flatMap((l) => l.options).find((o) => o.id === originSel.optionId)
		: null;
	const originSubOption = originOption && originSel?.subOptionId
		? originOption.subOptions?.find((s) => s.id === originSel.subOptionId) ?? null
		: null;
	const originName = originSubOption?.name ?? originOption?.name ?? 'Unknown';

	// Background name
	const bgDef = data.background
		? pack.backgrounds.find((b) => b.id === data.background!.backgroundId)
		: null;
	const backgroundName = bgDef?.name ?? 'Unknown';

	// Class/Subclass
	const classDef = pack.classes.find((c) => c.id === data.classes[0]?.classId) ?? null;
	const className = classDef?.name ?? 'Unknown';
	const subclassDef = classDef && data.classes[0]?.subclassId
		? classDef.subclasses.find((s) => s.id === data.classes[0].subclassId) ?? null
		: null;
	const subclassName = subclassDef?.name ?? null;

	// Features
	const classFeatures = classDef ? getClassFeaturesUpToLevel(classDef, data.level) : [];
	const subclassFeatures = subclassDef ? getSubclassFeaturesUpToLevel(subclassDef, data.level) : [];
	const allFeatures = [...classFeatures, ...subclassFeatures].sort((a, b) => a.level - b.level);

	// Feature display names & descriptions (resolve subclass placeholders)
	const featureDisplayNames = new Map<string, string>();
	const featureDescriptions = new Map<string, string>();
	for (const f of allFeatures) {
		let displayName = f.name;
		let description = f.description;
		if (subclassDef && f.name.endsWith('Subclass') && f.description?.includes('subclass')) {
			displayName = `${f.name}: ${subclassDef.name}`;
			description = subclassDef.description;
		}
		featureDisplayNames.set(`${f.id}-${f.level}`, displayName);
		featureDescriptions.set(`${f.id}-${f.level}`, description);
	}

	// Feature choice labels
	const featureChoiceLabels = new Map<string, string[]>();
	const asiChoiceLabels = new Map<string, string | null>();
	for (const feature of allFeatures) {
		const key = `${feature.id}-${feature.level}`;
		// Regular feature choices
		const labels: string[] = [];
		if (feature.choices) {
			const selections = data.classes[0]?.featureChoices ?? [];
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
		}
		featureChoiceLabels.set(key, labels);

		// ASI / Epic Boon choices
		if (feature.name === 'Ability Score Improvement' || feature.name === 'Epic Boon') {
			const classId = data.classes[0]?.classId;
			const sourcePrefix = `class:${classId}:${feature.level}`;
			const feat = data.feats.find((f) => f.source === sourcePrefix);
			if (feat) {
				const def = findFeatDef(pack.feats ?? [], feat.featId);
				asiChoiceLabels.set(key, def ? `Feat: ${def.name}` : null);
			} else {
				const bonuses = data.abilityScores.levelUpBonuses.filter((b) => b.source === sourcePrefix);
				if (bonuses.length > 0) {
					const parts = bonuses.map((b) =>
						`+${b.value} ${ABILITY_NAMES[b.ability as AbilityId]?.slice(0, 3).toUpperCase() ?? b.ability}`
					);
					asiChoiceLabels.set(key, `ASI: ${parts.join(', ')}`);
				} else {
					asiChoiceLabels.set(key, null);
				}
			}
		}
	}

	// Weapons
	const weapons = resolveWeapons(data, pack, sheet);

	// Armor
	const armorItems = resolveArmor(data, pack);

	// Other equipment
	const otherEquipment = resolveOtherEquipment(data, pack);

	// Feats
	const feats = resolveFeats(data, pack);

	// Species traits
	const speciesTraits: { name: string; description: string }[] = [];
	if (originOption) {
		for (const trait of originOption.traits) {
			speciesTraits.push({ name: trait.name, description: trait.description });
		}
	}
	if (originSubOption) {
		for (const trait of originSubOption.traits) {
			speciesTraits.push({ name: trait.name, description: trait.description });
		}
	}

	// Proficiency groups
	const proficiencyGroups: Record<string, string[]> = {};
	for (const p of data.proficiencies) {
		if (p.type === 'saving-throw') continue;
		const label = p.type === 'armor' ? 'Armor' : p.type === 'weapon' ? 'Weapons' : p.type === 'tool' ? 'Tools' : 'Languages';
		if (!proficiencyGroups[label]) proficiencyGroups[label] = [];
		proficiencyGroups[label].push(kebabToTitle(p.value));
	}

	// Spell groups
	const spellGroups = resolveSpellGroups(data, pack, additionalSpells);

	// Spellcasting ability
	const spellcastingAbility = classDef?.spellcasting
		? ABILITY_NAMES[classDef.spellcasting.ability] ?? null
		: null;

	// Hit dice summary — hd.die is like "1d10", replace leading "1" with actual total
	const hitDiceSummary = data.hitPoints.hitDice
		.map((hd) => {
			const dieSize = hd.die.replace(/^\d+/, '');
			return `${hd.total}${dieSize}`;
		})
		.join(' + ') || (classDef ? `${data.level}${classDef.hitDie.replace(/^\d+/, '')}` : '');

	return {
		sheet,
		originName,
		backgroundName,
		className,
		subclassName,
		weapons,
		armorItems,
		otherEquipment,
		classFeatures: allFeatures,
		feats,
		speciesTraits,
		spellGroups,
		spellcastingAbility,
		proficiencyGroups,
		hitDiceSummary,
		flavor: data.flavor,
		currency: data.currency,
		featureChoiceLabels,
		asiChoiceLabels,
		featureDisplayNames,
		featureDescriptions
	};
}

// ─── Helper functions ───────────────────────────────────────

function resolveWeapons(data: CharacterData, pack: ContentPack, sheet: ComputedSheet): ResolvedWeapon[] {
	const weapons: ResolvedWeapon[] = [];
	for (const eq of data.equipment) {
		const def = pack.equipment.find((e) => e.id === eq.equipmentId);
		if (!def?.weapon) continue;
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
		weapons.push({
			name: def.name,
			attackBonus: sheet.proficiencyBonus + abilityMod,
			damage: w.damage,
			damageBonus: abilityMod,
			damageType: w.damageType,
			properties: w.properties,
			range: w.range,
			equipped: eq.equipped
		});
	}
	return weapons;
}

function resolveArmor(data: CharacterData, pack: ContentPack): ResolvedArmor[] {
	const items: ResolvedArmor[] = [];
	for (const eq of data.equipment) {
		const def = pack.equipment.find((e) => e.id === eq.equipmentId);
		if (!def?.armor) continue;
		items.push({
			name: def.name,
			equipped: eq.equipped,
			category: def.armor.category,
			baseAC: def.armor.baseAC
		});
	}
	return items;
}

function resolveOtherEquipment(data: CharacterData, pack: ContentPack): ResolvedItem[] {
	return data.equipment
		.filter((eq) => {
			const def = pack.equipment.find((e) => e.id === eq.equipmentId);
			return !def?.weapon && !def?.armor;
		})
		.map((eq) => {
			const def = pack.equipment.find((e) => e.id === eq.equipmentId);
			return {
				name: def?.name ?? kebabToTitle(eq.equipmentId),
				quantity: eq.quantity,
				equipped: eq.equipped
			};
		});
}

function resolveFeats(data: CharacterData, pack: ContentPack): ResolvedFeat[] {
	return data.feats.map((sel) => {
		const def = findFeatDef(pack.feats ?? [], sel.featId);
		return {
			name: def?.name ?? kebabToTitle(sel.featId),
			source: formatFeatSource(sel.source),
			description: def?.description ?? '',
			category: def?.category ? FEAT_CATEGORY_LABELS[def.category] : undefined,
			effects: def?.effects ?? [],
			choices: sel.choices.map((c) => ({
				label: kebabToTitle(c.choiceId),
				value: kebabToTitle(c.selectedValue.replace(/^(skill:|tool:)/, ''))
			}))
		};
	});
}

function formatFeatSource(source: string): string {
	if (source === 'background') return 'Background';
	if (source === 'bonus') return 'Bonus';
	const classMatch = source.match(/^class:([^:]+):(\d+)$/);
	if (classMatch) return `Lv ${classMatch[2]}`;
	return kebabToTitle(source);
}

function resolveSpellGroups(
	data: CharacterData,
	pack: ContentPack,
	additionalSpells: SpellDefinition[]
): Map<number, ResolvedSpell[]> {
	const groups = new Map<number, ResolvedSpell[]>();
	const seenIds = new Set<string>();
	const preparedSet = new Set(data.spells.preparedSpellIds);

	// Class spells
	for (const known of data.spells.knownSpells) {
		const spell = pack.spells.find((s) => s.id === known.spellId)
			?? additionalSpells.find((s) => s.id === known.spellId);
		if (!spell) continue;
		seenIds.add(spell.id);
		const list = groups.get(spell.level) ?? [];
		list.push({ spell, source: 'class', prepared: preparedSet.has(spell.id) || known.alwaysPrepared === true });
		groups.set(spell.level, list);
	}

	// Feat spells (Magic Initiate)
	const featSpellIds = new Set<string>();
	for (const feat of data.feats) {
		if (feat.featId !== 'magic-initiate' && !feat.featId.startsWith('magic-initiate-')) continue;
		for (const choice of feat.choices) {
			if (choice.choiceId.startsWith('cantrip-') || choice.choiceId.startsWith('spell-')) {
				featSpellIds.add(choice.selectedValue);
			}
		}
	}
	for (const spellId of featSpellIds) {
		if (seenIds.has(spellId)) continue;
		const spell = pack.spells.find((s) => s.id === spellId)
			?? additionalSpells.find((s) => s.id === spellId);
		if (!spell) continue;
		seenIds.add(spell.id);
		const list = groups.get(spell.level) ?? [];
		list.push({ spell, source: 'feat', prepared: true });
		groups.set(spell.level, list);
	}

	// Origin/species spells
	const originSel = data.origins[0];
	if (originSel) {
		const originOption = pack.origins.flatMap((l) => l.options).find((o) => o.id === originSel.optionId);
		const subOption = originSel.subOptionId
			? originOption?.subOptions?.find((s) => s.id === originSel.subOptionId)
			: null;
		if (subOption?.spells) {
			for (const os of subOption.spells) {
				if (data.level >= os.level && !seenIds.has(os.spellId)) {
					const spell = pack.spells.find((s) => s.id === os.spellId)
						?? additionalSpells.find((s) => s.id === os.spellId);
					if (spell) {
						seenIds.add(spell.id);
						const list = groups.get(spell.level) ?? [];
						list.push({ spell, source: 'origin', prepared: true });
						groups.set(spell.level, list);
					}
				}
			}
		}
	}

	return new Map([...groups.entries()].sort(([a], [b]) => a - b));
}
