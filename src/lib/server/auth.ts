import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Discord from '@auth/sveltekit/providers/discord';
import Credentials from '@auth/sveltekit/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb, schema } from './db/index.js';

const isDev = process.env.NODE_ENV === 'development';

// Only include providers that have credentials configured
const providers: any[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
	providers.push(Google);
}
if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
	providers.push(Discord);
}

// Dev-only credentials provider — sign in with just email + name
if (isDev) {
	providers.push(
		Credentials({
			id: 'credentials',
			name: 'Dev Login',
			credentials: {
				email: { label: 'Email', type: 'email' },
				name: { label: 'Name', type: 'text' }
			},
			async authorize(credentials) {
				// Defense-in-depth: refuse to run in production
				if (process.env.NODE_ENV === 'production') return null;

				const email = credentials.email as string;
				const name = credentials.name as string;
				if (!email) return null;

				const db = getDb();

				// Find existing user by email, or create one
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

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(getDb() as any),
	providers,
	session: { strategy: 'jwt' },
	pages: {
		signIn: '/login'
	},
	callbacks: {
		jwt({ token, user }) {
			// On sign-in, persist the user's DB id into the JWT
			if (user?.id) {
				token.id = user.id;
			}
			return token;
		},
		session({ session, token }) {
			if (session.user && token.id) {
				session.user.id = token.id as string;
			}
			return session;
		}
	},
	trustHost: true
});
