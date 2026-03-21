import type { LayoutServerLoad } from './$types.js';
import { getContentPackRegistry } from '$lib/server/content/loader.js';
import { error } from '@sveltejs/kit';
import type { SystemId } from '$lib/types/content-pack.js';

const VALID_SYSTEMS: Set<string> = new Set<string>(['srd521', 'black-flag', 'a5e']);

export const load: LayoutServerLoad = async ({ params }) => {
	if (!VALID_SYSTEMS.has(params.system)) {
		throw error(404, `Unknown system "${params.system}"`);
	}

	const systemId = params.system as SystemId;
	const registry = getContentPackRegistry();
	const pack = registry.getBySystem(systemId)[0];

	if (!pack) {
		throw error(404, `No content pack found for system "${params.system}"`);
	}

	return {
		pack,
		systemId
	};
};
