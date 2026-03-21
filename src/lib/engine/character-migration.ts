import type { CharacterData } from '$lib/types/character.js';

/**
 * Current schema version for CharacterData.
 * Increment this when making breaking changes to the CharacterData interface,
 * and add a migration case in migrateCharacterData().
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migrate character data from any older schema version to the current one.
 * Each version bump should have a corresponding migration case.
 *
 * Returns the migrated data, or null if the data is unrecoverable.
 */
export function migrateCharacterData(raw: unknown): CharacterData | null {
	if (!raw || typeof raw !== 'object') return null;

	const data = raw as Record<string, unknown>;
	let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

	// Migration ladder — each case upgrades one version
	while (version < CURRENT_SCHEMA_VERSION) {
		switch (version) {
			case 0:
				// v0 → v1: Add schemaVersion field (no structural changes)
				data.schemaVersion = 1;
				version = 1;
				break;
			default:
				// Unknown version — cannot migrate
				console.error(`Unknown character schema version: ${version}`);
				return null;
		}
	}

	return data as unknown as CharacterData;
}

/**
 * Safely parse character JSON from the database, applying migrations.
 * Returns null if parsing or migration fails.
 */
export function parseAndMigrateCharacter(jsonString: string): CharacterData | null {
	try {
		const raw = JSON.parse(jsonString);
		return migrateCharacterData(raw);
	} catch (err) {
		console.error('Failed to parse character data:', err);
		return null;
	}
}
