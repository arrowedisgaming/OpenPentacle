import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getContentPackRegistry } from '$lib/server/content/loader.js';
import type { SystemId } from '$lib/types/content-pack.js';

const VALID_TYPES = ['classes', 'origins', 'spells', 'equipment', 'feats', 'backgrounds'] as const;

export const GET: RequestHandler = async (event) => {
	const type = event.params.type as (typeof VALID_TYPES)[number];
	if (!VALID_TYPES.includes(type)) {
		throw error(400, `Invalid content type: ${type}`);
	}

	const systemId = event.url.searchParams.get('system') as SystemId | null;
	const registry = getContentPackRegistry();

	const packs = systemId ? registry.getBySystem(systemId) : registry.getAll();

	const items = packs.flatMap((pack) => {
		const content = pack[type];
		if (Array.isArray(content)) {
			return content.map((item: any) => ({ ...item, _packId: pack.id, _system: pack.system }));
		}
		return [];
	});

	return json(items);
};
