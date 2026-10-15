// The filler between the sashes on the page (meeting-rail, #116): none to start with; given the gap,
// the plan says what to print, and its lengths are in the download.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('a filler for a hung window’s 20 mm gap, refused under 4.5 mm with no seal', async ({ page }) => {
  const gap = page.getByLabel('Gap between the sashes (mm)');
  await expect(gap).toHaveValue('0');
  await expect(page.getByTestId('plan-rail')).toHaveText('');
  await page.getByLabel('Window type').selectOption('hung');
  await gap.fill('20');
  await expect(page.getByTestId('plan-rail')).toHaveText(
    'Between the sashes: a filler for the 20 mm gap where they overlap, 599 mm long in 4 lengths of 157.2 mm ' +
      'that lap 10 mm, 19.5 mm thick and 20 mm tall, 0.5 mm less than the gap to slide in; foam tape on both ' +
      'faces would seal it.',
  );
  await gap.fill('4');
  await expect(page.getByTestId('error-railGapMm')).toHaveText(
    'At least 4.5 mm, for a filler to slide in; a narrower gap takes foam tape on one sash.',
  );
});

test('its lengths are in the download', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByLabel('Window type').selectOption('hung');
  await page.getByLabel('Gap between the sashes (mm)').fill('20');
  await expect(page.getByTestId('plan-rail')).toContainText('Between the sashes');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toContain('rail-end-157.2x19.5x20-print-2.stl');
  expect(names).toContain('rail-middle-157.2x19.5x20-print-2.stl');
});
