// The clamps on the page (clamps, #32): an answer to "What is in the window?", the appliance's
// size measured roughly and its piece as the cutout's (C47), the jaws' travel and depth under
// Advanced, the plan's line, and the jaws among the downloaded files.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const box = (page: Page) => page.getByTestId('clamp');
const line = (page: Page) => page.getByTestId('plan-clamps');

test('an appliance held by clamps: its size, its piece, the jaws’ travel, and the plan says so', async ({ page }) => {
  await expect(box(page)).toBeHidden();
  await page.getByRole('radio', { name: 'Something else, held by clamps' }).check();
  await expect(page.getByTestId('error-clamps')).toHaveText('Clamp: enter the appliance’s width and height in mm.');
  await box(page).getByLabel('Appliance width (mm)').fill('120');
  await box(page).getByLabel('Appliance height (mm)').fill('80');
  await expect(line(page)).toHaveText(
    'Clamp: a 120 × 80 mm appliance, in column 2, row 1, through a 130 × 90 mm opening; four jaws grip anything ' +
      'from 110 × 70 to 130 × 90 mm, each on two M4 bolts at least 12 mm long, with nuts and washers.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await page.getByText('Advanced: the clamps').click();
  await page.getByLabel('Jaw travel (mm)').fill('6');
  await expect(line(page)).toContainText('through a 126 × 86 mm opening; four jaws grip anything from 114 × 74');
  await page.getByLabel('Jaw travel (mm)').fill('0');
  await expect(page.getByTestId('error-clampTravelMm')).toHaveText('Enter a size in mm, greater than 0.');

  await page.getByLabel('Jaw travel (mm)').fill('10');
  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(box(page)).toBeHidden();
  await expect(line(page)).toHaveText('');
});

test('refuses an appliance too big for its piece', async ({ page }) => {
  await page.getByRole('radio', { name: 'Something else, held by clamps' }).check();
  await box(page).getByLabel('Appliance width (mm)').fill('200');
  await box(page).getByLabel('Appliance height (mm)').fill('150');
  await expect(page.getByTestId('error-clamps')).toHaveText(
    'Clamp 1: a 200 × 150 mm appliance with clamps needs a piece at least 272.5 × 222.5 mm; column 2, row 1 is ' +
      '197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
});

test('the download holds the clamp’s piece and its jaws', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('radio', { name: 'Something else, held by clamps' }).check();
  await box(page).getByLabel('Appliance width (mm)').fill('120');
  await box(page).getByLabel('Appliance height (mm)').fill('80');
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
  expect(names).toContain('piece-c2-r1-197.7x198.6-clamp-120x80.stl');
  expect(names).toContain('jaw-138x21.3x15-print-2.stl');
  expect(names).toContain('jaw-69x21.3x15-print-2.stl');
});
