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
