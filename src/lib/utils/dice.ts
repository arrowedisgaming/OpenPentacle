/** Parse dice notation "XdY" → { count, sides } */
export function parseDice(notation: string): { count: number; sides: number } {
	const match = notation.match(/^(\d+)d(\d+)$/);
	if (!match) throw new Error(`Invalid dice notation: ${notation}`);
	return { count: parseInt(match[1], 10), sides: parseInt(match[2], 10) };
}

/** Roll a single die (1 to sides inclusive) */
export function rollDie(sides: number): number {
	return Math.floor(Math.random() * sides) + 1;
}

/** Roll XdY and return individual results */
export function rollDice(notation: string): number[] {
	const { count, sides } = parseDice(notation);
	return Array.from({ length: count }, () => rollDie(sides));
}

/** Roll 4d6 drop lowest (standard ability score generation) */
export function roll4d6DropLowest(): { rolls: number[]; kept: number[]; total: number } {
	const rolls = rollDice('4d6');
	const sorted = [...rolls].sort((a, b) => b - a);
	const kept = sorted.slice(0, 3);
	return { rolls, kept, total: kept.reduce((a, b) => a + b, 0) };
}

/** Generate a full set of 6 ability scores using 4d6 drop lowest */
export function rollAbilityScores(): { rolls: number[]; kept: number[]; total: number }[] {
	return Array.from({ length: 6 }, () => roll4d6DropLowest());
}
