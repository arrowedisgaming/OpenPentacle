import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export { schema };

/**
 * Database access layer supporting both Cloudflare D1 and local better-sqlite3.
 *
 * On Cloudflare: initDatabase() in hooks sets D1 via setDatabase().
 * On Node.js: initDatabase() in hooks dynamically imports better-sqlite3.
 *
 * All consumers call getDb() — they don't need to know which backend is active.
 */

let _db: any = null;

/** Set the active database instance (called from hooks) */
export function setDatabase(db: any): void {
	_db = db;
}

/** Create a D1-backed drizzle instance from a Cloudflare D1 binding */
export function createD1Database(d1Binding: any) {
	return drizzleD1(d1Binding, { schema });
}

/** Get the active database instance */
export function getDb() {
	if (!_db) {
		throw new Error('Database not initialized. Ensure hooks.server.ts has run.');
	}
	return _db;
}
