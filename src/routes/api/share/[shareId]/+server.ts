import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const db = getDb();
	const character = await db
		.select()
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.shareId, event.params.shareId),
				eq(schema.characters.isPublic, true)
			)
		)
		.get();

	if (!character) {
		throw error(404, 'Shared character not found');
	}

	return json({
		name: character.name,
		systemId: character.systemId,
		classSummary: character.classSummary,
		level: character.level,
		data: JSON.parse(character.data)
	});
};
