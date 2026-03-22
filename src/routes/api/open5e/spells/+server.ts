import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getOpen5eSpells, isAllowedSource } from '$lib/server/open5e/cache.js';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Sign in to use Open5E spell sources');
	}

	const sourcesParam = event.url.searchParams.get('sources');
	if (!sourcesParam) {
		return json([]);
	}

	const sources = sourcesParam
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s && isAllowedSource(s));

	if (sources.length === 0) {
		return json([]);
	}

	console.log(`[Open5E] Fetching spells for sources: ${sources.join(', ')}`);
	const spells = await getOpen5eSpells(sources);
	console.log(`[Open5E] Returning ${spells.length} spells`);
	return json(spells);
};
