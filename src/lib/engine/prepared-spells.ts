import type { CharacterData, SpellKnown } from '$lib/types/character.js';
import type { ClassDefinition, ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
import { getMaxSpellLevel } from './class-progression.js';

/** Context for the prepared-spell editor, or null if the class can't prepare spells. */
export interface PreparedSpellContext {
	maxPrepared: number;
	maxSpellLevel: number;
	spellListId: string;
	alwaysPreparedIds: Set<string>;
	isSpellbookCaster: boolean;
	className: string;
	maxCantrips: number;
	canSwapCantrips: boolean;
}

/**
 * Compute the context needed to render the prepared-spell editor.
 * Returns null if the character's primary class has no spellcasting or
 * no preparedSpells in its progression table.
 */
export function computePreparedSpellContext(
	data: CharacterData,
	classDef: ClassDefinition,
	_pack: ContentPack
): PreparedSpellContext | null {
	if (!classDef.spellcasting) return null;

	const level = data.level;
	const row = classDef.progression.find((p) => p.level === level);
	if (!row) return null;

	// Only show for classes that have a preparedSpells column
	const maxPrepared = row.preparedSpells;
	if (maxPrepared == null || maxPrepared === 0) return null;

	const maxSpellLevel = getMaxSpellLevel(classDef, level);
	if (maxSpellLevel === 0) return null;

	const alwaysPreparedIds = new Set(
		data.spells.knownSpells
			.filter((s) => s.alwaysPrepared)
			.map((s) => s.spellId)
	);

	const maxCantrips = row.cantripsKnown ?? 0;

	return {
		maxPrepared,
		maxSpellLevel,
		spellListId: classDef.spellcasting.spellList,
		alwaysPreparedIds,
		isSpellbookCaster: classDef.id === 'wizard',
		className: classDef.name,
		maxCantrips,
		canSwapCantrips: classDef.id === 'wizard'
	};
}

/**
 * Return the spells available for preparation.
 *
 * - Wizard: level 1+ spells from knownSpells (the spellbook), resolved against allSpells
 * - All others: level 1+ spells from allSpells on the class spell list, up to maxSpellLevel
 *
 * Cantrips (level 0) are excluded — they are always prepared.
 */
export function getAvailableSpellsForPreparation(
	context: PreparedSpellContext,
	knownSpells: SpellKnown[],
	allSpells: SpellDefinition[]
): SpellDefinition[] {
	if (context.isSpellbookCaster) {
		const knownIds = new Set(knownSpells.map((s) => s.spellId));
		return allSpells.filter(
			(s) => s.level > 0 && s.level <= context.maxSpellLevel && knownIds.has(s.id)
		);
	}

	return allSpells.filter(
		(s) =>
			s.level > 0 &&
			s.level <= context.maxSpellLevel &&
			s.lists.includes(context.spellListId)
	);
}

/**
 * Return all cantrips (level 0) on the wizard spell list that the character
 * could swap to. The UI uses this pool to let the user pick which cantrips
 * to keep; the total count is capped at `context.maxCantrips`.
 */
export function getAvailableCantripsForSwap(
	context: PreparedSpellContext,
	allSpells: SpellDefinition[]
): SpellDefinition[] {
	return allSpells.filter(
		(s) => s.level === 0 && s.lists.includes(context.spellListId)
	);
}
