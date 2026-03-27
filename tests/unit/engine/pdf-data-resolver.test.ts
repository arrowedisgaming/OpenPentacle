import { describe, it, expect } from 'vitest';
import { resolveSheetData } from '$lib/pdf/pdf-data-resolver.js';
import { computeSheet } from '$lib/engine/character-sheet.js';
import { createEmptyCharacter } from '$lib/types/character.js';
import type { ContentPack, ClassDefinition, SpellDefinition } from '$lib/types/content-pack.js';

/** Minimal content pack for testing */
function createTestPack(overrides?: Partial<ContentPack>): ContentPack {
	const defaultClass: ClassDefinition = {
		id: 'fighter',
		name: 'Fighter',
		description: 'A master of martial combat',
		hitDie: '1d10',
		primaryAbility: ['str'],
		savingThrows: ['str', 'con'],
		armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
		weaponProficiencies: ['simple', 'martial'],
		toolProficiencies: [],
		skillChoices: { choices: ['acrobatics', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'], count: 2 },
		startingEquipment: [],
		progression: [
			{
				level: 1, proficiencyBonus: 2,
				features: [
					{ id: 'fighting-style', name: 'Fighting Style', description: 'Choose a fighting style', level: 1, choices: [] },
					{ id: 'second-wind', name: 'Second Wind', description: 'Heal yourself as a bonus action', level: 1 }
				]
			},
			{
				level: 2, proficiencyBonus: 2,
				features: [{ id: 'action-surge', name: 'Action Surge', description: 'Take an additional action', level: 2 }]
			},
			{
				level: 3, proficiencyBonus: 2,
				features: [{ id: 'fighter-subclass', name: 'Fighter Subclass', description: 'Choose a subclass', level: 3 }]
			},
			{
				level: 4, proficiencyBonus: 2,
				features: [{ id: 'asi-4', name: 'Ability Score Improvement', description: 'Increase ability scores', level: 4 }]
			}
		],
		subclasses: [
			{
				id: 'battle-master',
				name: 'Battle Master',
				description: 'Tactical superiority',
				features: [
					{ id: 'combat-superiority', name: 'Combat Superiority', description: 'Learn superiority dice and maneuvers', level: 3 }
				]
			}
		]
	};

	return {
		id: 'test-pack',
		name: 'Test Pack',
		version: '1.0.0',
		description: 'Test content pack',
		system: 'srd521',
		license: 'Test',
		authors: ['Test'],
		classes: [defaultClass],
		origins: [
			{
				id: 'species',
				name: 'Species',
				description: 'Choose your species',
				order: 0,
				options: [
					{
						id: 'dwarf',
						name: 'Dwarf',
						description: 'Bold and hardy',
						size: 'Medium',
						speed: 25,
						abilityScoreChanges: [],
						traits: [
							{ id: 'darkvision', name: 'Darkvision', description: 'You can see in dim light within 60 feet' },
							{ id: 'dwarven-resilience', name: 'Dwarven Resilience', description: 'Advantage on saves vs poison' }
						],
						proficiencies: [],
						languages: ['common', 'dwarvish'],
						darkvision: 60,
						subOptions: [
							{
								id: 'hill-dwarf',
								name: 'Hill Dwarf',
								description: 'Hardy and wise',
								traits: [{ id: 'dwarven-toughness', name: 'Dwarven Toughness', description: '+1 HP per level', mechanicalEffect: 'hp_per_level:1' }],
								abilityScoreChanges: [],
								proficiencies: []
							}
						]
					},
					{
						id: 'human',
						name: 'Human',
						description: 'Versatile and adaptable',
						size: 'Medium',
						speed: 30,
						abilityScoreChanges: [],
						traits: [],
						proficiencies: [],
						languages: ['common']
					}
				]
			}
		],
		backgrounds: [
			{
				id: 'soldier',
				name: 'Soldier',
				description: 'War has been your life',
				skillProficiencies: [{ value: 'athletics' }, { value: 'intimidation' }],
				toolProficiencies: [],
				languages: [],
				equipment: []
			}
		],
		spells: [],
		equipment: [
			{
				id: 'longsword',
				name: 'Longsword',
				type: 'weapon',
				cost: { amount: 15, currency: 'gp' },
				weight: 3,
				weapon: {
					category: 'martial',
					damage: '1d8',
					damageType: 'slashing',
					properties: ['versatile']
				}
			},
			{
				id: 'longbow',
				name: 'Longbow',
				type: 'weapon',
				cost: { amount: 50, currency: 'gp' },
				weight: 2,
				weapon: {
					category: 'martial',
					damage: '1d8',
					damageType: 'piercing',
					properties: ['ammunition', 'heavy', 'two-handed'],
					range: { normal: 150, long: 600 }
				}
			},
			{
				id: 'rapier',
				name: 'Rapier',
				type: 'weapon',
				cost: { amount: 25, currency: 'gp' },
				weight: 2,
				weapon: {
					category: 'martial',
					damage: '1d8',
					damageType: 'piercing',
					properties: ['finesse']
				}
			},
			{
				id: 'chain-mail',
				name: 'Chain Mail',
				type: 'armor',
				cost: { amount: 75, currency: 'gp' },
				weight: 55,
				armor: {
					category: 'heavy',
					baseAC: 16,
					maxDexBonus: 0,
					stealthDisadvantage: true,
					strengthRequirement: 13
				}
			},
			{
				id: 'shield',
				name: 'Shield',
				type: 'shield',
				cost: { amount: 10, currency: 'gp' },
				weight: 6,
				armor: {
					category: 'shield',
					baseAC: 2,
					stealthDisadvantage: false
				}
			},
			{
				id: 'explorers-pack',
				name: "Explorer's Pack",
				type: 'adventuring-gear',
				cost: { amount: 10, currency: 'gp' },
				weight: 59
			}
		],
		feats: [
			{
				id: 'great-weapon-master',
				name: 'Great Weapon Master',
				description: 'You gain the following benefits when using heavy weapons.',
				category: 'general',
				effects: [{ id: 'gwm-1', name: 'Heavy Weapon Mastery', description: 'Bonus attack on critical hit or killing blow' }],
				abilityScoreIncrease: { abilities: ['str'], count: 1, value: 1 }
			}
		],
		abilityScoreMethods: [
			{ id: 'standard-array', name: 'Standard Array', description: '', type: 'standard-array', standardArray: [15, 14, 13, 12, 10, 8] }
		],
		systemMechanics: {
			proficiencyTable: [
				{ level: 1, bonus: 2 }, { level: 2, bonus: 2 }, { level: 3, bonus: 2 }, { level: 4, bonus: 2 },
				{ level: 5, bonus: 3 }, { level: 6, bonus: 3 }, { level: 7, bonus: 3 }, { level: 8, bonus: 3 },
				{ level: 9, bonus: 4 }, { level: 10, bonus: 4 }, { level: 11, bonus: 4 }, { level: 12, bonus: 4 },
				{ level: 13, bonus: 5 }, { level: 14, bonus: 5 }, { level: 15, bonus: 5 }, { level: 16, bonus: 5 },
				{ level: 17, bonus: 6 }, { level: 18, bonus: 6 }, { level: 19, bonus: 6 }, { level: 20, bonus: 6 }
			],
			xpTable: [{ level: 1, xpRequired: 0 }],
			maxLevel: 20
		},
		...overrides
	};
}

/** Create a fighter character for testing */
function createFighter(level = 5) {
	const char = createEmptyCharacter('srd521');
	char.name = 'Thorin Ironforge';
	char.level = level;
	char.origins = [{ layerId: 'species', optionId: 'dwarf', subOptionId: 'hill-dwarf', choices: [] }];
	char.background = { backgroundId: 'soldier', choices: [] };
	char.classes = [{ classId: 'fighter', level, hitDie: '1d10', featureChoices: [] }];
	char.abilityScores = {
		method: 'standard-array',
		base: { str: 15, dex: 12, con: 14, int: 10, wis: 8, cha: 8 },
		originBonuses: [{ ability: 'str', value: 1, source: 'origin', sourceType: 'origin' }],
		levelUpBonuses: [],
		featBonuses: []
	};
	char.proficiencies = [
		{ type: 'saving-throw', value: 'str', source: 'class' },
		{ type: 'saving-throw', value: 'con', source: 'class' },
		{ type: 'armor', value: 'light', source: 'class' },
		{ type: 'armor', value: 'medium', source: 'class' },
		{ type: 'armor', value: 'heavy', source: 'class' },
		{ type: 'weapon', value: 'simple', source: 'class' },
		{ type: 'weapon', value: 'martial', source: 'class' },
		{ type: 'language', value: 'common', source: 'origin' },
		{ type: 'language', value: 'dwarvish', source: 'origin' }
	];
	char.skills = [
		{ skillId: 'athletics', proficiency: 'proficient', source: 'class' },
		{ skillId: 'perception', proficiency: 'proficient', source: 'class' }
	];
	char.equipment = [
		{ equipmentId: 'longsword', quantity: 1, equipped: true },
		{ equipmentId: 'longbow', quantity: 1, equipped: true },
		{ equipmentId: 'chain-mail', quantity: 1, equipped: true },
		{ equipmentId: 'shield', quantity: 1, equipped: true },
		{ equipmentId: 'explorers-pack', quantity: 1, equipped: true }
	];
	char.currency = { cp: 0, sp: 3, ep: 0, gp: 15, pp: 0 };
	char.hitPoints = { maximum: 44, current: 44, temporary: 0, hitDice: [{ die: '1d10', total: 5, used: 0 }] };
	return char;
}

describe('resolveSheetData', () => {
	const pack = createTestPack();

	it('resolves species/background/class names from IDs', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.originName).toBe('Hill Dwarf');
		expect(resolved.backgroundName).toBe('Soldier');
		expect(resolved.className).toBe('Fighter');
		expect(resolved.subclassName).toBeNull();
	});

	it('resolves subclass name when present', () => {
		const data = createFighter(5);
		data.classes[0].subclassId = 'battle-master';
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.subclassName).toBe('Battle Master');
	});

	it('computes weapon attack bonuses correctly', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		// STR 16 (+3), Prof +3 at level 5 → +6 for melee
		const longsword = resolved.weapons.find((w) => w.name === 'Longsword');
		expect(longsword).toBeDefined();
		expect(longsword!.attackBonus).toBe(6); // +3 STR + +3 prof
		expect(longsword!.damageBonus).toBe(3); // +3 STR

		// Longbow uses DEX (+1) → +4
		const longbow = resolved.weapons.find((w) => w.name === 'Longbow');
		expect(longbow).toBeDefined();
		expect(longbow!.attackBonus).toBe(4); // +1 DEX + +3 prof
		expect(longbow!.damageBonus).toBe(1); // +1 DEX
	});

	it('finesse weapons use higher of STR/DEX', () => {
		const data = createFighter();
		data.equipment.push({ equipmentId: 'rapier', quantity: 1, equipped: true });
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		// STR 16 (+3) > DEX 12 (+1) → uses STR
		const rapier = resolved.weapons.find((w) => w.name === 'Rapier');
		expect(rapier!.attackBonus).toBe(6); // +3 STR + +3 prof
	});

	it('handles non-caster characters (empty spell data)', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.spellGroups.size).toBe(0);
		expect(resolved.spellcastingAbility).toBeNull();
	});

	it('collects proficiency groups correctly', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.proficiencyGroups['Armor']).toContain('Light');
		expect(resolved.proficiencyGroups['Armor']).toContain('Heavy');
		expect(resolved.proficiencyGroups['Weapons']).toContain('Simple');
		expect(resolved.proficiencyGroups['Weapons']).toContain('Martial');
		expect(resolved.proficiencyGroups['Languages']).toContain('Common');
		expect(resolved.proficiencyGroups['Languages']).toContain('Dwarvish');
		// Saving throws should NOT appear in proficiency groups
		expect(resolved.proficiencyGroups['saving-throw']).toBeUndefined();
	});

	it('resolves species traits', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.speciesTraits.length).toBeGreaterThan(0);
		expect(resolved.speciesTraits.some((t) => t.name === 'Darkvision')).toBe(true);
		expect(resolved.speciesTraits.some((t) => t.name === 'Dwarven Toughness')).toBe(true);
	});

	it('resolves class features up to character level', () => {
		const data = createFighter(3);
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		const featureNames = resolved.classFeatures.map((f) => f.name);
		expect(featureNames).toContain('Fighting Style');
		expect(featureNames).toContain('Second Wind');
		expect(featureNames).toContain('Action Surge');
		expect(featureNames).toContain('Fighter Subclass');
		// Level 4 feature should not be included
		expect(featureNames).not.toContain('Ability Score Improvement');
	});

	it('resolves armor items', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.armorItems.length).toBe(2); // chain mail + shield
		expect(resolved.armorItems.some((a) => a.name === 'Chain Mail')).toBe(true);
		expect(resolved.armorItems.some((a) => a.name === 'Shield')).toBe(true);
	});

	it('resolves other equipment', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.otherEquipment.some((e) => e.name === "Explorer's Pack")).toBe(true);
		// Weapons and armor should NOT appear here
		expect(resolved.otherEquipment.some((e) => e.name === 'Longsword')).toBe(false);
		expect(resolved.otherEquipment.some((e) => e.name === 'Chain Mail')).toBe(false);
	});

	it('resolves hit dice summary', () => {
		const data = createFighter();
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.hitDiceSummary).toBe('5d10');
	});

	it('groups spells by level for casters', () => {
		const wizardPack = createTestPack({
			classes: [{
				id: 'wizard',
				name: 'Wizard',
				description: 'An arcane spellcaster',
				hitDie: '1d6',
				primaryAbility: ['int'],
				savingThrows: ['int', 'wis'],
				armorProficiencies: [],
				weaponProficiencies: ['simple'],
				toolProficiencies: [],
				skillChoices: { choices: ['arcana', 'history'], count: 2 },
				startingEquipment: [],
				progression: [
					{ level: 1, proficiencyBonus: 2, features: [], cantripsKnown: 3, spellSlots: [2] }
				],
				subclasses: [],
				spellcasting: {
					ability: 'int',
					type: 'full',
					ritual: true,
					spellList: 'wizard',
					preparedCaster: true,
					cantrips: true
				}
			}],
			spells: [
				{
					id: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'evocation',
					castingTime: '1 action', range: '120 feet', components: { verbal: true, somatic: true, material: false },
					duration: 'Instantaneous', concentration: false, ritual: false, description: 'Fire damage',
					lists: ['wizard']
				},
				{
					id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'evocation',
					castingTime: '1 action', range: '120 feet', components: { verbal: true, somatic: true, material: false },
					duration: 'Instantaneous', concentration: false, ritual: false, description: 'Force damage',
					lists: ['wizard']
				},
				{
					id: 'shield', name: 'Shield', level: 1, school: 'abjuration',
					castingTime: '1 reaction', range: 'Self', components: { verbal: true, somatic: true, material: false },
					duration: '1 round', concentration: false, ritual: false, description: '+5 AC',
					lists: ['wizard']
				}
			]
		});

		const data = createEmptyCharacter('srd521');
		data.name = 'Gandalf';
		data.level = 1;
		data.classes = [{ classId: 'wizard', level: 1, hitDie: '1d6', featureChoices: [] }];
		data.spells = {
			knownSpells: [
				{ spellId: 'fire-bolt', source: 'class:wizard' },
				{ spellId: 'magic-missile', source: 'class:wizard' },
				{ spellId: 'shield', source: 'class:wizard' }
			],
			preparedSpellIds: ['magic-missile'],
			spellSlots: { 1: 2 }
		};
		data.hitPoints = { maximum: 6, current: 6, temporary: 0, hitDice: [{ die: '1d6', total: 1, used: 0 }] };

		const sheet = computeSheet(data, wizardPack);
		const resolved = resolveSheetData(data, wizardPack, sheet);

		expect(resolved.spellGroups.size).toBe(2); // cantrips + 1st level
		expect(resolved.spellGroups.get(0)!.length).toBe(1); // Fire Bolt
		expect(resolved.spellGroups.get(1)!.length).toBe(2); // Magic Missile, Shield
		expect(resolved.spellcastingAbility).toBe('Intelligence');

		// Check prepared status
		const mm = resolved.spellGroups.get(1)!.find((s) => s.spell.name === 'Magic Missile');
		expect(mm!.prepared).toBe(true);
	});

	it('resolves feats with source labels', () => {
		const data = createFighter(4);
		data.feats = [{
			featId: 'great-weapon-master',
			source: 'class:fighter:4',
			choices: []
		}];
		const sheet = computeSheet(data, pack);
		const resolved = resolveSheetData(data, pack, sheet);

		expect(resolved.feats.length).toBe(1);
		expect(resolved.feats[0].name).toBe('Great Weapon Master');
		expect(resolved.feats[0].source).toBe('Lv 4');
		expect(resolved.feats[0].category).toBe('General Feat');
	});
});
