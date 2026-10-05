// The measured cutout on the page (measured-cutout, #23): a third answer to "What is in the
// window?" (C45), the appliance's measured width and height and its piece (C47), the rim under
// Advanced (C42), lined with the seal (C43), the plan's line, and the piece named by its cutout
// in the download (C46).
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const choose = (page: Page) => page.getByRole('radio', { name: 'Something else: a measured cutout' });
const box = (page: Page) => page.getByTestId('cutout');
const line = (page: Page) => page.getByTestId('plan-cutouts');

async function measured(page: Page, width: string, height: string) {
  await choose(page).check();
  await box(page).getByLabel('Appliance width (mm)').fill(width);
  await box(page).getByLabel('Appliance height (mm)').fill(height);
}

test('a measured cutout: its size, its piece, and the plan says so (C45, C47)', async ({ page }) => {
  await expect(box(page)).toBeHidden();
  await measured(page, '120', '80');
  await expect(line(page)).toHaveText(
    'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 15 mm rim.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await expect(box(page).getByLabel('Row')).toHaveValue('1');
  await box(page).getByLabel('Column').fill('3');
  await expect(line(page)).toContainText('in column 3, row 1');

  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(box(page)).toBeHidden();
  await expect(line(page)).toHaveText('');
});

test('refuses a missing size, or a cutout too big for its piece', async ({ page }) => {
  await measured(page, '120', '');
  await expect(page.getByTestId('error-cutouts')).toHaveText('Cutout: enter the appliance’s width and height in mm.');
  await box(page).getByLabel('Appliance height (mm)').fill('80');
  await box(page).getByLabel('Appliance width (mm)').fill('180');
  await expect(page.getByTestId('error-cutouts')).toContainText(
    'Cutout 1: a 180 × 80 mm cutout needs a piece at least 206.8 × 106.8 mm',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
});

test('the rim under Advanced; with a seal, the rim is lined with it (C42, C43)', async ({ page }) => {
  await measured(page, '120', '80');
  await page.getByText('Advanced: the cutout’s rim').click();
  const depth = page.getByLabel('Rim depth (mm)');
  await expect(depth).toHaveValue('15');
  await expect(page.getByLabel('Rim wall (mm)')).toHaveValue('2.4');
  await expect(page.getByLabel('Rim clearance (mm)')).toHaveValue('1');
  await depth.fill('20');
  await expect(line(page)).toContainText('in a 20 mm rim.');
  await page.getByRole('radio', { name: 'Foam tape' }).check();
  await expect(line(page)).toHaveText(
    'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 20 mm rim, lined with the foam tape.',
  );
  await depth.fill('9');
  await expect(page.getByTestId('error-rimDepthMm')).toHaveText(
    'Make it at least 9.5 mm, so the seal’s groove fits inside the rim.',
  );
});

test('the download names the cutout’s piece (C46)', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await measured(page, '120', '80');
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
  expect(names).toContain('piece-c2-r1-197.7x198.6-cutout-120x80.stl');
});
