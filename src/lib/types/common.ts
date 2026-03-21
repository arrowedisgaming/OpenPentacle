/** Ability score identifiers used across all supported systems */
export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

/** All six ability scores in canonical order */
export const ABILITY_IDS: readonly AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

/** Human-readable names for abilities */
export const ABILITY_NAMES: Record<AbilityId, string> = {
	str: 'Strength',
	dex: 'Dexterity',
	con: 'Constitution',
	int: 'Intelligence',
	wis: 'Wisdom',
	cha: 'Charisma'
};

/** Proficiency levels (shared across all systems) */
export type ProficiencyLevel = 'none' | 'proficient' | 'expertise';

/** Armor categories */
export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield';

/** Weapon categories */
export type WeaponCategory = 'simple' | 'martial';

/** Damage types common across all systems */
export type DamageType =
	| 'bludgeoning' | 'piercing' | 'slashing'
	| 'acid' | 'cold' | 'fire' | 'force' | 'lightning'
	| 'necrotic' | 'poison' | 'psychic' | 'radiant' | 'thunder';

/** Spell schools */
export type SpellSchool =
	| 'abjuration' | 'conjuration' | 'divination' | 'enchantment'
	| 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

/** Dice notation (e.g., "1d8", "2d6") */
export type DiceNotation = string;

/** Currency denominations */
export type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

/** A tracked bonus that records where it came from (for audit trail) */
export interface SourcedBonus {
	value: number;
	source: string;
	sourceType: 'origin' | 'class' | 'background' | 'feat' | 'equipment' | 'level-up' | 'system';
}

/** Skill identifiers (5e standard, also used by BF and A5E) */
export type SkillId =
	| 'acrobatics' | 'animal-handling' | 'arcana' | 'athletics'
	| 'deception' | 'history' | 'insight' | 'intimidation'
	| 'investigation' | 'medicine' | 'nature' | 'perception'
	| 'performance' | 'persuasion' | 'religion' | 'sleight-of-hand'
	| 'stealth' | 'survival';

/** Map of skill to its governing ability */
export const SKILL_ABILITIES: Record<SkillId, AbilityId> = {
	'acrobatics': 'dex',
	'animal-handling': 'wis',
	'arcana': 'int',
	'athletics': 'str',
	'deception': 'cha',
	'history': 'int',
	'insight': 'wis',
	'intimidation': 'cha',
	'investigation': 'int',
	'medicine': 'wis',
	'nature': 'int',
	'perception': 'wis',
	'performance': 'cha',
	'persuasion': 'cha',
	'religion': 'int',
	'sleight-of-hand': 'dex',
	'stealth': 'dex',
	'survival': 'wis'
};

/** Size categories */
export type Size = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
