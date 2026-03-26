import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ClassDefinition } from '$lib/types/content-pack.js';
import { resolveFeatureChoiceProficiencies } from '$lib/engine/class-progression.js';

interface ExpectedChoice {
	classId: string;
	featureIdOrName: string;
	level: number;
	choiceIdOrName: string;
	count: number;
	options: string[];
	citation: string;
}

const ROOT = process.cwd();
const EXPECTED_PATH = join(ROOT, 'tests', 'fixtures', 'srd521', 'class-choices.expected.json');
const CLASSES_PATH = join(ROOT, 'static', 'content-packs', 'srd521', 'classes.json');

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

describe('SRD 5.2.1 class choice coverage', () => {
	const classes = readJson<ClassDefinition[]>(CLASSES_PATH);

	it('covers expected SRD class choices in structured class feature choices', () => {
		const expected = readJson<ExpectedChoice[]>(EXPECTED_PATH);

		for (const item of expected) {
			const classDef = classes.find((c) => c.id === item.classId);
			expect(classDef, `Missing class for ${item.citation}`).toBeDefined();

			const row = classDef!.progression.find((p) => p.level === item.level);
			expect(row, `Missing level ${item.level} for ${item.classId}`).toBeDefined();

			const feature = row!.features.find(
				(f) => f.id === item.featureIdOrName || f.name === item.featureIdOrName
			);
			expect(feature, `Missing feature ${item.featureIdOrName} (${item.citation})`).toBeDefined();
			expect(Array.isArray(feature!.choices) && feature!.choices!.length > 0).toBe(true);

			const choice = feature!.choices!.find(
				(c) => c.id === item.choiceIdOrName || c.name === item.choiceIdOrName
			);
			expect(choice, `Missing choice ${item.choiceIdOrName} (${item.citation})`).toBeDefined();
			expect(choice!.count).toBe(item.count);

			const optionIds = new Set(choice!.options.map((o) => o.id));
			for (const expectedOptionId of item.options) {
				expect(optionIds.has(expectedOptionId), `Missing option ${expectedOptionId} (${item.citation})`).toBe(true);
			}
		}
	});

	it('resolves Protector grants (martial weapons + heavy armor)', () => {
		const cleric = classes.find((c) => c.id === 'cleric')!;
		const grants = resolveFeatureChoiceProficiencies(cleric, [
			{ featureId: 'divine-order', choiceId: 'divine-order', selectedOptionIds: ['protector'] }
		]);
		expect(grants).toEqual([
			{ type: 'weapon', value: 'martial', source: 'class:cleric:feature:divine-order' },
			{ type: 'armor', value: 'heavy', source: 'class:cleric:feature:divine-order' }
		]);
	});

	it('resolves Warden grants (martial weapons + medium armor)', () => {
		const druid = classes.find((c) => c.id === 'druid')!;
		const grants = resolveFeatureChoiceProficiencies(druid, [
			{ featureId: 'primal-order', choiceId: 'primal-order', selectedOptionIds: ['warden'] }
		]);
		expect(grants).toEqual([
			{ type: 'weapon', value: 'martial', source: 'class:druid:feature:primal-order' },
			{ type: 'armor', value: 'medium', source: 'class:druid:feature:primal-order' }
		]);
	});

	it('returns no grants for options without grants field', () => {
		const cleric = classes.find((c) => c.id === 'cleric')!;
		const grants = resolveFeatureChoiceProficiencies(cleric, [
			{ featureId: 'divine-order', choiceId: 'divine-order', selectedOptionIds: ['thaumaturge'] }
		]);
		expect(grants).toEqual([]);
	});

	it('returns no grants for empty feature choices', () => {
		const cleric = classes.find((c) => c.id === 'cleric')!;
		expect(resolveFeatureChoiceProficiencies(cleric, [])).toEqual([]);
	});
});
