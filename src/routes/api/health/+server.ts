import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import { getContentPackRegistry } from '$lib/server/content/loader.js';

export const GET: RequestHandler = async () => {
	let dbStatus = 'disconnected';
	let packCount = 0;
	let healthy = true;

	try {
		const db = getDb();
		db.run(sql`SELECT 1`);
		dbStatus = 'connected';
	} catch {
		healthy = false;
	}

	try {
		const registry = getContentPackRegistry();
		packCount = registry.getAll().length;
	} catch {
		healthy = false;
	}

	const body = {
		status: healthy ? 'ok' : 'degraded',
		database: dbStatus,
		contentPacks: packCount,
		timestamp: new Date().toISOString()
	};

	return json(body, { status: healthy ? 200 : 503 });
};
