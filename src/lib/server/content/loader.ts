import { contentPackSchema } from '$lib/schemas/content-pack.schema.js';
import { SYSTEM_NAMES, type ContentPack, type SystemId } from '$lib/types/content-pack.js';

// ─── Built-in Content Packs (embedded at build time via Vite) ──────
// These JSON imports work on both Node.js and Cloudflare — Vite bundles them.

import srd521Index from '../../../../static/content-packs/srd521/index.json';
import srd521Classes from '../../../../static/content-packs/srd521/classes.json';
import srd521Origins from '../../../../static/content-packs/srd521/origins.json';
import srd521Backgrounds from '../../../../static/content-packs/srd521/backgrounds.json';
import srd521Spells from '../../../../static/content-packs/srd521/spells.json';
import srd521Equipment from '../../../../static/content-packs/srd521/equipment.json';
import srd521Feats from '../../../../static/content-packs/srd521/feats.json';

/** Resolve file references in the index to their imported data */
function buildSrd521Pack(): Record<string, unknown> {
	const fileMap: Record<string, unknown> = {
		'classes.json': srd521Classes,
		'origins.json': srd521Origins,
		'backgrounds.json': srd521Backgrounds,
		'spells.json': srd521Spells,
		'equipment.json': srd521Equipment,
		'feats.json': srd521Feats,
	};

	const resolved = { ...srd521Index } as Record<string, unknown>;
	for (const [key, value] of Object.entries(resolved)) {
		if (typeof value === 'string' && value.endsWith('.json') && fileMap[value]) {
			resolved[key] = fileMap[value];
		}
	}
	return resolved;
}

/**
 * ContentPackRegistry loads content packs from embedded data (built-in)
 * and optionally from the filesystem (Node.js only, for homebrew).
 */
class ContentPackRegistry {
	private packs = new Map<string, ContentPack>();
	private loaded = false;

	/** Load all built-in packs */
	loadAll(): void {
		if (this.loaded) return;

		// Load embedded SRD 5.2.1 pack
		try {
			const raw = buildSrd521Pack();
			const result = contentPackSchema.safeParse(raw);
			if (result.success) {
				this.packs.set(result.data.id, result.data as ContentPack);
			} else {
				const errors = result.error.issues.map(
					(i) => `${i.path.join('.')}: ${i.message}`
				);
				console.error(`SRD 5.2.1 validation failed:\n${errors.join('\n')}`);
			}
		} catch (err) {
			console.error('Failed to load SRD 5.2.1 content pack:', err);
		}

		this.loaded = true;
	}

	/** Get a pack by ID */
	get(id: string): ContentPack | undefined {
		this.ensureLoaded();
		return this.packs.get(id);
	}

	/** Get all packs */
	getAll(): ContentPack[] {
		this.ensureLoaded();
		return Array.from(this.packs.values());
	}

	/** Get packs for a specific system */
	getBySystem(systemId: SystemId): ContentPack[] {
		this.ensureLoaded();
		return this.getAll().filter((p) => p.system === systemId);
	}

	/** Get list of available systems (from loaded packs) */
	getAvailableSystems(): { id: SystemId; name: string; packCount: number }[] {
		this.ensureLoaded();
		const systems = new Map<SystemId, number>();
		for (const pack of this.packs.values()) {
			systems.set(pack.system, (systems.get(pack.system) ?? 0) + 1);
		}
		return Array.from(systems.entries()).map(([id, count]) => ({
			id,
			name: SYSTEM_NAMES[id] ?? id,
			packCount: count
		}));
	}

	private ensureLoaded(): void {
		if (!this.loaded) this.loadAll();
	}

	/** Validate a pack without registering it (for homebrew upload) */
	validate(data: unknown): { valid: boolean; errors: string[] } {
		const result = contentPackSchema.safeParse(data);
		if (result.success) {
			return { valid: true, errors: [] };
		}
		return {
			valid: false,
			errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
		};
	}

	/** Register a validated pack (for homebrew) */
	register(pack: ContentPack): void {
		this.packs.set(pack.id, pack);
	}
}

// Singleton instance
let _registry: ContentPackRegistry | null = null;

export function getContentPackRegistry(): ContentPackRegistry {
	if (!_registry) {
		_registry = new ContentPackRegistry();
	}
	return _registry;
}

export { ContentPackRegistry };
