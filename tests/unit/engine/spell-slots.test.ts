import { describe, it, expect } from 'vitest';
import {
	multiclassCasterLevel,
	spellSlotsForCasterLevel,
	pactSlotsForLevel,
	calculateSpellSlots
} from '$lib/engine/spell-slots.js';
import type { SpellcastingConfig } from '$lib/types/content-pack.js';

const fullCaster: SpellcastingConfig = {
	ability: 'int',
	type: 'full',
	ritual: true,
	spellList: 'wizard',
	preparedCaster: true,
	cantrips: true
};

const halfCaster: SpellcastingConfig = {
	ability: 'wis',
	type: 'half',
	ritual: false,
	spellList: 'ranger',
	preparedCaster: false,
	cantrips: false
};

const pactCaster: SpellcastingConfig = {
	ability: 'cha',
	type: 'pact',
	ritual: false,
	spellList: 'warlock',
	preparedCaster: false,
	cantrips: true
};

describe('multiclassCasterLevel', () => {
	it('should calculate full caster level', () => {
		expect(multiclassCasterLevel([
			{ level: 5, spellcasting: fullCaster }
		])).toBe(5);
	});

	it('should calculate half caster level', () => {
		expect(multiclassCasterLevel([
			{ level: 5, spellcasting: halfCaster }
		])).toBe(2); // floor(5/2)
	});

	it('should not count pact casters', () => {
		expect(multiclassCasterLevel([
			{ level: 5, spellcasting: pactCaster }
		])).toBe(0);
	});

	it('should handle multiclass', () => {
		expect(multiclassCasterLevel([
			{ level: 3, spellcasting: fullCaster },
			{ level: 5, spellcasting: halfCaster }
		])).toBe(5); // 3 + floor(5/2)
	});

	it('should ignore non-casters', () => {
		expect(multiclassCasterLevel([
			{ level: 5, spellcasting: undefined },
			{ level: 3, spellcasting: fullCaster }
		])).toBe(3);
	});
});

describe('spellSlotsForCasterLevel', () => {
	it('should return empty for level 0', () => {
		expect(spellSlotsForCasterLevel(0)).toEqual({});
	});

	it('should return correct slots for level 1', () => {
		expect(spellSlotsForCasterLevel(1)).toEqual({ 1: 2 });
	});

	it('should return correct slots for level 5', () => {
		expect(spellSlotsForCasterLevel(5)).toEqual({ 1: 4, 2: 3, 3: 2 });
	});

	it('should return 9th level slots for level 17+', () => {
		const slots = spellSlotsForCasterLevel(20);
		expect(slots[9]).toBe(1);
	});
});

describe('pactSlotsForLevel', () => {
	it('should return null for level 0', () => {
		expect(pactSlotsForLevel(0)).toBeNull();
	});

	it('should return 1 slot at level 1', () => {
		expect(pactSlotsForLevel(1)).toEqual({ count: 1, level: 1 });
	});

	it('should return 2 slots at level 2', () => {
		expect(pactSlotsForLevel(2)).toEqual({ count: 2, level: 1 });
	});

	it('should max at level 5 spell slots at warlock 9', () => {
		expect(pactSlotsForLevel(9)).toEqual({ count: 2, level: 5 });
	});
});

describe('calculateSpellSlots', () => {
	it('should handle a pure wizard', () => {
		const result = calculateSpellSlots([
			{ level: 5, spellcasting: fullCaster }
		]);
		expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
		expect(result.pactSlots).toBeNull();
	});

	it('should handle a pure warlock', () => {
		const result = calculateSpellSlots([
			{ level: 5, spellcasting: pactCaster }
		]);
		expect(result.slots).toEqual({});
		expect(result.pactSlots).toEqual({ count: 2, level: 3 });
	});
});
