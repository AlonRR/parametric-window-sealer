// Run only by the "no-webgl" project, whose Chromium has 3D switched off: a visitor whose
// browser cannot draw in 3D is told so, and everything else on the page still works.
import { expect, test } from '@playwright/test';

test('without WebGL the page says so, and the plan and the download still work', async ({ page }) => {
  await page.goto('./');
  const preview = page.getByTestId('preview');
  await expect(preview).toHaveAttribute('data-state', 'unavailable', { timeout: 30_000 });
  await expect(page.getByTestId('preview-message')).toContainText('needs WebGL');
  await expect(page.getByTestId('plan-headline')).toHaveText('15 pieces: 3 across, 5 up, 3 mm thick');
  await expect(page.getByRole('button', { name: 'Download the pieces' })).toBeEnabled();
});
