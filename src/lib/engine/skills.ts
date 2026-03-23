import type { SkillId } from '$lib/types/common.js';
import { SKILL_ABILITIES } from '$lib/types/common.js';
import type { ClassDefinition, BackgroundDefinition } from '$lib/types/content-pack.js';

const ALL_SKILLS = Object.keys(SKILL_ABILITIES) as SkillId[];

/** Context for the skill selection step in the wizard */
export interface SkillChoiceContext {
	/** Skills auto-granted by background (read-only, always included) */
	backgroundSkills: SkillId[];
	/** Pool of skills the class can choose from */
	classChoicePool: SkillId[];
	/** How many class skills the user picks */
	classChoiceCount: number;
	/** Background skills that overlap with the class choice pool */
	overlapSkills: SkillId[];
	/**
	 * Extra skills available as replacements for overlaps.
	 * These are all skills NOT in the class choice pool and NOT already granted by background.
	 * The user picks from (classChoicePool + replacementPool) but can't double-pick background skills.
	 */
	replacementPool: SkillId[];
}

/**
 * Compute the skill selection context from class + background definitions.
 *
 * Rules:
 * - Background grants fixed skill proficiencies (no choice in SRD backgrounds)
 * - Class offers a "choose N from M" skill selection
 * - If a background skill is in the class's choice pool, it counts as an overlap.
 *   The background skill is still auto-granted, but the user gets to pick a replacement
 *   from the full skill list (minus all already-proficient skills).
 */
export function computeSkillChoiceContext(
	classDef: ClassDefinition,
	backgroundDef: BackgroundDefinition | null
): SkillChoiceContext {
	// Background skills (only fixed, non-choice proficiencies)
	const backgroundSkills: SkillId[] = (backgroundDef?.skillProficiencies ?? [])
		.filter((p) => !p.isChoice)
		.map((p) => p.value as SkillId);

	const classChoicePool = [...classDef.skillChoices.choices];
	const classChoiceCount = classDef.skillChoices.count;

	// Overlaps: background skills that are also in the class choice pool
	const overlapSkills = backgroundSkills.filter((s) => classChoicePool.includes(s));

	// Replacement pool: all skills NOT in the class pool AND NOT granted by background
	const backgroundSet = new Set(backgroundSkills);
	const classSet = new Set(classChoicePool);
	const replacementPool = ALL_SKILLS.filter(
		(s) => !classSet.has(s) && !backgroundSet.has(s)
	);

	return {
		backgroundSkills,
		classChoicePool,
		classChoiceCount,
		overlapSkills,
		replacementPool
	};
}

/**
 * Get the effective pool of skills the user can choose from.
 * This is the class pool (minus background-granted skills) + replacement pool.
 * The user picks `classChoiceCount` from this combined pool.
 */
export function getSelectableSkills(ctx: SkillChoiceContext): SkillId[] {
	const bgSet = new Set(ctx.backgroundSkills);
	const classAvailable = ctx.classChoicePool.filter((s) => !bgSet.has(s));
	return [...classAvailable, ...ctx.replacementPool];
}

/** Short flavor descriptions for each skill */
export const SKILL_EXAMPLES: Record<SkillId, string> = {
	acrobatics: 'Stay on your feet in a tricky situation, or perform an acrobatic stunt.',
	'animal-handling': 'Calm or train an animal, or get an animal to behave in a certain way.',
	arcana: 'Recall lore about spells, magic items, and the planes of existence.',
	athletics: 'Jump farther than normal, stay afloat in rough water, or break something.',
	deception: 'Tell a convincing lie, or wear a disguise convincingly.',
	history: 'Recall lore about historical events, people, nations, and cultures.',
	insight: "Discern a person's mood and intentions.",
	intimidation: 'Awe or threaten someone into doing what you want.',
	investigation: 'Find obscure information in books, or deduce how something works.',
	medicine: 'Diagnose an illness, or determine what killed the recently slain.',
	nature: 'Recall lore about terrain, plants, animals, and weather.',
	perception: "Using a combination of senses, notice something that's easy to miss.",
	performance: 'Act, tell a story, perform music, or dance.',
	persuasion: 'Honestly and graciously convince someone of something.',
	religion: 'Recall lore about gods, religious rituals, and holy symbols.',
	'sleight-of-hand': 'Pick a pocket, conceal a handheld object, or perform legerdemain.',
	stealth: 'Escape notice by moving quietly and hiding behind things.',
	survival: 'Follow tracks, forage, find a trail, or avoid natural hazards.'
};
