import { describe, it, expect } from 'vitest';
import { filterSpells, hasActiveFilters, EMPTY_FILTERS, type SpellFilters } from '$lib/engine/spells.js';
import type { SpellDefinition } from '$lib/types/content-pack.js';

// ─── Test Fixtures ───────────────────────────────────────────

function makeSpell(overrides: Partial<SpellDefinition> & { name: string }): SpellDefinition {
	return {
		id: overrides.name.toLowerCase().replace(/\s+/g, '-'),
		level: 0,
		school: 'evocation',
		castingTime: '1 action',
		range: '120 feet',
		components: { verbal: true, somatic: true },
		duration: 'Instantaneous',
		concentration: false,
		ritual: false,
		description: '',
		lists: ['wizard'],
		...overrides
	} as SpellDefinition;
}

const fireball = makeSpell({ name: 'Fireball', level: 3, school: 'evocation' });
const shield = makeSpell({ name: 'Shield', level: 1, school: 'abjuration' });
const detectMagic = makeSpell({ name: 'Detect Magic', level: 1, school: 'divination', ritual: true, concentration: true });
const mistyStep = makeSpell({ name: 'Misty Step', level: 2, school: 'conjuration' });
const holdPerson = makeSpell({ name: 'Hold Person', level: 2, school: 'enchantment', concentration: true });
const fireBolt = makeSpell({ name: 'Fire Bolt', level: 0, school: 'evocation' });
const light = makeSpell({ name: 'Light', level: 0, school: 'evocation' });
const findFamiliar = makeSpell({ name: 'Find Familiar', level: 1, school: 'conjuration', ritual: true });

const allSpells = [fireball, shield, detectMagic, mistyStep, holdPerson, fireBolt, light, findFamiliar];

function filters(overrides: Partial<SpellFilters> = {}): SpellFilters {
	return { ...EMPTY_FILTERS, schools: new Set(), levels: new Set(), ...overrides };
}

// ─── hasActiveFilters ────────────────────────────────────────

describe('hasActiveFilters', () => {
	it('returns false for empty filters', () => {
		expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
	});

	it('returns true when search is set', () => {
		expect(hasActiveFilters(filters({ search: 'fire' }))).toBe(true);
	});

	it('returns true when schools are set', () => {
		expect(hasActiveFilters(filters({ schools: new Set(['evocation']) }))).toBe(true);
	});

	it('returns true when levels are set', () => {
		expect(hasActiveFilters(filters({ levels: new Set([1]) }))).toBe(true);
	});

	it('returns true when concentration is set', () => {
		expect(hasActiveFilters(filters({ concentration: true }))).toBe(true);
	});

	it('returns true when ritual is set', () => {
		expect(hasActiveFilters(filters({ ritual: true }))).toBe(true);
	});

	it('returns false for whitespace-only search', () => {
		expect(hasActiveFilters(filters({ search: '   ' }))).toBe(false);
	});
});

// ─── filterSpells ────────────────────────────────────────────

describe('filterSpells', () => {
	it('returns all spells with empty filters', () => {
		expect(filterSpells(allSpells, EMPTY_FILTERS)).toEqual(allSpells);
	});

	it('returns empty array for empty spell list', () => {
		expect(filterSpells([], filters({ search: 'fire' }))).toEqual([]);
	});

	// ─── Search ──────────────────────────────────────────────

	describe('search', () => {
		it('matches by name (case-insensitive)', () => {
			const result = filterSpells(allSpells, filters({ search: 'fire' }));
			expect(result).toEqual([fireball, fireBolt]);
		});

		it('matches by school name', () => {
			const result = filterSpells(allSpells, filters({ search: 'abjur' }));
			expect(result).toEqual([shield]);
		});

		it('matches partial words', () => {
			const result = filterSpells(allSpells, filters({ search: 'bol' }));
			expect(result).toEqual([fireBolt]);
		});

		it('trims whitespace from search query', () => {
			const result = filterSpells(allSpells, filters({ search: '  shield  ' }));
			expect(result).toEqual([shield]);
		});

		it('ignores empty search', () => {
			expect(filterSpells(allSpells, filters({ search: '' }))).toEqual(allSpells);
		});
	});

	// ─── Schools ─────────────────────────────────────────────

	describe('schools', () => {
		it('filters by single school', () => {
			const result = filterSpells(allSpells, filters({ schools: new Set(['evocation']) }));
			expect(result).toEqual([fireball, fireBolt, light]);
		});

		it('filters by multiple schools (OR logic)', () => {
			const result = filterSpells(allSpells, filters({ schools: new Set(['abjuration', 'divination']) }));
			expect(result).toEqual([shield, detectMagic]);
		});

		it('returns empty when no spells match school', () => {
			const result = filterSpells(allSpells, filters({ schools: new Set(['necromancy']) }));
			expect(result).toEqual([]);
		});
	});

	// ─── Levels ──────────────────────────────────────────────

	describe('levels', () => {
		it('filters by single level', () => {
			const result = filterSpells(allSpells, filters({ levels: new Set([0]) }));
			expect(result).toEqual([fireBolt, light]);
		});

		it('filters by multiple levels (OR logic)', () => {
			const result = filterSpells(allSpells, filters({ levels: new Set([1, 3]) }));
			expect(result).toEqual([fireball, shield, detectMagic, findFamiliar]);
		});
	});

	// ─── Concentration ───────────────────────────────────────

	describe('concentration', () => {
		it('filters to concentration only when true', () => {
			const result = filterSpells(allSpells, filters({ concentration: true }));
			expect(result).toEqual([detectMagic, holdPerson]);
		});

		it('shows all when null', () => {
			expect(filterSpells(allSpells, filters({ concentration: null }))).toEqual(allSpells);
		});
	});

	// ─── Ritual ──────────────────────────────────────────────

	describe('ritual', () => {
		it('filters to ritual only when true', () => {
			const result = filterSpells(allSpells, filters({ ritual: true }));
			expect(result).toEqual([detectMagic, findFamiliar]);
		});

		it('shows all when null', () => {
			expect(filterSpells(allSpells, filters({ ritual: null }))).toEqual(allSpells);
		});
	});

	// ─── Combined Filters ────────────────────────────────────

	describe('combined filters', () => {
		it('search + school', () => {
			const result = filterSpells(allSpells, filters({
				search: 'fire',
				schools: new Set(['evocation'])
			}));
			expect(result).toEqual([fireball, fireBolt]);
		});

		it('school + concentration', () => {
			const result = filterSpells(allSpells, filters({
				schools: new Set(['divination', 'enchantment']),
				concentration: true
			}));
			expect(result).toEqual([detectMagic, holdPerson]);
		});

		it('level + ritual', () => {
			const result = filterSpells(allSpells, filters({
				levels: new Set([1]),
				ritual: true
			}));
			expect(result).toEqual([detectMagic, findFamiliar]);
		});

		it('search + level + concentration narrows to single result', () => {
			const result = filterSpells(allSpells, filters({
				search: 'detect',
				levels: new Set([1]),
				concentration: true
			}));
			expect(result).toEqual([detectMagic]);
		});

		it('conflicting filters return empty', () => {
			const result = filterSpells(allSpells, filters({
				schools: new Set(['evocation']),
				ritual: true  // no evocation spells are rituals in our fixtures
			}));
			expect(result).toEqual([]);
		});
	});
});
