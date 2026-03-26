import { describe, it, expect } from 'vitest';
import {
	computePreparedSpellContext,
	getAvailableSpellsForPreparation
} from '$lib/engine/prepared-spells.js';
import type { SpellDefinition } from '$lib/types/content-pack.js';
import type { SpellKnown } from '$lib/types/character.js';
import { makeClassDef, makeCharacter, makeProgression, minimalPack, clericClass, wizardClass, fighterClass } from '../../fixtures/index.js';

// ─── Spell Fixtures ─────────────────────────────────────────

function makeSpell(overrides: Partial<SpellDefinition> & { id: string }): SpellDefinition {
	return {
		name: overrides.id,
		level: 1,
		school: 'evocation',
		castingTime: '1 action',
		range: '120 feet',
		components: { verbal: true, somatic: true, material: false },
		duration: 'Instantaneous',
		concentration: false,
		ritual: false,
		description: 'Test spell',
		lists: [],
		...overrides
	};
}

const clericSpells: SpellDefinition[] = [
	makeSpell({ id: 'cure-wounds', level: 1, lists: ['cleric'] }),
	makeSpell({ id: 'bless', level: 1, lists: ['cleric'] }),
	makeSpell({ id: 'spiritual-weapon', level: 2, lists: ['cleric'] }),
	makeSpell({ id: 'spirit-guardians', level: 3, lists: ['cleric'] }),
	makeSpell({ id: 'sacred-flame', level: 0, lists: ['cleric'] }),
	makeSpell({ id: 'healing-word', level: 1, lists: ['cleric', 'bard'] }),
];

const wizardSpells: SpellDefinition[] = [
	makeSpell({ id: 'magic-missile', level: 1, lists: ['wizard'] }),
	makeSpell({ id: 'shield', level: 1, lists: ['wizard'] }),
	makeSpell({ id: 'fireball', level: 3, lists: ['wizard', 'sorcerer'] }),
	makeSpell({ id: 'fire-bolt', level: 0, lists: ['wizard'] }),
	makeSpell({ id: 'misty-step', level: 2, lists: ['wizard', 'sorcerer'] }),
];

// ─── computePreparedSpellContext ─────────────────────────────

describe('computePreparedSpellContext', () => {
	it('returns null for non-caster class (Fighter)', () => {
		const data = makeCharacter({ level: 5 });
		const result = computePreparedSpellContext(data, fighterClass, minimalPack);
		expect(result).toBeNull();
	});

	it('returns correct maxPrepared for Cleric L5', () => {
		// Cleric fixture doesn't have preparedSpells — build one that does
		const clericWithPrep = makeClassDef({
			...clericClass,
			progression: clericClass.progression.map((row) => ({
				...row,
				preparedSpells: row.level + 3 // e.g., L5 → 8
			}))
		});
		const data = makeCharacter({ level: 5 });
		const result = computePreparedSpellContext(data, clericWithPrep, minimalPack);

		expect(result).not.toBeNull();
		expect(result!.maxPrepared).toBe(8); // 5 + 3
	});

	it('returns correct maxPrepared for Wizard L3', () => {
		const wizWithPrep = makeClassDef({
			...wizardClass,
			progression: wizardClass.progression.map((row) => ({
				...row,
				preparedSpells: row.level + 2
			}))
		});
		const data = makeCharacter({ level: 3 });
		const result = computePreparedSpellContext(data, wizWithPrep, minimalPack);

		expect(result).not.toBeNull();
		expect(result!.maxPrepared).toBe(5); // 3 + 2
	});

	it('isSpellbookCaster is true only for Wizard', () => {
		const wizWithPrep = makeClassDef({
			...wizardClass,
			progression: wizardClass.progression.map((row) => ({
				...row,
				preparedSpells: row.level + 2
			}))
		});
		const clericWithPrep = makeClassDef({
			...clericClass,
			progression: clericClass.progression.map((row) => ({
				...row,
				preparedSpells: row.level + 3
			}))
		});
		const data = makeCharacter({ level: 3 });

		const wizResult = computePreparedSpellContext(data, wizWithPrep, minimalPack);
		const clericResult = computePreparedSpellContext(data, clericWithPrep, minimalPack);

		expect(wizResult!.isSpellbookCaster).toBe(true);
		expect(clericResult!.isSpellbookCaster).toBe(false);
	});

	it('identifies alwaysPreparedIds from knownSpells', () => {
		const clericWithPrep = makeClassDef({
			...clericClass,
			progression: clericClass.progression.map((row) => ({
				...row,
				preparedSpells: row.level + 3
			}))
		});
		const data = makeCharacter({
			level: 3,
			spells: {
				knownSpells: [
					{ spellId: 'bless', source: 'subclass:life-domain', alwaysPrepared: true },
					{ spellId: 'cure-wounds', source: 'subclass:life-domain', alwaysPrepared: true },
					{ spellId: 'healing-word', source: 'class:cleric' }
				],
				preparedSpellIds: ['bless', 'cure-wounds', 'healing-word'],
				spellSlots: {}
			}
		});

		const result = computePreparedSpellContext(data, clericWithPrep, minimalPack);
		expect(result!.alwaysPreparedIds).toEqual(new Set(['bless', 'cure-wounds']));
	});

	it('returns null when progression row has no preparedSpells', () => {
		// Use base clericClass which has no preparedSpells in progression
		const data = makeCharacter({ level: 1 });
		const result = computePreparedSpellContext(data, clericClass, minimalPack);
		expect(result).toBeNull();
	});
});

