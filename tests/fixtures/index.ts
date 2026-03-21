/**
 * Shared test fixtures for engine tests.
 *
 * Provides factory helpers and pre-built class definitions so that
 * individual test files don't need to duplicate boilerplate.
 */

import type { CharacterData } from '$lib/types/character.js';
import type {
	ClassDefinition,
	ClassFeature,
	ClassProgression,
	ContentPack,
	SubclassDefinition,
	SystemMechanics
} from '$lib/types/content-pack.js';

// ─── Factory Helpers ─────────────────────────────────────────

/** Create a ClassFeature with sensible defaults. */
export function makeFeature(overrides: Partial<ClassFeature> & { id?: string; name?: string; level?: number } = {}): ClassFeature {
	const { id = 'feat-1', name = 'Test Feature', level = 1, ...rest } = overrides;
	return { id, name, description: `${name} description`, level, ...rest };
}

/**
 * Shorthand overload: `makeFeature('my-id', 'My Feature', 3)`
 * kept for backward-compat with existing call-sites.
 */
export function makeFeatureFromArgs(id: string, name: string, level: number): ClassFeature {
	return { id, name, description: `${name} description`, level };
}

/** Create a ClassProgression row with sensible defaults. */
export function makeProgression(overrides: Partial<ClassProgression> & { level?: number; features?: ClassFeature[] } = {}): ClassProgression {
	const { level = 1, features = [], ...extras } = overrides;
	return {
		level,
		proficiencyBonus: Math.ceil(level / 4) + 1,
		features,
		...extras
	};
}

/**
 * Shorthand overload matching the original call signature used in tests:
 * `makeProgressionFromArgs(4, [feature], { cantripsKnown: 3 })`
 */
export function makeProgressionFromArgs(level: number, features: ClassFeature[], extras?: Partial<ClassProgression>): ClassProgression {
	return {
		level,
		proficiencyBonus: Math.ceil(level / 4) + 1,
		features,
		...extras
	};
}

/** Create a ClassDefinition with sensible defaults; every field can be overridden. */
export function makeClassDef(overrides: Partial<ClassDefinition> = {}): ClassDefinition {
	return {
		id: 'test-class',
		name: 'Test Class',
		description: '',
		hitDie: '1d8',
		primaryAbility: ['str'],
		savingThrows: ['str', 'con'],
		armorProficiencies: [],
		weaponProficiencies: [],
		toolProficiencies: [],
		skillChoices: { choices: ['athletics', 'acrobatics'], count: 2 },
		startingEquipment: [],
		progression: [],
		subclasses: [],
		...overrides
	};
}

// ─── Pre-built Class Definitions ─────────────────────────────

const f = makeFeatureFromArgs;
const p = makeProgressionFromArgs;

/** Minimal Fighter-like class with ASIs at 4,6,8,12,14,16 + Epic Boon at 19 */
export const fighterClass: ClassDefinition = {
	id: 'fighter',
	name: 'Fighter',
	description: '',
	hitDie: '1d10',
	primaryAbility: ['str'],
	savingThrows: ['str', 'con'],
	armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
	weaponProficiencies: ['simple', 'martial'],
	toolProficiencies: [],
	skillChoices: { choices: ['acrobatics', 'athletics'], count: 2 },
	startingEquipment: [],
	progression: [
		p(1, [f('fighting-style', 'Fighting Style', 1), f('second-wind', 'Second Wind', 1)]),
		p(2, [f('action-surge', 'Action Surge', 2)]),
		p(3, [f('martial-archetype', 'Martial Archetype', 3)]),
		p(4, [f('fighter-asi-4', 'Ability Score Improvement', 4)]),
		p(5, [f('extra-attack', 'Extra Attack', 5)]),
		p(6, [f('fighter-asi-6', 'Ability Score Improvement', 6)]),
		p(7, []),
		p(8, [f('fighter-asi-8', 'Ability Score Improvement', 8)]),
		p(9, [f('indomitable', 'Indomitable', 9)]),
		p(10, []),
		p(11, [f('extra-attack-2', 'Extra Attack (2)', 11)]),
		p(12, [f('fighter-asi-12', 'Ability Score Improvement', 12)]),
		p(13, []),
		p(14, [f('fighter-asi-14', 'Ability Score Improvement', 14)]),
		p(15, []),
		p(16, [f('fighter-asi-16', 'Ability Score Improvement', 16)]),
		p(17, []),
		p(18, []),
		p(19, [f('fighter-epic-boon-19', 'Epic Boon', 19)]),
		p(20, []),
	],
	subclasses: [
		{
			id: 'champion',
			name: 'Champion',
			description: '',
			features: [
				f('improved-critical', 'Improved Critical', 3),
				f('remarkable-athlete', 'Remarkable Athlete', 7),
				f('additional-fighting-style', 'Additional Fighting Style', 10),
				f('superior-critical', 'Superior Critical', 15),
				f('survivor', 'Survivor', 18),
			]
		}
	]
};

