import type { SpellDefinition } from '$lib/types/content-pack.js';
import type { SpellSchool } from '$lib/types/common.js';

// ─── Spell Filter Types ─────────────────────────────────────

export interface SpellFilters {
	search: string;
	schools: Set<SpellSchool>;
	levels: Set<number>;
	concentration: boolean | null; // null = no filter
	ritual: boolean | null;
}

export const EMPTY_FILTERS: SpellFilters = {
	search: '',
	schools: new Set(),
	levels: new Set(),
	concentration: null,
	ritual: null
};

// ─── Filter Functions ───────────────────────────────────────

/** Returns true if any filter is active (non-default) */
export function hasActiveFilters(filters: SpellFilters): boolean {
	return (
		filters.search.trim() !== '' ||
		filters.schools.size > 0 ||
		filters.levels.size > 0 ||
		filters.concentration !== null ||
		filters.ritual !== null
	);
}

/** Filter spells by all active filters. Pure function, no side effects. */
export function filterSpells(spells: SpellDefinition[], filters: SpellFilters): SpellDefinition[] {
	return spells.filter((spell) => {
		// Text search: match name or school
		if (filters.search.trim()) {
			const q = filters.search.trim().toLowerCase();
			if (!spell.name.toLowerCase().includes(q) && !spell.school.toLowerCase().includes(q)) {
				return false;
			}
		}

		// School filter
		if (filters.schools.size > 0 && !filters.schools.has(spell.school)) {
			return false;
		}

		// Level filter
		if (filters.levels.size > 0 && !filters.levels.has(spell.level)) {
			return false;
		}

		// Concentration filter
		if (filters.concentration === true && !spell.concentration) return false;

		// Ritual filter
		if (filters.ritual === true && !spell.ritual) return false;

		return true;
	});
}
