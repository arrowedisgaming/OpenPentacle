import type { ArmorProperties } from '$lib/types/content-pack.js';
import { abilityModifier } from './ability-scores.js';

/**
 * Calculate Armor Class.
 *
 * Rules:
 * - No armor: 10 + DEX modifier
 * - Light armor: baseAC + DEX modifier
 * - Medium armor: baseAC + DEX modifier (max +2)
 * - Heavy armor: baseAC (no DEX)
 * - Shield: +2 bonus
 */
export function calculateAC(
	dexScore: number,
	armor: ArmorProperties | null,
	hasShield: boolean,
	bonuses: number = 0
): number {
	const dexMod = abilityModifier(dexScore);
	let ac: number;

	if (!armor) {
		// Unarmored: 10 + DEX
		ac = 10 + dexMod;
	} else {
		switch (armor.category) {
			case 'light':
				ac = armor.baseAC + dexMod;
				break;
			case 'medium':
				ac = armor.baseAC + Math.min(dexMod, armor.maxDexBonus ?? 2);
				break;
			case 'heavy':
				ac = armor.baseAC;
				break;
			default:
				ac = 10 + dexMod;
		}
	}

	if (hasShield) {
		ac += 2;
	}

	return ac + bonuses;
}
