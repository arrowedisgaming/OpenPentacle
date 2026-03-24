import { describe, it, expect } from 'vitest';
import { computeSheet } from '$lib/engine/character-sheet.js';
import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack, ClassDefinition, EquipmentDefinition, OriginLayer } from '$lib/types/content-pack.js';
import { createEmptyCharacter } from '$lib/types/character.js';

// ─── Minimal Content Pack ────────────────────────────────────

const proficiencyTable = [
	{ level: 1, bonus: 2 }, { level: 2, bonus: 2 }, { level: 3, bonus: 2 }, { level: 4, bonus: 2 },
	{ level: 5, bonus: 3 }, { level: 6, bonus: 3 }, { level: 7, bonus: 3 }, { level: 8, bonus: 3 },
	{ level: 9, bonus: 4 }, { level: 10, bonus: 4 }, { level: 11, bonus: 4 }, { level: 12, bonus: 4 },
	{ level: 13, bonus: 5 }, { level: 14, bonus: 5 }, { level: 15, bonus: 5 }, { level: 16, bonus: 5 },
	{ level: 17, bonus: 6 }, { level: 18, bonus: 6 }, { level: 19, bonus: 6 }, { level: 20, bonus: 6 },
];

const fighterClass: ClassDefinition = {
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
	progression: Array.from({ length: 20 }, (_, i) => ({
		level: i + 1,
		proficiencyBonus: Math.ceil((i + 1) / 4) + 1,
		features: [],
	})),
	subclasses: [],
};

const wizardClass: ClassDefinition = {
	id: 'wizard',
	name: 'Wizard',
	description: '',
	hitDie: '1d6',
	primaryAbility: ['int'],
	savingThrows: ['int', 'wis'],
	armorProficiencies: [],
	weaponProficiencies: ['simple'],
	toolProficiencies: [],
	skillChoices: { choices: ['arcana', 'history', 'investigation'], count: 2 },
	startingEquipment: [],
	spellcasting: {
		ability: 'int',
		type: 'full',
		ritual: true,
		spellList: 'wizard',
		preparedCaster: false,
		cantrips: true,
	},
	progression: Array.from({ length: 20 }, (_, i) => ({
		level: i + 1,
		proficiencyBonus: Math.ceil((i + 1) / 4) + 1,
		features: [],
		spellSlots: [2, 0, 0, 0, 0, 0, 0, 0, 0], // placeholder; calculateSpellSlots uses its own table
	})),
	subclasses: [],
};

const humanOrigin: OriginLayer = {
	id: 'species',
	name: 'Species',
	description: '',
	order: 0,
	options: [
		{
			id: 'human',
			name: 'Human',
			description: '',
			size: 'Medium',
			speed: 30,
			abilityScoreChanges: [],
			traits: [],
			proficiencies: [],
			languages: ['Common'],
		},
	],
};

const elfOrigin: OriginLayer = {
	id: 'species',
	name: 'Species',
	description: '',
	order: 0,
	options: [
		{
			id: 'elf',
			name: 'Elf',
			description: '',
			size: 'Medium',
			speed: 35,
			abilityScoreChanges: [],
			traits: [],
			proficiencies: [],
			languages: ['Common', 'Elvish'],
		},
	],
};

const chainMail: EquipmentDefinition = {
	id: 'chain-mail',
	name: 'Chain Mail',
	type: 'armor',
	cost: { amount: 75, currency: 'gp' },
	weight: 55,
	armor: {
		category: 'heavy',
		baseAC: 16,
		stealthDisadvantage: true,
		strengthRequirement: 13,
	},
};

const shield: EquipmentDefinition = {
	id: 'shield',
	name: 'Shield',
	type: 'shield',
	cost: { amount: 10, currency: 'gp' },
	weight: 6,
	armor: {
		category: 'shield',
		baseAC: 2,
		stealthDisadvantage: false,
	},
};

const leatherArmor: EquipmentDefinition = {
	id: 'leather-armor',
	name: 'Leather Armor',
	type: 'armor',
	cost: { amount: 10, currency: 'gp' },
	weight: 10,
	armor: {
		category: 'light',
		baseAC: 11,
		stealthDisadvantage: false,
	},
};

