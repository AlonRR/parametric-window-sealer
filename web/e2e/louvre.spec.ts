// A louvre window on the page (louvre-frame, #163): the window type sets the wall's edges, standing
// on the sill, its sides against the clips and its top under the lowest blade left, says how to
// measure, and the plan says which blades come out and to keep the louvres closed.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Opening width (mm)').fill('600');
  await page.getByLabel('Opening height (mm)').fill('560');
  await page.getByLabel('Window type').selectOption('louvre');
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
});

test('the edges set for a louvre window, its note and the notches shown', async ({ page }) => {
  await expect(page.locator('select[name="topEdge"]')).toHaveValue('sash');
  await expect(page.locator('select[name="bottomEdge"]')).toHaveValue('sill');
  await expect(page.locator('select[name="leftEdge"]')).toHaveValue('frame');
  await expect(page.getByText('Measure the opening between the')).toBeVisible();
  await expect(page.getByLabel('Notches for hardware')).toBeVisible();
  await page.getByLabel('Window type').selectOption('slider');
  await expect(page.getByText('Measure the opening between the')).toBeHidden();
});

test('the plan says which blades come out and to keep the louvres closed', async ({ page }) => {
  await expect(page.getByTestId('plan-louvre').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('plan-louvre').locator('li').nth(1)).toContainText(
    'the lowest blade left closes onto the wall’s top gasket',
  );
  await page.getByLabel('Window type').selectOption('frame');
  await expect(page.getByTestId('plan-louvre').locator('li')).toHaveCount(0);
});
