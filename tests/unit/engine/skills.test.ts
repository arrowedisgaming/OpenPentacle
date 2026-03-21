import { describe, it, expect } from 'vitest';
import { computeSkillChoiceContext, getSelectableSkills } from '$lib/engine/skills.js';
import type { ClassDefinition, BackgroundDefinition } from '$lib/types/content-pack.js';
import { makeClassDef } from '../../fixtures/index.js';

// ─── Test Fixtures ───────────────────────────────────────────

function makeClass(skillChoices: { choices: string[]; count: number }): ClassDefinition {
	return makeClassDef({
		skillChoices: skillChoices as ClassDefinition['skillChoices']
	});
}

function makeBackground(skills: string[]): BackgroundDefinition {
	return {
		id: 'test-bg',
		name: 'Test Background',
		description: '',
		skillProficiencies: skills.map((s) => ({ value: s })),
		toolProficiencies: [],
		languages: [],
		equipment: [],
		feature: { id: 'f', name: 'F', description: '' }
	};
}

// ─── Tests ───────────────────────────────────────────────────

describe('computeSkillChoiceContext', () => {
	it('returns background skills and class choice pool with no overlap', () => {
		const cls = makeClass({ choices: ['athletics', 'acrobatics', 'stealth'], count: 2 });
		const bg = makeBackground(['insight', 'religion']);

		const ctx = computeSkillChoiceContext(cls, bg);

		expect(ctx.backgroundSkills).toEqual(['insight', 'religion']);
		expect(ctx.classChoicePool).toEqual(['athletics', 'acrobatics', 'stealth']);
		expect(ctx.classChoiceCount).toBe(2);
		expect(ctx.overlapSkills).toEqual([]);
	});

	it('detects overlapping skills between background and class pool', () => {
		const cls = makeClass({ choices: ['insight', 'religion', 'history', 'medicine'], count: 2 });
		const bg = makeBackground(['insight', 'religion']);

		const ctx = computeSkillChoiceContext(cls, bg);

		expect(ctx.overlapSkills).toEqual(['insight', 'religion']);
	});

	it('replacement pool excludes both class pool and background skills', () => {
		const cls = makeClass({ choices: ['athletics', 'acrobatics'], count: 2 });
		const bg = makeBackground(['insight']);

		const ctx = computeSkillChoiceContext(cls, bg);

		expect(ctx.replacementPool).not.toContain('athletics');
		expect(ctx.replacementPool).not.toContain('acrobatics');
		expect(ctx.replacementPool).not.toContain('insight');
		// Should contain other skills like stealth, perception, etc.
		expect(ctx.replacementPool).toContain('stealth');
		expect(ctx.replacementPool).toContain('perception');
	});

	it('handles null background gracefully', () => {
		const cls = makeClass({ choices: ['athletics', 'stealth'], count: 2 });

		const ctx = computeSkillChoiceContext(cls, null);

		expect(ctx.backgroundSkills).toEqual([]);
		expect(ctx.overlapSkills).toEqual([]);
		expect(ctx.classChoiceCount).toBe(2);
	});

	it('handles Rogue with 4 skill choices', () => {
		const cls = makeClass({
			choices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation',
				'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth'],
			count: 4
		});
		const bg = makeBackground(['deception', 'stealth']);

		const ctx = computeSkillChoiceContext(cls, bg);

		expect(ctx.classChoiceCount).toBe(4);
		expect(ctx.overlapSkills).toEqual(['deception', 'stealth']);
		expect(ctx.backgroundSkills).toEqual(['deception', 'stealth']);
	});

	it('handles Bard (all 18 skills) with overlapping background', () => {
		const allSkills = [
			'acrobatics', 'animal-handling', 'arcana', 'athletics',
			'deception', 'history', 'insight', 'intimidation',
			'investigation', 'medicine', 'nature', 'perception',
			'performance', 'persuasion', 'religion', 'sleight-of-hand',
			'stealth', 'survival'
		];
		const cls = makeClass({ choices: allSkills, count: 3 });
		const bg = makeBackground(['insight', 'religion']);

		const ctx = computeSkillChoiceContext(cls, bg);

		// With Bard, all skills are in class pool, so replacement pool = empty
		// (background skills are in class pool → overlap, but no skills outside class pool)
		expect(ctx.overlapSkills).toEqual(['insight', 'religion']);
		expect(ctx.replacementPool).toEqual([]);
	});
});

describe('getSelectableSkills', () => {
	it('returns class pool minus background skills, plus replacements', () => {
		const cls = makeClass({ choices: ['athletics', 'insight', 'stealth'], count: 2 });
		const bg = makeBackground(['insight']);

		const ctx = computeSkillChoiceContext(cls, bg);
		const selectable = getSelectableSkills(ctx);

		// insight is removed (background-granted), athletics and stealth remain
		expect(selectable).toContain('athletics');
		expect(selectable).toContain('stealth');
		expect(selectable).not.toContain('insight');
		// replacement pool skills should also be present
		expect(selectable).toContain('perception');
		expect(selectable).toContain('arcana');
	});

	it('returns just class pool when no overlap', () => {
		const cls = makeClass({ choices: ['athletics', 'acrobatics'], count: 2 });
		const bg = makeBackground(['insight', 'religion']);

		const ctx = computeSkillChoiceContext(cls, bg);
		const selectable = getSelectableSkills(ctx);

		// No overlap, so selectable = class pool (background skills excluded from replacement)
		expect(selectable).toContain('athletics');
		expect(selectable).toContain('acrobatics');
		expect(selectable).not.toContain('insight');
		expect(selectable).not.toContain('religion');
	});

	it('returns no overlap skills as selectable even when they are in class pool', () => {
		const cls = makeClass({ choices: ['insight', 'religion', 'history'], count: 2 });
		const bg = makeBackground(['insight', 'religion']);

		const ctx = computeSkillChoiceContext(cls, bg);
		const selectable = getSelectableSkills(ctx);

		// insight and religion are background-granted, so NOT selectable
		expect(selectable).not.toContain('insight');
		expect(selectable).not.toContain('religion');
		// history remains from class pool
		expect(selectable).toContain('history');
		// replacement pool skills are also available
		expect(selectable.length).toBeGreaterThan(1);
	});
});
