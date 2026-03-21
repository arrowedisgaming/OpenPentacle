import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ─── Auth.js Tables ──────────────────────────────────────────

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: integer('email_verified', { mode: 'timestamp' }),
	image: text('image')
});

export const accounts = sqliteTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	type: text('type').notNull(),
	provider: text('provider').notNull(),
	providerAccountId: text('provider_account_id').notNull(),
	refresh_token: text('refresh_token'),
	access_token: text('access_token'),
	expires_at: integer('expires_at'),
	token_type: text('token_type'),
	scope: text('scope'),
	id_token: text('id_token'),
	session_state: text('session_state')
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	sessionToken: text('session_token').unique().notNull(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expires: integer('expires', { mode: 'timestamp' }).notNull()
});

export const verificationTokens = sqliteTable('verification_tokens', {
	identifier: text('identifier').notNull(),
	token: text('token').notNull(),
	expires: integer('expires', { mode: 'timestamp' }).notNull()
});

// ─── Application Tables ──────────────────────────────────────

export const characters = sqliteTable('characters', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	systemId: text('system_id').notNull(),
	classSummary: text('class_summary').notNull().default(''),
	level: integer('level').notNull().default(1),
	/** Full character data as JSON blob */
	data: text('data').notNull(),
	/** Unique share slug (nullable - only set when sharing is enabled) */
	shareId: text('share_id').unique(),
	/** Whether the character sheet is publicly viewable via share link */
	isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (table) => [
	index('characters_user_id_idx').on(table.userId),
	index('characters_share_id_idx').on(table.shareId)
]);

export const userContentPacks = sqliteTable('user_content_packs', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	systemId: text('system_id').notNull(),
	/** Full content pack JSON */
	data: text('data').notNull(),
	/** Whether the pack passed validation */
	isValid: integer('is_valid', { mode: 'boolean' }).notNull().default(false),
	/** Validation error messages, if any */
	validationErrors: text('validation_errors'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (table) => [
	index('user_content_packs_user_id_idx').on(table.userId)
]);
