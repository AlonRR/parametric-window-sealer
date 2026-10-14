// The fan mount on the page (fan-mount, #28): an answer to "What is in the window?", its size
// from the library's list (C90), starting at 120 mm (C94), its piece as the port's (Q105), the
// plan's line, and the piece named by its fan in the download.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const box = (page: Page) => page.getByTestId('fan');
const line = (page: Page) => page.getByTestId('plan-fans');
const size = (page: Page) => box(page).getByLabel('Fan size');

test('an exhaust fan: its size from the list, its piece, and the plan says so', async ({ page }) => {
  await expect(box(page)).toBeHidden();
  await page.getByRole('radio', { name: 'Exhaust fan' }).check();
  await expect(size(page).locator('option')).toHaveText(['80 mm', '92 mm', '120 mm', '140 mm']);
  await expect(size(page)).toHaveValue('120');
  await expect(line(page)).toHaveText(
    'Fan: a 120 mm fan, in column 2, row 1: a 116 mm opening, and four 4.5 mm screw holes 105 mm apart.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await expect(box(page).getByLabel('Row')).toHaveValue('1');
  await size(page).selectOption('140');
  await box(page).getByLabel('Row').fill('3');
  await box(page).getByLabel('Column').fill('1');
  await expect(line(page)).toHaveText(
    'Fan: a 140 mm fan, in column 1, row 3: a 134.2 mm opening, and four 4.5 mm screw holes 124.5 to 125 mm apart.',
  );

  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(box(page)).toBeHidden();
  await expect(line(page)).toHaveText('');
});

test('refuses half a piece, or a fan too big for its piece', async ({ page }) => {
  await page.getByRole('radio', { name: 'Exhaust fan' }).check();
  // Once placed, the page shows the fan's piece; a row taken away leaves half a piece.
  await expect(box(page).getByLabel('Row')).toHaveValue('1');
  await box(page).getByLabel('Row').fill('');
  await expect(page.getByTestId('error-fans')).toHaveText('Fan: give both its column and its row.');
  await box(page).getByLabel('Column').fill('');
  // Two columns 149 mm wide: column 2 is there, but narrower than a 140 mm fan needs.
  await page.getByLabel('Opening width (mm)').fill('300');
  await size(page).selectOption('140');
  await expect(page.getByTestId('error-fans')).toHaveText(
    'Fan 1: A 140 mm fan needs a piece at least 160 × 160 mm; column 2, row 1 is 149 × 198.6 mm. ' +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
});

test('the download names the fan’s piece', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('radio', { name: 'Exhaust fan' }).check();
  await expect(line(page)).not.toHaveText('');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toContain('piece-c2-r1-197.7x198.6-fan-120.stl');
});
