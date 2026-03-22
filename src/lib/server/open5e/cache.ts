import { getDb, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import type { SpellDefinition } from '$lib/types/content-pack.js';
import type { Open5eSourceInfo } from './types.js';
import { fetchSpellsByDocument } from './client.js';
import { mapOpen5eSpell } from './mapper.js';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Curated list of Open5E sources that contain spells */
const ALLOWED_SOURCES: Open5eSourceInfo[] = [
	{ key: 'deepm', displayName: 'Deep Magic for 5th Edition', publisher: 'Kobold Press', gameSystem: '5th Edition 2014', spellCount: 515 },
	{ key: 'a5e-ag', displayName: "Adventurer's Guide", publisher: 'EN Publishing', gameSystem: 'Advanced 5th Edition', spellCount: 371 },
	{ key: 'srd-2024', displayName: '5e 2024 Rules', publisher: 'Wizards of the Coast', gameSystem: '5th Edition 2024', spellCount: 338 },
	{ key: 'toh', displayName: 'Tome of Heroes', publisher: 'Kobold Press', gameSystem: '5th Edition 2014', spellCount: 91 },
];

/** Get cached spells for a document key, or null if stale/missing */
async function getCachedSpells(documentKey: string): Promise<SpellDefinition[] | null> {
	const db = getDb();
	const row = await db
		.select()
		.from(schema.open5eSpellCache)
		.where(eq(schema.open5eSpellCache.documentKey, documentKey))
		.get();

	if (!row) return null;

	const age = Date.now() - row.fetchedAt;
	if (age > CACHE_TTL_MS) return null;

	try {
		return JSON.parse(row.spells) as SpellDefinition[];
	} catch {
		return null;
	}
}

/** Cache mapped spells for a document */
async function setCachedSpells(
	documentKey: string,
	documentName: string,
	spells: SpellDefinition[]
): Promise<void> {
	const db = getDb();
	const existing = await db
		.select({ documentKey: schema.open5eSpellCache.documentKey })
		.from(schema.open5eSpellCache)
		.where(eq(schema.open5eSpellCache.documentKey, documentKey))
		.get();

	const values = {
		documentKey,
		documentName,
		spellCount: spells.length,
		spells: JSON.stringify(spells),
		fetchedAt: Date.now()
	};

	if (existing) {
		await db.update(schema.open5eSpellCache)
			.set(values)
			.where(eq(schema.open5eSpellCache.documentKey, documentKey))
			.run();
	} else {
		await db.insert(schema.open5eSpellCache).values(values).run();
	}
}

/**
 * Get mapped SpellDefinition[] for the given Open5E source keys.
 * Uses SQLite cache with 7-day TTL; fetches from API on cache miss.
 */
export async function getOpen5eSpells(documentKeys: string[]): Promise<SpellDefinition[]> {
	const allSpells: SpellDefinition[] = [];

	for (const key of documentKeys) {
		const cached = await getCachedSpells(key);
		if (cached) {
			allSpells.push(...cached);
			continue;
		}

		try {
			const rawSpells = await fetchSpellsByDocument(key);
			const mapped: SpellDefinition[] = [];
			for (const raw of rawSpells) {
				try {
					mapped.push(mapOpen5eSpell(raw));
				} catch {
					// Skip individual spells that fail to map
				}
			}
			console.log(`[Open5E] ${key}: ${mapped.length}/${rawSpells.length} spells mapped`);
			await setCachedSpells(key, rawSpells[0]?.document?.display_name ?? key, mapped);
			allSpells.push(...mapped);
		} catch (err) {
			console.error(`[Open5E] Failed for "${key}":`, err);
		}
	}

	return allSpells;
}

/** Get the curated list of allowed Open5E spell sources */
export async function getAvailableOpen5eSources(): Promise<Open5eSourceInfo[]> {
	return ALLOWED_SOURCES;
}

/** Check if a source key is in the allowed list */
export function isAllowedSource(key: string): boolean {
	return ALLOWED_SOURCES.some((s) => s.key === key);
}
