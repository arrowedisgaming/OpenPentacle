import type {
	AbilityId,
	ArmorCategory,
	DamageType,
	DiceNotation,
	ProficiencyLevel,
	Size,
	SkillId,
	SpellSchool,
	WeaponCategory
} from './common.js';

// ─── Content Pack Envelope ───────────────────────────────────

/** Top-level content pack manifest */
export interface ContentPack {
	id: string;
	name: string;
	version: string;
	description: string;
	system: SystemId;
	license: string;
	authors: string[];
	classes: ClassDefinition[];
	origins: OriginLayer[];
	backgrounds: BackgroundDefinition[];
	spells: SpellDefinition[];
	equipment: EquipmentDefinition[];
	feats: FeatDefinition[];
	abilityScoreMethods: AbilityScoreMethod[];
	systemMechanics: SystemMechanics;
}

/** Supported game systems */
export type SystemId = 'srd521' | 'black-flag' | 'a5e';

/** Human-readable system names */
export const SYSTEM_NAMES: Record<SystemId, string> = {
	'srd521': 'D&D 5e SRD 5.2.1',
	'black-flag': 'Black Flag Roleplaying',
	'a5e': 'Advanced 5th Edition (Level Up)'
};

// ─── Origin Layers ───────────────────────────────────────────
// This is the key abstraction that lets one component handle:
// - 5e SRD: Species (1 layer)
// - Black Flag: Lineage + Heritage (2 layers)
// - A5E: Heritage + Culture (2 layers)

/** A named origin layer containing selectable options */
export interface OriginLayer {
	id: string;
	name: string; // e.g., "Species", "Lineage", "Heritage", "Culture"
	description: string;
	order: number; // Rendering order (0, 1, 2...)
	options: OriginOption[];
}

/** A single selectable origin (e.g., "Elf", "Dwarf Lineage", "Courtier Culture") */
export interface OriginOption {
	id: string;
	name: string;
	description: string;
	size: Size;
	speed: number;
	abilityScoreChanges: OriginAbilityChange[];
	traits: Trait[];
	proficiencies: OriginProficiency[];
	languages: string[];
	subOptions?: OriginSubOption[]; // e.g., Elf → High Elf / Wood Elf
	darkvision?: number;
	/** Available size choices when the player picks (e.g., Human/Tiefling: Medium or Small) */
	sizeChoices?: Size[];
	/** Label for sub-option picker (e.g., "Draconic Ancestry", "Elven Lineage") */
	subOptionLabel?: string;
}

/** Ability score change from an origin */
export interface OriginAbilityChange {
	ability: AbilityId | 'choice'; // 'choice' means player picks
	value: number;
	choiceCount?: number; // How many abilities to pick (if ability === 'choice')
}

/** Sub-option within an origin (e.g., Elven Lineage, Draconic Ancestry) */
export interface OriginSubOption {
	id: string;
	name: string;
	description: string;
	traits: Trait[];
	abilityScoreChanges: OriginAbilityChange[];
	proficiencies: OriginProficiency[];
	spells?: OriginSpell[];
	/** Override parent speed (e.g., Wood Elf → 35) */
	speed?: number;
	/** Override parent darkvision (e.g., Drow → 120) */
	darkvision?: number;
	/** Damage resistance granted by this sub-option (e.g., Dragonborn ancestry type) */
	damageResistance?: DamageType;
}

/** A trait granted by an origin, class feature, etc. */
export interface Trait {
	id: string;
	name: string;
	description: string;
	mechanicalEffect?: string; // Machine-readable effect for engine calculations
}

/** Proficiency granted by an origin */
export interface OriginProficiency {
	type: 'skill' | 'armor' | 'weapon' | 'tool' | 'saving-throw';
	value: string; // Skill ID, armor type, weapon name, etc.
	isChoice?: boolean; // true if player picks from options
	choices?: string[]; // Available options if isChoice
	choiceCount?: number; // How many to pick
}

/** Spell granted by an origin */
export interface OriginSpell {
	spellId: string;
	level: number; // Character level at which this is gained
	spellcastingAbility: AbilityId | 'choice';
	/** Available abilities when spellcastingAbility is 'choice' (e.g., ['int','wis','cha']) */
	spellcastingAbilityChoices?: AbilityId[];
}

