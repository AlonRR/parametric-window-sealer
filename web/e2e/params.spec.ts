// The parameter panel in a real browser (params-basic, #5): the form starts from the
// example (Q42), the plan follows every change, and bad values are marked, not planned.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const headline = (page: import('@playwright/test').Page) => page.getByTestId('plan-headline');

test('opens with the example opening, labelled as one, and its plan', async ({ page }) => {
  await expect(page.getByLabel('Opening width (mm)')).toHaveValue('600');
  await expect(page.getByLabel('Opening height (mm)')).toHaveValue('1000');
  await expect(page.getByText('Example sizes')).toBeVisible();
  await expect(page.getByLabel('Panel thickness (mm)')).toHaveValue('3');
  await expect(page.getByText('Default: 200 × 200 mm')).toBeVisible();
  await expect(headline(page)).toHaveText('15 pieces: 3 across, 5 up, 3 mm thick');
});

test('follows a change, and warns about a small filler', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('810');
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  await expect(headline(page)).toHaveText('25 pieces: 5 across, 5 up, 3 mm thick');
  await expect(page.getByTestId('plan-warnings')).toContainText(
    'Column 5 is 10 mm wide, under the 30 mm minimum',
  );
});

test('the filler position applies only to full pieces plus a filler', async ({ page }) => {
  await expect(page.getByLabel('Width filler')).toBeDisabled();
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  await expect(page.getByLabel('Width filler')).toBeEnabled();
  await page.getByLabel('Opening width (mm)').fill('500');
  await page.getByLabel('Width filler').selectOption('split');
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 50, 200, 200, 50 mm');
});

test('a custom piece size changes the plan', async ({ page }) => {
  await page.getByLabel('Custom', { exact: true }).check();
  await page.getByLabel('Custom width (mm)').fill('170');
  await page.getByLabel('Custom height (mm)').fill('165');
  await expect(headline(page)).toHaveText('28 pieces: 4 across, 7 up, 3 mm thick');
});

test('a bad value is marked, and nothing is planned from it', async ({ page }) => {
  const width = page.getByLabel('Opening width (mm)');
  await width.fill('wide');
  await expect(width).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('error-openingWidthMm')).toHaveText(
    'Enter a size in mm, greater than 0.',
  );
  await expect(headline(page)).toHaveText('Fix the marked fields to see the plan.');
  await width.fill('600');
  await expect(width).not.toHaveAttribute('aria-invalid', 'true');
  await expect(headline(page)).toHaveText('15 pieces: 3 across, 5 up, 3 mm thick');
});
