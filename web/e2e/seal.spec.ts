// The tape seal on the page (seal-tape, #15): a seal choice starting at none (Q122), the
// listed sizes or the user's own (Q121), the groove, the squeeze and the other places under
// Advanced (Q124, Q125, Q127, Q129, Q131), the plan's line, the tape drawn in the preview
// (Q132), and the grooved strips in the download. The printed TPU seal (seal-tpu, #22) beside
// it: the same sizes (C35), its joints in TPU under Advanced (C34, C38), drawn in the preview
// (C36) and in the download (C37).
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const seal = (page: Page) => page.getByTestId('plan-seal');
const tape = (page: Page) => page.getByRole('radio', { name: 'Foam tape' });
const tpu = (page: Page) => page.getByRole('radio', { name: 'Printed TPU' });
const size = (page: Page) => page.getByLabel('Seal size, width × thickness');
const squeeze = (page: Page) => page.getByLabel('Squeezed to (% of its thickness)');

test('starts with no seal (Q122)', async ({ page }) => {
  await expect(page.getByRole('radio', { name: 'None', exact: true })).toBeChecked();
  await expect(size(page)).toBeHidden();
  await expect(seal(page)).toHaveText('Seal: none.');
});

test('foam tape: 9 × 4 mm to start, a listed size or your own (Q121)', async ({ page }) => {
  await tape(page).check();
  await expect(size(page)).toHaveValue('9x4');
  await expect(size(page).locator('option')).toHaveText([
    '9 × 4 mm',
    '9.5 × 4.8 mm',
    '9 × 6 mm',
    '9.5 × 6.4 mm',
    'Your own size',
  ]);
  await expect(seal(page)).toHaveText('Seal: 9 × 4 mm foam tape along the edge strips’ outer faces: 3.2 m in all.');
  // The tape and its groove take 2 mm at each track and at the sash (Q125, Q126).
  await expect(page.getByTestId('plan-span')).toHaveText(
    'Pieces and joints: 599 × 1009 mm, for a 600 × 1000 mm opening.',
  );
  await expect(page.getByLabel('Width (mm)', { exact: true })).toBeHidden();

  await size(page).selectOption('9.5x4.8');
  await expect(seal(page)).toContainText('Seal: 9.5 × 4.8 mm foam tape');
  await size(page).selectOption('own');
  await page.getByLabel('Width (mm)', { exact: true }).fill('11');
  await page.getByLabel('Thickness (mm)', { exact: true }).fill('5');
  await expect(seal(page)).toContainText('Seal: 11 × 5 mm foam tape');

  await page.getByRole('radio', { name: 'None', exact: true }).check();
  await expect(seal(page)).toHaveText('Seal: none.');
});

test('the groove, the squeeze and the sides under Advanced, each refused with a reason', async ({ page }) => {
  await tape(page).check();
  await page.getByText('Advanced: the seal').click();
  await expect(page.getByLabel('Groove depth (mm)')).toHaveValue('1');
  await expect(squeeze(page)).toHaveValue('50');
  await page.getByLabel('Also on the sides of the edge strips in a track').check();
  await expect(seal(page)).toHaveText(
    'Seal: 9 × 4 mm foam tape along the edge strips’ outer faces and sides: 7.6 m in all.',
  );

  await squeeze(page).fill('25');
  await expect(page.getByTestId('error-tapeSqueezePct')).toHaveText(
    'Squeezed to 1 mm, the tape would sit inside its 1 mm groove; squeeze it less or make the groove shallower.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
  await squeeze(page).fill('50');

  // On the sides, 9 × 6 mm tape leaves walls of 0.75 mm beside its groove (Q131).
  await size(page).selectOption('9x6');
  await expect(page.getByTestId('error-tapeWidthMm')).toHaveText(
    'Leaves walls of 0.75 mm beside the tape’s groove in the edge strips, under the 0.8 mm they need; choose a narrower tape.',
  );
});

test('tape inside the hose port’s collar too (Q129)', async ({ page }) => {
  await page.getByRole('radio', { name: 'Portable AC hose' }).check();
  await tape(page).check();
  await page.getByText('Advanced: the seal').click();
  await page.getByLabel("Also inside each hose port's collar").check();
  await expect(seal(page)).toHaveText(
    'Seal: 9 × 4 mm foam tape along the edge strips’ outer faces, and inside the hose port’s collar: 3.7 m in all.',
  );
});

test('the preview draws the tape; the download has the grooved strips, and no tape (Q132)', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  const preview = page.getByTestId('preview');
  await expect(preview).toHaveAttribute('data-tapes', '0');
  await tape(page).check();
  await page.getByText('Advanced: the seal').click();
  await page.getByLabel('Also on the sides of the edge strips in a track').check();
  await expect(preview).toHaveAttribute('data-edges', '18');
  await expect(preview).toHaveAttribute('data-tapes', '18');

  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  // The strips in a track are named by its depth, as their side grooves follow it (Q127).
  expect(names.filter((n) => /^edge-[0-9.]+x13x11-track-10-print-[0-9]+\.stl$/.test(n)).length).toBeGreaterThan(0);
  expect(names.filter((n) => /^edge-[0-9.]+x15x11-print-[0-9]+\.stl$/.test(n)).length).toBeGreaterThan(0);
  expect(names.some((n) => n.includes('tape'))).toBe(false);
});

test('printed TPU: gaskets to the seal’s size, and its joints in TPU under Advanced (C34, C35, C38)', async ({
  page,
}) => {
  await tpu(page).check();
  await expect(size(page)).toHaveValue('9x4');
  await expect(seal(page)).toHaveText(
    'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all.',
  );
  await expect(page.getByText('Gaskets printed in TPU')).toBeVisible();
  await expect(page.getByText('Self-adhesive foam weather-seal tape')).toBeHidden();
  await page.getByText('Advanced: the seal').click();
  await page.getByLabel('Also the joint strips and cross pieces, in TPU').check();
  await expect(seal(page)).toHaveText(
    'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all, and the joint strips and cross pieces in TPU.',
  );
  await tape(page).check();
  await expect(page.getByTestId('error-tpuJoints')).toHaveText(
    'Tape does not fit a joint (Q128): choose printed TPU for the joints.',
  );
});

test('the preview draws the TPU seal; the download holds its gaskets and TPU joints (C36, C37)', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  const preview = page.getByTestId('preview');
  await expect(preview).toHaveAttribute('data-tpu', '0');
  await tpu(page).check();
  await page.getByText('Advanced: the seal').click();
  await page.getByLabel('Also the joint strips and cross pieces, in TPU').check();
  await expect(preview).toHaveAttribute('data-edges', '18');
  await expect(preview).toHaveAttribute('data-tpu', '18');
  await expect(preview).toHaveAttribute('data-tapes', '0');

  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names.filter((n) => /^gasket-[0-9.]+x9\.5x4-tpu-print-[0-9]+\.stl$/.test(n)).length).toBeGreaterThan(0);
  expect(names.filter((n) => /^strip-[0-9.]+x18-tpu-print-[0-9]+\.stl$/.test(n)).length).toBeGreaterThan(0);
  expect(names.filter((n) => /^cross-18x18-tpu-print-[0-9]+\.stl$/.test(n))).toHaveLength(1);
});