// ─── Classes ─────────────────────────────────────────────────

export interface ClassDefinition {
	id: string;
	name: string;
	description: string;
	hitDie: DiceNotation;
	primaryAbility: AbilityId[];
	savingThrows: AbilityId[];
	armorProficiencies: ArmorCategory[];
	weaponProficiencies: string[];
	toolProficiencies: ClassToolProficiency[];
	skillChoices: ClassSkillChoice;
	startingEquipment: StartingEquipmentOption[];
	startingGold?: DiceNotation;
	progression: ClassProgression[];
	subclasses: SubclassDefinition[];
	spellcasting?: SpellcastingConfig;
}

export interface ClassToolProficiency {
	value: string;
	isChoice?: boolean;
	choices?: string[];
	choiceCount?: number;
}

export interface ClassSkillChoice {
	choices: SkillId[];
	count: number;
}

export interface StartingEquipmentOption {
	description: string;
	items: StartingEquipmentItem[];
}

export interface StartingEquipmentItem {
	equipmentId: string;
	quantity: number;
	isChoice?: boolean;
	choices?: string[];
}

/** One row in a class progression table (level 1–20) */
export interface ClassProgression {
	level: number;
	proficiencyBonus: number;
	features: ClassFeature[];
	/** Extra columns (e.g., Rage Damage, Sneak Attack dice, Ki Points) */
	classSpecific?: Record<string, string | number>;
	cantripsKnown?: number;
	/** Number of spells known (for known-spell casters: Bard, Ranger, Sorcerer, Warlock) */
	spellsKnown?: number;
	/** Number of spells that can be prepared (for prepared casters: Wizard, Cleric, Druid, Paladin) */
	preparedSpells?: number;
	spellSlots?: number[];
}

export interface ClassFeature {
	id: string;
	name: string;
	description: string;
	level: number;
	choices?: FeatureChoice[];
}

export interface FeatureChoice {
	id: string;
	name: string;
	description: string;
	options: FeatureChoiceOption[];
	count: number; // How many to pick
}

export interface FeatureChoiceOption {
	id: string;
	name: string;
	description: string;
	effects?: Trait[];
}

export interface SubclassDefinition {
	id: string;
	name: string;
	description: string;
	features: ClassFeature[];
	spellcasting?: SpellcastingConfig;
}

export interface SpellcastingConfig {
	ability: AbilityId;
	type: 'full' | 'half' | 'third' | 'pact'; // Caster progression type
	ritual: boolean;
	spellList: string; // ID referencing which spells this class can pick from
	preparedCaster: boolean; // true = prepares from full list; false = learns spells
	cantrips: boolean;
}

// ─── Backgrounds ─────────────────────────────────────────────

export interface BackgroundDefinition {
	id: string;
	name: string;
	description: string;
	skillProficiencies: BackgroundProficiency[];
	toolProficiencies: BackgroundProficiency[];
	languages: BackgroundLanguage[];
	equipment: string[];
	startingGold?: number;
	/** 2014-style background feature (e.g., Shelter of the Faithful). Not used in 5.2.1. */
	feature?: Trait;
	/** For systems that grant feats via background (5e 2024 / SRD 5.2.1 Origin Feat) */
	feat?: string;
	/** Background ability score options — player distributes +2/+1/+1 or +1/+1/+1 across these */
	abilityScoreChanges?: OriginAbilityChange[];
}

export interface BackgroundProficiency {
	value: string;
	isChoice?: boolean;
	choices?: string[];
	choiceCount?: number;
}

export interface BackgroundLanguage {
	value: string;
	isChoice?: boolean;
	choices?: string[];
}

// ─── Spells ──────────────────────────────────────────────────

export interface SpellDefinition {
	id: string;
	name: string;
	level: number; // 0 = cantrip
	school: SpellSchool;
	castingTime: string;
	range: string;
	components: SpellComponents;
	duration: string;
	concentration: boolean;
	ritual: boolean;
	description: string;
	higherLevels?: string;
	lists: string[]; // Which spell lists include this (e.g., ["wizard", "sorcerer"])
	damageType?: DamageType;
	tags?: string[];
}

