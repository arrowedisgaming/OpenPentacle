import { describe, it, expect } from 'vitest';
import { getCharacterResources, getSpellSlotResources } from '$lib/engine/resources.js';
import { createEmptyCharacter } from '$lib/types/character.js';
import type { ContentPack, ClassDefinition } from '$lib/types/content-pack.js';

// ─── Minimal Test Fixtures ─────────────────���────────────────

const proficiencyTable = Array.from({ length: 20 }, (_, i) => ({
	level: i + 1,
	bonus: Math.ceil((i + 1) / 4) + 1
}));

const barbarianClass: ClassDefinition = {
	id: 'barbarian',
	name: 'Barbarian',
	description: '',
	hitDie: '1d12',
	primaryAbility: ['str'],
	savingThrows: ['str', 'con'],
	armorProficiencies: ['light', 'medium', 'shield'],
	weaponProficiencies: ['simple', 'martial'],
	toolProficiencies: [],
	skillChoices: { choices: ['athletics', 'intimidation'], count: 2 },
	startingEquipment: [],
	progression: [
		{ level: 1, proficiencyBonus: 2, features: [], classSpecific: { rages: 2, rageDamage: 2 } },
		{ level: 2, proficiencyBonus: 2, features: [], classSpecific: { rages: 2, rageDamage: 2 } },
		{ level: 3, proficiencyBonus: 2, features: [], classSpecific: { rages: 3, rageDamage: 2 } },
		{ level: 5, proficiencyBonus: 3, features: [], classSpecific: { rages: 3, rageDamage: 2 } },
	],
	subclasses: [],
	resourceDefinitions: [
		{ id: 'rages', name: 'Rages', recovery: 'long' }
	]
};

const monkClass: ClassDefinition = {
	id: 'monk',
	name: 'Monk',
	description: '',
	hitDie: '1d8',
	primaryAbility: ['dex', 'wis'],
	savingThrows: ['str', 'dex'],
	armorProficiencies: [],
	weaponProficiencies: ['simple'],
	toolProficiencies: [],
	skillChoices: { choices: ['acrobatics', 'athletics'], count: 2 },
	startingEquipment: [],
	progression: [
		{ level: 1, proficiencyBonus: 2, features: [], classSpecific: { focusPoints: 0, martialArtsDie: '1d6' } },
		{ level: 2, proficiencyBonus: 2, features: [], classSpecific: { focusPoints: 2, martialArtsDie: '1d6' } },
		{ level: 3, proficiencyBonus: 2, features: [], classSpecific: { focusPoints: 3, martialArtsDie: '1d6' } },
	],
	subclasses: [],
	resourceDefinitions: [
		{ id: 'focusPoints', name: 'Focus Points', recovery: 'short' }
	]
};

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
	progression: [
		{ level: 1, proficiencyBonus: 2, features: [] },
	],
	subclasses: []
};

function makePack(...classes: ClassDefinition[]): ContentPack {
	return {
		id: 'test',
		name: 'Test',
		version: '1.0.0',
		description: '',
		system: 'srd521',
		license: 'test',
		authors: ['test'],
		classes,
		origins: [],
		backgrounds: [],
		spells: [],
		equipment: [],
		feats: [],
		abilityScoreMethods: [{ id: 'standard', name: 'Standard', description: '', type: 'standard-array', standardArray: [15, 14, 13, 12, 10, 8] }],
		systemMechanics: { proficiencyTable, xpTable: [{ level: 1, xpRequired: 0 }], maxLevel: 20 }
	};
}

// ─── getCharacterResources ───��──────────────────────────────

