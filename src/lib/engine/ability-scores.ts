import type { AbilityId } from '$lib/types/common.js';
import type { AbilityScoreData } from '$lib/types/character.js';
import type { PointBuyConfig } from '$lib/types/content-pack.js';
import { ABILITY_IDS } from '$lib/types/common.js';

/** Standard 5e point buy cost table (covers 8–15) */
export const STANDARD_POINT_BUY_COSTS: Record<number, number> = {
	8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

/** Calculate ability modifier from score: floor((score - 10) / 2) */
export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

// Re-export formatModifier so existing imports from this module continue to work
export { formatModifier } from '$lib/utils/format.js';

/** Calculate total score for a single ability, summing base + all bonuses */
export function totalAbilityScore(data: AbilityScoreData, ability: AbilityId): number {
	const base = data.base[ability] ?? 10;
	const originBonus = data.originBonuses
		.filter((b) => b.ability === ability)
		.reduce((sum, b) => sum + b.value, 0);
	const levelUpBonus = data.levelUpBonuses
		.filter((b) => b.ability === ability)
		.reduce((sum, b) => sum + b.value, 0);
	const featBonus = data.featBonuses
		.filter((b) => b.ability === ability)
		.reduce((sum, b) => sum + b.value, 0);
	return Math.min(base + originBonus + levelUpBonus + featBonus, 30);
}

/** Calculate all six ability totals */
export function allAbilityTotals(data: AbilityScoreData): Record<AbilityId, number> {
	const result = {} as Record<AbilityId, number>;
	for (const ability of ABILITY_IDS) {
		result[ability] = totalAbilityScore(data, ability);
	}
	return result;
}

/** Calculate all six ability modifiers */
export function allAbilityModifiers(data: AbilityScoreData): Record<AbilityId, number> {
	const result = {} as Record<AbilityId, number>;
	for (const ability of ABILITY_IDS) {
		result[ability] = abilityModifier(totalAbilityScore(data, ability));
	}
	return result;
}

/** Calculate total point buy cost for a set of base scores */
export function pointBuyCost(
	scores: Record<AbilityId, number>,
	costs: Record<number, number> = STANDARD_POINT_BUY_COSTS
): number {
	let total = 0;
	for (const ability of ABILITY_IDS) {
		const score = scores[ability];
		const cost = costs[score];
		if (cost === undefined) {
			throw new Error(`Invalid score ${score} for point buy`);
		}
		total += cost;
	}
	return total;
}

/** Check if a point buy allocation is valid */
export function isValidPointBuy(
	scores: Record<AbilityId, number>,
	config: PointBuyConfig
): { valid: boolean; spent: number; remaining: number; errors: string[] } {
	const errors: string[] = [];
	for (const ability of ABILITY_IDS) {
		const score = scores[ability];
		if (score < config.minimum) {
			errors.push(`${ability.toUpperCase()} (${score}) is below minimum ${config.minimum}`);
		}
		if (score > config.maximum) {
			errors.push(`${ability.toUpperCase()} (${score}) is above maximum ${config.maximum}`);
		}
	}
	let spent = 0;
	try {
		spent = pointBuyCost(scores, config.costs);
	} catch {
		errors.push('One or more scores has no valid cost in the point buy table');
	}
	if (spent > config.budget) {
		errors.push(`Spent ${spent} points, but budget is ${config.budget}`);
	}
	return {
		valid: errors.length === 0,
		spent,
		remaining: config.budget - spent,
		errors
	};
}

/** Validate a standard array allocation (all values used exactly once) */
export function isValidStandardArray(
	scores: Record<AbilityId, number>,
	array: number[]
): boolean {
	const assigned = ABILITY_IDS.map((a) => scores[a]).sort((a, b) => a - b);
	const sorted = [...array].sort((a, b) => a - b);
	return assigned.length === sorted.length && assigned.every((v, i) => v === sorted[i]);
}
