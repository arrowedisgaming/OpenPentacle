import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

function getChangelogAnchor(version: string): string {
	const changelog = readFileSync('CHANGELOG.md', 'utf-8');
	const match = changelog.match(new RegExp(`^## (\\[${version.replace(/\./g, '\\.')}\\].*)$`, 'm'));
	if (!match) return '';
	// GitHub anchor: lowercase, strip non-word chars except spaces/hyphens, spaces→hyphens
	return match[1].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__APP_CHANGELOG_ANCHOR__: JSON.stringify(getChangelogAnchor(pkg.version))
	}
});
