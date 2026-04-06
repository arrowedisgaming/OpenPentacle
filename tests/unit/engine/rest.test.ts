import { describe, it, expect } from 'vitest';
import { applyShortRest, applyLongRest } from '$lib/engine/rest.js';
import { createEmptyCharacter } from '$lib/types/character.js';
import type { ContentPack, ClassDefinition } from '$lib/types/content-pack.js';

// ─── Minimal Test Fixtures ──────────────────────────────────

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
		{ level: 3, proficiencyBonus: 2, features: [], classSpecific: { rages: 3, rageDamage: 2 } },
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
		{ level: 2, proficiencyBonus: 2, features: [], classSpecific: { focusPoints: 2, martialArtsDie: '1d6' } },
	],
	subclasses: [],
	resourceDefinitions: [
		{ id: 'focusPoints', name: 'Focus Points', recovery: 'short' }
	]
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

// ─── applyShortRest ─────────────────────────────────────────

describe('applyShortRest', () => {
	it('resets short-rest resources only', () => {
		const pack = makePack(barbarianClass, monkClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [
			{ classId: 'barbarian', level: 1, hitDie: '1d12', featureChoices: [] },
			{ classId: 'monk', level: 2, hitDie: '1d8', featureChoices: [] }
		];
		data.resourceUsage = {
			'barbarian:rages': 1,
			'monk:focusPoints': 2
		};

		const result = applyShortRest(data, pack);

		// Monk focus points (short rest) should be reset
		expect(result.resourceUsage?.['monk:focusPoints']).toBeUndefined();
		// Barbarian rages (long rest) should remain
		expect(result.resourceUsage?.['barbarian:rages']).toBe(1);
	});

	it('resets pact slots', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.spells.pactSlotsUsed = 2;

		const result = applyShortRest(data, pack);
		expect(result.spells.pactSlotsUsed).toBe(0);
	});

	it('recovers HP when specified', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.hitPoints = { maximum: 30, current: 15, temporary: 0, hitDice: [] };

		const result = applyShortRest(data, pack, 10);
		expect(result.hitPoints.current).toBe(25);
	});

	it('caps HP recovery at maximum', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.hitPoints = { maximum: 30, current: 25, temporary: 0, hitDice: [] };

		const result = applyShortRest(data, pack, 20);
		expect(result.hitPoints.current).toBe(30);
	});

	it('does not modify original data (immutable)', () => {
		const pack = makePack(monkClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'monk', level: 2, hitDie: '1d8', featureChoices: [] }];
		data.resourceUsage = { 'monk:focusPoints': 2 };

		const result = applyShortRest(data, pack);
		expect(data.resourceUsage['monk:focusPoints']).toBe(2); // original unchanged
		expect(result).not.toBe(data);
	});
});

// ─── applyLongRest ──────────────────────────────────────────

describe('applyLongRest', () => {
	it('resets all resource usage', () => {
		const pack = makePack(barbarianClass, monkClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [
			{ classId: 'barbarian', level: 1, hitDie: '1d12', featureChoices: [] },
			{ classId: 'monk', level: 2, hitDie: '1d8', featureChoices: [] }
		];
		data.resourceUsage = {
			'barbarian:rages': 1,
			'monk:focusPoints': 2
		};

		const result = applyLongRest(data, pack);
		expect(result.resourceUsage).toBeUndefined();
	});

	it('resets all spell slots used', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.spells.spellSlotsUsed = { '1': 3, '2': 2 };
		data.spells.pactSlotsUsed = 2;

		const result = applyLongRest(data, pack);
		expect(result.spells.spellSlotsUsed).toBeUndefined();
		expect(result.spells.pactSlotsUsed).toBe(0);
	});

	it('restores HP to maximum and clears temp HP', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.hitPoints = { maximum: 45, current: 20, temporary: 5, hitDice: [] };

		const result = applyLongRest(data, pack);
		expect(result.hitPoints.current).toBe(45);
		expect(result.hitPoints.temporary).toBe(0);
	});

	it('recovers hit dice (floor(total/2), min 1)', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.hitPoints = {
			maximum: 45,
			current: 20,
			temporary: 0,
			hitDice: [
				{ die: '1d10', total: 5, used: 4 },
				{ die: '1d6', total: 1, used: 1 }
			]
		};

		const result = applyLongRest(data, pack);
		// 5 total → recover floor(5/2) = 2 → used goes 4-2=2
		expect(result.hitPoints.hitDice[0].used).toBe(2);
		// 1 total → recover max(floor(1/2), 1) = 1 → used goes 1-1=0
		expect(result.hitPoints.hitDice[1].used).toBe(0);
	});

	it('does not reduce hit dice used below 0', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.hitPoints = {
			maximum: 20,
			current: 20,
			temporary: 0,
			hitDice: [{ die: '1d10', total: 4, used: 1 }]
		};

		const result = applyLongRest(data, pack);
		// 4 total → recover 2, used was 1 → clamped to 0
		expect(result.hitPoints.hitDice[0].used).toBe(0);
	});

	it('resets system pools (luck, exertion)', () => {
		const pack = makePack();
		const data = createEmptyCharacter('srd521');
		data.systemData = {
			luckPoints: { current: 1, max: 3 },
			exertionPoints: { current: 2, max: 8 }
		};

		const result = applyLongRest(data, pack);
		expect(result.systemData.luckPoints?.current).toBe(3);
		expect(result.systemData.exertionPoints?.current).toBe(8);
	});

	it('does not modify original data (immutable)', () => {
		const pack = makePack(barbarianClass);
		const data = createEmptyCharacter('srd521');
		data.classes = [{ classId: 'barbarian', level: 1, hitDie: '1d12', featureChoices: [] }];
		data.resourceUsage = { 'barbarian:rages': 2 };
		data.hitPoints = { maximum: 20, current: 10, temporary: 3, hitDice: [] };

		const result = applyLongRest(data, pack);
		expect(data.resourceUsage['barbarian:rages']).toBe(2);
		expect(data.hitPoints.current).toBe(10);
		expect(result).not.toBe(data);
	});
});
