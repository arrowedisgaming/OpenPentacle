import { describe, it, expect } from 'vitest';
import { calculateMaxHP, parseDice, averageHitDieRoll } from '$lib/engine/hit-points.js';
import type { ClassSelection } from '$lib/types/character.js';

describe('parseDice', () => {
	it('should parse valid dice notation', () => {
		expect(parseDice('1d8')).toEqual({ count: 1, sides: 8 });
		expect(parseDice('2d6')).toEqual({ count: 2, sides: 6 });
		expect(parseDice('1d12')).toEqual({ count: 1, sides: 12 });
	});

	it('should throw on invalid notation', () => {
		expect(() => parseDice('d8')).toThrow();
		expect(() => parseDice('abc')).toThrow();
	});
});

describe('calculateMaxHP', () => {
	it('should calculate HP for a single-class fighter at level 1', () => {
		// Fighter: d10, CON 14 (mod +2)
		// Level 1: 10 + 2 = 12
		const classes: ClassSelection[] = [{
			classId: 'fighter',
			level: 1,
			hitDie: '1d10',
			featureChoices: []
		}];
		expect(calculateMaxHP(classes, 14)).toBe(12);
	});

	it('should calculate HP for a wizard at level 3', () => {
		// Wizard: d6, CON 12 (mod +1)
		// Level 1: 6 + 1 = 7
		// Level 2: 4 + 1 = 5
		// Level 3: 4 + 1 = 5
		// Total: 17
		const classes: ClassSelection[] = [{
			classId: 'wizard',
			level: 3,
			hitDie: '1d6',
			featureChoices: []
		}];
		expect(calculateMaxHP(classes, 12)).toBe(17);
	});

	it('should handle multiclass', () => {
		// Fighter 3 / Wizard 2, CON 10 (mod 0)
		// Fighter L1: 10 + 0 = 10
		// Fighter L2: 6 + 0 = 6
		// Fighter L3: 6 + 0 = 6
		// Wizard L1: 4 + 0 = 4 (not first overall level)
		// Wizard L2: 4 + 0 = 4
		// Total: 30
		const classes: ClassSelection[] = [
			{ classId: 'fighter', level: 3, hitDie: '1d10', featureChoices: [] },
			{ classId: 'wizard', level: 2, hitDie: '1d6', featureChoices: [] }
		];
		expect(calculateMaxHP(classes, 10)).toBe(30);
	});

	it('should enforce minimum 1 HP per level', () => {
		// d6 wizard with CON 3 (mod -4)
		// Level 1: 6 + (-4) = 2
		// Level 2: 4 + (-4) = 0 → 1
		const classes: ClassSelection[] = [{
			classId: 'wizard',
			level: 2,
			hitDie: '1d6',
			featureChoices: []
		}];
		expect(calculateMaxHP(classes, 3)).toBe(3); // 2 + 1
	});
});

describe('averageHitDieRoll', () => {
	it('should return correct averages', () => {
		expect(averageHitDieRoll('1d6')).toBe(4);   // ceil(6/2) + 1 = 4
		expect(averageHitDieRoll('1d8')).toBe(5);   // ceil(8/2) + 1 = 5
		expect(averageHitDieRoll('1d10')).toBe(6);  // ceil(10/2) + 1 = 6
		expect(averageHitDieRoll('1d12')).toBe(7);  // ceil(12/2) + 1 = 7
	});
});
