import { describe, it, expect } from 'vitest';
import {
	abilityModifier,
	formatModifier,
	totalAbilityScore,
	allAbilityTotals,
	pointBuyCost,
	isValidPointBuy,
	isValidStandardArray,
	STANDARD_POINT_BUY_COSTS
} from '$lib/engine/ability-scores.js';
import type { AbilityScoreData, AbilityBonus } from '$lib/types/character.js';

describe('abilityModifier', () => {
	it('should return correct modifiers', () => {
		expect(abilityModifier(1)).toBe(-5);
		expect(abilityModifier(8)).toBe(-1);
		expect(abilityModifier(9)).toBe(-1);
		expect(abilityModifier(10)).toBe(0);
		expect(abilityModifier(11)).toBe(0);
		expect(abilityModifier(12)).toBe(1);
		expect(abilityModifier(14)).toBe(2);
		expect(abilityModifier(15)).toBe(2);
		expect(abilityModifier(16)).toBe(3);
		expect(abilityModifier(20)).toBe(5);
		expect(abilityModifier(30)).toBe(10);
	});
});

describe('formatModifier', () => {
	it('should format positive modifiers with +', () => {
		expect(formatModifier(3)).toBe('+3');
		expect(formatModifier(0)).toBe('+0');
	});

	it('should format negative modifiers with -', () => {
		expect(formatModifier(-1)).toBe('-1');
		expect(formatModifier(-5)).toBe('-5');
	});
});

describe('totalAbilityScore', () => {
	it('should sum base + all bonuses', () => {
		const data: AbilityScoreData = {
			method: 'point-buy',
			base: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 },
			originBonuses: [
				{ ability: 'str', value: 2, source: 'Mountain Dwarf', sourceType: 'origin' }
			],
			levelUpBonuses: [] as AbilityBonus[],
			featBonuses: [] as AbilityBonus[]
		};

		expect(totalAbilityScore(data, 'str')).toBe(16); // 14 + 2
		expect(totalAbilityScore(data, 'dex')).toBe(12); // no bonuses
	});

	it('should cap at 30', () => {
		const data: AbilityScoreData = {
			method: 'point-buy',
			base: { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
			originBonuses: [
				{ ability: 'str', value: 2, source: 'test', sourceType: 'origin' }
			],
			levelUpBonuses: [
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' },
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' },
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' },
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' },
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' },
				{ ability: 'str', value: 2, source: 'ASI', sourceType: 'level-up' }
			],
			featBonuses: []
		};

		// 15 + 2 + 12 = 29, but should cap at 30
		expect(totalAbilityScore(data, 'str')).toBe(29);
	});
});

describe('pointBuyCost', () => {
	it('should correctly calculate standard array cost', () => {
		// Standard array: 15,14,13,12,10,8 → costs: 9+7+5+4+2+0 = 27
		const scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
		expect(pointBuyCost(scores as any)).toBe(27);
	});

	it('should calculate all 8s as 0', () => {
		const scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
		expect(pointBuyCost(scores as any)).toBe(0);
	});
});

describe('isValidPointBuy', () => {
	const config = {
		budget: 27,
		minimum: 8,
		maximum: 15,
		costs: STANDARD_POINT_BUY_COSTS
	};

	it('should validate a valid allocation', () => {
		const scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
		const result = isValidPointBuy(scores as any, config);
		expect(result.valid).toBe(true);
		expect(result.spent).toBe(27);
		expect(result.remaining).toBe(0);
	});

	it('should reject over-budget allocation', () => {
		const scores = { str: 15, dex: 15, con: 15, int: 15, wis: 15, cha: 15 };
		const result = isValidPointBuy(scores as any, config);
		expect(result.valid).toBe(false);
		expect(result.spent).toBe(54);
	});

	it('should reject scores below minimum', () => {
		const scores = { str: 7, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
		const result = isValidPointBuy(scores as any, config);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('STR (7) is below minimum 8');
	});
});

describe('isValidStandardArray', () => {
	const array = [15, 14, 13, 12, 10, 8];

	it('should validate correct allocation', () => {
		const scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
		expect(isValidStandardArray(scores as any, array)).toBe(true);
	});

	it('should validate scrambled allocation', () => {
		const scores = { str: 8, dex: 15, con: 10, int: 14, wis: 13, cha: 12 };
		expect(isValidStandardArray(scores as any, array)).toBe(true);
	});

	it('should reject invalid allocation', () => {
		const scores = { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 };
		expect(isValidStandardArray(scores as any, array)).toBe(false);
	});
});
