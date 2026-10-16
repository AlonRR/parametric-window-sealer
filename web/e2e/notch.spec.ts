// Notches for the window's hardware on the page (edge-notches, #161): a frame's edges take them,
// written as the command takes them, and the plan says where each is.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('800');
  await page.getByLabel('Opening height (mm)').fill('1200');
  await page.getByLabel('Window type').selectOption('frame');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('a notch in a frame edge is in the plan, and the field shows only for a frame', async ({ page }) => {
  await page.getByLabel('Notches for hardware').fill('40x25@bottom,300');
  await expect(page.getByTestId('plan-notches').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('plan-notches').locator('li').first()).toHaveText(
    /^Notch 1: 40 × 25 mm in the bottom edge, its middle 300 mm from the left corner/,
  );
  await page.getByLabel('Window type').selectOption('slider');
  await expect(page.getByLabel('Notches for hardware')).toBeHidden();
});

test('a notch across a joint is refused where it is written', async ({ page }) => {
  await page.getByLabel('Notches for hardware').fill('40x25@bottom,10');
  await expect(page.getByTestId('error-notches')).toHaveText(
    /^Notch 1 crosses a joint between pieces or the wall’s corner/,
  );
});
