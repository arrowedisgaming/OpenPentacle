import { z } from 'zod';

// ─── Shared ──────────────────────────────────────────────────

const abilityIdSchema = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']);
const proficiencyLevelSchema = z.enum(['none', 'proficient', 'expertise']);
const sizeSchema = z.enum(['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']);
const spellSchoolSchema = z.enum([
	'abjuration', 'conjuration', 'divination', 'enchantment',
	'evocation', 'illusion', 'necromancy', 'transmutation'
]);
const damageTypeSchema = z.enum([
	'bludgeoning', 'piercing', 'slashing',
	'acid', 'cold', 'fire', 'force', 'lightning',
	'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
]);
const armorCategorySchema = z.enum(['light', 'medium', 'heavy', 'shield']);
const weaponCategorySchema = z.enum(['simple', 'martial']);
const skillIdSchema = z.enum([
	'acrobatics', 'animal-handling', 'arcana', 'athletics',
	'deception', 'history', 'insight', 'intimidation',
	'investigation', 'medicine', 'nature', 'perception',
	'performance', 'persuasion', 'religion', 'sleight-of-hand',
	'stealth', 'survival'
]);

// ─── Trait ───────────────────────────────────────────────────

const traitSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	mechanicalEffect: z.string().optional()
});

// ─── Origin Layers ───────────────────────────────────────────

const originAbilityChangeSchema = z.object({
	ability: z.union([abilityIdSchema, z.literal('choice')]),
	value: z.number().int(),
	choiceCount: z.number().int().positive().optional()
});

const originProficiencySchema = z.object({
	type: z.enum(['skill', 'armor', 'weapon', 'tool', 'saving-throw']),
	value: z.string(),
	isChoice: z.boolean().optional(),
	choices: z.array(z.string()).optional(),
	choiceCount: z.number().int().positive().optional()
});

const originSpellSchema = z.object({
	spellId: z.string().min(1),
	level: z.number().int().min(1),
	spellcastingAbility: z.union([abilityIdSchema, z.literal('choice')]),
	spellcastingAbilityChoices: z.array(abilityIdSchema).optional()
});

const originSubOptionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	traits: z.array(traitSchema),
	abilityScoreChanges: z.array(originAbilityChangeSchema),
	proficiencies: z.array(originProficiencySchema),
	spells: z.array(originSpellSchema).optional(),
	speed: z.number().int().positive().optional(),
	darkvision: z.number().int().positive().optional(),
	damageResistance: damageTypeSchema.optional()
});

const originOptionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	size: sizeSchema,
	speed: z.number().int().positive(),
	abilityScoreChanges: z.array(originAbilityChangeSchema),
	traits: z.array(traitSchema),
	proficiencies: z.array(originProficiencySchema),
	languages: z.array(z.string()),
	subOptions: z.array(originSubOptionSchema).optional(),
	darkvision: z.number().int().positive().optional(),
	sizeChoices: z.array(sizeSchema).optional(),
	subOptionLabel: z.string().optional()
});

const originLayerSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	order: z.number().int().min(0),
	options: z.array(originOptionSchema).min(1)
});

// ─── Classes ─────────────────────────────────────────────────

const featureChoiceOptionGrantSchema = z.object({
	type: z.enum(['armor', 'weapon']),
	value: z.string().min(1)
});

const featureChoiceOptionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	effects: z.array(traitSchema).optional(),
	grants: z.array(featureChoiceOptionGrantSchema).optional()
});

const featureChoiceSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	options: z.array(featureChoiceOptionSchema),
	count: z.number().int().positive()
});

const classFeatureSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	level: z.number().int().min(1).max(20),
	choices: z.array(featureChoiceSchema).optional()
});

const spellcastingConfigSchema = z.object({
	ability: abilityIdSchema,
	type: z.enum(['full', 'half', 'third', 'pact']),
	ritual: z.boolean(),
	spellList: z.string().min(1),
	preparedCaster: z.boolean(),
	cantrips: z.boolean()
});

const subclassSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	features: z.array(classFeatureSchema),
	spellcasting: spellcastingConfigSchema.optional()
});