function makeContentPack(overrides: Partial<ContentPack> = {}): ContentPack {
	return {
		id: 'test-pack',
		name: 'Test Pack',
		version: '1.0.0',
		description: 'Test content pack',
		system: 'srd521',
		license: 'test',
		authors: ['test'],
		classes: [fighterClass, wizardClass],
		origins: [humanOrigin],
		backgrounds: [],
		spells: [],
		equipment: [chainMail, shield, leatherArmor],
		feats: [],
		abilityScoreMethods: [],
		systemMechanics: {
			proficiencyTable,
			xpTable: [{ level: 1, xpRequired: 0 }],
			maxLevel: 20,
		},
		...overrides,
	};
}

// ─── Character Data Helpers ──────────────────────────────────

function makeFighter(overrides: Partial<CharacterData> = {}): CharacterData {
	const char = createEmptyCharacter('srd521');
	return {
		...char,
		name: 'Test Fighter',
		level: 1,
		classes: [{ classId: 'fighter', level: 1, hitDie: '1d10', featureChoices: [] }],
		abilityScores: {
			method: 'standard-array',
			base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
			originBonuses: [],
			levelUpBonuses: [],
			featBonuses: [],
		},
		proficiencies: [
			{ type: 'saving-throw', value: 'str', source: 'class:fighter' },
			{ type: 'saving-throw', value: 'con', source: 'class:fighter' },
		],
		origins: [{ layerId: 'species', optionId: 'human', choices: [] }],
		...overrides,
	};
}

function makeWizard(overrides: Partial<CharacterData> = {}): CharacterData {
	const char = createEmptyCharacter('srd521');
	return {
		...char,
		name: 'Test Wizard',
		level: 1,
		classes: [{ classId: 'wizard', level: 1, hitDie: '1d6', featureChoices: [] }],
		abilityScores: {
			method: 'standard-array',
			base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
			originBonuses: [],
			levelUpBonuses: [],
			featBonuses: [],
		},
		proficiencies: [
			{ type: 'saving-throw', value: 'int', source: 'class:wizard' },
			{ type: 'saving-throw', value: 'wis', source: 'class:wizard' },
		],
		origins: [{ layerId: 'species', optionId: 'human', choices: [] }],
		...overrides,
	};
}

// ─── Tests ───────────────────────────────────────────────────

