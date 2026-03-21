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

	if (format === 'json') {
		const data = JSON.parse(character.data);
		return new Response(JSON.stringify(data, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${character.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`
			}
		});
	}

	// PDF export will be implemented in Phase 4
	throw error(400, 'PDF export is not yet available');
};
