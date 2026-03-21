import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const character = await db
		.select({ id: schema.characters.id, shareId: schema.characters.shareId })
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.id, event.params.id),
				eq(schema.characters.userId, session.user.id)
			)
		)
		.get();

	if (!character) {
		throw error(404, 'Character not found');
	}

	// Generate new share ID if none exists
	const shareId = character.shareId ?? nanoid(10);

	await db
		.update(schema.characters)
		.set({ shareId, isPublic: true, updatedAt: new Date() })
		.where(eq(schema.characters.id, event.params.id));

	return json({ shareId, url: `/share/${shareId}` });
};

export const DELETE: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();

	await db
		.update(schema.characters)
		.set({ shareId: null, isPublic: false, updatedAt: new Date() })
		.where(
			and(
				eq(schema.characters.id, event.params.id),
				eq(schema.characters.userId, session.user.id)
			)
		);

	return json({ success: true });
};
