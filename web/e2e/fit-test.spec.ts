// The guided test print (fit-test-print, #63): in the measuring guide's fifth step, the test coupon
// goes into the download, each of its sections has a button with its grip, and the answer to which
// held the tab best moves the grip, or the fit, for the next print until one holds.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByText('Measuring guide: what to measure, with pictures').click();
});

const step = (page: Page) => page.getByTestId('guide').locator('section[data-step="grip"]');
const sections = (page: Page) => step(page).getByRole('button', { name: /^Section / });
const told = (page: Page) => page.getByTestId('guide-test-print');

test('the coupon goes into the download from the guide, a button for each section with its grip', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await step(page).getByRole('button', { name: 'Add the test coupon to the download' }).click();
  await expect(page.getByLabel('Add a test coupon to the download')).toBeChecked();
  await expect(page.getByTestId('plan-joints')).toContainText('gripping by 0.05, 0.1, 0.15, 0.2 and 0.25 mm');
  await expect(sections(page)).toHaveText([
    'Section 1: 0.05 mm',
    'Section 2: 0.1 mm',
    'Section 3: 0.15 mm',
    'Section 4: 0.2 mm',
    'Section 5: 0.25 mm',
  ]);
});

test('too loose in every section: the grip goes up, then a section holds and the test is done', async ({ page }) => {
  await step(page).getByRole('button', { name: 'It slipped out of every one' }).click();
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toHaveValue('0.4');
  await expect(step(page).getByLabel('Grip of the strip that held best (mm per face)')).toHaveValue('0.4');
  await expect(page.getByLabel('Add a test coupon to the download')).toBeChecked();
  await expect(told(page)).toHaveText(
    'The tab slipped out of every section, so the grip goes up to 0.4 mm per face: print the coupon ' +
      'again, which now tries 0.3 to 0.5 mm. Measuring a strip’s slot with calipers (step 4) can save a print.',
  );
  await expect(sections(page).first()).toHaveText('Section 1: 0.3 mm');
  await expect(page.getByTestId('plan-joints')).toContainText('gripping by 0.3, 0.35, 0.4, 0.45 and 0.5 mm');

  await step(page).getByRole('button', { name: 'Section 2: 0.35 mm' }).click();
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toHaveValue('0.35');
  await expect(page.getByLabel('Add a test coupon to the download')).not.toBeChecked();
  await expect(told(page)).toHaveText(
    'Section 2 held: print the strips with a grip of 0.35 mm per face. The coupon can come out of the download.',
  );
});

test('into none, not even the section with no ribs: the fit goes up', async ({ page }) => {
  await step(page).getByLabel('Grip of the strip that held best (mm per face)').fill('0.05');
  await expect(sections(page).first()).toHaveText('Section 1: 0 mm');
  await step(page).getByRole('button', { name: 'It went into none' }).click();
  await expect(page.getByLabel('Fit (mm per face)')).toHaveValue('0.3');
  await expect(page.getByLabel('Grip (mm per face)', { exact: true })).toHaveValue('0.05');
  await expect(told(page)).toContainText(
    'the slot prints narrower than the piece: the fit goes up to 0.3 mm per face.',
  );
});

test('no answer while the grip or the fit is not a size', async ({ page }) => {
  await step(page).getByLabel('Grip of the strip that held best (mm per face)').fill('');
  await expect(step(page).getByRole('button', { name: 'It went into none' })).toBeDisabled();
  await expect(sections(page)).toHaveText(['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5']);
});
