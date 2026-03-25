import { sequence } from '@sveltejs/kit/hooks';
import { json } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth.js';
import { setDatabase, createD1Database, getDb, schema } from '$lib/server/db/index.js';

// ─── Database Initialization ───────────────────────────────

let nodeDbInitialized = false;

const initDatabase: Handle = async ({ event, resolve }) => {
	const platformEnv = event.platform?.env as Record<string, any> | undefined;
	const d1 = platformEnv?.DB;

	if (d1) {
		// Cloudflare: set D1 database per-request
		setDatabase(createD1Database(d1));

		// Expose Cloudflare secrets to process.env so Auth.js can find them
		for (const key of ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_DISCORD_ID', 'AUTH_DISCORD_SECRET', 'AUTH_URL']) {
			if (platformEnv[key] && !process.env[key]) {
				process.env[key] = platformEnv[key];
			}
		}
	} else if (!nodeDbInitialized) {
		// Node.js: dynamically import to avoid bundling native deps on Cloudflare
		const { initNodeDatabase } = await import('$lib/server/db/node.js');
		await initNodeDatabase();
		nodeDbInitialized = true;
	}

	return resolve(event);
};

// ─── Security Headers ──────────────────────────────────────

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (event.request.headers.get('x-forwarded-proto') === 'https' || event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com https://cdn.discordapp.com; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'"
	);
	return response;
};

// ─── CSRF / Origin Verification ────────────────────────────

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

const csrfProtection: Handle = async ({ event, resolve }) => {
	if (STATE_CHANGING_METHODS.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.url.origin;

		if (origin && origin !== host) {
			return json(
				{ message: 'Forbidden: cross-origin request' },
				{ status: 403 }
			);
		}
	}
	return resolve(event);
};

// ─── Rate Limiting (unauthenticated endpoints) ─────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

// Periodic cleanup (only runs on Node.js — Workers don't have persistent timers)
if (typeof globalThis.setInterval === 'function') {
	try {
		setInterval(() => {
			const now = Date.now();
			for (const [key, entry] of rateLimitMap) {
				if (entry.resetAt <= now) rateLimitMap.delete(key);
			}
		}, 60_000);
	} catch {
		// Workers may throw on setInterval — that's fine, map resets between invocations
	}
}

const SHARE_RATE_LIMIT_MAX = 10;

const rateLimiting: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isApi = path.startsWith('/api/');
	const isShare = path.startsWith('/api/share/') || path.startsWith('/share/');

	if (!isApi && !isShare) return resolve(event);

	const ip = event.getClientAddress();
	const now = Date.now();
	const key = isShare ? `share:${ip}` : ip;
	const max = isShare ? SHARE_RATE_LIMIT_MAX : RATE_LIMIT_MAX;

	let entry = rateLimitMap.get(key);
	if (!entry || entry.resetAt <= now) {
		entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
		rateLimitMap.set(key, entry);
	}

	entry.count++;
	if (entry.count > max) {
		return json(
			{ message: 'Too many requests' },
			{
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000))
				}
			}
		);
	}

	return resolve(event);
};

// ─── Ensure User Exists in DB ──────────────────────────────
// Without DrizzleAdapter, Auth.js JWT doesn't create user rows.
// This hook creates the D1 user row on first authenticated request.

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const ensuredUserIds = new Set<string>();

const ensureUser: Handle = async ({ event, resolve }) => {
	const session = await event.locals.auth?.();
	const userId = session?.user?.id;

	if (userId && !ensuredUserIds.has(userId)) {
		try {
			const db = getDb();
			const existing = await db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.id, userId))
				.get();

			if (!existing) {
				const email = session.user?.email ?? null;
				const emailTaken = email
					? !!(await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get())
					: false;
				await db.insert(schema.users).values({
					id: userId,
					name: session.user?.name ?? null,
					email: emailTaken ? null : email,
					image: session.user?.image ?? null,
				});
			}
			ensuredUserIds.add(userId);
		} catch (err) {
			console.error('ensureUser error:', err);
		}
	}

	return resolve(event);
};

// ─── Compose ───────────────────────────────────────────────
// initDatabase MUST run before authHandle (auth needs the DB)
// ensureUser MUST run after authHandle (needs the session)

export const handle = sequence(initDatabase, securityHeaders, csrfProtection, rateLimiting, authHandle, ensureUser);

// ─── Global Error Handler ──────────────────────────────────

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[${event.request.method} ${event.url.pathname}]`, error);

	return {
		message: status === 500 ? 'Internal server error' : message
	};
};
