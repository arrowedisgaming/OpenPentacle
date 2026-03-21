import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { env } from '$env/dynamic/private';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

/**
 * Resolve the migrations folder.
 * In dev: src/lib/server/db/migrations (relative to this file)
 * In production (adapter-node): migrations/ copied alongside the build
 */
function getMigrationsFolder(): string {
	// Try relative to this source file first (dev)
	const thisDir = dirname(fileURLToPath(import.meta.url));
	const devPath = join(thisDir, 'migrations');
	if (existsSync(devPath)) return devPath;

	// Production: migrations/ alongside the build output
	const prodPath = join(process.cwd(), 'migrations');
	if (existsSync(prodPath)) return prodPath;

	throw new Error(
		'Migrations folder not found. Expected at:\n' +
		`  ${devPath}\n` +
		`  ${prodPath}`
	);
}

/**
 * For databases created by the old INIT_SQL approach (pre-migration),
 * mark the initial migration as already applied so the migrator
 * doesn't try to re-create existing tables.
 */
function backfillMigrationJournal(sqlite: Database.Database, migrationsFolder: string): void {
	const hasUsersTable = sqlite
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
		.get();

	if (!hasUsersTable) return; // Fresh database — migrations will handle everything

	// Ensure the migration tracking table exists
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
		// Database has tables but no migration records — created by old INIT_SQL
		console.log('Existing database detected (pre-migration). Backfilling migration journal...');
		const journal = JSON.parse(
			readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf-8')
		);
		const insert = sqlite.prepare(
			'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
		);
		for (const entry of journal.entries) {
			insert.run(entry.tag, entry.when);
		}
		console.log(`Backfilled ${journal.entries.length} migration(s).`);
	}
}

function createDb() {
	const dbPath = env.DATABASE_URL || 'local.db';
	const sqlite = new Database(dbPath);
	// Enable WAL mode for better concurrent read performance
	sqlite.pragma('journal_mode = WAL');

	const migrationsFolder = getMigrationsFolder();

	// Handle databases created before the migration system
	backfillMigrationJournal(sqlite, migrationsFolder);

	const db = drizzle(sqlite, { schema });

	// Run migrations — safe to call on every startup, only applies new ones
	migrate(db, { migrationsFolder });

	return db;
}

// Lazy singleton — created on first access
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
	if (!_db) {
		_db = createDb();
	}
	return _db;
}

export { schema };
