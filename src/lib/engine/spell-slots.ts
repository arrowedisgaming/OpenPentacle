import type { ClassSelection } from '$lib/types/character.js';
import type { SpellcastingConfig } from '$lib/types/content-pack.js';

/** Standard 5e spell slot table: spellSlots[casterLevel][spellLevel] */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
	1:  [2],
	2:  [3],
	3:  [4, 2],
	4:  [4, 3],
	5:  [4, 3, 2],
	6:  [4, 3, 3],
	7:  [4, 3, 3, 1],
	8:  [4, 3, 3, 2],
	9:  [4, 3, 3, 3, 1],
	10: [4, 3, 3, 3, 2],
	11: [4, 3, 3, 3, 2, 1],
	12: [4, 3, 3, 3, 2, 1],
	13: [4, 3, 3, 3, 2, 1, 1],
	14: [4, 3, 3, 3, 2, 1, 1],
	15: [4, 3, 3, 3, 2, 1, 1, 1],
	16: [4, 3, 3, 3, 2, 1, 1, 1],
	17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
	18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
	19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
	20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

/** Pact Magic slot table: pactSlots[warlockLevel] = { count, level } */
const PACT_SLOTS: Record<number, { count: number; level: number }> = {
	1:  { count: 1, level: 1 },
	2:  { count: 2, level: 1 },
	3:  { count: 2, level: 2 },
	4:  { count: 2, level: 2 },
	5:  { count: 2, level: 3 },
	6:  { count: 2, level: 3 },
	7:  { count: 2, level: 4 },
	8:  { count: 2, level: 4 },
	9:  { count: 2, level: 5 },
	10: { count: 2, level: 5 },
	11: { count: 3, level: 5 },
	12: { count: 3, level: 5 },
	13: { count: 3, level: 5 },
	14: { count: 3, level: 5 },
	15: { count: 3, level: 5 },
	16: { count: 3, level: 5 },
	17: { count: 4, level: 5 },
	18: { count: 4, level: 5 },
	19: { count: 4, level: 5 },
	20: { count: 4, level: 5 }
};

/**
 * Calculate multiclass caster level from class levels + spellcasting configs.
 * Full casters contribute their full level, half casters half (rounded down),
 * third casters a third (rounded down). Pact casters don't contribute.
 */
export function multiclassCasterLevel(
	classes: { level: number; spellcasting: SpellcastingConfig | undefined }[]
): number {
	let total = 0;
	for (const cls of classes) {
		if (!cls.spellcasting || cls.spellcasting.type === 'pact') continue;
		switch (cls.spellcasting.type) {
			case 'full':
				total += cls.level;
				break;
			case 'half':
				total += Math.floor(cls.level / 2);
				break;
			case 'third':
				total += Math.floor(cls.level / 3);
				break;
		}
	}
	return total;
}

/** Get spell slots for a given caster level (non-pact) */
export function spellSlotsForCasterLevel(casterLevel: number): Record<number, number> {
	const slots: Record<number, number> = {};
	if (casterLevel <= 0) return slots;
	const level = Math.min(casterLevel, 20);
	const table = FULL_CASTER_SLOTS[level] ?? [];
	for (let i = 0; i < table.length; i++) {
		slots[i + 1] = table[i];
	}
	return slots;
}

/** Get pact magic slots for a warlock level */
export function pactSlotsForLevel(warlockLevel: number): { count: number; level: number } | null {
	if (warlockLevel <= 0) return null;
	return PACT_SLOTS[Math.min(warlockLevel, 20)] ?? null;
}

/**
 * Calculate all spell slots for a character, handling multiclass.
 * Returns { slots: Record<spellLevel, count>, pactSlots?: { count, level } }
 */
export function calculateSpellSlots(
	classes: { level: number; spellcasting: SpellcastingConfig | undefined }[]
): { slots: Record<number, number>; pactSlots: { count: number; level: number } | null } {
	const casterLevel = multiclassCasterLevel(classes);
	const slots = spellSlotsForCasterLevel(casterLevel);

	// Handle pact magic separately
	const pactClass = classes.find((c) => c.spellcasting?.type === 'pact');
	const pactSlots = pactClass ? pactSlotsForLevel(pactClass.level) : null;

	return { slots, pactSlots };
}
