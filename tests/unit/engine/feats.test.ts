import { describe, it, expect } from 'vitest';
import { getAvailableFeats } from '$lib/engine/feats.js';
import type { FeatDefinition, ClassDefinition } from '$lib/types/content-pack.js';
import type { FeatSelection } from '$lib/types/character.js';
import type { AbilityId } from '$lib/types/common.js';

const originFeat: FeatDefinition = {
	id: 'alert', name: 'Alert', description: '', category: 'origin',
	effects: [], repeatable: false
};
const generalFeat: FeatDefinition = {
	id: 'grappler', name: 'Grappler', description: '', category: 'general',
	prerequisites: [{ type: 'level', value: '4' }, { type: 'ability', value: 'str-or-dex-13' }],
	effects: [], abilityScoreIncrease: { abilities: ['str', 'dex'], count: 1, value: 1 },
	repeatable: false
};
const epicFeat: FeatDefinition = {
	id: 'boon-combat-prowess', name: 'Boon of Combat Prowess', description: '',
	category: 'epic', prerequisites: [{ type: 'level', value: '19' }],
	effects: [], abilityScoreIncrease: { abilities: ['str','dex','con','int','wis','cha'], count: 1, value: 1, max: 30 },
	repeatable: false
};
const fightingStyleFeat: FeatDefinition = {
	id: 'archery', name: 'Archery', description: '', category: 'fighting-style',
	prerequisites: [{ type: 'feature', value: 'fighting-style' }],
	effects: [], repeatable: false
};
const repeatableFeat: FeatDefinition = {
	id: 'skilled', name: 'Skilled', description: '', category: 'origin',
	effects: [], repeatable: true
};
const spellcastingEpic: FeatDefinition = {
	id: 'boon-spell-recall', name: 'Boon of Spell Recall', description: '',
	category: 'epic', prerequisites: [{ type: 'level', value: '19' }, { type: 'spellcasting', value: 'any' }],
	effects: [], repeatable: false
};

const allFeats = [originFeat, generalFeat, epicFeat, fightingStyleFeat, repeatableFeat, spellcastingEpic];

const scores = { str: 16, dex: 14, con: 12, int: 10, wis: 8, cha: 8 } as Record<AbilityId, number>;
const lowScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } as Record<AbilityId, number>;

const fighterClass = {
	id: 'fighter', spellcasting: null,
	progression: [{ level: 1, proficiencyBonus: 2, features: [{ id: 'fs', name: 'Fighting Style', description: '', level: 1 }] }]
} as unknown as ClassDefinition;

const wizardClass = {
	id: 'wizard', spellcasting: { ability: 'int', type: 'full', ritual: true, spellList: 'wizard', preparedCaster: true, cantrips: true },
	progression: [{ level: 1, proficiencyBonus: 2, features: [] }]
} as unknown as ClassDefinition;

const rogueClass = {
	id: 'rogue', spellcasting: null,
	progression: [{ level: 1, proficiencyBonus: 2, features: [] }]
} as unknown as ClassDefinition;

describe('getAvailableFeats', () => {
	it('at L4 shows origin + general feats', () => {
		const result = getAvailableFeats(allFeats, 4, rogueClass, [], scores);
		const ids = result.map(f => f.id);
		expect(ids).toContain('alert');
		expect(ids).toContain('grappler');
		expect(ids).toContain('skilled');
		expect(ids).not.toContain('boon-combat-prowess');
		expect(ids).not.toContain('archery');
	});

	it('at L19 shows all qualifying feats including epic', () => {
		const result = getAvailableFeats(allFeats, 19, rogueClass, [], scores);
		const ids = result.map(f => f.id);
		expect(ids).toContain('boon-combat-prowess');
		expect(ids).toContain('alert');
		expect(ids).toContain('grappler');
		expect(ids).not.toContain('boon-spell-recall');
	});

	it('L19 with spellcasting shows Boon of Spell Recall', () => {
		const result = getAvailableFeats(allFeats, 19, wizardClass, [], scores);
		expect(result.map(f => f.id)).toContain('boon-spell-recall');
	});

	it('excludes grappler when STR and DEX < 13', () => {
		const result = getAvailableFeats(allFeats, 4, rogueClass, [], lowScores);
		expect(result.map(f => f.id)).not.toContain('grappler');
	});

	it('excludes non-repeatable feats already taken', () => {
		const existing: FeatSelection[] = [{ featId: 'alert', source: 'class:rogue:4', choices: [] }];
		const result = getAvailableFeats(allFeats, 8, rogueClass, existing, scores);
		expect(result.map(f => f.id)).not.toContain('alert');
	});

	it('keeps repeatable feats even if already taken', () => {
		const existing: FeatSelection[] = [{ featId: 'skilled', source: 'class:rogue:4', choices: [] }];
		const result = getAvailableFeats(allFeats, 8, rogueClass, existing, scores);
		expect(result.map(f => f.id)).toContain('skilled');
	});

	it('shows fighting style feats for classes with Fighting Style feature', () => {
		const result = getAvailableFeats(allFeats, 19, fighterClass, [], scores);
		expect(result.map(f => f.id)).toContain('archery');
	});

	it('excludes fighting style feats for classes without the feature', () => {
		const result = getAvailableFeats(allFeats, 19, rogueClass, [], scores);
		expect(result.map(f => f.id)).not.toContain('archery');
	});

	it('excludes grappler at level 3 (level prerequisite)', () => {
		const result = getAvailableFeats(allFeats, 3, rogueClass, [], scores);
		expect(result.map(f => f.id)).not.toContain('grappler');
	});

	it('handles single-ability prerequisite format (str-13)', () => {
		const singlePrereqFeat: FeatDefinition = {
			...generalFeat, id: 'test-single',
			prerequisites: [{ type: 'ability', value: 'str-13' }]
		};
		const result = getAvailableFeats([singlePrereqFeat], 4, rogueClass, [], scores);
		expect(result.map(f => f.id)).toContain('test-single');
		const failResult = getAvailableFeats([singlePrereqFeat], 4, rogueClass, [], lowScores);
		expect(failResult.map(f => f.id)).not.toContain('test-single');
	});

	it('does not exclude feats with max:30 on abilityScoreIncrease', () => {
		const result = getAvailableFeats(allFeats, 19, rogueClass, [], scores);
		expect(result.map(f => f.id)).toContain('boon-combat-prowess');
	});
});
