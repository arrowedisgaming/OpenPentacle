import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	themes,
	allThemeClasses,
	allThemeIds,
	getTheme,
	getSystemDarkTheme,
	type ThemeId
} from '$lib/themes/registry';

const PATRICK_HAND_URL = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap';
let fontLinkElement: HTMLLinkElement | null = null;

/** Dynamically load Patrick Hand font when notebook theme is active */
function ensureNotebookFont(needed: boolean): void {
	if (!browser) return;

	if (needed && !fontLinkElement) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = PATRICK_HAND_URL;
		document.head.appendChild(link);
		fontLinkElement = link;
	} else if (!needed && fontLinkElement) {
		fontLinkElement.remove();
		fontLinkElement = null;
	}
}

function getInitialTheme(): ThemeId {
	if (!browser) return 'system';
	const stored = localStorage.getItem('theme');
	// Validate against known IDs — graceful fallback for removed themes
	if (stored && allThemeIds.includes(stored)) return stored as ThemeId;
	return 'system';
}

function createThemeStore() {
	const { subscribe, set } = writable<ThemeId>(getInitialTheme());

	function applyTheme(themeId: ThemeId) {
		if (!browser) return;
		const root = document.documentElement;
		root.classList.remove(...allThemeClasses);

		let isNotebook = false;

		if (themeId === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark) {
				const darkTheme = getSystemDarkTheme();
				if (darkTheme.cssClass) root.classList.add(darkTheme.cssClass);
			}
		} else {
			const def = getTheme(themeId);
			if (def?.cssClass) root.classList.add(def.cssClass);
			isNotebook = themeId === 'notebook';
		}

		ensureNotebookFont(isNotebook);
	}

	// Apply on subscription
	subscribe(applyTheme);

	return {
		subscribe,
		set(themeId: ThemeId) {
			if (browser) localStorage.setItem('theme', themeId);
			set(themeId);
		}
	};
}

export const theme = createThemeStore();
