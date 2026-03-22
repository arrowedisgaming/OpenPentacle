import type { Open5eDocument, Open5ePaginatedResponse, Open5eSpell } from './types.js';

const BASE_URL = 'https://api.open5e.com/v2';
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 20;
const PAGE_SIZE = 50;

async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Open5E API error: ${response.status} ${response.statusText}`);
		}
		return response;
	} finally {
		clearTimeout(timeout);
	}
}

/** Fetch all available source documents from Open5E */
export async function fetchOpen5eDocuments(): Promise<Open5eDocument[]> {
	const docs: Open5eDocument[] = [];
	let url: string | null = `${BASE_URL}/documents/?format=json&page_size=${PAGE_SIZE}`;

	while (url) {
		const response = await fetchWithTimeout(url);
		const data: Open5ePaginatedResponse<Open5eDocument> = await response.json();
		docs.push(...data.results);
		url = data.next;
	}

	return docs;
}

/** Fetch all spells for a given source document key, handling pagination */
export async function fetchSpellsByDocument(documentKey: string): Promise<Open5eSpell[]> {
	const spells: Open5eSpell[] = [];
	let url: string | null =
		`${BASE_URL}/spells/?format=json&document__key=${encodeURIComponent(documentKey)}&page_size=${PAGE_SIZE}`;
	let pages = 0;

	while (url && pages < MAX_PAGES) {
		const response = await fetchWithTimeout(url);
		const data: Open5ePaginatedResponse<Open5eSpell> = await response.json();
		spells.push(...data.results);
		url = data.next;
		pages++;
	}

	return spells;
}
