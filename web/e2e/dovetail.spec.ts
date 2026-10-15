// Puzzle dovetails on the page (joint-dovetail, #29): a joint style under Advanced: the joint
// between pieces. The settings only the strips have are hidden; the plan says how many tabs, and the
// download has no strips or cross pieces.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByText('Advanced: the joint between pieces').click();
});

test('H-strips to start with; puzzle dovetails hide what only the strips have', async ({ page }) => {
  const style = page.getByLabel('Joint style');
  await expect(style).toHaveValue('strips');
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toBeVisible();
  await style.selectOption('dovetails');
  for (const label of ['Slide (mm)', 'Web (mm)', 'Pin each strip', 'Add a test coupon to the download']) {
    await expect(page.getByLabel(label)).toBeHidden();
  }
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toBeHidden();
  for (const label of ['Slot depth (mm)', 'Flanges (mm)', 'Fit (mm per face)']) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(page.getByTestId('plan-joints')).toHaveText(/^Joints: puzzle dovetails, 114 tabs along the 38 edges/);
});

test('the download has the pieces and edge strips, and no strips or cross pieces', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByLabel('Joint style').selectOption('dovetails');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names.filter((n) => n.startsWith('piece-'))).toHaveLength(24);
  expect(names.some((n) => n.startsWith('edge-'))).toBe(true);
  expect(names.some((n) => n.startsWith('strip-') || n.startsWith('cross-'))).toBe(false);
});

test('pieces cut from sheet are refused with them', async ({ page }) => {
  await page.getByLabel('Joint style').selectOption('dovetails');
  await page.getByLabel('Cut the pieces from sheet').check();
  await expect(page.getByTestId('error-jointStyle')).toHaveText(
    'Puzzle dovetails are printed: print the pieces, or choose the H-strips.',
  );
});