// ─── getAvailableSpellsForPreparation ───────────────────────

describe('getAvailableSpellsForPreparation', () => {
	it('Wizard returns only spellbook spells (level 1+)', () => {
		const context = {
			maxPrepared: 4,
			maxSpellLevel: 2,
			spellListId: 'wizard',
			alwaysPreparedIds: new Set<string>(),
			isSpellbookCaster: true,
			className: 'Wizard'
		};
		const knownSpells: SpellKnown[] = [
			{ spellId: 'magic-missile', source: 'class:wizard' },
			{ spellId: 'shield', source: 'class:wizard' },
			{ spellId: 'fire-bolt', source: 'class:wizard' } // cantrip
		];

		const available = getAvailableSpellsForPreparation(context, knownSpells, wizardSpells);

		// Should include magic-missile and shield (level 1, in spellbook)
		// Should exclude fire-bolt (cantrip) and fireball (level 3 > maxSpellLevel 2)
		// Should exclude misty-step (not in spellbook even though level 2)
		expect(available.map((s) => s.id).sort()).toEqual(['magic-missile', 'shield']);
	});

	it('Cleric returns full class list spells (level 1+)', () => {
		const context = {
			maxPrepared: 8,
			maxSpellLevel: 3,
			spellListId: 'cleric',
			alwaysPreparedIds: new Set<string>(),
			isSpellbookCaster: false,
			className: 'Cleric'
		};
		const knownSpells: SpellKnown[] = []; // Cleric prepares from full list

		const available = getAvailableSpellsForPreparation(context, knownSpells, clericSpells);

		// Should include all cleric spells level 1-3, exclude cantrip
		const ids = available.map((s) => s.id).sort();
		expect(ids).toEqual(['bless', 'cure-wounds', 'healing-word', 'spirit-guardians', 'spiritual-weapon']);
		expect(ids).not.toContain('sacred-flame'); // cantrip excluded
	});

	it('respects maxSpellLevel cap', () => {
		const context = {
			maxPrepared: 4,
			maxSpellLevel: 1, // Only 1st-level spells
			spellListId: 'cleric',
			alwaysPreparedIds: new Set<string>(),
			isSpellbookCaster: false,
			className: 'Cleric'
		};

		const available = getAvailableSpellsForPreparation(context, [], clericSpells);

		// Only level 1 cleric spells
		const ids = available.map((s) => s.id).sort();
		expect(ids).toEqual(['bless', 'cure-wounds', 'healing-word']);
		expect(ids).not.toContain('spiritual-weapon'); // level 2
		expect(ids).not.toContain('spirit-guardians'); // level 3
	});

	it('excludes cantrips from available pool', () => {
		const context = {
			maxPrepared: 8,
			maxSpellLevel: 9,
			spellListId: 'wizard',
			alwaysPreparedIds: new Set<string>(),
			isSpellbookCaster: false, // Pretend non-spellbook for this test
			className: 'Wizard'
		};

		const available = getAvailableSpellsForPreparation(context, [], wizardSpells);

		expect(available.every((s) => s.level > 0)).toBe(true);
		expect(available.find((s) => s.id === 'fire-bolt')).toBeUndefined();
	});
});
