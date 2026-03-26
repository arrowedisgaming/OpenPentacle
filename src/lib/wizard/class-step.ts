import type { ClassSelection, FeatureChoiceSelection } from '$lib/types/character.js';
import type { DiceNotation } from '$lib/types/common.js';

function featureChoiceKey(choice: FeatureChoiceSelection): string {
	return `${choice.featureId}::${choice.choiceId}`;
}

export function mergeFeatureChoices(
	existing: FeatureChoiceSelection[],
	incoming: FeatureChoiceSelection[]
): FeatureChoiceSelection[] {
	const incomingByKey = new Map(incoming.map((choice) => [featureChoiceKey(choice), choice]));
	const merged: FeatureChoiceSelection[] = [];

	for (const choice of existing) {
		const key = featureChoiceKey(choice);
		if (!incomingByKey.has(key)) {
			merged.push(choice);
		}
	}

	return [...merged, ...incoming];
}

interface BuildClassSelectionParams {
	existingClass?: ClassSelection;
	selectedClassId: string;
	selectedLevel: number;
	hitDie: DiceNotation;
	selectedClassFeatureChoices: FeatureChoiceSelection[];
}

export function buildClassSelection({
	existingClass,
	selectedClassId,
	selectedLevel,
	hitDie,
	selectedClassFeatureChoices
}: BuildClassSelectionParams): ClassSelection {
	const classChanged = !!existingClass && existingClass.classId !== selectedClassId;

	if (!existingClass || classChanged) {
		return {
			classId: selectedClassId,
			level: selectedLevel,
			hitDie,
			featureChoices: selectedClassFeatureChoices
		};
	}

	return {
		...existingClass,
		classId: selectedClassId,
		level: selectedLevel,
		hitDie,
		featureChoices: mergeFeatureChoices(existingClass.featureChoices ?? [], selectedClassFeatureChoices)
	};
}
