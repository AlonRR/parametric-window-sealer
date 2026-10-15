// Printing defaults on the page (print-defaults, #122): the plan says what is done against warping,
// and gives brim advice for the material chosen.
import { expect, test } from '@playwright/test';

test('the plan says the corners are rounded, and when to use a brim', async ({ page }) => {
  await page.goto('./');
  const line = page.getByTestId('plan-printing');
  await expect(line).toHaveText(
    'Printing: the pieces’ corners are rounded 3 mm and their bed-side edges chamfered 1 mm against warping. ' +
      'In PETG, add a 5 mm brim if the corners lift.',
  );
  await page.getByLabel('Material').selectOption('asa');
  await expect(line).toContainText('In ASA, add a 5 mm brim, and print in an enclosure or out of draughts');
});
