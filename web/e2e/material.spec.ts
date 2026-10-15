// Material advice on the page (material-advice, #113): PETG in a light colour to start with, the
// plan naming it, and a warning where the wall would get near what the material takes.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('names the material, and warns of PLA in sun', async ({ page }) => {
  await expect(page.getByLabel('Material')).toHaveValue('petg');
  await expect(page.getByTestId('plan-material')).toHaveText('Material: PETG in a light colour.');
  await expect(page.getByTestId('plan-warnings')).toHaveText('');
  await page.getByLabel('Material').selectOption('pla');
  await page.getByLabel('The outside of the wall gets direct sun').check();
  await expect(page.getByTestId('plan-material')).toHaveText(
    'Material: PLA in a light colour. In sun at 30 °C its outside face reaches about 50 °C.',
  );
  await expect(page.getByTestId('plan-warnings')).toContainText('PLA gave at 60 °C in a loaded oven test');
  await page.getByLabel('Material').selectOption('asa');
  await page.getByLabel('Colour').selectOption('dark');
  await expect(page.getByTestId('plan-warnings')).toHaveText('');
});
