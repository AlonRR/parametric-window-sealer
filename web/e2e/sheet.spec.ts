// Pieces cut from sheet on the page (sheet-pieces, #112): the choice under the panel, the sheet's
// size, the plan's list of what to cut, and a download without the pieces to cut.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('cut from sheet: one piece the size of the wall, listed to cut, its size a setting', async ({ page }) => {
  await expect(page.getByTestId('sheet')).toBeHidden();
  await expect(page.getByTestId('plan-sheet')).toHaveText('');
  await page.getByRole('radio', { name: 'Cut the pieces from sheet' }).check();
  await expect(page.getByLabel('Sheet width (mm)')).toHaveValue('1000');
  await expect(page.getByTestId('plan-headline')).toHaveText('1 piece: 1 across, 1 up, 3 mm thick');
  await expect(page.getByTestId('plan-sheet')).toHaveText('Cut from 3 mm sheet: 1 piece of 603 × 1013 mm.');
  await page.getByLabel('Sheet width (mm)').fill('500');
  await expect(page.getByTestId('plan-headline')).toHaveText('2 pieces: 2 across, 1 up, 3 mm thick');
  await page.getByLabel('Sheet width (mm)').fill('0');
  await expect(page.getByTestId('error-sheetWidthMm')).toHaveText('Enter a size in mm, greater than 0.');
});

test('the download holds the strips and edge strips, not the pieces to cut', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('radio', { name: 'Cut the pieces from sheet' }).check();
  await expect(page.getByTestId('plan-sheet')).not.toHaveText('');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names.filter((n) => n.startsWith('piece-'))).toEqual([]);
  expect(names.filter((n) => n.startsWith('edge-'))).toHaveLength(3);
});
