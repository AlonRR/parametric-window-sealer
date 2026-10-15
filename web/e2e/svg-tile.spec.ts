// The SVG tile on the page (svg-tile, #27): a pattern in the fill's list, a round opening to
// start with, then a file of the user's own read into the plan; a file that is not a drawing
// refused with the library's reason; its openings in the downloaded pieces.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const fill = (page: Page) => page.locator('select[name="fill"]');
const line = (page: Page) => page.getByTestId('plan-fill');
const box = (page: Page) => page.getByTestId('svg-tile');
const choose = (page: Page, name: string, text: string) =>
  box(page)
    .getByLabel('SVG file')
    .setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(text) });

const SQUARES =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
  '<rect width="10" height="10"/><rect x="12" width="5" height="5"/></svg>';

test('a round opening to start with, then the file chosen; its width under Advanced', async ({ page }) => {
  await expect(box(page)).toBeHidden();
  await fill(page).selectOption('svg');
  await expect(box(page)).toBeVisible();
  await expect(line(page)).toHaveText('Fill: an SVG tile 20 × 20 mm with 1 opening, cut 1.5 mm into the room side.');
  await expect(page.getByTestId('svg-tile-name')).toHaveText('Using the starting drawing: one round opening.');
  await choose(page, 'squares.svg', SQUARES);
  await expect(line(page)).toHaveText('Fill: an SVG tile 20 × 20 mm with 2 openings, cut 1.5 mm into the room side.');
  await expect(page.getByTestId('svg-tile-name')).toHaveText('Using squares.svg.');
  await page.getByText('Advanced: the pattern').click();
  await page.getByLabel('Tile width (mm)').fill('30');
  await expect(line(page)).toHaveText('Fill: an SVG tile 30 × 30 mm with 2 openings, cut 1.5 mm into the room side.');
});

test('a file that is not a drawing is refused, with the reason', async ({ page }) => {
  await fill(page).selectOption('svg');
  await choose(page, 'page.html', '<html><body/></html>');
  await expect(page.getByTestId('error-fillDrawing')).toHaveText(
    'The file is not an SVG drawing: it has no svg element at its root.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
  // A wall not using the tile keeps a drawing it cannot read, as it keeps a size (C15).
  await fill(page).selectOption('sealed');
  await expect(page.getByTestId('error-fillDrawing')).toHaveText('');
  await expect(line(page)).toHaveText('Fill: sealed.');
});

test('the downloaded pieces carry its openings', async ({ page }) => {
  // Cutting a drawn tile into every piece takes 28 to 30 s on its own, at the 30 s limit: three times it.
  test.slow();
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  // Without the pins' slots (joint-lock, #110), so a sealed piece would be a plain box.
  await page.getByText('Advanced: the joint between pieces').click();
  await page.getByLabel('Pin each strip').uncheck();
  await fill(page).selectOption('svg');
  await page.getByRole('radio', { name: 'Cut through' }).check();
  await choose(page, 'squares.svg', SQUARES);
  await expect(line(page)).toContainText('2 openings');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const files = unzipSync(await readFile((await file.path()) ?? ''));
  // A sealed piece as printed has under 300 triangles, for its rounded corners and its chamfer (#122).
  // With the tile's openings it has many more.
  expect(files['piece-c1-r1-197.7x198.6.stl']?.length ?? 0).toBeGreaterThan(3 * (84 + 50 * 300));
});
