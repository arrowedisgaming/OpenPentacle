/**
 * Node.js-only database initialization using better-sqlite3.
 * This file is NEVER imported on Cloudflare — only dynamically imported
 * from hooks.server.ts when platform.env.DB is not available.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';
import { setDatabase } from './index.js';

export async function initNodeDatabase(): Promise<void> {
	const dbPath = process.env.DATABASE_URL || 'local.db';
	const sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');

	// Resolve migrations folder
	const thisDir = dirname(fileURLToPath(import.meta.url));
	let migrationsFolder = join(thisDir, 'migrations');
	if (!existsSync(migrationsFolder)) {
		migrationsFolder = join(process.cwd(), 'migrations');
	}

	if (existsSync(migrationsFolder)) {
		// Backfill migration journal for pre-migration databases
		const hasUsersTable = sqlite
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
			.get();

		if (hasUsersTable) {
			sqlite.prepare(`
				CREATE TABLE IF NOT EXISTS __drizzle_migrations (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					hash TEXT NOT NULL,
					created_at NUMERIC
				)
			`).run();

			const migrationCount = sqlite
				.prepare('SELECT count(*) as cnt FROM __drizzle_migrations')
				.get() as { cnt: number };

			if (migrationCount.cnt === 0) {
				console.log('Backfilling migration journal...');
				const journal = JSON.parse(
					readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf-8')
				);
				const insert = sqlite.prepare(
					'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
				);
				for (const entry of journal.entries) {
					insert.run(entry.tag, entry.when);
				}
			}
		}

		const db = drizzle(sqlite, { schema });
		migrate(db, { migrationsFolder });
		setDatabase(db);
	} else {
		setDatabase(drizzle(sqlite, { schema }));
	}
}
