import type { PageServerLoad } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getContentPackRegistry } from '$lib/server/content/loader.js';
import type { SystemId } from '$lib/types/content-pack.js';
import { parseAndMigrateCharacter } from '$lib/engine/character-migration.js';

export const load: PageServerLoad = async (event) => {
	const db = getDb();
	const character = await db
		.select()
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.shareId, event.params.shareId),
				eq(schema.characters.isPublic, true)
			)
		)
		.get();

	if (!character) {
		throw error(404, 'Shared character not found or link has been revoked');
	}

	const data = parseAndMigrateCharacter(character.data);
	if (!data) {
		throw error(500, 'Failed to load character data');
	}

	const registry = getContentPackRegistry();
	const pack = registry.getBySystem(character.systemId as SystemId)[0];

	return {
		character: {
			name: character.name,
			systemId: character.systemId,
			classSummary: character.classSummary,
			level: character.level,
			data
		},
		pack
	};
};
