// See https://svelte.dev/docs/kit/types#app.d.ts
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
