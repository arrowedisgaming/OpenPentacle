import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const format = event.url.searchParams.get('format') ?? 'json';
	if (format !== 'json') {
		throw error(400, 'Unsupported export format');
	}

	const db = getDb();
	const character = await db
		.select()
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.id, event.params.characterId),
				eq(schema.characters.userId, session.user.id)
			)
		)
		.get();

	if (!character) {
		throw error(404, 'Character not found');
	}

	const data = JSON.parse(character.data);
	const safeName = character.name.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') || 'character';
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${safeName}.json"`
		}
	});
};