const classProgressionSchema = z.object({
	level: z.number().int().min(1).max(20),
	proficiencyBonus: z.number().int().min(2).max(6),
	features: z.array(classFeatureSchema),
	classSpecific: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
	cantripsKnown: z.number().int().min(0).optional(),
	spellsKnown: z.number().int().min(0).optional(),
	preparedSpells: z.number().int().min(0).optional(),
	spellSlots: z.array(z.number().int().min(0)).optional()
});

const classDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	hitDie: z.string().regex(/^\d+d\d+$/),
	primaryAbility: z.array(abilityIdSchema).min(1),
	savingThrows: z.array(abilityIdSchema).length(2),
	armorProficiencies: z.array(armorCategorySchema),
	weaponProficiencies: z.array(z.string()),
	toolProficiencies: z.array(z.object({
		value: z.string(),
		isChoice: z.boolean().optional(),
		choices: z.array(z.string()).optional(),
		choiceCount: z.number().int().positive().optional()
	})),
	skillChoices: z.object({
		choices: z.array(skillIdSchema),
		count: z.number().int().positive()
	}),
	startingEquipment: z.array(z.object({
		description: z.string(),
		items: z.array(z.object({
			equipmentId: z.string().min(1),
			quantity: z.number().int().positive(),
			isChoice: z.boolean().optional(),
			choices: z.array(z.string()).optional()
		}))
	})),
	startingGold: z.string().optional(),
	progression: z.array(classProgressionSchema).min(1),
	subclasses: z.array(subclassSchema),
	spellcasting: spellcastingConfigSchema.optional(),
	suggestedAbilityScores: z.record(abilityIdSchema, z.number().int()).optional()
});

// ─── Backgrounds ─────────────────────────────────────────────

const backgroundProficiencySchema = z.object({
	value: z.string(),
	isChoice: z.boolean().optional(),
	choices: z.array(z.string()).optional(),
	choiceCount: z.number().int().positive().optional()
});

const backgroundDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	skillProficiencies: z.array(backgroundProficiencySchema),
	toolProficiencies: z.array(backgroundProficiencySchema),
	languages: z.array(z.object({
		value: z.string(),
		isChoice: z.boolean().optional(),
		choices: z.array(z.string()).optional()
	})),
	equipment: z.array(z.string()),
	startingGold: z.number().optional(),
	feature: traitSchema.optional(),
	feat: z.string().optional(),
	abilityScoreChanges: z.array(originAbilityChangeSchema).optional()
});

// ─── Spells ──────────────────────────────────────────────────

const spellDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	level: z.number().int().min(0).max(9),
	school: spellSchoolSchema,
	castingTime: z.string().min(1),
	range: z.string().min(1),
	components: z.object({
		verbal: z.boolean(),
		somatic: z.boolean(),
		material: z.boolean(),
		materialDescription: z.string().optional(),
		materialCost: z.number().optional(),
		materialConsumed: z.boolean().optional()
	}),
	duration: z.string().min(1),
	concentration: z.boolean(),
	ritual: z.boolean(),
	description: z.string().min(1),
	higherLevels: z.string().optional(),
	lists: z.array(z.string()).min(1),
	damageType: damageTypeSchema.optional(),
	tags: z.array(z.string()).optional()
});

// ─── Equipment ───────────────────────────────────────────────

const equipmentDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.enum([
		'weapon', 'armor', 'shield',
		'adventuring-gear', 'tool', 'mount', 'vehicle',
		'ammunition', 'holy-symbol', 'arcane-focus', 'druidic-focus'
	]),
	description: z.string().optional(),
	cost: z.object({
		amount: z.number().min(0),
		currency: z.enum(['cp', 'sp', 'ep', 'gp', 'pp'])
	}),
	weight: z.number().min(0),
	weapon: z.object({
		category: weaponCategorySchema,
		damage: z.string(),
		damageType: damageTypeSchema,
		properties: z.array(z.enum([
			'ammunition', 'finesse', 'heavy', 'light', 'loading',
			'reach', 'special', 'thrown', 'two-handed', 'versatile'
		])),
		range: z.object({
			normal: z.number().int().positive(),
			long: z.number().int().positive()
		}).optional()
	}).optional(),
	armor: z.object({
		category: armorCategorySchema,
		baseAC: z.number().int().positive(),
		maxDexBonus: z.number().int().min(0).optional(),
		stealthDisadvantage: z.boolean(),
		strengthRequirement: z.number().int().optional()
	}).optional()
});

