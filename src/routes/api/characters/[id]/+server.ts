import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { characterDataSchema } from '$lib/schemas/character.schema.js';
import { parseAndMigrateCharacter } from '$lib/engine/character-migration.js';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const character = await db
		.select()
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

	const data = parseAndMigrateCharacter(character.data);
	if (!data) {
		throw error(500, 'Failed to load character data');
	}

	return json({
		...character,
		data
	});
};

export const PUT: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const body = await event.request.json();
	const result = characterDataSchema.safeParse(body);
	if (!result.success) {
		throw error(400, `Invalid character data: ${result.error.issues.map(i => i.message).join(', ')}`);
	}

	const data = result.data;
	const db = getDb();

	const existing = await db
		.select({ id: schema.characters.id })
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.id, event.params.id),
				eq(schema.characters.userId, session.user.id)
			)
		)
		.get();

	if (!existing) {
		throw error(404, 'Character not found');
	}

	const classSummary = data.classes
		.map((c) => `${c.classId} ${c.level}`)
		.join(' / ');

	await db
		.update(schema.characters)
		.set({
			name: data.name,
			systemId: data.systemId,
			classSummary,
			level: data.level,
			data: JSON.stringify(data),
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(and(eq(schema.characters.id, event.params.id), eq(schema.characters.userId, session.user.id)));

	return json({ success: true });
};

export const DELETE: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();

	const existing = await db
		.select({ id: schema.characters.id })
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.id, event.params.id),
				eq(schema.characters.userId, session.user.id)
			)
		)
		.get();

	if (!existing) {
		throw error(404, 'Character not found');
	}

	await db.delete(schema.characters).where(and(eq(schema.characters.id, event.params.id), eq(schema.characters.userId, session.user.id)));

	return json({ success: true });
};
