// The hose port on the page (hose-port, #12): an appliance choice starting at none (Q112),
// the hose end's outside diameter from the listed sizes or the user's own (Q103), its piece
// starting in the bottom row's middle (Q105), a piece too small said so (Q108), the collar
// and more ports under Advanced (Q107, Q113), and the port's piece in the download.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const ports = (page: Page) => page.getByTestId('plan-ports');
const hose = (page: Page) => page.getByRole('radio', { name: 'Portable AC hose' });

test('starts with no port: a plain wall', async ({ page }) => {
  await expect(page.getByRole('radio', { name: 'None, a plain wall' })).toBeChecked();
  await expect(page.getByLabel('Hose end, outside diameter')).toBeHidden();
  await expect(ports(page)).toBeEmpty();
});

test('a hose: 150 mm in the bottom row’s middle piece, a listed size or your own', async ({ page }) => {
  await hose(page).check();
  await expect(page.getByLabel('Hose end, outside diameter')).toHaveValue('150');
  await expect(page.getByTestId('port-1').getByLabel('Column', { exact: true })).toHaveValue('2');
  await expect(page.getByTestId('port-1').getByLabel('Row', { exact: true })).toHaveValue('1');
  await expect(ports(page)).toHaveText('Hose port: a 150 mm hose end, in column 2, row 1.');
  await expect(page.getByText('Measure across the outside of the end that goes into the port')).toBeVisible();

  await page.getByLabel('Hose end, outside diameter').selectOption('130');
  await expect(ports(page)).toHaveText('Hose port: a 130 mm hose end, in column 2, row 1.');
  await page.getByLabel('Hose end, outside diameter').selectOption('own');
  await page.getByLabel('Your measurement (mm)').fill('142');
  await expect(ports(page)).toHaveText('Hose port: a 142 mm hose end, in column 2, row 1.');

  await page.getByTestId('port-1').getByLabel('Column', { exact: true }).fill('3');
  await expect(ports(page)).toHaveText('Hose port: a 142 mm hose end, in column 3, row 1.');
});

test('a piece too small for the port is said so, with what fixes it (Q108)', async ({ page }) => {
  await hose(page).check();
  await page.getByLabel('Opening width (mm)').fill('405');
  await expect(page.getByTestId('error-ports')).toHaveText(
    'Port 1: A 150 mm hose port needs a piece at least 175.8 × 175.8 mm; column 2, row 1 is 132.7 × 198.6 mm. ' +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
});

test('the collar and more ports under Advanced (Q107, Q113)', async ({ page }) => {
  await hose(page).check();
  const advanced = page.getByText('Advanced: the hose port');
  await advanced.click();
  await expect(page.getByLabel('Collar depth (mm)')).toHaveValue('20');
  await expect(page.getByLabel('Lip (mm)')).toHaveValue('5');

  await page.getByRole('button', { name: 'Add another port' }).click();
  const extra = page.getByTestId('extra-port-2');
  await expect(page.getByTestId('error-ports')).toHaveText('Port 2: choose its piece: column and row.');
  await extra.getByLabel('Column').fill('1');
  await extra.getByLabel('Row').fill('4');
  await expect(ports(page)).toHaveText(
    'Hose port: a 150 mm hose end, in column 2, row 1.Hose port: a 150 mm hose end, in column 1, row 4.',
  );
  await extra.getByLabel('Row').fill('1');
  await extra.getByLabel('Column').fill('2');
  await expect(page.getByTestId('error-ports')).toHaveText('Ports 1 and 2 are both in column 2, row 1; give each its own piece.');
  await extra.getByRole('button', { name: 'Remove' }).click();
  await expect(ports(page)).toHaveText('Hose port: a 150 mm hose end, in column 2, row 1.');
});

test('back to none removes the port', async ({ page }) => {
  await hose(page).check();
  await expect(ports(page)).not.toBeEmpty();
  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(ports(page)).toBeEmpty();
});

test('the port’s piece is in the download, named with its hose', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await hose(page).check();
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toContain('piece-c2-r1-197.7x198.6-port-150.stl');
  expect(names).toHaveLength(15 + 6);
});
