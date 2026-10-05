// The printer list on the page (printer-presets, #13): "Your printer" starts at the 200 mm
// default (Q5, Q38), lists the 29 printers by maker (Q115), takes each bed less a margin set
// under Advanced (Q117), turned whichever way needs fewer pieces (Q116), and keeps "Custom
// size". Counts worked by hand: the example slider's span is 603 × 1013 mm, joints 5 mm.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const printer = (page: Page) => page.getByLabel('Your printer');
const headline = (page: Page) => page.getByTestId('plan-headline');

test('starts at "Not listed: 200 × 200 mm", and lists the printers by maker', async ({ page }) => {
  await expect(printer(page)).toHaveValue('default');
  await expect(printer(page).locator('option:checked')).toHaveText('Not listed: 200 × 200 mm');
  await expect(printer(page).locator('optgroup')).toHaveCount(7);
  await expect(printer(page).locator('optgroup[label="Prusa"] option').first()).toHaveText(
    'Original Prusa MK4S (bed 250 × 210 mm)',
  );
  await expect(printer(page).locator('option')).toHaveCount(29 + 2);
});

test('a listed printer: its bed less 10 mm, the custom size not asked', async ({ page }) => {
  await printer(page).selectOption({ label: 'Bambu Lab A1 mini (bed 180 × 180 mm)' });
  // 170 mm pieces: 4 across (4 × 170 + 15 = 695 ≥ 603) and 6 up (6 × 170 + 25 = 1045 ≥ 1013).
  await expect(headline(page)).toHaveText('24 pieces: 4 across, 6 up, 3 mm thick');
  await expect(page.getByLabel('Custom width (mm)')).toBeDisabled();
});

test('the bed margin under Advanced (Q117)', async ({ page }) => {
  await printer(page).selectOption({ label: 'Bambu Lab A1 mini (bed 180 × 180 mm)' });
  await page.getByText('Advanced: the printer').click();
  await expect(page.getByLabel('Bed margin (mm)')).toHaveValue('10');
  await page.getByLabel('Bed margin (mm)').fill('30');
  // 150 mm pieces: 4 across (615 ≥ 603) and 7 up (7 × 150 + 30 = 1080 ≥ 1013; 6 reach 925).
  await expect(headline(page)).toHaveText('28 pieces: 4 across, 7 up, 3 mm thick');
});

test('the bed turned where that needs fewer pieces (Q116)', async ({ page }) => {
  await printer(page).selectOption({ label: 'Original Prusa MK4S (bed 250 × 210 mm)' });
  await page.getByLabel('Opening width (mm)').fill('717');
  await page.getByLabel('Opening height (mm)').fill('467');
  // A 720 × 480 mm span: turned (200 × 240 mm) 4 × 2 = 8; as listed (240 × 200) 3 × 3 = 9.
  await expect(headline(page)).toHaveText('8 pieces: 4 across, 2 up, 3 mm thick');
});

test('"Custom size" still takes your own piece size', async ({ page }) => {
  await printer(page).selectOption('custom');
  await expect(page.getByLabel('Custom width (mm)')).toBeEnabled();
  await page.getByLabel('Custom width (mm)').fill('170');
  await page.getByLabel('Custom height (mm)').fill('165');
  // 4 across (695 ≥ 603) and 6 up (6 × 165 + 25 = 1015 ≥ 1013).
  await expect(headline(page)).toHaveText('24 pieces: 4 across, 6 up, 3 mm thick');
});
