import type { ProficiencyTableEntry } from '$lib/types/content-pack.js';

/** Standard 5e proficiency bonus by level */
export const STANDARD_PROFICIENCY_TABLE: ProficiencyTableEntry[] = [
	{ level: 1, bonus: 2 }, { level: 2, bonus: 2 }, { level: 3, bonus: 2 }, { level: 4, bonus: 2 },
	{ level: 5, bonus: 3 }, { level: 6, bonus: 3 }, { level: 7, bonus: 3 }, { level: 8, bonus: 3 },
	{ level: 9, bonus: 4 }, { level: 10, bonus: 4 }, { level: 11, bonus: 4 }, { level: 12, bonus: 4 },
	{ level: 13, bonus: 5 }, { level: 14, bonus: 5 }, { level: 15, bonus: 5 }, { level: 16, bonus: 5 },
	{ level: 17, bonus: 6 }, { level: 18, bonus: 6 }, { level: 19, bonus: 6 }, { level: 20, bonus: 6 }
];

/** Get proficiency bonus for a given character level */
export function proficiencyBonus(
	level: number,
	table: ProficiencyTableEntry[] = STANDARD_PROFICIENCY_TABLE
): number {
	const entry = table.find((e) => e.level === level);
	if (entry) return entry.bonus;
	// Fallback formula: ceil(level / 4) + 1
	return Math.ceil(level / 4) + 1;
}
