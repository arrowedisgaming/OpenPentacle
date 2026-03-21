import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getContentPackRegistry } from '$lib/server/content/loader.js';

export const GET: RequestHandler = async () => {
	const registry = getContentPackRegistry();
	const packs = registry.getAll().map((pack) => ({
		id: pack.id,
		name: pack.name,
		version: pack.version,
		system: pack.system,
		description: pack.description,
		license: pack.license,
		authors: pack.authors
	}));

	return json(packs);
};
