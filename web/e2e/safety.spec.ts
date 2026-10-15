// The warnings on the page (safety-guidance, #121): shown, not folded away, before the download.
import { expect, test } from '@playwright/test';

test('the page shows what to read before fitting the wall, and what it does not claim', async ({ page }) => {
  await page.goto('./');
  const safety = page.getByTestId('safety');
  await expect(safety.getByRole('heading', { name: 'Before you fit it' })).toBeVisible();
  await expect(safety.getByRole('listitem')).toHaveCount(7);
  await expect(safety).toContainText('The wall is not a fall barrier');
  await expect(safety).toContainText('it has no wind, rain or UV rating.');
});