describe('computeSheet', () => {
	describe('basic fighter (level 1)', () => {
		const pack = makeContentPack();
		const data = makeFighter();
		const sheet = computeSheet(data, pack);

		it('computes name, level, and class summary', () => {
			expect(sheet.name).toBe('Test Fighter');
			expect(sheet.level).toBe(1);
			expect(sheet.classSummary).toBe('Fighter 1');
		});

		it('computes proficiency bonus of +2 at level 1', () => {
			expect(sheet.proficiencyBonus).toBe(2);
		});

		it('computes ability scores from base values', () => {
			expect(sheet.abilityScores.str).toBe(15);
			expect(sheet.abilityScores.dex).toBe(14);
			expect(sheet.abilityScores.con).toBe(13);
			expect(sheet.abilityScores.int).toBe(12);
			expect(sheet.abilityScores.wis).toBe(10);
			expect(sheet.abilityScores.cha).toBe(8);
		});

		it('computes ability modifiers', () => {
			expect(sheet.abilityModifiers.str).toBe(2);  // 15 → +2
			expect(sheet.abilityModifiers.dex).toBe(2);  // 14 → +2
			expect(sheet.abilityModifiers.con).toBe(1);  // 13 → +1
			expect(sheet.abilityModifiers.int).toBe(1);  // 12 → +1
			expect(sheet.abilityModifiers.wis).toBe(0);  // 10 → +0
			expect(sheet.abilityModifiers.cha).toBe(-1); // 8 → -1
		});

		it('computes HP: max hit die + CON mod at level 1', () => {
			// Fighter d10, CON 13 (mod +1) → 10 + 1 = 11
			expect(sheet.maxHP).toBe(11);
		});

		it('computes AC as 10 + DEX mod with no armor', () => {
			// DEX 14 (mod +2) → 10 + 2 = 12
			expect(sheet.armorClass).toBe(12);
		});

		it('computes initiative as DEX modifier', () => {
			expect(sheet.initiative).toBe(2);
		});

		it('computes speed from origin', () => {
			expect(sheet.speed).toBe(30);
		});

		it('marks STR and CON saving throws as proficient', () => {
			expect(sheet.savingThrows.str.proficient).toBe(true);
			expect(sheet.savingThrows.con.proficient).toBe(true);
			// Proficient saves: modifier + proficiency bonus
			expect(sheet.savingThrows.str.modifier).toBe(4); // +2 mod + 2 prof
			expect(sheet.savingThrows.con.modifier).toBe(3); // +1 mod + 2 prof
		});

		it('marks non-proficient saving throws correctly', () => {
			expect(sheet.savingThrows.dex.proficient).toBe(false);
			expect(sheet.savingThrows.dex.modifier).toBe(2); // just DEX mod
			expect(sheet.savingThrows.int.proficient).toBe(false);
			expect(sheet.savingThrows.wis.proficient).toBe(false);
			expect(sheet.savingThrows.cha.proficient).toBe(false);
		});

		it('has no spell slots for a non-caster', () => {
			expect(sheet.spellSlots).toEqual({});
			expect(sheet.pactSlots).toBeNull();
		});

		it('has no spell save DC or attack bonus', () => {
			expect(sheet.spellSaveDC).toEqual({});
			expect(sheet.spellAttackBonus).toEqual({});
		});

		it('computes passive perception', () => {
			// WIS 10 (mod 0), no perception proficiency → 10 + 0 = 10
			expect(sheet.passivePerception).toBe(10);
		});
	});

	describe('fighter with armor equipped', () => {
		const pack = makeContentPack();

		it('computes AC with heavy armor (chain mail)', () => {
			const data = makeFighter({
				equipment: [
					{ equipmentId: 'chain-mail', quantity: 1, equipped: true },
				],
			});
			const sheet = computeSheet(data, pack);
			// Chain mail: baseAC 16, heavy armor ignores DEX
			expect(sheet.armorClass).toBe(16);
		});

		it('computes AC with heavy armor and shield', () => {
			const data = makeFighter({
				equipment: [
					{ equipmentId: 'chain-mail', quantity: 1, equipped: true },
					{ equipmentId: 'shield', quantity: 1, equipped: true },
				],
			});
			const sheet = computeSheet(data, pack);
			// Chain mail 16 + shield 2 = 18
			expect(sheet.armorClass).toBe(18);
		});

		it('computes AC with light armor (leather)', () => {
			const data = makeFighter({
				equipment: [
					{ equipmentId: 'leather-armor', quantity: 1, equipped: true },
				],
			});
			const sheet = computeSheet(data, pack);
			// Leather: baseAC 11 + DEX mod 2 = 13
			expect(sheet.armorClass).toBe(13);
		});

		it('ignores unequipped armor', () => {
			const data = makeFighter({
				equipment: [
					{ equipmentId: 'chain-mail', quantity: 1, equipped: false },
				],
			});
			const sheet = computeSheet(data, pack);
			// No equipped armor → 10 + DEX mod 2 = 12
			expect(sheet.armorClass).toBe(12);
		});
	});

	describe('wizard with spellcasting', () => {
		const pack = makeContentPack();
		const data = makeWizard();
		const sheet = computeSheet(data, pack);

		it('computes spell slots for a level 1 full caster', () => {
			// Level 1 full caster: 2 first-level slots
			expect(sheet.spellSlots).toEqual({ 1: 2 });
		});

		it('computes spell save DC', () => {
			// 8 + proficiency (2) + INT mod (2, from score 15) = 12
			expect(sheet.spellSaveDC['wizard']).toBe(12);
		});

		it('computes spell attack bonus', () => {
			// proficiency (2) + INT mod (2) = 4
			expect(sheet.spellAttackBonus['wizard']).toBe(4);
		});

		it('has no pact slots', () => {
			expect(sheet.pactSlots).toBeNull();
		});

		it('has INT and WIS saving throw proficiency', () => {
			expect(sheet.savingThrows.int.proficient).toBe(true);
			expect(sheet.savingThrows.wis.proficient).toBe(true);
			// INT: +2 mod + 2 prof = 4
			expect(sheet.savingThrows.int.modifier).toBe(4);
			// WIS: +1 mod + 2 prof = 3
			expect(sheet.savingThrows.wis.modifier).toBe(3);
		});
	});

	describe('skill modifiers with proficiency', () => {
		const pack = makeContentPack();

		it('adds proficiency bonus to proficient skills', () => {
			const data = makeFighter({
				skills: [
					{ skillId: 'athletics', proficiency: 'proficient', source: 'class:fighter' },
					{ skillId: 'perception', proficiency: 'proficient', source: 'background' },
				],
			});
			const sheet = computeSheet(data, pack);
			// Athletics: STR mod (2) + prof (2) = 4
			expect(sheet.skills.athletics.modifier).toBe(4);
			expect(sheet.skills.athletics.proficiency).toBe('proficient');
			// Perception: WIS mod (0) + prof (2) = 2
			expect(sheet.skills.perception.modifier).toBe(2);
			expect(sheet.skills.perception.proficiency).toBe('proficient');
		});

		it('adds double proficiency bonus for expertise', () => {
			const data = makeFighter({
				skills: [
					{ skillId: 'athletics', proficiency: 'expertise', source: 'class:fighter' },
				],
			});
			const sheet = computeSheet(data, pack);
			// Athletics: STR mod (2) + 2 * prof (4) = 6
			expect(sheet.skills.athletics.modifier).toBe(6);
			expect(sheet.skills.athletics.proficiency).toBe('expertise');
		});

		it('uses only ability modifier for non-proficient skills', () => {
			const data = makeFighter();
			const sheet = computeSheet(data, pack);
			// Stealth: DEX mod (2), no proficiency
			expect(sheet.skills.stealth.modifier).toBe(2);
			expect(sheet.skills.stealth.proficiency).toBe('none');
			// Arcana: INT mod (1), no proficiency
			expect(sheet.skills.arcana.modifier).toBe(1);
			expect(sheet.skills.arcana.proficiency).toBe('none');
		});

		it('reflects proficient perception in passive perception', () => {
			const data = makeFighter({
				skills: [
					{ skillId: 'perception', proficiency: 'proficient', source: 'background' },
				],
			});
			const sheet = computeSheet(data, pack);
			// 10 + WIS mod (0) + prof (2) = 12
			expect(sheet.passivePerception).toBe(12);
		});
	});

	describe('higher level character (level 5)', () => {
		const pack = makeContentPack();

		it('increases proficiency bonus to +3 at level 5', () => {
			const data = makeFighter({
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.proficiencyBonus).toBe(3);
		});

		it('computes HP across multiple levels', () => {
			const data = makeFighter({
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			// Fighter d10, CON 13 (mod +1)
			// L1: 10 + 1 = 11
			// L2: 6 + 1 = 7
			// L3: 6 + 1 = 7
			// L4: 6 + 1 = 7
			// L5: 6 + 1 = 7
			// Total: 39
			expect(sheet.maxHP).toBe(39);
		});

		it('saving throw modifiers include increased proficiency', () => {
			const data = makeFighter({
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			// STR save: mod (2) + prof (3) = 5
			expect(sheet.savingThrows.str.modifier).toBe(5);
		});

		it('skill modifiers include increased proficiency at level 5', () => {
			const data = makeFighter({
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
				skills: [
					{ skillId: 'athletics', proficiency: 'proficient', source: 'class:fighter' },
				],
			});
			const sheet = computeSheet(data, pack);
			// Athletics: STR mod (2) + prof (3) = 5
			expect(sheet.skills.athletics.modifier).toBe(5);
		});

		it('wizard spell slots increase at level 5', () => {
			const data = makeWizard({
				level: 5,
				classes: [{ classId: 'wizard', level: 5, hitDie: '1d6', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			// Full caster level 5: [4, 3, 2]
			expect(sheet.spellSlots).toEqual({ 1: 4, 2: 3, 3: 2 });
		});

		it('spell save DC and attack bonus increase with proficiency', () => {
			const data = makeWizard({
				level: 5,
				classes: [{ classId: 'wizard', level: 5, hitDie: '1d6', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			// DC: 8 + prof (3) + INT mod (2) = 13
			expect(sheet.spellSaveDC['wizard']).toBe(13);
			// Attack: prof (3) + INT mod (2) = 5
			expect(sheet.spellAttackBonus['wizard']).toBe(5);
		});
	});

	describe('origin speed', () => {
		it('uses speed from the selected origin', () => {
			const pack = makeContentPack({ origins: [elfOrigin] });
			const data = makeFighter({
				origins: [{ layerId: 'species', optionId: 'elf', choices: [] }],
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.speed).toBe(35);
		});

		it('defaults to 30 when no origin is selected', () => {
			const pack = makeContentPack();
			const data = makeFighter({ origins: [] });
			const sheet = computeSheet(data, pack);
			expect(sheet.speed).toBe(30);
		});
	});

	describe('ability score bonuses', () => {
		const pack = makeContentPack();

		it('includes origin bonuses in ability scores', () => {
			const data = makeFighter({
				abilityScores: {
					method: 'standard-array',
					base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
					originBonuses: [
						{ ability: 'str', value: 2, source: 'Human', sourceType: 'origin' },
						{ ability: 'con', value: 1, source: 'Human', sourceType: 'origin' },
					],
					levelUpBonuses: [],
					featBonuses: [],
				},
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.abilityScores.str).toBe(17); // 15 + 2
			expect(sheet.abilityScores.con).toBe(14); // 13 + 1
			expect(sheet.abilityModifiers.str).toBe(3); // 17 → +3
			expect(sheet.abilityModifiers.con).toBe(2); // 14 → +2
		});

		it('includes level-up ASI bonuses', () => {
			const data = makeFighter({
				level: 4,
				classes: [{ classId: 'fighter', level: 4, hitDie: '1d10', featureChoices: [] }],
				abilityScores: {
					method: 'standard-array',
					base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
					originBonuses: [],
					levelUpBonuses: [
						{ ability: 'str', value: 2, source: 'ASI L4', sourceType: 'level-up' },
					],
					featBonuses: [],
				},
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.abilityScores.str).toBe(17); // 15 + 2
		});
	});

	describe('class summary formatting', () => {
		const pack = makeContentPack();

		it('formats single class', () => {
			const data = makeFighter({ level: 3, classes: [{ classId: 'fighter', level: 3, hitDie: '1d10', featureChoices: [] }] });
			const sheet = computeSheet(data, pack);
			expect(sheet.classSummary).toBe('Fighter 3');
		});

		it('formats multiclass with slash separator', () => {
			const data = makeFighter({
				level: 5,
				classes: [
					{ classId: 'fighter', level: 3, hitDie: '1d10', featureChoices: [] },
					{ classId: 'wizard', level: 2, hitDie: '1d6', featureChoices: [] },
				],
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.classSummary).toBe('Fighter 3 / Wizard 2');
		});

		it('uses classId as fallback for unknown class', () => {
			const data = makeFighter({
				classes: [{ classId: 'homebrew-warrior', level: 1, hitDie: '1d10', featureChoices: [] }],
			});
			const sheet = computeSheet(data, pack);
			expect(sheet.classSummary).toBe('homebrew-warrior 1');
		});
	});

	describe('Species-derived fields', () => {
		it('resolves speed from sub-option override (Wood Elf)', () => {
			const elfWithSubOptions: OriginLayer = {
				id: 'species', name: 'Species', description: '', order: 0,
				options: [{
					id: 'elf', name: 'Elf', description: '', size: 'Medium', speed: 30,
					abilityScoreChanges: [], traits: [], proficiencies: [], languages: [],
					subOptions: [
						{ id: 'wood-elf', name: 'Wood Elf', description: '', traits: [],
						  abilityScoreChanges: [], proficiencies: [], speed: 35 }
					]
				}]
			};
			const data = makeFighter({
				origins: [{ layerId: 'species', optionId: 'elf', subOptionId: 'wood-elf', choices: [] }],
			});
			const testPack = makeContentPack({ origins: [elfWithSubOptions] });
			const sheet = computeSheet(data, testPack);
			expect(sheet.speed).toBe(35);
		});

		it('resolves darkvision from sub-option override (Drow)', () => {
			const elfWithDrow: OriginLayer = {
				id: 'species', name: 'Species', description: '', order: 0,
				options: [{
					id: 'elf', name: 'Elf', description: '', size: 'Medium', speed: 30,
					abilityScoreChanges: [], traits: [], proficiencies: [], languages: [],
					darkvision: 60,
					subOptions: [
						{ id: 'drow', name: 'Drow', description: '', traits: [],
						  abilityScoreChanges: [], proficiencies: [], darkvision: 120 }
					]
				}]
			};
			const data = makeFighter({
				origins: [{ layerId: 'species', optionId: 'elf', subOptionId: 'drow', choices: [] }],
			});
			const testPack = makeContentPack({ origins: [elfWithDrow] });
			const sheet = computeSheet(data, testPack);
			expect(sheet.darkvision).toBe(120);
		});

		it('applies Dwarven Toughness bonus HP per level', () => {
			const dwarfOrigin: OriginLayer = {
				id: 'species', name: 'Species', description: '', order: 0,
				options: [{
					id: 'dwarf', name: 'Dwarf', description: '', size: 'Medium', speed: 30,
					abilityScoreChanges: [], proficiencies: [], languages: [],
					traits: [{
						id: 'dwarven-toughness', name: 'Dwarven Toughness',
						description: '+1 HP per level',
						mechanicalEffect: 'hp_per_level:1'
					}]
				}]
			};
			const data = makeFighter({
				origins: [{ layerId: 'species', optionId: 'dwarf', choices: [] }],
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
			});
			const testPack = makeContentPack({ origins: [dwarfOrigin] });
			const sheetWithDwarf = computeSheet(data, testPack);

			// Same character without dwarf
			const dataHuman = makeFighter({
				origins: [{ layerId: 'species', optionId: 'human', choices: [] }],
				level: 5,
				classes: [{ classId: 'fighter', level: 5, hitDie: '1d10', featureChoices: [] }],
			});
			const sheetWithHuman = computeSheet(dataHuman, makeContentPack());

			// Dwarf should have exactly 5 more HP (1 per level)
			expect(sheetWithDwarf.maxHP).toBe(sheetWithHuman.maxHP + 5);
		});

		it('resolves size from OriginChoice', () => {
			const humanWithSizeChoice: OriginLayer = {
				id: 'species', name: 'Species', description: '', order: 0,
				options: [{
					id: 'human', name: 'Human', description: '', size: 'Medium', speed: 30,
					abilityScoreChanges: [], traits: [], proficiencies: [], languages: [],
					sizeChoices: ['Medium', 'Small']
				}]
			};
			const data = makeFighter({
				origins: [{
					layerId: 'species', optionId: 'human', choices: [
						{ choiceId: 'size', selectedValues: ['Small'] }
					]
				}],
			});
			const testPack = makeContentPack({ origins: [humanWithSizeChoice] });
			const sheet = computeSheet(data, testPack);
			expect(sheet.size).toBe('Small');
		});

		it('resolves damage resistance from sub-option', () => {
			const dragonbornOrigin: OriginLayer = {
				id: 'species', name: 'Species', description: '', order: 0,
				options: [{
					id: 'dragonborn', name: 'Dragonborn', description: '', size: 'Medium', speed: 30,
					abilityScoreChanges: [], traits: [], proficiencies: [], languages: [],
					subOptions: [
						{ id: 'red-dragon', name: 'Red Dragon', description: '', traits: [],
						  abilityScoreChanges: [], proficiencies: [], damageResistance: 'fire' }
					]
				}]
			};
			const data = makeFighter({
				origins: [{ layerId: 'species', optionId: 'dragonborn', subOptionId: 'red-dragon', choices: [] }],
			});
			const testPack = makeContentPack({ origins: [dragonbornOrigin] });
			const sheet = computeSheet(data, testPack);
			expect(sheet.damageResistances).toEqual(['fire']);
		});

		it('defaults to Medium size and 0 darkvision when no origin', () => {
			const data = makeFighter({ origins: [] });
			const sheet = computeSheet(data, makeContentPack());
			expect(sheet.size).toBe('Medium');
			expect(sheet.darkvision).toBe(0);
			expect(sheet.damageResistances).toEqual([]);
		});
	});
});
