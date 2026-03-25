// See https://svelte.dev/docs/kit/types#app.d.ts
declare const __APP_VERSION__: string;
declare const __APP_CHANGELOG_ANCHOR__: string;

declare global {
	namespace App {
		interface Locals {
			session: import('@auth/sveltekit').Session | null;
		}
		interface Platform {
			env?: {
				DB?: import('@cloudflare/workers-types').D1Database;
			};
		}
	}
}

export {};
