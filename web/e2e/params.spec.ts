// The parameter panel in a real browser (params-basic, #5): the form starts from the
// example (Q42), the plan follows every change, and bad values are marked, not planned.
// With connector-strip (#10): the joint under advanced (Q51), and the warning with a choice
// when full pieces leave less room than a joint takes (Q60 to Q64). With track-edge (#11):
// the window type presets each edge (Q66, Q75), and the pieces span the opening plus each
// edge's reach (Q67): 3 mm more across and 13 mm more up on the example slider.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const headline = (page: import('@playwright/test').Page) => page.getByTestId('plan-headline');

test('opens with the example opening, labelled as one, and its plan', async ({ page }) => {
  await expect(page.getByLabel('Opening width (mm)')).toHaveValue('600');
  await expect(page.getByLabel('Opening height (mm)')).toHaveValue('1000');
  // Every example size is labelled as one (Q18): the opening's and the tracks'.
  await expect(page.getByText('Example sizes: measure the opening')).toBeVisible();
  await expect(page.getByText('Example sizes: measure your own tracks')).toBeVisible();
  await expect(page.getByLabel('Panel thickness (mm)')).toHaveValue('3');
  await expect(page.getByText('Default: 200 × 200 mm')).toBeVisible();
  await expect(headline(page)).toHaveText('15 pieces: 3 across, 5 up, 3 mm thick');
  await expect(page.getByTestId('plan-span')).toHaveText(
    'Pieces and joints: 603 × 1013 mm, for a 600 × 1000 mm opening.',
  );
  await expect(page.getByTestId('plan-joints')).toHaveText(
    'Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide.',
  );
  await expect(page.getByTestId('plan-edges')).toHaveText('Edges: 18 edge strips in 3 shapes.');
  await expect(page.getByLabel('Window type')).toHaveValue('slider');
});

test('follows a change, and warns about a small filler', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('637'); // 640 mm with the edges
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  await expect(headline(page)).toHaveText('20 pieces: 4 across, 5 up, 3 mm thick');
  await expect(page.getByTestId('plan-warnings')).toContainText(
    'Column 4 is 25 mm wide, under the 30 mm minimum',
  );
});

test('the filler position applies only to full pieces plus a filler', async ({ page }) => {
  await expect(page.getByLabel('Width filler')).toBeDisabled();
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  await expect(page.getByLabel('Width filler')).toBeEnabled();
  await page.getByLabel('Opening width (mm)').fill('497'); // 500 mm with the edges
  await page.getByLabel('Width filler').selectOption('split');
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 42.5, 200, 200, 42.5 mm');
});

