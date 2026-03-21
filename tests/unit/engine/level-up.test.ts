import { describe, it, expect } from 'vitest';
import { computeLevelUpChoices } from '$lib/engine/level-up.js';
import {
	makeFeatureFromArgs as makeFeature,
	makeProgressionFromArgs as makeProgression,
	fighterClass as fighter,
	wizardClass as wizard,
	makeCharacter,
	minimalPack
} from '../../fixtures/index.js';

// ─── Tests ───────────────────────────────────────────────────

describe('computeLevelUpChoices', () => {
	it('returns new level and features for Fighter L1→L2', () => {
		const data = makeCharacter({ level: 1 });
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result).not.toBeNull();
		expect(result!.newLevel).toBe(2);
		expect(result!.newFeatures).toHaveLength(1);
		expect(result!.newFeatures[0].name).toBe('Action Surge');
		expect(result!.needsASI).toBe(false);
		expect(result!.needsSubclass).toBe(false);
	});

	it('detects ASI at Fighter L3→L4', () => {
		const data = makeCharacter({
			level: 3,
			classes: [{ classId: 'fighter', subclassId: 'champion', level: 3, hitDie: '1d10', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result!.newLevel).toBe(4);
		expect(result!.needsASI).toBe(true);
		expect(result!.newFeatures.some((f) => f.name === 'Ability Score Improvement')).toBe(true);
	});

	it('detects subclass need at Fighter L2→L3 (no subclass chosen)', () => {
		const data = makeCharacter({
			level: 2,
			classes: [{ classId: 'fighter', level: 2, hitDie: '1d10', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result!.newLevel).toBe(3);
		expect(result!.needsSubclass).toBe(true);
	});

	it('does NOT need subclass if already chosen', () => {
		const data = makeCharacter({
			level: 2,
			classes: [{ classId: 'fighter', subclassId: 'champion', level: 2, hitDie: '1d10', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result!.needsSubclass).toBe(false);
	});

	it('returns null at max level (20)', () => {
		const data = makeCharacter({
			level: 20,
			classes: [{ classId: 'fighter', subclassId: 'champion', level: 20, hitDie: '1d10', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result).toBeNull();
	});

	it('computes spell deltas for Wizard L1→L2', () => {
		const data = makeCharacter({
			level: 1,
			classes: [{ classId: 'wizard', level: 1, hitDie: '1d6', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, wizard, minimalPack);

		expect(result!.newLevel).toBe(2);
		expect(result!.spellsKnownDelta).toBe(2); // 8 - 6
		expect(result!.cantripsKnownDelta).toBe(0); // still 3
		expect(result!.newMaxSpellLevel).toBe(1); // still only 1st level slots
		expect(result!.needsSubclass).toBe(true); // Wizard subclass at L2, none chosen
	});

	it('detects new cantrip at Wizard L3→L4', () => {
		const data = makeCharacter({
			level: 3,
			classes: [{ classId: 'wizard', subclassId: 'evocation', level: 3, hitDie: '1d6', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, wizard, minimalPack);

		expect(result!.newLevel).toBe(4);
		expect(result!.cantripsKnownDelta).toBe(1); // 4 - 3
		expect(result!.spellsKnownDelta).toBe(2); // 12 - 10
		expect(result!.needsASI).toBe(true);
	});

	it('detects new max spell level at Wizard L2→L3', () => {
		const data = makeCharacter({
			level: 2,
			classes: [{ classId: 'wizard', subclassId: 'evocation', level: 2, hitDie: '1d6', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, wizard, minimalPack);

		expect(result!.newMaxSpellLevel).toBe(2); // gains 2nd level slots
	});

	it('handles empty progression row gracefully', () => {
		const data = makeCharacter({
			level: 6,
			classes: [{ classId: 'fighter', subclassId: 'champion', level: 6, hitDie: '1d10', featureChoices: [] }]
		});
		const result = computeLevelUpChoices(data, fighter, minimalPack);

		expect(result!.newLevel).toBe(7);
		expect(result!.newFeatures).toEqual([]);
		expect(result!.needsASI).toBe(false);
	});
});
