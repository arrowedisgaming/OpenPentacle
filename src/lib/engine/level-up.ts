import type { CharacterData } from '$lib/types/character.js';
import type { ClassDefinition, ClassFeature, ContentPack } from '$lib/types/content-pack.js';
import { isASILevel, getSubclassLevel } from './class-progression.js';

/** Everything the level-up page needs to know about the next level */
export interface LevelUpChoices {
	/** The level the character will become */
	newLevel: number;
	/** Class features gained at the new level */
	newFeatures: ClassFeature[];
	/** Whether this level requires selecting a subclass */
	needsSubclass: boolean;
	/** Whether this level is an ASI level */
	needsASI: boolean;
	/** Change in spells known at this level (0 if N/A) */
	spellsKnownDelta: number;
	/** Change in cantrips known at this level (0 if N/A) */
	cantripsKnownDelta: number;
	/** Highest spell level available at the new level */
	newMaxSpellLevel: number;
}

/**
 * Compute what choices the player needs to make for the next level.
 * Returns null if the character is already at max level.
 */
export function computeLevelUpChoices(
	data: CharacterData,
	classDef: ClassDefinition,
	pack: ContentPack
): LevelUpChoices | null {
	const maxLevel = pack.systemMechanics.maxLevel;
	if (data.level >= maxLevel) return null;

	const newLevel = data.level + 1;
	const primaryClass = data.classes[0];
	if (!primaryClass) return null;

	// Features gained at this exact level
	const progressionRow = classDef.progression.find((p) => p.level === newLevel);
	const newFeatures = progressionRow?.features ?? [];

	// Subclass: needed if this level is the subclass trigger AND no subclass chosen yet
	const subclassLevel = getSubclassLevel(classDef);
	const needsSubclass =
		subclassLevel !== null &&
		newLevel >= subclassLevel &&
		!primaryClass.subclassId;

	// ASI
	const needsASI = isASILevel(classDef, newLevel);

	// Spells known delta
	const prevRow = classDef.progression.find((p) => p.level === data.level);
	const prevSpellsKnown = prevRow?.spellsKnown ?? 0;
	const newSpellsKnown = progressionRow?.spellsKnown ?? 0;
	const spellsKnownDelta = newSpellsKnown - prevSpellsKnown;

	// Cantrips known delta
	const prevCantrips = prevRow?.cantripsKnown ?? 0;
	const newCantrips = progressionRow?.cantripsKnown ?? 0;
	const cantripsKnownDelta = newCantrips - prevCantrips;

	// Max spell level at the new level
	const newSpellSlots = progressionRow?.spellSlots ?? [];
	const newMaxSpellLevel = newSpellSlots.length;

	return {
		newLevel,
		newFeatures,
		needsSubclass,
		needsASI,
		spellsKnownDelta,
		cantripsKnownDelta,
		newMaxSpellLevel
	};
}
