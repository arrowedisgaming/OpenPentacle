import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack, ArmorProperties, OriginOption, OriginSubOption } from '$lib/types/content-pack.js';
import type { AbilityId, Size, SkillId } from '$lib/types/common.js';
import { ABILITY_IDS, SKILL_ABILITIES } from '$lib/types/common.js';
import { allAbilityTotals, allAbilityModifiers } from './ability-scores.js';
import { proficiencyBonus } from './proficiency.js';
import { calculateMaxHP } from './hit-points.js';
import { calculateAC } from './armor-class.js';
import { calculateSpellSlots } from './spell-slots.js';

/** Fully computed character sheet with all derived values */
export interface ComputedSheet {
	name: string;
	level: number;
	classSummary: string;
	proficiencyBonus: number;
	abilityScores: Record<AbilityId, number>;
	abilityModifiers: Record<AbilityId, number>;
	savingThrows: Record<AbilityId, { modifier: number; proficient: boolean }>;
	skills: Record<SkillId, { modifier: number; proficiency: 'none' | 'proficient' | 'expertise' }>;
	maxHP: number;
	armorClass: number;
	initiative: number;
	speed: number;
	size: Size;
	darkvision: number;
	damageResistances: string[];
	passivePerception: number;
	spellSlots: Record<number, number>;
	pactSlots: { count: number; level: number } | null;
	spellSaveDC: Record<string, number>; // classId → DC
	spellAttackBonus: Record<string, number>; // classId → bonus
}

/** Compute all derived values from raw character data + content pack */
export function computeSheet(data: CharacterData, pack: ContentPack): ComputedSheet {
	const scores = allAbilityTotals(data.abilityScores);
	const modifiers = allAbilityModifiers(data.abilityScores);
	const profBonus = proficiencyBonus(data.level, pack.systemMechanics.proficiencyTable);

	// Class summary: "Fighter 5 / Wizard 3"
	const classSummary = data.classes
		.map((c) => {
			const classDef = pack.classes.find((cd) => cd.id === c.classId);
			return `${classDef?.name ?? c.classId} ${c.level}`;
		})
		.join(' / ');

	// Saving throws
	const savingThrows = {} as ComputedSheet['savingThrows'];
	for (const ability of ABILITY_IDS) {
		const proficient = data.proficiencies.some(
			(p) => p.type === 'saving-throw' && p.value === ability
		);
		savingThrows[ability] = {
			modifier: modifiers[ability] + (proficient ? profBonus : 0),
			proficient
		};
	}

	// Skills
	const skills = {} as ComputedSheet['skills'];
	const skillIds = Object.keys(SKILL_ABILITIES) as SkillId[];
	for (const skillId of skillIds) {
		const ability = SKILL_ABILITIES[skillId];
		const skillData = data.skills.find((s) => s.skillId === skillId);
		const proficiency = skillData?.proficiency ?? 'none';
		let modifier = modifiers[ability];
		if (proficiency === 'proficient') modifier += profBonus;
		if (proficiency === 'expertise') modifier += profBonus * 2;
		skills[skillId] = { modifier, proficiency };
	}

	// Resolve origin (species) option and sub-option
	const originSel = data.origins[0];
	let originOption: OriginOption | undefined;
	let originSubOption: OriginSubOption | undefined;
	if (originSel) {
		originOption = pack.origins.flatMap((l) => l.options).find((o) => o.id === originSel.optionId);
		if (originOption && originSel.subOptionId) {
			originSubOption = originOption.subOptions?.find((s) => s.id === originSel.subOptionId);
		}
	}

	// HP (with species bonus, e.g., Dwarven Toughness)
	const bonusHPPerLevel = getOriginBonusHPPerLevel(originOption, originSubOption);
	const maxHP = calculateMaxHP(data.classes, scores.con, bonusHPPerLevel);

	// AC (find equipped armor + shield)
	let equippedArmor: ArmorProperties | null = null;
	let hasShield = false;
	for (const eq of data.equipment) {
		if (!eq.equipped) continue;
		const item = pack.equipment.find((e) => e.id === eq.equipmentId);
		if (item?.armor && item.armor.category !== 'shield') {
			equippedArmor = item.armor;
		}
		if (item?.type === 'shield') {
			hasShield = true;
		}
	}
	const armorClass = calculateAC(scores.dex, equippedArmor, hasShield);

	// Speed (sub-option can override, e.g., Wood Elf → 35)
	const speed = originSubOption?.speed ?? originOption?.speed ?? 30;

	// Size (resolved from sizeChoices + OriginChoice, or from option.size)
	let size: Size = originOption?.size ?? 'Medium';
	if (originSel && originOption?.sizeChoices?.length) {
		const sizeChoice = originSel.choices.find((c) => c.choiceId === 'size');
		if (sizeChoice?.selectedValues[0]) {
			size = sizeChoice.selectedValues[0] as Size;
		}
	}

	// Darkvision (sub-option can override, e.g., Drow → 120)
	const darkvision = originSubOption?.darkvision ?? originOption?.darkvision ?? 0;

	// Damage resistances
	const damageResistances: string[] = [];
	if (originSubOption?.damageResistance) {
		damageResistances.push(originSubOption.damageResistance);
	}

	// Spell slots
	const classesWithCasting = data.classes.map((c) => {
		const classDef = pack.classes.find((cd) => cd.id === c.classId);
		return { level: c.level, spellcasting: classDef?.spellcasting };
	});
	const { slots: spellSlots, pactSlots } = calculateSpellSlots(classesWithCasting);

	// Spell save DC and attack bonus per class
	const spellSaveDC: Record<string, number> = {};
	const spellAttackBonus: Record<string, number> = {};
	for (const cls of data.classes) {
		const classDef = pack.classes.find((cd) => cd.id === cls.classId);
		const casting = classDef?.spellcasting;
		if (casting) {
			const abilityMod = modifiers[casting.ability];
			spellSaveDC[cls.classId] = 8 + profBonus + abilityMod;
			spellAttackBonus[cls.classId] = profBonus + abilityMod;
		}
	}

	return {
		name: data.name,
		level: data.level,
		classSummary,
		proficiencyBonus: profBonus,
		abilityScores: scores,
		abilityModifiers: modifiers,
		savingThrows,
		skills,
		maxHP,
		armorClass,
		initiative: modifiers.dex,
		speed,
		size,
		darkvision,
		damageResistances,
		passivePerception: 10 + skills.perception.modifier,
		spellSlots,
		pactSlots,
		spellSaveDC,
		spellAttackBonus
	};
}

/** Extract bonus HP per level from origin traits (e.g., Dwarven Toughness: hp_per_level:1) */
export function getOriginBonusHPPerLevel(
	option?: OriginOption,
	subOption?: OriginSubOption
): number {
	const allTraits = [...(option?.traits ?? []), ...(subOption?.traits ?? [])];
	for (const trait of allTraits) {
		const match = trait.mechanicalEffect?.match(/hp_per_level:(\d+)/);
		if (match) return parseInt(match[1], 10);
	}
	return 0;
}
