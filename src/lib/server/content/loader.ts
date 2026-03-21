import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { contentPackSchema } from '$lib/schemas/content-pack.schema.js';
import { SYSTEM_NAMES, type ContentPack, type SystemId } from '$lib/types/content-pack.js';

/**
 * ContentPackRegistry loads and caches content packs from the filesystem.
 * Built-in packs live in static/content-packs/{system-id}/.
 * Each pack has an index.json manifest that references other JSON files,
 * OR contains all data inline.
 */
class ContentPackRegistry {
	private packs = new Map<string, ContentPack>();
	private loaded = false;
	private contentDir: string;

	constructor(contentDir?: string) {
		this.contentDir = contentDir ?? process.env.CONTENT_PACKS_DIR ?? join(process.cwd(), 'static', 'content-packs');
	}

	/** Load all packs from the content directory */
	loadAll(): void {
		if (this.loaded) return;

		if (!existsSync(this.contentDir)) {
			console.warn(`Content directory not found: ${this.contentDir}`);
			this.loaded = true;
			return;
		}

		const entries = readdirSync(this.contentDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				this.loadPack(entry.name);
			} catch (err) {
				console.error(`Failed to load content pack "${entry.name}":`, err);
			}
		}

		this.loaded = true;
	}

	/** Load a single pack by its directory name */
	private loadPack(dirName: string): void {
		const packDir = join(this.contentDir, dirName);
		const indexPath = join(packDir, 'index.json');

		if (!existsSync(indexPath)) {
			console.warn(`No index.json in ${packDir}, skipping`);
			return;
		}

		const rawIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

		// The index.json can be a complete pack or reference external files
		const pack = this.resolvePackFiles(rawIndex, packDir);

		// Validate with Zod
		const result = contentPackSchema.safeParse(pack);
		if (!result.success) {
			const errors = result.error.issues.map(
				(i) => `${i.path.join('.')}: ${i.message}`
			);
			throw new Error(`Validation failed for pack "${dirName}":\n${errors.join('\n')}`);
		}

		this.packs.set(result.data.id, result.data as ContentPack);
	}

	/**
	 * Resolve external file references in a pack.
	 * If the index.json has a field like `"classes": "classes.json"`,
	 * load that file and replace the string reference with the parsed data.
	 */
	private resolvePackFiles(raw: Record<string, unknown>, packDir: string): Record<string, unknown> {
		const resolved = { ...raw };
		const fileFields = ['classes', 'origins', 'backgrounds', 'spells', 'equipment', 'feats'];

		for (const field of fileFields) {
			const value = resolved[field];
			if (typeof value === 'string' && value.endsWith('.json')) {
				const filePath = join(packDir, value);
				if (!filePath.startsWith(packDir)) {
					throw new Error(`Path traversal detected in field "${field}": ${value}`);
				}
				if (existsSync(filePath)) {
					resolved[field] = JSON.parse(readFileSync(filePath, 'utf-8'));
				}
			}
		}

		// Also resolve systemMechanics and abilityScoreMethods
		for (const field of ['systemMechanics', 'abilityScoreMethods']) {
			const value = resolved[field];
			if (typeof value === 'string' && value.endsWith('.json')) {
				const filePath = join(packDir, value);
				if (!filePath.startsWith(packDir)) {
					throw new Error(`Path traversal detected in field "${field}": ${value}`);
				}
				if (existsSync(filePath)) {
					resolved[field] = JSON.parse(readFileSync(filePath, 'utf-8'));
				}
			}
		}

		return resolved;
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
