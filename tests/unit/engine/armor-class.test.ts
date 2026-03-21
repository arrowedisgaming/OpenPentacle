import { describe, it, expect } from 'vitest';
import { calculateAC } from '$lib/engine/armor-class.js';
import type { ArmorProperties } from '$lib/types/content-pack.js';

describe('calculateAC', () => {
	it('should calculate unarmored AC (10 + DEX)', () => {
		expect(calculateAC(14, null, false)).toBe(12); // 10 + 2
		expect(calculateAC(10, null, false)).toBe(10); // 10 + 0
		expect(calculateAC(8, null, false)).toBe(9);   // 10 + (-1)
	});

	it('should add +2 for shield', () => {
		expect(calculateAC(14, null, true)).toBe(14); // 10 + 2 + 2
	});

	it('should calculate light armor AC', () => {
		const leather: ArmorProperties = {
			category: 'light',
			baseAC: 11,
			stealthDisadvantage: false
		};
		expect(calculateAC(14, leather, false)).toBe(13); // 11 + 2
		expect(calculateAC(20, leather, false)).toBe(16); // 11 + 5
	});

	it('should cap DEX bonus for medium armor', () => {
		const chainShirt: ArmorProperties = {
			category: 'medium',
			baseAC: 13,
			maxDexBonus: 2,
			stealthDisadvantage: false
		};
		expect(calculateAC(14, chainShirt, false)).toBe(15); // 13 + 2
		expect(calculateAC(20, chainShirt, false)).toBe(15); // 13 + 2 (capped)
		expect(calculateAC(10, chainShirt, false)).toBe(13); // 13 + 0
	});

	it('should ignore DEX for heavy armor', () => {
		const plate: ArmorProperties = {
			category: 'heavy',
			baseAC: 18,
			stealthDisadvantage: true,
			strengthRequirement: 15
		};
		expect(calculateAC(20, plate, false)).toBe(18); // No DEX
		expect(calculateAC(8, plate, false)).toBe(18);  // No DEX
		expect(calculateAC(20, plate, true)).toBe(20);  // 18 + shield
	});

	it('should add bonus', () => {
		expect(calculateAC(10, null, false, 2)).toBe(12); // 10 + 0 + 2 bonus
	});
});
