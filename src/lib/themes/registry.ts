import { Sun, Moon, Monitor, NotebookPen } from 'lucide-svelte';

export interface ThemeDefinition {
	id: string;
	label: string;
	icon: any; // lucide component types don't match Component<{class?: string}>
	cssClass: string | null; // class applied to <html>, null = default/light
	resolvesDark: boolean; // whether this theme satisfies prefers-color-scheme: dark
}

export const themes: ThemeDefinition[] = [
	{ id: 'light', label: 'Light', icon: Sun, cssClass: null, resolvesDark: false },
	{ id: 'dark', label: 'Dark', icon: Moon, cssClass: 'dark', resolvesDark: true },
	{ id: 'notebook', label: 'Notebook', icon: NotebookPen, cssClass: 'notebook', resolvesDark: false },
];

export const systemOption = { id: 'system' as const, label: 'System', icon: Monitor };

export type ThemeId = (typeof themes)[number]['id'] | 'system';

/** All CSS classes that themes can apply to <html> — used for cleanup on theme switch */
export const allThemeClasses = themes
	.map((t) => t.cssClass)
	.filter((c): c is string => c !== null);

/** Look up a theme definition by ID */
export function getTheme(id: string): ThemeDefinition | undefined {
	return themes.find((t) => t.id === id);
}

/** Return the theme that should be used when OS reports dark mode (for 'system' option) */
export function getSystemDarkTheme(): ThemeDefinition {
	return themes.find((t) => t.resolvesDark)!;
}

/** All valid theme IDs including 'system' */
export const allThemeIds: string[] = [...themes.map((t) => t.id), systemOption.id];
