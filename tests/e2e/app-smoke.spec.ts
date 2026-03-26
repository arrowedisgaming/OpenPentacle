import { expect, test } from '@playwright/test';

test('app loads and create wizard route is reachable', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/OpenPentacle/i);

	await page.goto('/create/srd521/class');
	await expect(page.getByRole('heading', { name: /choose your class/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /next/i }).first()).toBeVisible();
});
