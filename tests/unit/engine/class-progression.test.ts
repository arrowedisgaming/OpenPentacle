import { describe, it, expect } from 'vitest';
import {
	getASILevels,
	getSubclassLevel,
	getClassFeaturesUpToLevel,
	getSubclassFeaturesUpToLevel,
	isASILevel,
	getMaxSpellLevel,
	resolveClassLanguages
} from '$lib/engine/class-progression.js';
import type { ClassDefinition } from '$lib/types/content-pack.js';
import {
	makeFeatureFromArgs as makeFeature,
	makeProgressionFromArgs as makeProgression,
	fighterClass as fighter,
	clericClass as cleric
} from '../../fixtures/index.js';

// ─── Test Fixtures ───────────────────────────────────────────

/** Class with no subclasses */
const classWithNoSubclasses: ClassDefinition = {
	...fighter,
	id: 'homebrew',
	subclasses: []
};

// ─── Tests ───────────────────────────────────────────────────

describe('getASILevels', () => {
	it('returns Fighter ASI levels (6 total, including bonus at 6 and 14; L19 is Epic Boon)', () => {
		expect(getASILevels(fighter)).toEqual([4, 6, 8, 12, 14, 16]);
	});

	it('returns Cleric ASI levels (4 standard, L19 is Epic Boon)', () => {
		expect(getASILevels(cleric)).toEqual([4, 8, 12, 16]);
	});

	it('returns empty array for class with no ASIs', () => {
		const noASI: ClassDefinition = {
			...fighter,
			progression: [makeProgression(1, [makeFeature('f1', 'Some Feature', 1)])]
		};
		expect(getASILevels(noASI)).toEqual([]);
	});
});

describe('getSubclassLevel', () => {
	it('returns 3 for Fighter (Champion features start at level 3)', () => {
		expect(getSubclassLevel(fighter)).toBe(3);
	});

	it('returns 3 for Cleric (Life Domain features start at level 3 in SRD 5.2.1)', () => {
		expect(getSubclassLevel(cleric)).toBe(3);
	});

	it('returns null for class with no subclasses', () => {
		expect(getSubclassLevel(classWithNoSubclasses)).toBeNull();
	});
});

describe('getClassFeaturesUpToLevel', () => {
	it('returns all Fighter features through level 5', () => {
		const features = getClassFeaturesUpToLevel(fighter, 5);
		const names = features.map((f) => f.name);
		expect(names).toEqual([
			'Fighting Style',
			'Second Wind',
			'Action Surge',
			'Martial Archetype',
			'Ability Score Improvement',
			'Extra Attack'
		]);
	});

	it('returns only level 1 features when targetLevel is 1', () => {
		const features = getClassFeaturesUpToLevel(fighter, 1);
		expect(features).toHaveLength(2);
		expect(features[0].name).toBe('Fighting Style');
		expect(features[1].name).toBe('Second Wind');
	});

	it('returns empty array when targetLevel is 0', () => {
		expect(getClassFeaturesUpToLevel(fighter, 0)).toHaveLength(0);
	});

	it('includes ASI features in the result', () => {
		const features = getClassFeaturesUpToLevel(fighter, 6);
		const asiFeatures = features.filter((f) => f.name === 'Ability Score Improvement');
		expect(asiFeatures).toHaveLength(2); // Level 4 and 6
	});
});

describe('getSubclassFeaturesUpToLevel', () => {
	const champion = fighter.subclasses[0];
	const lifeDomain = cleric.subclasses[0];

	it('returns Champion features through level 10', () => {
		const features = getSubclassFeaturesUpToLevel(champion, 10);
		expect(features.map((f) => f.name)).toEqual([
			'Improved Critical',
			'Remarkable Athlete',
			'Additional Fighting Style'
		]);
	});

	it('returns Life Domain features at level 3', () => {
		const features = getSubclassFeaturesUpToLevel(lifeDomain, 3);
		expect(features).toHaveLength(2);
		expect(features.map((f) => f.name)).toEqual(['Disciple of Life', 'Preserve Life']);
	});

	it('returns no Life Domain features before level 3', () => {
		const features = getSubclassFeaturesUpToLevel(lifeDomain, 2);
		expect(features).toHaveLength(0);
	});

	it('returns all Life Domain features at level 20', () => {
		const features = getSubclassFeaturesUpToLevel(lifeDomain, 20);
		expect(features).toHaveLength(4);
	});

	it('returns no features before subclass trigger level', () => {
		const features = getSubclassFeaturesUpToLevel(champion, 2);
		expect(features).toHaveLength(0);
	});
});

