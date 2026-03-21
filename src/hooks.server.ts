import { sequence } from '@sveltejs/kit/hooks';
import { json } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth.js';

// ─── Security Headers ──────────────────────────────────────

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
	);
	return response;
};

// ─── CSRF / Origin Verification ────────────────────────────

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

const csrfProtection: Handle = async ({ event, resolve }) => {
	if (STATE_CHANGING_METHODS.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.url.origin;

		// Allow requests with no Origin header (same-origin non-CORS requests)
		// but reject mismatched origins
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
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window

// Clean up stale entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitMap) {
		if (entry.resetAt <= now) rateLimitMap.delete(key);
	}
}, 60_000);

const rateLimiting: Handle = async ({ event, resolve }) => {
	// Only rate-limit unauthenticated API endpoints
	if (!event.url.pathname.startsWith('/api/')) return resolve(event);

	const ip = event.getClientAddress();
	const now = Date.now();

	let entry = rateLimitMap.get(ip);
	if (!entry || entry.resetAt <= now) {
		entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
		rateLimitMap.set(ip, entry);
	}

	entry.count++;
	if (entry.count > RATE_LIMIT_MAX) {
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

// ─── Compose ───────────────────────────────────────────────

export const handle = sequence(securityHeaders, csrfProtection, rateLimiting, authHandle);

// ─── Global Error Handler ──────────────────────────────────

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[${event.request.method} ${event.url.pathname}]`, error);

	return {
		message: status === 500 ? 'Internal server error' : message
	};
};
