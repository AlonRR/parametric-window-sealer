// A pivot window on the page (pivot-window, #162): the window type asks for the pivot's height and
// the gap at the top, keeps the wall's own settings for the wall below the pivot, and the plan, the
// preview and the download hold both the wall and the wedge above it.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const preview = (page: Page) => page.getByTestId('preview');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('800');
  await page.getByLabel('Opening height (mm)').fill('1200');
  await page.getByLabel('Window type').selectOption('pivot');
  await page.getByLabel('Pivot’s place (mm)').fill('600');
  await page.getByLabel('Gap where it swings in (mm)').fill('150');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('the pivot asked for, the top edge against the sash, the wall’s own settings still there', async ({ page }) => {
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('sash');
  await expect(page.locator('select[name="bottomEdge"]')).toHaveValue('frame');
  await expect(page.getByText('Dividing the width')).toBeVisible();
  await expect(page.getByLabel('Notches for hardware')).toBeVisible();
  await page.getByLabel('Window type').selectOption('frame');
  await expect(page.getByLabel('Pivot’s place (mm)')).toBeHidden();
  await expect(page.getByTestId('plan-pivot').locator('li')).toHaveCount(0);
});

test('the plan and the preview hold the wall below the pivot and the wedge above it', async ({ page }) => {
  await expect(page.getByTestId('plan-pivot').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('plan-pivot')).toContainText('the wall goes below the pivot, 600 mm up');
  await expect(page.getByTestId('plan-wedge').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('plan-wedge').locator('li').nth(1)).toContainText('mm above the pivot;');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The wall's 4 × 3 pieces and 6 cross pieces; the wedge's 3 panels in each triangle, 4 in its top
  // strip, and its 2 corner pieces.
  await expect(preview(page)).toHaveAttribute('data-pieces', '22');
  await expect(preview(page)).toHaveAttribute('data-crosses', '8');
});

test('in a roof, the plan says what pulls the wall below the pivot out of the frame', async ({ page }) => {
  await expect(page.getByTestId('plan-roof').locator('li')).toHaveCount(0);
  await page.getByLabel('Pitch, from level (°)').fill('35');
  await expect(page.getByTestId('plan-roof').locator('li').first()).toHaveText(
    /^On a roof at 35°, 82% of the wall’s weight pulls it out of the frame into the room/,
  );
  await page.getByLabel('Pitch, from level (°)').fill('10');
  await expect(page.getByTestId('error-pivotPitchDeg')).toHaveText(
    'A pivot window lies at 15 to 90° from level: 90 for an upright one, less in a roof.',
  );
});

test('the wall below takes a hose port, and a pivot outside the opening is refused where it is given', async ({
  page,
}) => {
  await page.getByRole('radio', { name: 'Portable AC hose' }).check();
  await expect(page.getByTestId('plan-ports').locator('li')).toHaveCount(1);
  await page.getByLabel('Pivot’s place (mm)').fill('1300');
  await expect(page.getByTestId('error-pivotAtMm')).toHaveText(
    'The pivot is 1300 mm up: give its height inside the opening, above 0 and below 1200 mm.',
  );
});

test('on an upright axis, the edge at the pivot is the sash’s, and the plan and preview say which side each goes', async ({
  page,
}) => {
  await page.getByLabel('Half that swings in').selectOption('right');
  await page.getByLabel('Pivot’s place (mm)').fill('400');
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('frame');
  await expect(page.locator('select[name="rightEdge"]')).toHaveValue('sash');
  await expect(page.getByLabel('Pitch, from level (°)')).toBeHidden();
  await expect(page.getByTestId('plan-pivot')).toContainText(
    'A pivot window on an upright axis: the wall goes left of the pivot, 400 mm from the left jamb',
  );
  await expect(page.getByTestId('plan-wedge').locator('li').first()).toContainText('a jamb strip 1200 mm long');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The wall's 2 × 6 pieces and 5 cross pieces, and the turned wedge's 2 corner pieces.
  await expect(preview(page)).toHaveAttribute('data-crosses', '7');
  await page.getByLabel('Half that swings in').selectOption('top');
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('sash');
  await expect(page.locator('select[name="rightEdge"]')).toHaveValue('frame');
});