// ─── Feats ───────────────────────────────────────────────────

const featDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	category: z.enum(['general', 'origin', 'fighting-style', 'epic']),
	prerequisites: z.array(z.object({
		type: z.enum(['ability', 'proficiency', 'level', 'spellcasting', 'class', 'feature']),
		value: z.string(),
		minimum: z.number().optional()
	})).optional(),
	effects: z.array(traitSchema),
	abilityScoreIncrease: z.object({
		abilities: z.array(abilityIdSchema),
		count: z.number().int().positive(),
		value: z.number().int(),
		max: z.number().int().optional()
	}).optional(),
	repeatable: z.boolean().optional(),
	choices: z.array(z.object({
		id: z.string().min(1),
		type: z.enum(['spell-list', 'cantrip', 'spell', 'skill-or-tool']),
		label: z.string().min(1),
		count: z.number().int().positive().optional(),
		dependsOn: z.string().optional(),
		options: z.array(z.string()).optional()
	})).optional()
});

// ─── Ability Score Methods ───────────────────────────────────

const abilityScoreMethodSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	type: z.enum(['point-buy', 'standard-array', 'rolling']),
	pointBuy: z.object({
		budget: z.number().int().positive(),
		minimum: z.number().int(),
		maximum: z.number().int(),
		costs: z.record(z.string(), z.number().int())
	}).optional(),
	standardArray: z.array(z.number().int()).optional(),
	rolling: z.object({
		dice: z.string(),
		count: z.number().int().positive(),
		keepHighest: z.number().int().positive()
	}).optional()
});

// ─── System Mechanics ────────────────────────────────────────

const systemMechanicsSchema = z.object({
	proficiencyTable: z.array(z.object({
		level: z.number().int().min(1).max(20),
		bonus: z.number().int().min(2).max(6)
	})),
	xpTable: z.array(z.object({
		level: z.number().int().min(1),
		xpRequired: z.number().int().min(0)
	})),
	luck: z.object({
		description: z.string(),
		poolSize: z.number().int()
	}).optional(),
	exertion: z.object({
		description: z.string(),
		poolFormula: z.string()
	}).optional(),
	destiny: z.object({
		description: z.string(),
		options: z.array(z.object({
			id: z.string().min(1),
			name: z.string().min(1),
			description: z.string(),
			sourceOfInspiration: z.string(),
			inspirationFeature: traitSchema,
			fulfillmentFeature: traitSchema
		}))
	}).optional(),
	maxLevel: z.number().int().min(1).max(20)
});

// ─── Content Pack (Top-Level) ────────────────────────────────

export const contentPackSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	description: z.string(),
	system: z.enum(['srd521', 'black-flag', 'a5e']),
	license: z.string().min(1),
	authors: z.array(z.string()).min(1),
	classes: z.array(classDefinitionSchema),
	origins: z.array(originLayerSchema),
	backgrounds: z.array(backgroundDefinitionSchema),
	spells: z.array(spellDefinitionSchema),
	equipment: z.array(equipmentDefinitionSchema),
	feats: z.array(featDefinitionSchema),
	abilityScoreMethods: z.array(abilityScoreMethodSchema).min(1),
	systemMechanics: systemMechanicsSchema
});

export type ContentPackInput = z.infer<typeof contentPackSchema>;

// Re-export sub-schemas for partial validation
export {
	classDefinitionSchema,
	originLayerSchema,
	backgroundDefinitionSchema,
	spellDefinitionSchema,
	equipmentDefinitionSchema,
	featDefinitionSchema,
	abilityScoreMethodSchema,
	systemMechanicsSchema,
	traitSchema
};
