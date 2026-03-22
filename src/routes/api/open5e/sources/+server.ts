import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAvailableOpen5eSources } from '$lib/server/open5e/cache.js';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Sign in to browse Open5E sources');
	}

	const sources = await getAvailableOpen5eSources();
	return json(sources);
};
