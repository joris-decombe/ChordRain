import { test, expect } from '@playwright/test';

test('landing page loads and shows song list', async ({ page }) => {
  await page.goto('');
  await expect(page.getByText('Select a song')).toBeVisible();
  await expect(page.getByTestId('song-amazing-grace')).toBeVisible();
});

test('clicking a song opens the player', async ({ page }) => {
  await page.goto('');
  await page.getByTestId('song-amazing-grace').click();
  await expect(page.getByTestId('play-button')).toBeVisible({ timeout: 20000 });
});
