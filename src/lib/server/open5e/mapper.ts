import type { SpellDefinition } from '$lib/types/content-pack.js';
import type { DamageType, SpellSchool } from '$lib/types/common.js';
import type { Open5eSpell } from './types.js';

const VALID_SCHOOLS: Set<string> = new Set([
	'abjuration', 'conjuration', 'divination', 'enchantment',
	'evocation', 'illusion', 'necromancy', 'transmutation'
]);

const VALID_DAMAGE_TYPES: Set<string> = new Set([
	'bludgeoning', 'piercing', 'slashing',
	'acid', 'cold', 'fire', 'force', 'lightning',
	'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
]);

/**
 * Extract the bare class name from an Open5E class key.
 * e.g., "srd-2024_wizard" → "wizard", "srd_bard" → "bard"
 */
export function extractClassName(classKey: string): string {
	const parts = classKey.split('_');
	return parts[parts.length - 1];
}

/** Map an Open5E spell to our SpellDefinition format */
export function mapOpen5eSpell(raw: Open5eSpell): SpellDefinition {
	const school = (raw.school?.key ?? 'evocation').toLowerCase();

	return {
		id: raw.key,
		name: raw.name,
		level: raw.level,
		school: (VALID_SCHOOLS.has(school) ? school : 'evocation') as SpellSchool,
		castingTime: raw.casting_time ?? '1 action',
		range: raw.range_text || (raw.range != null ? `${raw.range} feet` : 'Self'),
		components: {
			verbal: raw.verbal ?? false,
			somatic: raw.somatic ?? false,
			material: raw.material ?? false,
			materialDescription: raw.material_specified || undefined,
			materialCost: raw.material_cost ?? undefined,
			materialConsumed: raw.material_consumed || undefined
		},
		duration: raw.duration ?? 'Instantaneous',
		concentration: raw.concentration ?? false,
		ritual: raw.ritual ?? false,
		description: raw.desc ?? '',
		higherLevels: raw.higher_level || undefined,
		lists: (raw.classes ?? []).map((c) => extractClassName(c.key)),
		damageType: parseDamageType(raw.damage_types),
		tags: buildTags(raw)
	};
}

function parseDamageType(damageTypes: { name: string; key: string }[]): DamageType | undefined {
	if (!damageTypes?.length) return undefined;
	const key = damageTypes[0]?.key?.toLowerCase();
	if (!key) return undefined;
	return VALID_DAMAGE_TYPES.has(key) ? (key as DamageType) : undefined;
}

function buildTags(raw: Open5eSpell): string[] {
	const tags: string[] = [];
	if (raw.damage_roll) tags.push('damage');
	if (raw.level === 0 && raw.damage_roll) tags.push('cantrip-scaling');
	return tags;
}
