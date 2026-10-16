// A turned sash on the page (sash-wedge, #159): the window type asks for the gap at the latch side and
// hides what a wall has and the wedge has no place for, as for a tilted sash; the plan and the
// preview are the wedge turned on its side, its strip up the latch side.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const preview = (page: Page) => page.getByTestId('preview');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('800');
  await page.getByLabel('Opening height (mm)').fill('1200');
  await page.getByLabel('Window type').selectOption('turn');
  await page.getByLabel('Gap at the latch side (mm)').fill('150');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('the gap at the latch side asked for, not the gap at the top; the wall’s own settings hidden', async ({
  page,
}) => {
  await expect(page.getByLabel('Gap at the latch side (mm)')).toBeVisible();
  await expect(page.getByLabel('Gap at the top (mm)')).toBeHidden();
  await expect(page.getByLabel('Top edge')).toBeHidden();
  await expect(page.getByText('Dividing the height')).toBeHidden();
  await expect(page.getByText('Panel fill')).toBeHidden();
  await expect(page.locator('select[name="leftEdge"]')).toHaveValue('frame');
  await page.getByLabel('Window type').selectOption('tilt');
  await expect(page.getByLabel('Gap at the latch side (mm)')).toBeHidden();
  await expect(page.getByLabel('Gap at the top (mm)')).toBeVisible();
});

test('the plan and the preview are the turned wedge’s, its hose port in the latch-side strip', async ({ page }) => {
  await page.getByRole('radio', { name: 'Portable AC hose' }).check();
  await expect(page.getByTestId('plan-wedge').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('plan-wedge').locator('li').first()).toHaveText(/^The sash turns 10\.8° in\./);
  await expect(page.getByTestId('plan-wedge')).toContainText('The hose port is in the latch-side strip’s piece 3');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // Four panels in each triangle and six in the strip; their joint strips; the two corners; four
  // strips along each leg of each triangle and six up each side of the strip.
  await expect(preview(page)).toHaveAttribute('data-pieces', '14');
  await expect(preview(page)).toHaveAttribute('data-strips', '11');
  await expect(preview(page)).toHaveAttribute('data-crosses', '2');
  await expect(preview(page)).toHaveAttribute('data-edges', '28');
});

test('a wall’s fitting is refused in the turned sash’s words', async ({ page }) => {
  await page.getByRole('radio', { name: 'Exhaust fan' }).check();
  await expect(page.getByTestId('error-fans')).toHaveText('A turned sash’s wedge has room for a hose port only.');
});
