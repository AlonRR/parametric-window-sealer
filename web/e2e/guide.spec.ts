// The measuring guide (user-guide, #14; Q51, Q54). Chosen without asking (Q144; docs/choices.md):
// a section at the top of the form with four steps, the opening, the track, what passes through the
// wall and a printed strip and piece (C58); a drawing made for each, its sizes examples (C59); its
// fields fill the form as you type (C60); one track depth for every edge in a track (C61); the fit
// worked out from calipers (C62).
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByText('Measuring guide: what to measure, with pictures').click();
});

const guide = (page: Page) => page.getByTestId('guide');

test('five steps, the first four with a drawing, filling the form as you type', async ({ page }) => {
  await expect(guide(page).getByRole('heading')).toHaveText([
    '1. The opening',
    '2. The track',
    '3. What passes through the wall',
    '4. A printed strip and piece',
    '5. The grip', // joint-lock, #110
  ]);
  // A drawing for each thing to measure; the third step's follows what is in the window.
  for (const step of ['opening', 'track', 'test']) {
    await expect(guide(page).locator(`section[data-step="${step}"]`).getByRole('img')).toBeVisible();
  }
  // Filled from the form when opened.
  await expect(guide(page).getByLabel('Width of the gap (mm)')).toHaveValue('600');
  await guide(page).getByLabel('Width of the gap (mm)').fill('700');
  await expect(page.getByLabel('Opening width (mm)')).toHaveValue('700');
  await expect(page.getByTestId('plan-span')).toContainText('for a 700 × 1000 mm opening');
  await guide(page).getByLabel('Track width, inside (mm)').fill('16');
  await expect(page.getByLabel('Track width (mm)')).toHaveValue('16');
});

test('the grip from the test coupon fills the joint’s grip (joint-lock, #110)', async ({ page }) => {
  const step = guide(page).locator('section[data-step="grip"]');
  await expect(step.getByLabel('Grip of the strip that held best (mm per face)')).toHaveValue('0.15');
  await step.getByLabel('Grip of the strip that held best (mm per face)').fill('0.2');
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toHaveValue('0.2');
});

test('one track depth for every edge in a track (C61)', async ({ page }) => {
  await guide(page).getByLabel('Track depth (mm)').fill('12');
  for (const edge of ['Top', 'Bottom', 'Left'])
    await expect(page.getByLabel(`${edge} track depth (mm)`)).toHaveValue('12');
  // On the example slider the right edge meets the sash: its depth is not used and stays.
  await expect(page.getByLabel('Right track depth (mm)')).toHaveValue('10');
});

test('the third step follows what is in the window', async ({ page }) => {
  await expect(guide(page).getByText('Nothing passes through a plain wall')).toBeVisible();
  await page.getByRole('radio', { name: 'Portable AC hose' }).check();
  await expect(guide(page).getByRole('img', { name: /The end of a hose/ })).toBeVisible();
  await guide(page).getByLabel('Across the hose end (mm)').fill('142');
  await expect(page.getByTestId('plan-ports')).toHaveText('Hose port: a 142 mm hose end, in column 2, row 1.');

  await page.getByRole('radio', { name: 'Something else: a measured cutout' }).check();
  await expect(guide(page).getByRole('img', { name: /An appliance seen from the room/ })).toBeVisible();
  await expect(guide(page).getByRole('img', { name: /The end of a hose/ })).toBeHidden();
  await guide(page).getByLabel('Unit width, outside (mm)').fill('120');
  await guide(page).getByLabel('Unit height, outside (mm)').fill('80');
  await expect(page.getByTestId('plan-cutouts')).toContainText('Cutout: a 120 × 80 mm appliance');

  await page.getByRole('radio', { name: 'Window air conditioner' }).check();
  await expect(guide(page).getByText('Measure the opening left open around the unit, in step 1')).toBeVisible();
});

test('the fit worked out from a printed strip and piece, and used with a button (C62)', async ({ page }) => {
  const step = guide(page).locator('section[data-step="test"]');
  await step.getByLabel('Slot across, measured (mm)').fill('3.2');
  await step.getByLabel('Piece thickness, measured (mm)').fill('3');
  await expect(page.getByTestId('guide-fit')).toHaveText(
    'Each face has 0.1 mm of play; the joint is meant to have 0.2 mm. Print with a fit of 0.3 mm per face.',
  );
  // A track just wide enough for strips with a 0.2 mm fit: the form's own checks see the new fit
  // at once.
  await page.getByLabel('Track width (mm)').fill('7.6');
  await expect(page.getByTestId('error-trackWidthMm')).toHaveText('');
  await step.getByRole('button', { name: 'Use this fit' }).click();
  await expect(page.getByLabel('Fit (mm per face)')).toHaveValue('0.3');
  await expect(page.getByTestId('error-trackWidthMm')).toHaveText(
    'Make it at least 7.8 mm: an edge strip needs walls as thick as the flanges.',
  );
  await step.getByLabel('Slot across, measured (mm)').fill('');
  await expect(page.getByTestId('guide-fit')).toHaveText('Enter both measurements to work out the fit.');
  await expect(step.getByRole('button', { name: 'Use this fit' })).toBeDisabled();
});
