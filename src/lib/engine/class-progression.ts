import type { ClassDefinition, ClassFeature, SubclassDefinition } from '$lib/types/content-pack.js';
import type { FeatureChoiceSelection, ProficiencySelection } from '$lib/types/character.js';

/** Name used for ASI features in progression data */
const ASI_FEATURE_NAME = 'Ability Score Improvement';

/**
 * Detect ASI levels by scanning progression features for "Ability Score Improvement".
 * Returns sorted array of levels where ASIs occur.
 *
 * Fighter → [4,6,8,12,14,16,19], most classes → [4,8,12,16,19]
 */
export function getASILevels(classDef: ClassDefinition): number[] {
	const levels: number[] = [];
	for (const row of classDef.progression) {
		if (row.features.some((f) => f.name === ASI_FEATURE_NAME)) {
			levels.push(row.level);
		}
	}
	return levels.sort((a, b) => a - b);
}

/**
 * Find the level at which subclass features first appear.
 * Reads the minimum level from the first subclass's features array.
 * Returns null if the class has no subclasses defined.
 */
export function getSubclassLevel(classDef: ClassDefinition): number | null {
	if (!classDef.subclasses || classDef.subclasses.length === 0) return null;

	// Find the earliest feature level across all subclasses
	let minLevel = Infinity;
	for (const sub of classDef.subclasses) {
		for (const feat of sub.features) {
			if (feat.level < minLevel) {
				minLevel = feat.level;
			}
		}
	}
	return minLevel === Infinity ? null : minLevel;
}

/**
 * Collect all class features gained from level 1 through targetLevel.
 * Features come from the class progression table (not subclass features).
 */
export function getClassFeaturesUpToLevel(
	classDef: ClassDefinition,
	targetLevel: number
): ClassFeature[] {
	const features: ClassFeature[] = [];
	for (const row of classDef.progression) {
		if (row.level > targetLevel) continue;
		features.push(...row.features);
	}
	return features;
}

/**
 * Collect subclass features gained up to targetLevel.
 */
export function getSubclassFeaturesUpToLevel(
	subclass: SubclassDefinition,
	targetLevel: number
): ClassFeature[] {
	return subclass.features.filter((f) => f.level <= targetLevel);
}

/**
 * Check if a specific level is an ASI level for a class.
 */
export function isASILevel(classDef: ClassDefinition, level: number): boolean {
	return getASILevels(classDef).includes(level);
}

/** Name used for Epic Boon features in progression data */
const EPIC_BOON_FEATURE_NAME = 'Epic Boon';

/**
 * Detect Epic Boon levels by scanning progression features for "Epic Boon".
 * Returns sorted array of levels where Epic Boons occur (typically [19]).
 */
export function getEpicBoonLevels(classDef: ClassDefinition): number[] {
	const levels: number[] = [];
	for (const row of classDef.progression) {
		if (row.features.some((f) => f.name === EPIC_BOON_FEATURE_NAME)) {
			levels.push(row.level);
		}
	}
	return levels.sort((a, b) => a - b);
}

/**
 * Check if a specific level is an Epic Boon level for a class.
 */
export function isEpicBoonLevel(classDef: ClassDefinition, level: number): boolean {
	return getEpicBoonLevels(classDef).includes(level);
}

/**
 * Get the highest spell level a class can cast at a given character level.
 * Reads from the progression table's spellSlots array.
 * Returns 0 if the class has no spellcasting at that level.
 */
export function getMaxSpellLevel(classDef: ClassDefinition, characterLevel: number): number {
	const row = classDef.progression.find((p) => p.level === characterLevel);
	if (!row?.spellSlots) return 0;
	// spellSlots is an array where index 0 = 1st level slots, etc.
	// The highest spell level = length of the array
	return row.spellSlots.length;
}

/**
 * Resolve proficiency grants from feature choice selections.
 * Walks the class progression to find matching features/choices/options and
 * reads `grants` from content-pack data — no hardcoded class/feature IDs.
 */
export function resolveFeatureChoiceProficiencies(
	classDef: ClassDefinition,
	featureChoices: FeatureChoiceSelection[]
): { type: 'armor' | 'weapon'; value: string; source: string }[] {
	const extra: { type: 'armor' | 'weapon'; value: string; source: string }[] = [];

	for (const fc of featureChoices) {
		for (const prog of classDef.progression) {
			const feature = prog.features.find((f) => f.id === fc.featureId);
			if (!feature?.choices) continue;
			const choice = feature.choices.find((c) => c.id === fc.choiceId);
			if (!choice) continue;
			for (const optionId of fc.selectedOptionIds) {
				const option = choice.options.find((o) => o.id === optionId);
				if (!option?.grants) continue;
				for (const grant of option.grants) {
					extra.push({
						type: grant.type,
						value: grant.value,
						source: `class:${classDef.id}:feature:${fc.featureId}`
					});
				}
			}
		}
	}

	return extra;
}

/**
 * Resolve language proficiencies from class features with mechanicalEffect "language:*".
 * Also resolves language feature choices (e.g., Thieves' Cant grants Thieves' Cant + 1 choice).
 */
export function resolveClassLanguages(
	classDef: ClassDefinition,
	characterLevel: number,
	featureChoices: FeatureChoiceSelection[]
): ProficiencySelection[] {
	const languages: ProficiencySelection[] = [];

	for (const row of classDef.progression) {
		if (row.level > characterLevel) continue;
		for (const feature of row.features) {
			const match = feature.mechanicalEffect?.match(/^language:(.+)$/);
			if (match) {
				languages.push({
					type: 'language',
					value: match[1],
					source: `class:${classDef.id}:feature:${feature.id}`
				});
			}
			// Resolve language choices on this feature (e.g., Thieves' Cant "pick 1 language")
			if (feature.choices) {
				for (const choice of feature.choices) {
					if (choice.id !== 'language') continue;
					const fc = featureChoices.find(
						(s) => s.featureId === feature.id && s.choiceId === 'language'
					);
					if (!fc) continue;
					for (const langId of fc.selectedOptionIds) {
						languages.push({
							type: 'language',
							value: langId,
							source: `class:${classDef.id}:feature:${feature.id}`
						});
					}
				}
			}
		}
	}

	return languages;
}