test('a custom piece size changes the plan', async ({ page }) => {
  await page.getByLabel('Custom', { exact: true }).check();
  await page.getByLabel('Custom width (mm)').fill('170');
  await page.getByLabel('Custom height (mm)').fill('165');
  await expect(headline(page)).toHaveText('24 pieces: 4 across, 6 up, 3 mm thick');
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

test('the joint is under advanced, starts from the owner’s numbers, and sets the joints', async ({
  page,
}) => {
  const slide = page.getByLabel('Slide (mm)');
  await expect(slide).toBeHidden();
  await page.getByText('Advanced: the joint between pieces').click();
  await expect(page.getByLabel('Slot depth (mm)')).toHaveValue('8');
  await expect(slide).toHaveValue('3');
  await expect(page.getByLabel('Web (mm)')).toHaveValue('2');
  await expect(page.getByLabel('Flanges (mm)')).toHaveValue('1.6');
  await expect(page.getByLabel('Fit (mm per face)')).toHaveValue('0.2');
  await slide.fill('0');
  await expect(page.getByTestId('plan-joints')).toContainText('each joint 2 mm wide');
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 150, 150, 150, 150 mm');
  await slide.fill('8');
  await expect(page.getByTestId('error-slideMm')).toHaveText(
    'Make it less than the slot depth, so a piece always stays in its slot.',
  );
  await expect(headline(page)).toHaveText('Fix the marked fields to see the plan.');
});

test('full pieces that leave too little: a warning, spreading chosen, the others a click away', async ({
  page,
}) => {
  await page.getByLabel('Opening width (mm)').fill('609'); // 612 mm with the edges
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  const warning = page.getByTestId('leftover-width');
  await expect(warning).toContainText(
    'Width: 3 full 200 mm pieces leave 2 mm, too little for another joint and a filler.',
  );
  const spread = warning.getByLabel('Spread the pieces 1 mm further apart at each joint');
  const equal = warning.getByLabel('Equal pieces: 4 of 149.3 mm');
  const shorten = warning.getByLabel('Shorten one full piece: 200, 200, 167 and 30 mm');
  await expect(spread).toBeChecked();
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 200, 200, 200 mm');
  await equal.check();
  await expect(page.getByTestId('plan-columns')).toHaveText(
    'Widths: 149.3, 149.3, 149.3, 149.3 mm',
  );
  await expect(warning.getByLabel('Equal pieces: 4 of 149.3 mm')).toBeChecked();
  await expect(warning.getByLabel('Equal pieces: 4 of 149.3 mm')).toBeFocused();
  await shorten.check();
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 200, 200, 167, 30 mm');
});

test('when spreading cannot work it is greyed out, and equal pieces is chosen', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('200'); // 203 mm with the edges
  await page.getByLabel('Width division').selectOption('full-plus-filler');
  const warning = page.getByTestId('leftover-width');
  await expect(warning.getByLabel('Spread the pieces: there is no joint to spread')).toBeDisabled();
  await expect(warning.getByLabel('Equal pieces: 2 of 99 mm')).toBeChecked();
  await expect(page.getByTestId('plan-columns')).toHaveText('Widths: 99, 99 mm');
});

test('the window type presets each edge, and any edge can be changed (Q66)', async ({ page }) => {
  await expect(page.getByLabel('Top edge')).toHaveValue('track');
  await expect(page.getByLabel('Right edge')).toHaveValue('sash');
  await expect(page.getByLabel('Right track depth (mm)')).toBeDisabled();
  await page.getByLabel('Window type').selectOption('hung');
  await expect(page.getByLabel('Top edge')).toHaveValue('sash');
  await expect(page.getByLabel('Bottom edge')).toHaveValue('sill');
  await expect(page.getByLabel('Left edge')).toHaveValue('track');
  await expect(page.getByLabel('Right edge')).toHaveValue('track');
  await expect(page.getByLabel('Top track depth (mm)')).toBeDisabled();
  await expect(page.getByLabel('Right track depth (mm)')).toBeEnabled();
  await expect(page.getByTestId('plan-span')).toHaveText(
    'Pieces and joints: 613 × 993 mm, for a 600 × 1000 mm opening.',
  );
  // A sill with a track: the bottom edge reaches into it too.
  await page.getByLabel('Bottom edge').selectOption('track');
  await expect(page.getByTestId('plan-span')).toHaveText(
    'Pieces and joints: 613 × 1003 mm, for a 600 × 1000 mm opening.',
  );
});

test('a deeper track takes the pieces no further, and a too-narrow track is marked', async ({
  page,
}) => {
  await page.getByLabel('Left track depth (mm)').fill('25');
  // The strip fills the deeper track; the panel still sits 6.5 mm into it (Q69).
  await expect(page.getByTestId('plan-span')).toHaveText(
    'Pieces and joints: 603 × 1013 mm, for a 600 × 1000 mm opening.',
  );
  await page.getByLabel('Track width (mm)').fill('7');
  await expect(page.getByTestId('error-trackWidthMm')).toHaveText(
    'Make it at least 7.6 mm: an edge strip needs walls as thick as the flanges.',
  );
  await expect(headline(page)).toHaveText('Fix the marked fields to see the plan.');
});
