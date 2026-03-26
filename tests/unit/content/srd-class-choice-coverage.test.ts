import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

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
	it('covers expected SRD class choices in structured class feature choices', () => {
		const expected = readJson<ExpectedChoice[]>(EXPECTED_PATH);
		const classes = readJson<any[]>(CLASSES_PATH);

		for (const item of expected) {
			const classDef = classes.find((c) => c.id === item.classId);
			expect(classDef, `Missing class for ${item.citation}`).toBeDefined();

			const row = classDef.progression.find((p: any) => p.level === item.level);
			expect(row, `Missing level ${item.level} for ${item.classId}`).toBeDefined();

			const feature = row.features.find(
				(f: any) => f.id === item.featureIdOrName || f.name === item.featureIdOrName
			);
			expect(feature, `Missing feature ${item.featureIdOrName} (${item.citation})`).toBeDefined();
			expect(Array.isArray(feature.choices) && feature.choices.length > 0).toBe(true);

			const choice = feature.choices.find(
				(c: any) => c.id === item.choiceIdOrName || c.name === item.choiceIdOrName
			);
			expect(choice, `Missing choice ${item.choiceIdOrName} (${item.citation})`).toBeDefined();
			expect(choice.count).toBe(item.count);

			const optionIds = new Set((choice.options ?? []).map((o: any) => o.id));
			for (const expectedOptionId of item.options) {
				expect(optionIds.has(expectedOptionId), `Missing option ${expectedOptionId} (${item.citation})`).toBe(true);
			}
		}
	});

	it('creator and level-up flows render feature choices from structured data', () => {
		const classPage = readFileSync(
			join(ROOT, 'src', 'routes', 'create', '[system]', 'class', '+page.svelte'),
			'utf-8'
		);
		const subclassPage = readFileSync(
			join(ROOT, 'src', 'routes', 'create', '[system]', 'subclass', '+page.svelte'),
			'utf-8'
		);
		const levelUpPage = readFileSync(
			join(ROOT, 'src', 'routes', 'sheet', '[id]', 'level-up', '+page.svelte'),
			'utf-8'
		);

		expect(classPage.includes('featuresWithChoices')).toBe(true);
		expect(classPage.includes('feature.choices')).toBe(true);

		expect(subclassPage.includes('feature.choices')).toBe(true);
		expect(subclassPage.includes('featureChoices')).toBe(true);

		expect(levelUpPage.includes('newFeaturesWithChoices')).toBe(true);
		expect(levelUpPage.includes('buildNewFeatureChoices')).toBe(true);
		expect(levelUpPage.includes('featureChoices:')).toBe(true);
	});
});