describe('isASILevel', () => {
	it('returns true for Fighter at level 4', () => {
		expect(isASILevel(fighter, 4)).toBe(true);
	});

	it('returns true for Fighter at level 6 (bonus ASI)', () => {
		expect(isASILevel(fighter, 6)).toBe(true);
	});

	it('returns false for Fighter at level 5', () => {
		expect(isASILevel(fighter, 5)).toBe(false);
	});

	it('returns false for Cleric at level 6', () => {
		expect(isASILevel(cleric, 6)).toBe(false);
	});

	it('returns true for Cleric at level 8', () => {
		expect(isASILevel(cleric, 8)).toBe(true);
	});
});

describe('getMaxSpellLevel', () => {
	it('returns 0 for non-caster (Fighter) at any level', () => {
		expect(getMaxSpellLevel(fighter, 1)).toBe(0);
		expect(getMaxSpellLevel(fighter, 20)).toBe(0);
	});

	it('returns 1 for Cleric at level 1 (has 1st level slots)', () => {
		expect(getMaxSpellLevel(cleric, 1)).toBe(1);
	});

	it('returns 2 for Cleric at level 3 (has 1st and 2nd level slots)', () => {
		expect(getMaxSpellLevel(cleric, 3)).toBe(2);
	});

	it('returns 3 for Cleric at level 5', () => {
		expect(getMaxSpellLevel(cleric, 5)).toBe(3);
	});

	it('returns 9 for Cleric at level 17', () => {
		expect(getMaxSpellLevel(cleric, 17)).toBe(9);
	});
});

describe('resolveClassLanguages', () => {
	const cantFeature = {
		id: 'thieves-cant',
		name: "Thieves' Cant",
		description: 'You know Thieves\' Cant and one other language of your choice.',
		level: 1,
		mechanicalEffect: 'language:thieves-cant',
		choices: [{
			id: 'language',
			name: 'Language',
			description: 'Choose one Standard language.',
			options: [
				{ id: 'elvish', name: 'Elvish', description: 'Elves' },
				{ id: 'dwarvish', name: 'Dwarvish', description: 'Dwarves' }
			],
			count: 1
		}]
	};

	const rogueWithCant: ClassDefinition = {
		...fighter,
		id: 'rogue',
		progression: [
			{ level: 1, proficiencyBonus: 2, features: [
				{ id: 'sneak-attack', name: 'Sneak Attack', description: 'Extra damage.', level: 1 },
				cantFeature
			]},
			{ level: 2, proficiencyBonus: 2, features: [
				{ id: 'cunning-action', name: 'Cunning Action', description: 'Dash, Disengage, or Hide.', level: 2 }
			]}
		]
	};

	it('resolves Thieves\' Cant language from mechanicalEffect', () => {
		const result = resolveClassLanguages(rogueWithCant, 1, []);
		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'language', value: 'thieves-cant' })
			])
		);
	});

	it('resolves language feature choice selection', () => {
		const result = resolveClassLanguages(rogueWithCant, 1, [
			{ featureId: 'thieves-cant', choiceId: 'language', selectedOptionIds: ['elvish'] }
		]);
		expect(result).toHaveLength(2); // thieves-cant + elvish
		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'language', value: 'thieves-cant' }),
				expect.objectContaining({ type: 'language', value: 'elvish' })
			])
		);
	});

	it('returns empty for class with no language features', () => {
		const result = resolveClassLanguages(fighter, 20, []);
		expect(result).toHaveLength(0);
	});

	it('respects character level (no language from higher-level features)', () => {
		const classWithL6Lang: ClassDefinition = {
			...fighter,
			id: 'test',
			progression: [
				{ level: 1, proficiencyBonus: 2, features: [] },
				{ level: 6, proficiencyBonus: 3, features: [{
					id: 'secret-tongue',
					name: 'Secret Tongue',
					description: 'You learn a secret language.',
					level: 6,
					mechanicalEffect: 'language:secret-tongue'
				}]}
			]
		};
		expect(resolveClassLanguages(classWithL6Lang, 5, [])).toHaveLength(0);
		expect(resolveClassLanguages(classWithL6Lang, 6, [])).toHaveLength(1);
	});
});
