import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { contentPackSchema } from '$lib/schemas/content-pack.schema.js';

export const GET: RequestHandler = async () => {
	const jsonSchema = z.toJSONSchema(contentPackSchema, { target: 'draft-2020-12' });
	return json(jsonSchema, {
		headers: {
			'Content-Type': 'application/schema+json',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
