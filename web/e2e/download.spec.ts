// The download dialog (download-zip, #7; Q44 to Q47): clicking Download opens a dialog,
// the user chooses the format and the packaging, a zip is an option and not a default,
// nothing is chosen the first time, and the last choice is remembered after that.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { unzipSync } from 'fflate';

const openDialog = async (page: Page) => {
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await expect(dialog).toBeVisible();
  return dialog;
};

const downloads = (page: Page) => {
  const seen: Download[] = [];
  page.on('download', (d) => seen.push(d));
  return seen;
};

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
});

test('the first time, nothing is chosen and Download waits for a choice', async ({ page }) => {
  const dialog = await openDialog(page);
  for (const name of ['STL', '3MF']) {
    await expect(dialog.getByRole('radio', { name, exact: true })).not.toBeChecked();
  }
  await expect(dialog.getByRole('radio', { name: 'One zip file' })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toBeEnabled();
  await expect(dialog).toContainText('yours to use, change, share or sell');
});

test('"one file holding every piece" is for 3MF only', async ({ page }) => {
  const dialog = await openDialog(page);
  const single = dialog.getByRole('radio', { name: 'One 3MF file holding every piece' });
  await dialog.getByRole('radio', { name: '3MF', exact: true }).check();
  await single.check();
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await expect(single).toBeDisabled();
  await expect(single).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
});

test('STL in one zip: one file holding an STL for each of the 15 pieces', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('window-sealer-600x1000-stl.zip');
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toHaveLength(15);
  expect(names).toContain('piece-c3-r5-200x200.stl');
  await expect(dialog).not.toBeVisible();
});

test('STL as separate files: one download per piece', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('400');
  await page.getByLabel('Opening height (mm)').fill('200');
  const seen = downloads(page);
  const dialog = await openDialog(page);
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'Separate files, one per piece' }).check();
  await dialog.getByRole('button', { name: 'Download', exact: true }).click();
  await expect.poll(() => seen.length).toBe(2);
  expect(seen.map((d) => d.suggestedFilename()).sort()).toEqual([
    'piece-c1-r1-200x200.stl',
    'piece-c2-r1-200x200.stl',
  ]);
});

test('3MF in one file holding every piece', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole('radio', { name: '3MF', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One 3MF file holding every piece' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('window-sealer-600x1000.3mf');
  const parts = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(parts.sort()).toEqual(['3D/3dModel.model', '[Content_Types].xml', '_rels/.rels']);
});

test('the last choice is chosen again next time, even after a reload', async ({ page }) => {
  let dialog = await openDialog(page);
  await dialog.getByRole('radio', { name: '3MF', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  await page.reload();
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  dialog = await openDialog(page);
  await expect(dialog.getByRole('radio', { name: '3MF', exact: true })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'One zip file' })).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toBeEnabled();
});

test('cancel closes the dialog and downloads nothing', async ({ page }) => {
  const seen = downloads(page);
  const dialog = await openDialog(page);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  expect(seen).toEqual([]);
});

test('with a bad value in the form there is nothing to download', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('wide');
  await expect(page.getByRole('button', { name: 'Download the pieces' })).toBeDisabled();
  await page.getByLabel('Opening width (mm)').fill('600');
  await expect(page.getByRole('button', { name: 'Download the pieces' })).toBeEnabled();
});
