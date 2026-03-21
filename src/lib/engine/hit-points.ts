import type { ClassSelection } from '$lib/types/character.js';
import { abilityModifier } from './ability-scores.js';
import { parseDice } from '$lib/utils/dice.js';

// Re-export parseDice so existing imports from this module continue to work
export { parseDice } from '$lib/utils/dice.js';

/**
 * Calculate maximum hit points for a character.
 *
 * Rules:
 * - First level of first class: max hit die + CON modifier
 * - Each subsequent level: average roll (ceil(sides/2) + 1) + CON modifier (minimum 1 HP per level)
 */
export function calculateMaxHP(
	classes: ClassSelection[],
	conScore: number,
	bonusHPPerLevel: number = 0
): number {
	const conMod = abilityModifier(conScore);
	let total = 0;
	let isFirstLevel = true;

	for (const cls of classes) {
		const { sides } = parseDice(cls.hitDie);
		for (let i = 0; i < cls.level; i++) {
			let levelHP: number;
			if (isFirstLevel) {
				// First level: max hit die value
				levelHP = sides + conMod + bonusHPPerLevel;
				isFirstLevel = false;
			} else {
				// Subsequent levels: average (rounded up) + CON mod
				const averageRoll = Math.ceil(sides / 2) + 1;
				levelHP = averageRoll + conMod + bonusHPPerLevel;
			}
			// Minimum 1 HP per level
			total += Math.max(levelHP, 1);
		}
	}

	return total;
}

/** Get the average HP per level for a hit die (used in UI preview) */
export function averageHitDieRoll(hitDie: string): number {
	const { sides } = parseDice(hitDie);
	return Math.ceil(sides / 2) + 1;
}
