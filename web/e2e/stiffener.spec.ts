// Stiffeners on the page (stiffener-strips, #111): on to start with, the plan saying what to buy and
// where it goes; off, no line.
import { expect, test } from '@playwright/test';

test('a 603 mm wide wall is stiffened with two lengths of aluminium angle', async ({ page }) => {
  await page.goto('./');
  const stiffen = page.getByLabel('Stiffen a wall over 500 mm across with aluminium angle');
  await expect(stiffen).toBeChecked();
  const line = page.getByTestId('plan-stiffeners');
  await expect(line).toContainText('Stiffeners: the wall is 603 mm across, more than 500');
  await expect(line).toContainText('2 lengths of 20 × 20 × 2 mm aluminium angle, each 593 mm long');
  await stiffen.uncheck();
  await expect(line).toHaveText('');
});
