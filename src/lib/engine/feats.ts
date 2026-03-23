import type { FeatDefinition, ClassDefinition, FeatPrerequisite } from '$lib/types/content-pack.js';
import type { FeatSelection } from '$lib/types/character.js';
import type { AbilityId } from '$lib/types/common.js';

const EPIC_BOON_MIN_LEVEL = 19;

export const FEAT_CATEGORY_LABELS: Record<string, string> = {
	origin: 'Origin Feat',
	general: 'General Feat',
	'fighting-style': 'Fighting Style',
	epic: 'Epic Boon'
};

/**
 * Filter feats by availability based on character level, class, existing feats, and ability scores.
 *
 * At ASI levels (4, 8, 12, 16): Origin + General feats.
 * At L19+: ALL qualifying feats (Epic + Origin + General + Fighting Style if qualified).
 * Prerequisites are always checked.
 */
export function getAvailableFeats(
	allFeats: FeatDefinition[],
	level: number,
	classDef: ClassDefinition,
	existingFeats: FeatSelection[],
	abilityScores: Record<AbilityId, number>
): FeatDefinition[] {
	const isEpicEligible = level >= EPIC_BOON_MIN_LEVEL;
	const existingIds = new Set(existingFeats.map((f) => f.featId));

	return allFeats.filter((feat) => {
		// Category filter
		if (!isEpicEligible && feat.category === 'epic') return false;
		if (!isEpicEligible && feat.category === 'fighting-style') return false;

		// Non-repeatable already taken
		if (!feat.repeatable && existingIds.has(feat.id)) return false;

		// Prerequisites
		if (feat.prerequisites) {
			for (const prereq of feat.prerequisites) {
				if (!checkPrerequisite(prereq, level, classDef, abilityScores)) return false;
			}
		}

		return true;
	});
}

function checkPrerequisite(
	prereq: FeatPrerequisite,
	level: number,
	classDef: ClassDefinition,
	abilityScores: Record<AbilityId, number>
): boolean {
	switch (prereq.type) {
		case 'level':
			return level >= parseInt(prereq.value, 10);
		case 'ability':
			return checkAbilityPrerequisite(prereq.value, abilityScores);
		case 'spellcasting':
			return classDef.spellcasting != null;
		case 'feature':
			return hasClassFeature(classDef, prereq.value);
		case 'proficiency':
		case 'class':
			return true; // Not enforced yet
	}
}

function checkAbilityPrerequisite(value: string, scores: Record<AbilityId, number>): boolean {
	// Format: "str-or-dex-13" or "str-13"
	const parts = value.split('-');
	const min = parseInt(parts[parts.length - 1], 10);
	const abilities: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] === 'or') continue;
		if (!isNaN(parseInt(parts[i], 10))) continue;
		abilities.push(parts[i]);
	}
	return abilities.some((ab) => (scores[ab as AbilityId] ?? 0) >= min);
}

function hasClassFeature(classDef: ClassDefinition, featureName: string): boolean {
	const searchName = featureName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	for (const row of classDef.progression) {
		if (row.features.some((f) => f.name === searchName)) return true;
	}
	return false;
}
