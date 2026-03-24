import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Discord from '@auth/sveltekit/providers/discord';
import Credentials from '@auth/sveltekit/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb, schema } from './db/index.js';

// Use async callback so config is resolved per-request.
// This is required because:
// 1. On Cloudflare, env vars (secrets) are in platform.env, not process.env
// 2. The DB is initialized per-request via hooks
/** Read an env var from platform.env (Cloudflare) or process.env (Node.js) */
function getEnv(event: any, key: string): string | undefined {
	try {
		const platformVal = (event?.platform?.env as any)?.[key];
		if (platformVal) return platformVal;
	} catch {}
	try {
		return process.env[key];
	} catch {}
	return undefined;
}

export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
	const env = {
		AUTH_GOOGLE_ID: getEnv(event, 'AUTH_GOOGLE_ID'),
		AUTH_GOOGLE_SECRET: getEnv(event, 'AUTH_GOOGLE_SECRET'),
		AUTH_DISCORD_ID: getEnv(event, 'AUTH_DISCORD_ID'),
		AUTH_DISCORD_SECRET: getEnv(event, 'AUTH_DISCORD_SECRET'),
		AUTH_SECRET: getEnv(event, 'AUTH_SECRET'),
		NODE_ENV: getEnv(event, 'NODE_ENV') ?? 'production',
	};

	const providers: any[] = [];

	if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
		providers.push(Google({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
		}));
	}
	if (env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET) {
		providers.push(Discord({
			clientId: env.AUTH_DISCORD_ID,
			clientSecret: env.AUTH_DISCORD_SECRET,
			// Use POST body auth instead of Basic header — avoids encoding issues on Cloudflare Workers
			client: { token_endpoint_auth_method: 'client_secret_post' },
		}));
	}

	// Dev-only credentials provider
	if (env.NODE_ENV === 'development') {
		providers.push(
			Credentials({
				id: 'credentials',
				name: 'Dev Login',
				credentials: {
					email: { label: 'Email', type: 'email' },
					name: { label: 'Name', type: 'text' }
				},
				async authorize(credentials) {
					if (env.NODE_ENV !== 'development') return null;

					const email = credentials.email as string;
					const name = credentials.name as string;
					if (!email) return null;

					const db = getDb();

					const existing = await db
						.select()
						.from(schema.users)
						.where(eq(schema.users.email, email))
						.get();

					if (existing) {
						return { id: existing.id, name: existing.name, email: existing.email };
					}

					const id = nanoid(21);
					await db.insert(schema.users).values({ id, name: name || 'Dev User', email });
					return { id, name: name || 'Dev User', email };
				}
			})
		);
	}

	return {
		providers,
		secret: env.AUTH_SECRET,
		session: { strategy: 'jwt' as const },
		pages: {
			signIn: '/login'
		},
		callbacks: {
			jwt({ token, user, account }: { token: any; user: any; account: any }) {
				// Use the OAuth provider's stable subject ID as the user ID
				// This is consistent across sessions (unlike the random UUID without DrizzleAdapter)
				if (account?.providerAccountId) {
					token.id = account.providerAccountId;
				} else if (user?.id) {
					token.id = user.id;
				}
				return token;
			},
			session({ session, token }: { session: any; token: any }) {
				if (session.user && token.id) {
					session.user.id = token.id as string;
				}
				return session;
			}
		},
		trustHost: true
	};
});