export interface SpellComponents {
	verbal: boolean;
	somatic: boolean;
	material: boolean;
	materialDescription?: string;
	materialCost?: number; // In gold pieces
	materialConsumed?: boolean;
}

// ─── Equipment ───────────────────────────────────────────────

export interface EquipmentDefinition {
	id: string;
	name: string;
	type: EquipmentType;
	description?: string;
	cost: EquipmentCost;
	weight: number;
	weapon?: WeaponProperties;
	armor?: ArmorProperties;
}

export type EquipmentType =
	| 'weapon' | 'armor' | 'shield'
	| 'adventuring-gear' | 'tool' | 'mount' | 'vehicle'
	| 'ammunition' | 'holy-symbol' | 'arcane-focus' | 'druidic-focus';

export interface EquipmentCost {
	amount: number;
	currency: 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
}

export interface WeaponProperties {
	category: WeaponCategory;
	damage: DiceNotation;
	damageType: DamageType;
	properties: WeaponProperty[];
	range?: { normal: number; long: number };
}

export type WeaponProperty =
	| 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading'
	| 'reach' | 'special' | 'thrown' | 'two-handed' | 'versatile';

export interface ArmorProperties {
	category: ArmorCategory;
	baseAC: number;
	maxDexBonus?: number; // undefined = no limit (light armor)
	stealthDisadvantage: boolean;
	strengthRequirement?: number;
}

// ─── Feats ───────────────────────────────────────────────────

export interface FeatDefinition {
	id: string;
	name: string;
	description: string;
	category: FeatCategory;
	prerequisites?: FeatPrerequisite[];
	effects: Trait[];
	abilityScoreIncrease?: FeatAbilityIncrease;
	repeatable?: boolean;
	choices?: FeatChoiceDefinition[];
}

export type FeatCategory = 'general' | 'origin' | 'fighting-style' | 'epic';

export interface FeatPrerequisite {
	type: 'ability' | 'proficiency' | 'level' | 'spellcasting' | 'class' | 'feature';
	value: string;
	minimum?: number;
}

export interface FeatAbilityIncrease {
	abilities: AbilityId[];
	count: number; // How many to choose
	value: number; // Increase amount
	max?: number; // Default: 20. Epic Boons use 30.
}

export interface FeatChoiceDefinition {
	id: string;
	type: 'spell-list' | 'cantrip' | 'spell' | 'skill-or-tool';
	label: string;
	count?: number;
	dependsOn?: string;
	options?: string[];
}

// ─── Ability Score Methods ───────────────────────────────────

export interface AbilityScoreMethod {
	id: string;
	name: string;
	description: string;
	type: 'point-buy' | 'standard-array' | 'rolling';
	pointBuy?: PointBuyConfig;
	standardArray?: number[];
	rolling?: RollingConfig;
}

export interface PointBuyConfig {
	budget: number; // 27 for 5e, 32 for BF
	minimum: number; // Usually 8
	maximum: number; // Usually 15
	costs: Record<number, number>; // score → point cost
}

export interface RollingConfig {
	dice: DiceNotation;
	count: number; // Roll this many times
	keepHighest: number; // Keep this many dice per roll
}

// ─── System Mechanics ────────────────────────────────────────

export interface SystemMechanics {
	proficiencyTable: ProficiencyTableEntry[];
	xpTable: XpTableEntry[];
	/** Black Flag: Luck pool */
	luck?: LuckConfig;
	/** A5E: Exertion pool */
	exertion?: ExertionConfig;
	/** A5E: Destiny system */
	destiny?: DestinyConfig;
	/** Maximum character level */
	maxLevel: number;
}

export interface ProficiencyTableEntry {
	level: number;
	bonus: number;
}

export interface XpTableEntry {
	level: number;
	xpRequired: number;
}

export interface LuckConfig {
	description: string;
	poolSize: number; // Usually = proficiency bonus
}

export interface ExertionConfig {
	description: string;
	poolFormula: string; // e.g., "2 * proficiency_bonus"
}

export interface DestinyConfig {
	description: string;
	options: DestinyOption[];
}

export interface DestinyOption {
	id: string;
	name: string;
	description: string;
	sourceOfInspiration: string;
	inspirationFeature: Trait;
	fulfillmentFeature: Trait;
}
