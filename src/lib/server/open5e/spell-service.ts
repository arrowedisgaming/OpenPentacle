import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
import { getOpen5eSpells } from './cache.js';

/**
 * Get the full merged spell list for a character: base pack spells + Open5E spells.
 * Deduplicates by name (case-insensitive) — built-in spells win over Open5E versions.
 */
export async function getSpellsForCharacter(
	pack: ContentPack,
	open5eSources: string[]
): Promise<SpellDefinition[]> {
	const baseSpells = pack.spells ?? [];
	if (!open5eSources || open5eSources.length === 0) return baseSpells;

	const open5eSpells = await getOpen5eSpells(open5eSources);

	// Deduplicate: built-in spells take priority (curated data)
	const baseNames = new Set(baseSpells.map((s) => s.name.toLowerCase()));
	const unique = open5eSpells.filter((s) => !baseNames.has(s.name.toLowerCase()));

	return [...baseSpells, ...unique];
}
