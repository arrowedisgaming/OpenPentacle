import type { ClassDefinition, ClassFeature, SubclassDefinition } from '$lib/types/content-pack.js';

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
