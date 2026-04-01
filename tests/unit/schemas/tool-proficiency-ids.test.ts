import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PACK_DIR = join(process.cwd(), 'static', 'content-packs', 'srd521');

function loadJson(filename: string): any {
	return JSON.parse(readFileSync(join(PACK_DIR, filename), 'utf-8'));
}

describe('Tool proficiency ID cross-references', () => {
	const equipment: any[] = loadJson('equipment.json');
	const toolIds = new Set(equipment.filter((e) => e.type === 'tool').map((e) => e.id));

	it('all background toolProficiency IDs exist in equipment.json', () => {
		const backgrounds: any[] = loadJson('backgrounds.json');
		const missing: string[] = [];
		for (const bg of backgrounds) {
			for (const tp of bg.toolProficiencies ?? []) {
				if (tp.isChoice) {
					for (const choiceId of tp.choices ?? []) {
						if (!toolIds.has(choiceId)) missing.push(`${bg.id}: choice "${choiceId}"`);
					}
				} else if (tp.value !== 'choice' && !toolIds.has(tp.value)) {
					missing.push(`${bg.id}: "${tp.value}"`);
				}
			}
		}
		expect(missing, `Missing tool IDs in backgrounds: ${missing.join(', ')}`).toEqual([]);
	});

	it('all class toolProficiency IDs exist in equipment.json', () => {
		const classes: any[] = loadJson('classes.json');
		const missing: string[] = [];
		for (const cls of classes) {
			for (const tp of cls.toolProficiencies ?? []) {
				if (tp.isChoice) {
					for (const choiceId of tp.choices ?? []) {
						if (!toolIds.has(choiceId)) missing.push(`${cls.id}: choice "${choiceId}"`);
					}
				} else if (!toolIds.has(tp.value)) {
					missing.push(`${cls.id}: "${tp.value}"`);
				}
			}
		}
		expect(missing, `Missing tool IDs in classes: ${missing.join(', ')}`).toEqual([]);
	});

	it('all tool entries in equipment.json have a toolCategory', () => {
		const validCategories = new Set(['artisan', 'gaming', 'musical', 'other']);
		const missing: string[] = [];
		for (const e of equipment) {
			if (e.type === 'tool' && !validCategories.has(e.toolCategory)) {
				missing.push(e.id);
			}
		}
		expect(missing, `Tools missing toolCategory: ${missing.join(', ')}`).toEqual([]);
	});
});
