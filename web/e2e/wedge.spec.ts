// A tilted sash on the page (sash-wedge, #159): the window type asks for the gap at the top and hides
// what a wall has and the wedge has no place for; the plan, the preview and the download are the
// wedge's, its hose port in the top strip.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const preview = (page: Page) => page.getByTestId('preview');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('800');
  await page.getByLabel('Opening height (mm)').fill('1200');
  await page.getByLabel('Window type').selectOption('tilt');
  await page.getByLabel('Gap at the top (mm)').fill('150');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('the gap asked for, the wall’s own settings hidden, every edge a frame edge', async ({ page }) => {
  await expect(page.getByLabel('Gap at the top (mm)')).toBeVisible();
  await expect(page.getByLabel('Top edge')).toBeHidden();
  await expect(page.getByText('Dividing the width')).toBeHidden();
  await expect(page.getByText('Panel fill')).toBeHidden();
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('frame');
  await page.getByLabel('Window type').selectOption('slider');
  await expect(page.getByLabel('Gap at the top (mm)')).toBeHidden();
  await expect(page.getByLabel('Top edge')).toBeVisible();
});

test('the plan and the preview are the wedge’s, its hose port in the top strip', async ({ page }) => {
  await page.getByRole('radio', { name: 'Portable AC hose' }).check();
  await expect(page.getByTestId('plan-wedge').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('plan-wedge').locator('li').first()).toHaveText(/^The sash leans 7\.2° in\./);
  await expect(page.getByTestId('plan-wedge')).toContainText('The hose port is in the top strip’s piece 2');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // Five panels in each triangle and four in the top strip; their joint strips; the two corners;
  // six strips up each leg of each triangle and four along each side of the top.
  await expect(preview(page)).toHaveAttribute('data-pieces', '14');
  await expect(preview(page)).toHaveAttribute('data-strips', '11');
  await expect(preview(page)).toHaveAttribute('data-crosses', '2');
  await expect(preview(page)).toHaveAttribute('data-edges', '32');
});

test('a wall’s fitting is refused where it is chosen', async ({ page }) => {
  await page.getByRole('radio', { name: 'Exhaust fan' }).check();
  await expect(page.getByTestId('error-fans')).toHaveText('A tilted sash’s wedge has room for a hose port only.');
});
