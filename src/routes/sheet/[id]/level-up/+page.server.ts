import type { PageServerLoad } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getContentPackRegistry } from '$lib/server/content/loader.js';
import type { SystemId } from '$lib/types/content-pack.js';
import { parseAndMigrateCharacter } from '$lib/engine/character-migration.js';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Please sign in to view your characters');
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
		throw error(500, 'Failed to load character data — it may be corrupted');
	}

	const registry = getContentPackRegistry();
	const pack = registry.getBySystem(character.systemId as SystemId)[0];

	if (data.level >= pack.systemMechanics.maxLevel) {
		throw error(400, 'Character is already at maximum level');
	}

	return {
		character: {
			...character,
			data
		},
		pack
	};
};
