import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw redirect(303, '/');
	}

	const db = getDb();
	const row = await db
		.select()
		.from(schema.userOpen5eDefaults)
		.where(eq(schema.userOpen5eDefaults.userId, session.user.id))
		.get();

	const enabledSources: string[] = row?.enabledSources ? JSON.parse(row.enabledSources) : [];

	return { enabledSources };
};
