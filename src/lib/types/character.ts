import type { AbilityId, DiceNotation, ProficiencyLevel, SkillId, SourcedBonus } from './common.js';
import type { SystemId } from './content-pack.js';

/** A sourced bonus tied to a specific ability score */
export interface AbilityBonus extends SourcedBonus {
	ability: AbilityId;
}

/** Complete character data, stored as JSON blob in the database */
export interface CharacterData {
	/** Schema version for data migration (added in v1) */
	schemaVersion?: number;

	/** System this character was created for */
	systemId: SystemId;

	/** Content pack IDs used (base + any homebrew) */
	contentPackIds: string[];

	/** Open5E spell source document keys enabled for this character */
	open5eSources?: string[];

	/** Basic info */
	name: string;
	level: number;
	xp: number;

	/** Origin selections (ordered layers) */
	origins: OriginSelection[];

	/** Class selections (supports multiclass) */
	classes: ClassSelection[];

	/** Ability scores with full audit trail */
	abilityScores: AbilityScoreData;

	/** Skills with proficiency tracking */
	skills: SkillSelection[];

	/** All proficiencies (armor, weapons, tools, languages) */
	proficiencies: ProficiencySelection[];

	/** Spell configuration */
	spells: SpellData;

	/** Equipment inventory */
	equipment: EquipmentSelection[];

	/** Feats/Talents taken */
	feats: FeatSelection[];

	/** Background selection */
	background: BackgroundSelection | null;

	/** System-specific data (Luck, Exertion, Destiny, etc.) */
	systemData: SystemSpecificData;

	/** Hit points */
	hitPoints: HitPointData;

	/** Currency */
	currency: CurrencyData;

	/** Flavor/roleplaying details */
	flavor: FlavorData;
}

// ─── Origin ──────────────────────────────────────────────────

export interface OriginSelection {
	layerId: string;
	optionId: string;
	subOptionId?: string;
	/** Choices made within this origin (e.g., which ability to increase) */
	choices: OriginChoice[];
}

export interface OriginChoice {
	choiceId: string;
	selectedValues: string[];
}

// ─── Class ───────────────────────────────────────────────────

export interface ClassSelection {
	classId: string;
	subclassId?: string;
	level: number;
	hitDie: DiceNotation;
	/** Feature choices made (e.g., Fighting Style, Eldritch Invocations) */
	featureChoices: FeatureChoiceSelection[];
}

export interface FeatureChoiceSelection {
	featureId: string;
	choiceId: string;
	selectedOptionIds: string[];
}

// ─── Ability Scores ──────────────────────────────────────────

export interface AbilityScoreData {
	method: string; // ID of the ability score method used
	/** Base scores from the chosen method (before any bonuses) */
	base: Record<AbilityId, number>;
	/** Bonuses from origins */
	originBonuses: AbilityBonus[];
	/** Bonuses from level-up ASIs */
	levelUpBonuses: AbilityBonus[];
	/** Bonuses from feats */
	featBonuses: AbilityBonus[];
}

// ─── Skills ──────────────────────────────────────────────────

export interface SkillSelection {
	skillId: SkillId;
	proficiency: ProficiencyLevel;
	source: string;
}

// ─── Proficiencies ───────────────────────────────────────────

export interface ProficiencySelection {
	type: 'armor' | 'weapon' | 'tool' | 'language' | 'saving-throw';
	value: string;
	source: string;
}

// ─── Spells ──────────────────────────────────────────────────

export interface SpellData {
	knownSpells: SpellKnown[];
	preparedSpellIds: string[];
	spellSlots: Record<number, number>; // level → slots
	pactSlots?: { count: number; level: number };
}

export interface SpellKnown {
	spellId: string;
	source: string; // "class:wizard", "origin:high-elf", etc.
	alwaysPrepared?: boolean;
}

// ─── Equipment ───────────────────────────────────────────────

export interface EquipmentSelection {
	equipmentId: string;
	quantity: number;
	equipped: boolean;
	notes?: string;
}

// ─── Feats ───────────────────────────────────────────────────

export interface FeatSelection {
	featId: string;
	source: string; // "background", "class:fighter:4", "bonus"
	choices: FeatChoiceSelection[];
}

export interface FeatChoiceSelection {
	choiceId: string;
	selectedValue: string;
}

// ─── Background ──────────────────────────────────────────────

export interface BackgroundSelection {
	backgroundId: string;
	/** Choices made within background (skill picks, tool picks, etc.) */
	choices: { choiceId: string; selectedValues: string[] }[];
}

// ─── System-Specific ─────────────────────────────────────────

export interface SystemSpecificData {
	/** A5E: Destiny selection */
	destinyId?: string;
	/** Black Flag: Luck pool tracking */
	luckPoints?: { current: number; max: number };
	/** A5E: Exertion pool tracking */
	exertionPoints?: { current: number; max: number };
}

// ─── Hit Points ──────────────────────────────────────────────

export interface HitPointData {
	maximum: number;
	current: number;
	temporary: number;
	hitDice: HitDieTracker[];
}

export interface HitDieTracker {
	die: DiceNotation;
	total: number;
	used: number;
}

// ─── Currency ────────────────────────────────────────────────

export interface CurrencyData {
	cp: number;
	sp: number;
	ep: number;
	gp: number;
	pp: number;
}

// ─── Flavor ──────────────────────────────────────────────────

export interface FlavorData {
	appearance?: string;
	backstory?: string;
	personalityTraits?: string;
	ideals?: string;
	bonds?: string;
	flaws?: string;
	age?: string;
	height?: string;
	weight?: string;
	eyes?: string;
	skin?: string;
	hair?: string;
}

// ─── Default Factory ─────────────────────────────────────────

/** Create a fresh, empty character data object */
export function createEmptyCharacter(systemId: SystemId): CharacterData {
	return {
		schemaVersion: 1,
		systemId,
		contentPackIds: [],
		name: '',
		level: 1,
		xp: 0,
		origins: [],
		classes: [],
		abilityScores: {
			method: '',
			base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
			originBonuses: [],
			levelUpBonuses: [],
			featBonuses: []
		},
		skills: [],
		proficiencies: [],
		spells: {
			knownSpells: [],
			preparedSpellIds: [],
			spellSlots: {}
		},
		equipment: [],
		feats: [],
		background: null,
		systemData: {},
		hitPoints: {
			maximum: 0,
			current: 0,
			temporary: 0,
			hitDice: []
		},
		currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
		flavor: {}
	};
}
