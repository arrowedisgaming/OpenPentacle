import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
	contentPackSchema,
	classDefinitionSchema,
	originLayerSchema,
	backgroundDefinitionSchema,
	spellDefinitionSchema,
	equipmentDefinitionSchema,
	featDefinitionSchema
} from '$lib/schemas/content-pack.schema.js';

const PACK_DIR = join(process.cwd(), 'static', 'content-packs', 'srd521');

function loadJson(filename: string): unknown {
	return JSON.parse(readFileSync(join(PACK_DIR, filename), 'utf-8'));
}

function assembleFullPack(): Record<string, unknown> {
	const index = loadJson('index.json') as Record<string, unknown>;
	const fileFields = ['classes', 'origins', 'backgrounds', 'spells', 'equipment', 'feats'];
	for (const field of fileFields) {
		const value = index[field];
		if (typeof value === 'string' && value.endsWith('.json')) {
			index[field] = loadJson(value);
		}
	}
	return index;
}

describe('SRD 5.2.1 Content Pack', () => {
	describe('Full pack validation', () => {
		it('should validate the complete assembled pack against the schema', () => {
			const pack = assembleFullPack();
			const result = contentPackSchema.safeParse(pack);
			if (!result.success) {
				const errors = result.error.issues.map(
					(i) => `${i.path.join('.')}: ${i.message}`
				);
				throw new Error(`Pack validation failed:\n${errors.join('\n')}`);
			}
			expect(result.success).toBe(true);
		});

		it('should have correct metadata', () => {
			const pack = assembleFullPack();
			expect(pack.id).toBe('srd521');
			expect(pack.system).toBe('srd521');
			expect(pack.license).toBe('CC-BY-4.0');
		});
	});

	describe('classes.json', () => {
		const classes = loadJson('classes.json') as unknown[];

		it('should contain all 12 SRD classes', () => {
			expect(classes).toHaveLength(12);
		});

		it('should validate every class against the schema', () => {
			for (const cls of classes) {
				const result = classDefinitionSchema.safeParse(cls);
				if (!result.success) {
					const className = (cls as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Class "${className}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should have 20 progression levels for each class', () => {
			for (const cls of classes as { id: string; progression: { level: number }[] }[]) {
				expect(cls.progression).toHaveLength(20);
				expect(cls.progression[0].level).toBe(1);
				expect(cls.progression[19].level).toBe(20);
			}
		});

		it('should have correct hit dice for known classes', () => {
			const hitDice: Record<string, string> = {
				barbarian: '1d12',
				fighter: '1d10',
				wizard: '1d6',
				rogue: '1d8',
				sorcerer: '1d6',
				bard: '1d8',
				cleric: '1d8',
				druid: '1d8',
				monk: '1d8',
				paladin: '1d10',
				ranger: '1d10',
				warlock: '1d8'
			};
			for (const cls of classes as { id: string; hitDie: string }[]) {
				if (hitDice[cls.id]) {
					expect(cls.hitDie).toBe(hitDice[cls.id]);
				}
			}
		});

		it('should have exactly 2 saving throws per class', () => {
			for (const cls of classes as { id: string; savingThrows: string[] }[]) {
				expect(cls.savingThrows).toHaveLength(2);
			}
		});

		it('should have at least one subclass per class', () => {
			for (const cls of classes as { id: string; subclasses: unknown[] }[]) {
				expect(cls.subclasses.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('should have spellcasting config for caster classes', () => {
			const casters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard', 'warlock', 'paladin', 'ranger'];
			for (const cls of classes as { id: string; spellcasting?: unknown }[]) {
				if (casters.includes(cls.id)) {
					expect(cls.spellcasting).toBeDefined();
				}
			}
		});

		it('should NOT have spellcasting for non-caster classes', () => {
			const nonCasters = ['barbarian', 'fighter', 'monk', 'rogue'];
			for (const cls of classes as { id: string; spellcasting?: unknown }[]) {
				if (nonCasters.includes(cls.id)) {
					expect(cls.spellcasting).toBeUndefined();
				}
			}
		});
	});

	describe('origins.json', () => {
		const origins = loadJson('origins.json') as unknown[];

		it('should have at least one origin layer', () => {
			expect(origins.length).toBeGreaterThanOrEqual(1);
		});

		it('should validate every origin layer against the schema', () => {
			for (const layer of origins) {
				const result = originLayerSchema.safeParse(layer);
				if (!result.success) {
					const layerName = (layer as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Origin layer "${layerName}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should have species layer with multiple options', () => {
			const speciesLayer = (origins as { id: string; options: unknown[] }[])
				.find(l => l.id === 'species');
			expect(speciesLayer).toBeDefined();
			expect(speciesLayer!.options.length).toBeGreaterThanOrEqual(4);
		});

		it('should have valid speeds for all origin options', () => {
			for (const layer of origins as { options: { name: string; speed: number }[] }[]) {
				for (const opt of layer.options) {
					expect(opt.speed).toBeGreaterThan(0);
					expect(opt.speed % 5).toBe(0); // D&D speeds are multiples of 5
				}
			}
		});
	});

	describe('backgrounds.json', () => {
		const backgrounds = loadJson('backgrounds.json') as unknown[];

		it('should have at least 4 backgrounds', () => {
			expect(backgrounds.length).toBeGreaterThanOrEqual(4);
		});

		it('should validate every background against the schema', () => {
			for (const bg of backgrounds) {
				const result = backgroundDefinitionSchema.safeParse(bg);
				if (!result.success) {
					const bgName = (bg as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Background "${bgName}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should have a feature or origin feat for every background', () => {
			for (const bg of backgrounds as { name: string; feature?: { id: string; name: string }; feat?: string }[]) {
				const hasFeature = bg.feature && bg.feature.id && bg.feature.name;
				const hasFeat = !!bg.feat;
				expect(hasFeature || hasFeat).toBe(true);
			}
		});
	});

	describe('spells.json', () => {
		const spells = loadJson('spells.json') as unknown[];

		it('should have a substantial spell list', () => {
			expect(spells.length).toBeGreaterThanOrEqual(30);
		});

		it('should validate every spell against the schema', () => {
			for (const spell of spells) {
				const result = spellDefinitionSchema.safeParse(spell);
				if (!result.success) {
					const spellName = (spell as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Spell "${spellName}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should include cantrips (level 0)', () => {
			const cantrips = (spells as { level: number }[]).filter(s => s.level === 0);
			expect(cantrips.length).toBeGreaterThanOrEqual(5);
		});

		it('should have spells assigned to at least one list', () => {
			for (const spell of spells as { name: string; lists: string[] }[]) {
				expect(spell.lists.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('should have valid spell levels (0-9)', () => {
			for (const spell of spells as { name: string; level: number }[]) {
				expect(spell.level).toBeGreaterThanOrEqual(0);
				expect(spell.level).toBeLessThanOrEqual(9);
			}
		});
	});

	describe('equipment.json', () => {
		const equipment = loadJson('equipment.json') as unknown[];

		it('should have a substantial equipment list', () => {
			expect(equipment.length).toBeGreaterThanOrEqual(50);
		});

		it('should validate every equipment item against the schema', () => {
			for (const item of equipment) {
				const result = equipmentDefinitionSchema.safeParse(item);
				if (!result.success) {
					const itemName = (item as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Equipment "${itemName}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should include weapons, armor, and adventuring gear', () => {
			const types = new Set((equipment as { type: string }[]).map(e => e.type));
			expect(types.has('weapon')).toBe(true);
			expect(types.has('armor')).toBe(true);
			expect(types.has('adventuring-gear')).toBe(true);
		});

		it('should have weapon details for weapon items', () => {
			const weapons = (equipment as { type: string; weapon?: { category: string; damage: string } }[])
				.filter(e => e.type === 'weapon');
			for (const w of weapons) {
				expect(w.weapon).toBeDefined();
				expect(w.weapon!.category).toMatch(/^(simple|martial)$/);
				expect(w.weapon!.damage).toBeTruthy();
			}
		});

		it('should have armor details for armor items', () => {
			const armors = (equipment as { type: string; armor?: { category: string; baseAC: number } }[])
				.filter(e => e.type === 'armor');
			for (const a of armors) {
				expect(a.armor).toBeDefined();
				expect(a.armor!.baseAC).toBeGreaterThan(0);
			}
		});
	});

	describe('feats.json', () => {
		const feats = loadJson('feats.json') as unknown[];

		it('should have at least 5 feats', () => {
			expect(feats.length).toBeGreaterThanOrEqual(5);
		});

		it('should validate every feat against the schema', () => {
			for (const feat of feats) {
				const result = featDefinitionSchema.safeParse(feat);
				if (!result.success) {
					const featName = (feat as { name?: string }).name ?? 'unknown';
					const errors = result.error.issues.map(
						(i) => `${i.path.join('.')}: ${i.message}`
					);
					throw new Error(`Feat "${featName}" failed validation:\n${errors.join('\n')}`);
				}
			}
		});

		it('should have effects for every feat', () => {
			for (const feat of feats as { name: string; effects: unknown[] }[]) {
				expect(feat.effects.length).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe('Ability Score Methods', () => {
		const pack = assembleFullPack();
		const methods = pack.abilityScoreMethods as {
			id: string;
			type: string;
			pointBuy?: { budget: number };
			standardArray?: number[];
		}[];

		it('should have at least 3 methods (standard array, point buy, rolling)', () => {
			expect(methods.length).toBeGreaterThanOrEqual(3);
		});

		it('should have a standard array method with 6 values', () => {
			const stdArray = methods.find(m => m.type === 'standard-array');
			expect(stdArray).toBeDefined();
			expect(stdArray!.standardArray).toHaveLength(6);
		});

		it('should have a point buy method with 27-point budget', () => {
			const pointBuy = methods.find(m => m.type === 'point-buy');
			expect(pointBuy).toBeDefined();
			expect(pointBuy!.pointBuy!.budget).toBe(27);
		});
	});
});
