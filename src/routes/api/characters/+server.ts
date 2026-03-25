import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { characterDataSchema } from '$lib/schemas/character.schema.js';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const characters = await db
		.select({
			id: schema.characters.id,
			name: schema.characters.name,
			systemId: schema.characters.systemId,
			classSummary: schema.characters.classSummary,
			level: schema.characters.level,
			updatedAt: schema.characters.updatedAt
		})
		.from(schema.characters)
		.where(eq(schema.characters.userId, session.user.id))
		.all();

	return json(characters);
};

export const POST: RequestHandler = async (event) => {
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
	const id = nanoid(10);
	const nowUnix = Math.floor(Date.now() / 1000);

	// Build class summary
	const classSummary = data.classes
		.map((c) => `${c.classId} ${c.level}`)
		.join(' / ');

	try {
		const db = getDb();

		// Ensure user row exists (Auth.js JWT strategy doesn't create DB rows).
		// A user may sign in via multiple providers (Google + Discord) sharing the
		// same email. Each provider produces a different user ID, but the email
		// column has a unique constraint. If the ID doesn't exist but the email
		// does, we insert a new row without the email to avoid the unique conflict.
		const existingUser = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.id, session.user.id))
			.get();
		if (!existingUser) {
			const email = session.user.email ?? null;
			const emailTaken = email
				? !!(await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get())
				: false;
			await db.insert(schema.users).values({
				id: session.user.id,
				name: session.user.name ?? null,
				email: emailTaken ? null : email,
				image: session.user.image ?? null,
			});
		}

		await db.insert(schema.characters).values({
			id,
			userId: session.user.id,
			name: data.name,
			systemId: data.systemId,
			classSummary,
			level: data.level,
			data: JSON.stringify(data),
			createdAt: nowUnix as any,
			updatedAt: nowUnix as any
		});

		return json({ id }, { status: 201 });
	} catch (err: any) {
		console.error('Character save error:', err);
		throw error(500, 'Failed to save character');
	}
};