/** Minimal Cleric-like class — subclass at level 3 (SRD 5.2.1), ASIs at 4,8,12,16 + Epic Boon at 19 */
export const clericClass: ClassDefinition = {
	id: 'cleric',
	name: 'Cleric',
	description: '',
	hitDie: '1d8',
	primaryAbility: ['wis'],
	savingThrows: ['wis', 'cha'],
	armorProficiencies: ['light', 'medium', 'shield'],
	weaponProficiencies: ['simple'],
	toolProficiencies: [],
	skillChoices: { choices: ['history', 'insight', 'medicine', 'persuasion', 'religion'], count: 2 },
	startingEquipment: [],
	spellcasting: { ability: 'wis', type: 'full', ritual: true, spellList: 'cleric', preparedCaster: true, cantrips: true },
	progression: [
		p(1, [f('spellcasting', 'Spellcasting', 1), f('divine-domain', 'Divine Domain', 1)], { cantripsKnown: 3, spellSlots: [2] }),
		p(2, [f('channel-divinity', 'Channel Divinity', 2)], { cantripsKnown: 3, spellSlots: [3] }),
		p(3, [], { cantripsKnown: 3, spellSlots: [4, 2] }),
		p(4, [f('cleric-asi-4', 'Ability Score Improvement', 4)], { cantripsKnown: 4, spellSlots: [4, 3] }),
		p(5, [f('destroy-undead', 'Destroy Undead', 5)], { cantripsKnown: 4, spellSlots: [4, 3, 2] }),
		p(6, [], { cantripsKnown: 4, spellSlots: [4, 3, 3] }),
		p(7, [], { cantripsKnown: 4, spellSlots: [4, 3, 3, 1] }),
		p(8, [f('cleric-asi-8', 'Ability Score Improvement', 8)], { cantripsKnown: 4, spellSlots: [4, 3, 3, 2] }),
		p(9, [], { cantripsKnown: 4, spellSlots: [4, 3, 3, 3, 1] }),
		p(10, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2] }),
		p(11, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1] }),
		p(12, [f('cleric-asi-12', 'Ability Score Improvement', 12)], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1] }),
		p(13, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1, 1] }),
		p(14, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1, 1] }),
		p(15, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1, 1, 1] }),
		p(16, [f('cleric-asi-16', 'Ability Score Improvement', 16)], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1, 1, 1] }),
		p(17, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 2, 1, 1, 1, 1] }),
		p(18, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 3, 1, 1, 1, 1] }),
		p(19, [f('cleric-epic-boon-19', 'Epic Boon', 19)], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 3, 2, 1, 1, 1] }),
		p(20, [], { cantripsKnown: 5, spellSlots: [4, 3, 3, 3, 3, 2, 2, 1, 1] }),
	],
	subclasses: [
		{
			id: 'life-domain',
			name: 'Life Domain',
			description: '',
			features: [
				f('disciple-of-life', 'Disciple of Life', 3),
				f('preserve-life', 'Preserve Life', 3),
				f('blessed-healer', 'Blessed Healer', 6),
				f('supreme-healing', 'Supreme Healing', 17),
			]
		}
	]
};

/** Wizard-like class: spellcasting progression, subclass at 2 */
export const wizardClass: ClassDefinition = {
	id: 'wizard',
	name: 'Wizard',
	description: '',
	hitDie: '1d6',
	primaryAbility: ['int'],
	savingThrows: ['int', 'wis'],
	armorProficiencies: [],
	weaponProficiencies: [],
	toolProficiencies: [],
	skillChoices: { choices: ['arcana', 'history'], count: 2 },
	startingEquipment: [],
	spellcasting: { ability: 'int', type: 'full', ritual: true, spellList: 'wizard', preparedCaster: true, cantrips: true },
	progression: [
		p(1, [f('spellcasting', 'Spellcasting', 1)], { cantripsKnown: 3, spellsKnown: 6, spellSlots: [2] }),
		p(2, [f('arcane-tradition', 'Arcane Tradition', 2)], { cantripsKnown: 3, spellsKnown: 8, spellSlots: [3] }),
		p(3, [], { cantripsKnown: 3, spellsKnown: 10, spellSlots: [4, 2] }),
		p(4, [f('wizard-asi-4', 'Ability Score Improvement', 4)], { cantripsKnown: 4, spellsKnown: 12, spellSlots: [4, 3] }),
		p(5, [], { cantripsKnown: 4, spellsKnown: 14, spellSlots: [4, 3, 2] }),
	],
	subclasses: [
		{
			id: 'evocation',
			name: 'School of Evocation',
			description: '',
			features: [f('sculpt-spells', 'Sculpt Spells', 2)]
		}
	]
};

// ─── Shared Content Pack / Character Helpers ─────────────────

export const minimalMechanics: SystemMechanics = {
	proficiencyTable: [],
	xpTable: [],
	maxLevel: 20
};

export const minimalPack = {
	systemMechanics: minimalMechanics
} as ContentPack;

/** Create a CharacterData object with sensible defaults; every field can be overridden. */
export function makeCharacter(overrides: Partial<CharacterData> = {}): CharacterData {
	return {
		systemId: 'srd521',
		contentPackIds: ['srd521'],
		name: 'Test Character',
		level: 1,
		xp: 0,
		origins: [],
		classes: [{ classId: 'fighter', level: 1, hitDie: '1d10', featureChoices: [] }],
		abilityScores: {
			method: 'standard-array',
			base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
			originBonuses: [],
			levelUpBonuses: [],
			featBonuses: []
		},
		skills: [],
		proficiencies: [],
		spells: { knownSpells: [], preparedSpellIds: [], spellSlots: {} },
		equipment: [],
		feats: [],
		background: null,
		systemData: {},
		hitPoints: { maximum: 12, current: 12, temporary: 0, hitDice: [{ die: '1d10', total: 1, used: 0 }] },
		currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
		flavor: {},
		...overrides
	};
}
