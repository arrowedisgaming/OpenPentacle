import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const row = await db
		.select()
		.from(schema.userOpen5eDefaults)
		.where(eq(schema.userOpen5eDefaults.userId, session.user.id))
		.get();

	const enabledSources: string[] = row?.enabledSources ? JSON.parse(row.enabledSources) : [];
	return json({ enabledSources });
};

export const PUT: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const body = await event.request.json();
	const enabledSources: string[] = body?.enabledSources;

	if (!Array.isArray(enabledSources) || enabledSources.some((s: any) => typeof s !== 'string')) {
		throw error(400, 'enabledSources must be an array of strings');
	}

	if (enabledSources.length > 30) {
		throw error(400, 'Maximum 30 sources allowed');
	}

	const db = getDb();
	const existing = await db
		.select({ id: schema.userOpen5eDefaults.id })
		.from(schema.userOpen5eDefaults)
		.where(eq(schema.userOpen5eDefaults.userId, session.user.id))
		.get();

	const now = Date.now();

	if (existing) {
		await db.update(schema.userOpen5eDefaults)
			.set({
				enabledSources: JSON.stringify(enabledSources),
				updatedAt: now
			})
			.where(eq(schema.userOpen5eDefaults.userId, session.user.id))
			.run();
	} else {
		await db.insert(schema.userOpen5eDefaults)
			.values({
				id: nanoid(),
				userId: session.user.id,
				enabledSources: JSON.stringify(enabledSources),
				updatedAt: now
			})
			.run();
	}

	return json({ enabledSources });
};
