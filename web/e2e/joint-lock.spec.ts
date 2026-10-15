// The joint that locks on the page (joint-lock, #110): the grip and the pins under Advanced, the
// plan saying how many pins to cut, and the test coupon in the download when asked for.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByText('Advanced: the joint between pieces').click();
});

const joints = (page: Page) => page.getByTestId('plan-joints');

test('the grip and the pins start set, and the plan says how many pins to cut', async ({ page }) => {
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toHaveValue('0.15');
  await expect(page.getByLabel('Pin each strip')).toBeChecked();
  await expect(page.getByLabel('Add a test coupon to the download')).not.toBeChecked();
  await expect(joints(page)).toContainText('Pins: 44, each 6.6 mm of 1.75 mm filament');
  await page.getByLabel('Pin each strip').uncheck();
  await expect(joints(page)).toHaveText('Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide.');
  await page.getByLabel('Grip (mm per face)', { exact: true }).fill('-1');
  await expect(page.getByTestId('error-gripMm')).toHaveText('Enter a size in mm, 0 or more.');
});

test('refuses pins with too little slot beyond the slide', async ({ page }) => {
  await page.getByLabel('Slide (mm)').fill('4.5');
  await expect(page.getByTestId('error-pins')).toHaveText(
    'A pin needs the slot at least 4 mm deeper than the slide; this one is 3.5 mm deeper. Make the slot ' +
      'deeper or the slide shorter, or turn the pins off.',
  );
  await page.getByLabel('Pin each strip').uncheck();
  await expect(page.getByTestId('error-pins')).toHaveText('');
});

test('the coupon, when asked for, is in the download and its grips in the plan', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByLabel('Add a test coupon to the download').check();
  await expect(joints(page)).toContainText(
    'Test coupon: 5 sections, marked with 1 to 5 notches, gripping by 0.05, 0.1, 0.15, 0.2 and 0.25 mm.',
  );
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toContain('coupon-grip-0.05-to-0.25-print-1.stl');
});
