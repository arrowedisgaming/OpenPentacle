import { z } from 'zod';

const abilityIdSchema = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']);
const proficiencyLevelSchema = z.enum(['none', 'proficient', 'expertise']);
const systemIdSchema = z.enum(['srd521', 'black-flag', 'a5e']);

const sourcedBonusWithAbility = z.object({
	ability: abilityIdSchema,
	value: z.number().int(),
	source: z.string(),
	sourceType: z.enum(['origin', 'class', 'background', 'feat', 'equipment', 'level-up', 'system'])
});

const originSelectionSchema = z.object({
	layerId: z.string().min(1),
	optionId: z.string().min(1),
	subOptionId: z.string().optional(),
	choices: z.array(z.object({
		choiceId: z.string().min(1),
		selectedValues: z.array(z.string())
	}))
});

const classSelectionSchema = z.object({
	classId: z.string().min(1),
	subclassId: z.string().optional(),
	level: z.number().int().min(1).max(20),
	hitDie: z.string().regex(/^\d+d\d+$/),
	featureChoices: z.array(z.object({
		featureId: z.string().min(1),
		choiceId: z.string().min(1),
		selectedOptionIds: z.array(z.string())
	}))
});

const abilityScoreDataSchema = z.object({
	method: z.string(),
	base: z.record(abilityIdSchema, z.number().int().min(1).max(30)),
	originBonuses: z.array(sourcedBonusWithAbility),
	levelUpBonuses: z.array(sourcedBonusWithAbility),
	featBonuses: z.array(sourcedBonusWithAbility)
});

const spellDataSchema = z.object({
	knownSpells: z.array(z.object({
		spellId: z.string().min(1),
		source: z.string(),
		alwaysPrepared: z.boolean().optional()
	})),
	preparedSpellIds: z.array(z.string()),
	spellSlots: z.record(z.string(), z.number().int().min(0)),
	pactSlots: z.object({
		count: z.number().int(),
		level: z.number().int()
	}).optional()
});

export const characterDataSchema = z.object({
	schemaVersion: z.number().int().optional(),
	systemId: systemIdSchema,
	contentPackIds: z.array(z.string()).max(50),
	open5eSources: z.array(z.string()).max(30).optional(),
	name: z.string().min(1).max(100),
	level: z.number().int().min(1).max(20),
	xp: z.number().int().min(0),
	origins: z.array(originSelectionSchema).max(10),
	classes: z.array(classSelectionSchema).min(1).max(20),
	abilityScores: abilityScoreDataSchema,
	skills: z.array(z.object({
		skillId: z.string().min(1),
		proficiency: proficiencyLevelSchema,
		source: z.string()
	})).max(50),
	proficiencies: z.array(z.object({
		type: z.enum(['armor', 'weapon', 'tool', 'language', 'saving-throw']),
		value: z.string(),
		source: z.string()
	})).max(100),
	spells: spellDataSchema,
	equipment: z.array(z.object({
		equipmentId: z.string().min(1),
		quantity: z.number().int().min(0),
		equipped: z.boolean(),
		notes: z.string().optional()
	})).max(500),
	feats: z.array(z.object({
		featId: z.string().min(1),
		source: z.string(),
		choices: z.array(z.object({
			choiceId: z.string().min(1),
			selectedValue: z.string()
		})).max(20)
	})).max(50),
	background: z.object({
		backgroundId: z.string().min(1),
		choices: z.array(z.object({
			choiceId: z.string().min(1),
			selectedValues: z.array(z.string())
		}))
	}).nullable(),
	systemData: z.object({
		destinyId: z.string().optional(),
		luckPoints: z.object({ current: z.number().int(), max: z.number().int() }).optional(),
		exertionPoints: z.object({ current: z.number().int(), max: z.number().int() }).optional()
	}),
	hitPoints: z.object({
		maximum: z.number().int().min(0),
		current: z.number().int(),
		temporary: z.number().int().min(0),
		hitDice: z.array(z.object({
			die: z.string(),
			total: z.number().int().min(0),
			used: z.number().int().min(0)
		}))
	}),
	currency: z.object({
		cp: z.number().int().min(0),
		sp: z.number().int().min(0),
		ep: z.number().int().min(0),
		gp: z.number().int().min(0),
		pp: z.number().int().min(0)
	}),
	flavor: z.object({
		appearance: z.string().optional(),
		backstory: z.string().optional(),
		personalityTraits: z.string().optional(),
		ideals: z.string().optional(),
		bonds: z.string().optional(),
		flaws: z.string().optional(),
		age: z.string().optional(),
		height: z.string().optional(),
		weight: z.string().optional(),
		eyes: z.string().optional(),
		skin: z.string().optional(),
		hair: z.string().optional()
	})
});

export type CharacterDataInput = z.infer<typeof characterDataSchema>;
