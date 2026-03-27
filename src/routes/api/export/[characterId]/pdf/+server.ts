import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { parseAndMigrateCharacter } from '$lib/engine/character-migration.js';
import type { SystemId } from '$lib/types/content-pack.js';
import { getContentPackRegistry } from '$lib/server/content/loader.js';
import { computeSheet } from '$lib/engine/character-sheet.js';
import { generateCharacterPDFBuffer } from '$lib/server/pdf/pdf-generator.js';
import { getOpen5eSpells } from '$lib/server/open5e/cache.js';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const character = await db
		.select()
		.from(schema.characters)
		.where(
			and(
				eq(schema.characters.id, event.params.characterId),
				eq(schema.characters.userId, session.user.id)
			)
		)
		.get();

	if (!character) {
		throw error(404, 'Character not found');
	}

	const data = parseAndMigrateCharacter(character.data);
	if (!data) {
		throw error(500, 'Failed to load character data');
	}

	const registry = getContentPackRegistry();
	const pack = registry.getBySystem(character.systemId as SystemId)[0];
	if (!pack) {
		throw error(500, `Content pack not found for system: ${character.systemId}`);
	}

	// Fetch Open5E spells if the character has external sources configured
	const additionalSpells = data.open5eSources?.length
		? await getOpen5eSpells(data.open5eSources)
		: [];

	const sheet = computeSheet(data, pack);
	const pdfBuffer = await generateCharacterPDFBuffer(data, pack, sheet, additionalSpells);

	const safeName = character.name.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') || 'character';

	return new Response(new Uint8Array(pdfBuffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
			'Cache-Control': 'no-store'
		}
	});
};
