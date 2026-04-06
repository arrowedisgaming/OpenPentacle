import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack } from '$lib/types/content-pack.js';

/** A class resource with computed current/max values */
export interface ComputedResource {
	/** Composite key: "{classId}:{resourceId}" */
	key: string;
	/** Display name from ResourceDefinition */
	name: string;
	/** Maximum value from classSpecific at current class level */
	maximum: number;
	/** Number used (from CharacterData.resourceUsage) */
	used: number;
	/** maximum - used */
	remaining: number;
	/** When this resource resets */
	recovery: 'short' | 'long' | 'none';
	/** Which class this belongs to */
	classId: string;
}

/** A spell slot level with usage tracking */
export interface SpellSlotResource {
	level: number;
	maximum: number;
	used: number;
	remaining: number;
}

/**
 * Compute trackable class resources from character data + content pack.
 * Walks each class selection, finds resourceDefinitions, and looks up
 * the maximum from classSpecific progression data at the character's class level.
 */
export function getCharacterResources(
	data: CharacterData,
	pack: ContentPack
): ComputedResource[] {
	const resources: ComputedResource[] = [];

	for (const cls of data.classes) {
		const classDef = pack.classes.find((cd) => cd.id === cls.classId);
		if (!classDef?.resourceDefinitions) continue;

		const progression = classDef.progression.find((p) => p.level === cls.level);
		if (!progression?.classSpecific) continue;

		for (const resDef of classDef.resourceDefinitions) {
			const maxValue = progression.classSpecific[resDef.id];
			if (typeof maxValue !== 'number' || maxValue <= 0) continue;

			const key = `${cls.classId}:${resDef.id}`;
			const used = data.resourceUsage?.[key] ?? 0;

			resources.push({
				key,
				name: resDef.name,
				maximum: maxValue,
				used: Math.min(used, maxValue),
				remaining: Math.max(maxValue - used, 0),
				recovery: resDef.recovery,
				classId: cls.classId
			});
		}
	}

	return resources;
}

/**
 * Compute spell slot resources with usage tracking.
 * Uses pre-computed slot maximums (from calculateSpellSlots), not raw SpellData.
 */
export function getSpellSlotResources(
	computedSlots: Record<number, number>,
	pactSlots: { count: number; level: number } | null,
	data: CharacterData
): { slots: SpellSlotResource[]; pactSlots: SpellSlotResource | null } {
	const slots: SpellSlotResource[] = [];

	for (const [levelStr, maximum] of Object.entries(computedSlots)) {
		if (maximum <= 0) continue;
		const level = parseInt(levelStr, 10);
		const used = data.spells.spellSlotsUsed?.[levelStr] ?? 0;
		slots.push({
			level,
			maximum,
			used: Math.min(used, maximum),
			remaining: Math.max(maximum - used, 0)
		});
	}

	// Sort by spell level
	slots.sort((a, b) => a.level - b.level);

	let pactSlotResource: SpellSlotResource | null = null;
	if (pactSlots && pactSlots.count > 0) {
		const used = data.spells.pactSlotsUsed ?? 0;
		pactSlotResource = {
			level: pactSlots.level,
			maximum: pactSlots.count,
			used: Math.min(used, pactSlots.count),
			remaining: Math.max(pactSlots.count - used, 0)
		};
	}

	return { slots, pactSlots: pactSlotResource };
}
