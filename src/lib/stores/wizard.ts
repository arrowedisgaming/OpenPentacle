import { writable, get } from 'svelte/store';
import type { CharacterData } from '$lib/types/character.js';
import type { SystemId } from '$lib/types/content-pack.js';
import { createEmptyCharacter } from '$lib/types/character.js';

const STORAGE_KEY = 'wizard-state';

/**
 * Version of the wizard state schema.
 * Increment when WizardState shape changes to invalidate stale localStorage.
 */
const WIZARD_STATE_VERSION = 1;

export interface WizardState {
	/** Schema version for localStorage validation */
	version: number;
	/** Which system is being used */
	systemId: SystemId | null;
	/** Current step index */
	currentStep: number;
	/** Steps completed (for validation gating) */
	completedSteps: Set<number>;
	/** Character data being built */
	character: CharacterData | null;
	/** Whether the wizard is in progress */
	active: boolean;
}

function createInitialState(): WizardState {
	return {
		version: WIZARD_STATE_VERSION,
		systemId: null,
		currentStep: 0,
		completedSteps: new Set(),
		character: null,
		active: false
	};
}

function loadFromStorage(): WizardState | null {
	if (typeof window === 'undefined') return null;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return null;
		const parsed = JSON.parse(stored);

		// Discard stale or malformed state
		if (!parsed || typeof parsed !== 'object') return null;
		if (parsed.version !== WIZARD_STATE_VERSION) {
			console.log(`Wizard state version mismatch (got ${parsed.version}, expected ${WIZARD_STATE_VERSION}). Discarding.`);
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}

		// Restore Set from array
		parsed.completedSteps = new Set(parsed.completedSteps);
		return parsed;
	} catch {
		return null;
	}
}

function saveToStorage(state: WizardState): void {
	if (typeof window === 'undefined') return;
	try {
		const serializable = {
			...state,
			// Serialize Set as array
			completedSteps: Array.from(state.completedSteps)
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
	} catch {
		// Silently fail if storage is full/unavailable
	}
}

function createWizardStore() {
	const initial = loadFromStorage() ?? createInitialState();
	const { subscribe, set, update } = writable<WizardState>(initial);

	// Auto-persist on changes
	subscribe((state) => saveToStorage(state));

	return {
		subscribe,

		/** Start a new character creation wizard */
		start(systemId: SystemId) {
			const character = createEmptyCharacter(systemId);
			set({
				version: WIZARD_STATE_VERSION,
				systemId,
				currentStep: 0,
				completedSteps: new Set(),
				character,
				active: true
			});

			// Load user's default Open5E sources (non-blocking)
			fetch('/api/settings/open5e-defaults')
				.then((res) => res.ok ? res.json() : null)
				.then((data) => {
					if (data?.enabledSources?.length) {
						update((s) => {
							if (!s.character) return s;
							return { ...s, character: { ...s.character, open5eSources: data.enabledSources } };
						});
					}
				})
				.catch(() => { /* not logged in or API unavailable */ });
		},

		/** Navigate to a specific step */
		goToStep(step: number) {
			update((s) => ({ ...s, currentStep: step }));
		},

		/** Mark current step as complete and advance */
		completeStep() {
			update((s) => {
				const completed = new Set(s.completedSteps);
				completed.add(s.currentStep);
				return { ...s, completedSteps: completed, currentStep: s.currentStep + 1 };
			});
		},

		/** Update character data (partial merge) */
		updateCharacter(partial: Partial<CharacterData>) {
			update((s) => {
				if (!s.character) return s;
				return { ...s, character: { ...s.character, ...partial } };
			});
		},

		/** Get current character data */
		getCharacter(): CharacterData | null {
			return get({ subscribe }).character;
		},

		/** Reset the wizard */
		reset() {
			set(createInitialState());
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
		},

		/** Check if a step is accessible */
		canAccessStep(step: number): boolean {
			const state = get({ subscribe });
			// Can always access step 0, or any step <= max completed + 1
			if (step === 0) return true;
			const maxCompleted = Math.max(-1, ...state.completedSteps);
			return step <= maxCompleted + 1;
		}
	};
}

export const wizardStore = createWizardStore();
