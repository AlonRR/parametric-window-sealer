// A roof window on the page (sloped-frame, #160): the window type asks for the roof's pitch, sets
// every edge to a frame edge, and the plan says what share of the wall's weight pulls it out of the
// frame and how to test that it holds.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('800');
  await page.getByLabel('Opening height (mm)').fill('1200');
  await page.getByLabel('Window type').selectOption('roof');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('the pitch asked for, every edge a frame edge, the wall’s own settings still there', async ({ page }) => {
  await expect(page.getByLabel('Roof pitch (°)')).toBeVisible();
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('frame');
  await expect(page.getByText('Dividing the width')).toBeVisible();
  await page.getByLabel('Window type').selectOption('frame');
  await expect(page.getByLabel('Roof pitch (°)')).toBeHidden();
  await expect(page.getByTestId('plan-roof').locator('li')).toHaveCount(0);
});

test('the plan says what pulls the wall out of the frame, and how to test it', async ({ page }) => {
  await page.getByLabel('Roof pitch (°)').fill('30');
  await expect(page.getByTestId('plan-roof').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('plan-roof').locator('li').first()).toHaveText(
    /^On a roof at 30°, 87% of the wall’s weight pulls it out of the frame into the room.*up to 1\.7 times their weight/,
  );
});

test('a pitch a roof window does not have is refused where it is given', async ({ page }) => {
  await page.getByLabel('Roof pitch (°)').fill('10');
  await expect(page.getByTestId('error-roofPitchDeg')).toHaveText(
    'A roof window lies at 15 to 90° from level: give its pitch in degrees.',
  );
});
