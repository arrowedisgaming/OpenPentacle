import { describe, expect, it } from 'vitest';
import type { ClassSelection, FeatureChoiceSelection } from '$lib/types/character.js';
import { buildClassSelection, mergeFeatureChoices } from '$lib/wizard/class-step.js';

function makeChoice(
	featureId: string,
	choiceId: string,
	selectedOptionIds: string[]
): FeatureChoiceSelection {
	return { featureId, choiceId, selectedOptionIds };
}

describe('class-step helpers', () => {
	it('preserves subclass when class stays the same', () => {
		const existingClass: ClassSelection = {
			classId: 'druid',
			subclassId: 'circle-of-land',
			level: 4,
			hitDie: 'd8',
			featureChoices: [makeChoice('feature-a', 'choice-a', ['one'])]
		};

		const updated = buildClassSelection({
			existingClass,
			selectedClassId: 'druid',
			selectedLevel: 8,
			hitDie: 'd8',
			selectedClassFeatureChoices: [makeChoice('feature-a', 'choice-a', ['two'])]
		});

		expect(updated.subclassId).toBe('circle-of-land');
		expect(updated.featureChoices).toEqual([makeChoice('feature-a', 'choice-a', ['two'])]);
	});

	it('clears subclass when class changes', () => {
		const existingClass: ClassSelection = {
			classId: 'druid',
			subclassId: 'circle-of-land',
			level: 4,
			hitDie: 'd8',
			featureChoices: [makeChoice('feature-a', 'choice-a', ['one'])]
		};

		const updated = buildClassSelection({
			existingClass,
			selectedClassId: 'fighter',
			selectedLevel: 4,
			hitDie: 'd10',
			selectedClassFeatureChoices: [makeChoice('feature-b', 'choice-b', ['style-1'])]
		});

		expect(updated.classId).toBe('fighter');
		expect(updated.subclassId).toBeUndefined();
		expect(updated.featureChoices).toEqual([makeChoice('feature-b', 'choice-b', ['style-1'])]);
	});

	it('keeps unrelated feature choices when merging', () => {
		const existing = [
			makeChoice('class-feature', 'fighting-style', ['defense']),
			makeChoice('subclass-feature', 'hunter-prey', ['colossus-slayer'])
		];
		const incoming = [makeChoice('class-feature', 'fighting-style', ['archery'])];

		const merged = mergeFeatureChoices(existing, incoming);
		expect(merged).toEqual([
			makeChoice('subclass-feature', 'hunter-prey', ['colossus-slayer']),
			makeChoice('class-feature', 'fighting-style', ['archery'])
		]);
	});
});
