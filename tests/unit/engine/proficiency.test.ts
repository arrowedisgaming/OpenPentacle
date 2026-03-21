import { describe, it, expect } from 'vitest';
import { proficiencyBonus } from '$lib/engine/proficiency.js';

describe('proficiencyBonus', () => {
	it('should return +2 for levels 1-4', () => {
		expect(proficiencyBonus(1)).toBe(2);
		expect(proficiencyBonus(4)).toBe(2);
	});

	it('should return +3 for levels 5-8', () => {
		expect(proficiencyBonus(5)).toBe(3);
		expect(proficiencyBonus(8)).toBe(3);
	});

	it('should return +4 for levels 9-12', () => {
		expect(proficiencyBonus(9)).toBe(4);
		expect(proficiencyBonus(12)).toBe(4);
	});

	it('should return +5 for levels 13-16', () => {
		expect(proficiencyBonus(13)).toBe(5);
		expect(proficiencyBonus(16)).toBe(5);
	});

	it('should return +6 for levels 17-20', () => {
		expect(proficiencyBonus(17)).toBe(6);
		expect(proficiencyBonus(20)).toBe(6);
	});
});
