import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack } from '$lib/types/content-pack.js';

/**
 * Apply a short rest to character data. Returns a new CharacterData (immutable).
 *
 * Resets:
 * - Class resources with recovery === 'short'
 * - Pact magic slots
 * - Optionally adds HP recovered from spending hit dice
 */
export function applyShortRest(
	data: CharacterData,
	pack: ContentPack,
	hpRecovered?: number
): CharacterData {
	const newResourceUsage = { ...data.resourceUsage };

	// Reset short-rest resources
	for (const cls of data.classes) {
		const classDef = pack.classes.find((cd) => cd.id === cls.classId);
		if (!classDef?.resourceDefinitions) continue;

		for (const resDef of classDef.resourceDefinitions) {
			if (resDef.recovery === 'short') {
				const key = `${cls.classId}:${resDef.id}`;
				delete newResourceUsage[key];
			}
		}
	}

	// Reset pact slots
	const newSpells = {
		...data.spells,
		pactSlotsUsed: 0
	};

	// Apply HP recovery
	let newHitPoints = data.hitPoints;
	if (hpRecovered && hpRecovered > 0) {
		const newCurrent = Math.min(
			data.hitPoints.current + hpRecovered,
			data.hitPoints.maximum
		);
		newHitPoints = { ...data.hitPoints, current: newCurrent };
	}

	return {
		...data,
		resourceUsage: Object.keys(newResourceUsage).length > 0 ? newResourceUsage : undefined,
		spells: newSpells,
		hitPoints: newHitPoints
	};
}

/**
 * Apply a long rest to character data. Returns a new CharacterData (immutable).
 *
 * Resets:
 * - ALL class resources (both short and long recovery)
 * - All spell slots used
 * - Pact magic slots
 * - HP to maximum, temporary HP to 0
 * - Hit dice: recover floor(total/2) per die type (minimum 1)
 * - System pools (luck points, exertion points)
 */
export function applyLongRest(
	data: CharacterData,
	pack: ContentPack
): CharacterData {
	// Reset all spell usage
	const newSpells = {
		...data.spells,
		spellSlotsUsed: undefined as Record<string, number> | undefined,
		pactSlotsUsed: 0
	};

	// Full HP, clear temp HP
	const newHitPoints = {
		...data.hitPoints,
		current: data.hitPoints.maximum,
		temporary: 0,
		hitDice: data.hitPoints.hitDice.map((hd) => {
			// Recover floor(total/2) hit dice, minimum 1
			const recover = Math.max(Math.floor(hd.total / 2), 1);
			return {
				...hd,
				used: Math.max(hd.used - recover, 0)
			};
		})
	};

	// Reset system pools
	const newSystemData = { ...data.systemData };
	if (newSystemData.luckPoints) {
		newSystemData.luckPoints = {
			...newSystemData.luckPoints,
			current: newSystemData.luckPoints.max
		};
	}
	if (newSystemData.exertionPoints) {
		newSystemData.exertionPoints = {
			...newSystemData.exertionPoints,
			current: newSystemData.exertionPoints.max
		};
	}

	return {
		...data,
		resourceUsage: undefined,
		spells: newSpells,
		hitPoints: newHitPoints,
		systemData: newSystemData
	};
}
