// The sliding insert on the page (sliding-insert, #38): an answer to "What is in the window?", the
// appliance's size and its piece as the cutout's, the shutters' travel and clearance under
// Advanced, the plan's line, and the shutters among the downloaded files.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const box = (page: Page) => page.getByTestId('insert');
const line = (page: Page) => page.getByTestId('plan-inserts');
const choose = async (page: Page, width: string, height: string) => {
  await page.getByRole('radio', { name: 'Something else, in a sliding insert' }).check();
  await box(page).getByLabel('Appliance width (mm)').fill(width);
  await box(page).getByLabel('Appliance height (mm)').fill(height);
};

test('an appliance in a sliding insert: its size, its piece, the shutters’ travel, and the plan says so', async ({
  page,
}) => {
  await expect(box(page)).toBeHidden();
  await page.getByRole('radio', { name: 'Something else, in a sliding insert' }).check();
  await expect(page.getByTestId('error-inserts')).toHaveText('Insert: enter the appliance’s width and height in mm.');
  await choose(page, '60', '40');
  await expect(line(page)).toHaveText(
    'Sliding insert: a 60 × 40 mm appliance, in column 2, row 1, through a 80 × 42 mm opening; two shutters slide ' +
      'in its rails to close round anything 40 to 80 mm wide, each locked by an M4 bolt at least 12 mm long, with a ' +
      'nut and washers.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await page.getByText('Advanced: the sliding insert').click();
  await page.getByLabel('Shutter travel (mm)').fill('10');
  await expect(line(page)).toContainText('through a 70 × 42 mm opening');
  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(line(page)).toHaveText('');
});

test('refuses an appliance too big for its piece', async ({ page }) => {
  await choose(page, '120', '80');
  await expect(page.getByTestId('error-inserts')).toHaveText(
    'Insert 1: a 120 × 80 mm appliance in a sliding insert needs a piece at least 224 × 118 mm; column 2, row 1 ' +
      'is 197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  );
});

test('the download holds the insert’s piece and its shutters', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await choose(page, '60', '40');
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
  expect(names).toContain('piece-c2-r1-197.7x198.6-insert-60x40.stl');
  expect(names).toContain('shutter-32x49.4-print-2.stl');
});