describe('getCharacterResources', () => {
	it('returns resources for a barbarian with rages', () => {
		const pack = makePack(barbarianClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'barbarian', level: 1, hitDie: '1d12', featureChoices: [] }];

		const resources = getCharacterResources(data, pack);
		expect(resources).toHaveLength(1);
		expect(resources[0]).toEqual({
			key: 'barbarian:rages',
			name: 'Rages',
			maximum: 2,
			used: 0,
			remaining: 2,
			recovery: 'long',
			classId: 'barbarian'
		});
	});

	it('reflects resource usage', () => {
		const pack = makePack(barbarianClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'barbarian', level: 3, hitDie: '1d12', featureChoices: [] }];
		data.resourceUsage = { 'barbarian:rages': 2 };

		const resources = getCharacterResources(data, pack);
		expect(resources[0].maximum).toBe(3);
		expect(resources[0].used).toBe(2);
		expect(resources[0].remaining).toBe(1);
	});

	it('clamps used to maximum', () => {
		const pack = makePack(barbarianClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'barbarian', level: 1, hitDie: '1d12', featureChoices: [] }];
		data.resourceUsage = { 'barbarian:rages': 99 };

		const resources = getCharacterResources(data, pack);
		expect(resources[0].used).toBe(2); // clamped to max
		expect(resources[0].remaining).toBe(0);
	});

	it('skips resources with 0 maximum (monk L1 focus points)', () => {
		const pack = makePack(monkClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'monk', level: 1, hitDie: '1d8', featureChoices: [] }];

		const resources = getCharacterResources(data, pack);
		expect(resources).toHaveLength(0);
	});

	it('shows resources at level 2+ for monk', () => {
		const pack = makePack(monkClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'monk', level: 2, hitDie: '1d8', featureChoices: [] }];

		const resources = getCharacterResources(data, pack);
		expect(resources).toHaveLength(1);
		expect(resources[0].name).toBe('Focus Points');
		expect(resources[0].maximum).toBe(2);
		expect(resources[0].recovery).toBe('short');
	});

	it('returns empty for class without resourceDefinitions', () => {
		const pack = makePack(fighterClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'fighter', level: 1, hitDie: '1d10', featureChoices: [] }];

		const resources = getCharacterResources(data, pack);
		expect(resources).toHaveLength(0);
	});

	it('handles multiclass with resources from both classes', () => {
		const pack = makePack(barbarianClass, monkClass);
		const data = createEmptyCharacter('srd521');
		data.level = 5;
		data.classes = [
			{ classId: 'barbarian', level: 3, hitDie: '1d12', featureChoices: [] },
			{ classId: 'monk', level: 2, hitDie: '1d8', featureChoices: [] }
		];

		const resources = getCharacterResources(data, pack);
		expect(resources).toHaveLength(2);
		expect(resources.find(r => r.key === 'barbarian:rages')?.maximum).toBe(3);
		expect(resources.find(r => r.key === 'monk:focusPoints')?.maximum).toBe(2);
	});
});

// ─── getSpellSlotResources ─────���───────��────────────────────

describe('getSpellSlotResources', () => {
	it('computes spell slot resources with no usage', () => {
		const data = createEmptyCharacter('srd521');
		const computedSlots = { 1: 4, 2: 3, 3: 2 };

		const result = getSpellSlotResources(computedSlots, null, data);
		expect(result.slots).toHaveLength(3);
		expect(result.slots[0]).toEqual({ level: 1, maximum: 4, used: 0, remaining: 4 });
		expect(result.slots[1]).toEqual({ level: 2, maximum: 3, used: 0, remaining: 3 });
		expect(result.slots[2]).toEqual({ level: 3, maximum: 2, used: 0, remaining: 2 });
		expect(result.pactSlots).toBeNull();
	});

	it('reflects spell slot usage', () => {
		const data = createEmptyCharacter('srd521');
		data.spells.spellSlotsUsed = { '1': 2, '3': 1 };
		const computedSlots = { 1: 4, 2: 3, 3: 2 };

		const result = getSpellSlotResources(computedSlots, null, data);
		expect(result.slots[0]).toEqual({ level: 1, maximum: 4, used: 2, remaining: 2 });
		expect(result.slots[1]).toEqual({ level: 2, maximum: 3, used: 0, remaining: 3 });
		expect(result.slots[2]).toEqual({ level: 3, maximum: 2, used: 1, remaining: 1 });
	});

	it('clamps spell slot usage to maximum', () => {
		const data = createEmptyCharacter('srd521');
		data.spells.spellSlotsUsed = { '1': 99 };
		const computedSlots = { 1: 4 };

		const result = getSpellSlotResources(computedSlots, null, data);
		expect(result.slots[0].used).toBe(4);
		expect(result.slots[0].remaining).toBe(0);
	});

	it('computes pact slot resources', () => {
		const data = createEmptyCharacter('srd521');
		data.spells.pactSlotsUsed = 1;
		const pactSlots = { count: 2, level: 3 };

		const result = getSpellSlotResources({}, pactSlots, data);
		expect(result.slots).toHaveLength(0);
		expect(result.pactSlots).toEqual({ level: 3, maximum: 2, used: 1, remaining: 1 });
	});

	it('returns sorted by spell level', () => {
		const data = createEmptyCharacter('srd521');
		// Object keys might not be in order
		const computedSlots = { 3: 2, 1: 4, 2: 3 };

		const result = getSpellSlotResources(computedSlots, null, data);
		expect(result.slots.map(s => s.level)).toEqual([1, 2, 3]);
	});
});
