/** Format an ability modifier with +/- sign */
export function formatModifier(mod: number): string {
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Format a class summary: "Fighter 5 / Wizard 3" */
export function formatClassSummary(classes: { name: string; level: number }[]): string {
	return classes.map((c) => `${c.name} ${c.level}`).join(' / ');
}

/** Format a spell level: 0 → "Cantrip", 1 → "1st", 2 → "2nd", etc. */
export function formatSpellLevel(level: number): string {
	if (level === 0) return 'Cantrip';
	const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
	return `${level}${suffixes[level] ?? 'th'}`;
}

/** Format currency: { gp: 15, sp: 3 } → "15 gp, 3 sp" */
export function formatCurrency(currency: Record<string, number>): string {
	const order = ['pp', 'gp', 'ep', 'sp', 'cp'];
	return order
		.filter((c) => currency[c] > 0)
		.map((c) => `${currency[c]} ${c}`)
		.join(', ') || '0 gp';
}

/** Capitalize first letter */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert kebab-case to Title Case */
export function kebabToTitle(str: string): string {
	return str.split('-').map(capitalize).join(' ');
}
