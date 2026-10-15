// The panel fill on the page (pattern-grid, #16): sealed to start with, or the grid, in relief
// to start with or cut through (Q141, Q142); its sizes under Advanced (Q139, Q140, Q143); the
// openings in the downloaded pieces.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const fill = (page: Page) => page.locator('select[name="fill"]');
const line = (page: Page) => page.getByTestId('plan-fill');

test('starts sealed (Q141)', async ({ page }) => {
  await expect(fill(page)).toHaveValue('sealed');
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeHidden();
  await expect(line(page)).toHaveText('Fill: sealed.');
});

test('the grid: in relief to start with, or cut through, said under it (Q142)', async ({ page }) => {
  await fill(page).selectOption('grid');
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeChecked();
  await expect(line(page)).toHaveText(
    'Fill: a grid of 15 mm square openings and 3 mm bars, cut 1.5 mm into the room side.',
  );
  await expect(page.getByText('Air passes through the wall.')).toBeVisible();
  await page.getByRole('radio', { name: 'Cut through' }).check();
  await expect(line(page)).toHaveText(
    'Fill: a grid of 15 mm square openings and 3 mm bars, cut through: air passes through the wall.',
  );
  await fill(page).selectOption('sealed');
  await expect(line(page)).toHaveText('Fill: sealed.');
});

test('its sizes under Advanced; a bar under 0.8 mm is refused (Q140, Q143)', async ({ page }) => {
  await fill(page).selectOption('grid');
  await page.getByText('Advanced: the pattern').click();
  await expect(page.getByLabel('Grid opening (mm)')).toHaveValue('15');
  await expect(page.getByLabel('Grid bar (mm)')).toHaveValue('3');
  await expect(page.getByLabel("Relief depth (% of the panel's thickness)")).toHaveValue('50');
  await page.getByLabel('Grid opening (mm)').fill('12');
  await expect(line(page)).toContainText('a grid of 12 mm square openings');
  await page.getByLabel('Grid bar (mm)').fill('0.5');
  await expect(page.getByTestId('error-gridBarMm')).toHaveText(
    'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.',
  );
  await expect(page.getByTestId('plan-headline')).toHaveText('Fix the marked fields to see the plan.');
});

// Without the pins' slots (joint-lock, #110), so a sealed piece is a plain box.
const unpin = async (page: Page) => {
  await page.getByText('Advanced: the joint between pieces').click();
  await page.getByLabel('Pin each strip').uncheck();
};

test('the downloaded pieces carry the openings, named as before', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await unpin(page);
  const download = async () => {
    await page.getByRole('button', { name: 'Download the pieces' }).click();
    const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
    await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
    await dialog.getByRole('radio', { name: 'One zip file' }).check();
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Download', exact: true }).click(),
    ]);
    return unzipSync(await readFile((await file.path()) ?? ''));
  };
  const sealed = await download();
  await fill(page).selectOption('grid');
  await expect(line(page)).toContainText('a grid');
  const grid = await download();
  expect(Object.keys(grid).sort()).toEqual(Object.keys(sealed).sort());
  const piece = 'piece-c1-r1-197.7x198.6.stl';
  // A sealed piece is a box: 12 triangles, 684 bytes. With the grid it has many more.
  expect(sealed[piece]?.length).toBe(684);
  expect(grid[piece]?.length ?? 0).toBeGreaterThan(10 * 684);
});

test('the hexagon: a honeycomb; under Advanced only its sizes show (C13 to C17)', async ({ page }) => {
  await fill(page).selectOption('hexagon');
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeChecked();
  await expect(line(page)).toHaveText(
    'Fill: a honeycomb of hexagonal openings 15 mm across the flats and 3 mm bars, cut 1.5 mm into the room side.',
  );
  await page.getByText('Advanced: the pattern').click();
  await expect(page.getByLabel('Hexagon opening, across the flats (mm)')).toHaveValue('15');
  await expect(page.getByLabel('Grid opening (mm)')).toBeHidden();
  await page.getByLabel('Hexagon bar (mm)').fill('2');
  await expect(line(page)).toContainText('and 2 mm bars');
  await fill(page).selectOption('grid');
  await expect(page.getByLabel('Grid opening (mm)')).toBeVisible();
  await expect(page.getByLabel('Hexagon opening, across the flats (mm)')).toBeHidden();
});

test('bricks: a running bond, sized by width, height and bar (C18 to C21)', async ({ page }) => {
  await fill(page).selectOption('brick');
  await expect(line(page)).toHaveText(
    'Fill: bricks of 30 × 12 mm openings and 3 mm bars, cut 1.5 mm into the room side.',
  );
  await page.getByText('Advanced: the pattern').click();
  await expect(page.getByLabel('Hexagon opening, across the flats (mm)')).toBeHidden();
  await page.getByLabel('Brick height (mm)').fill('10');
  await expect(line(page)).toHaveText(
    'Fill: bricks of 30 × 10 mm openings and 3 mm bars, cut 1.5 mm into the room side.',
  );
});

test('diamonds: point-up, sized by width, height and bar (C22 to C25)', async ({ page }) => {
  await fill(page).selectOption('diamond');
  await expect(line(page)).toHaveText(
    'Fill: diamonds 20 mm wide and 30 mm tall and 3 mm bars, cut 1.5 mm into the room side.',
  );
  await page.getByText('Advanced: the pattern').click();
  await expect(page.getByLabel('Brick width (mm)')).toBeHidden();
  await page.getByLabel('Diamond height, corner to corner (mm)').fill('20');
  await expect(line(page)).toContainText('20 mm wide and 20 mm tall');
});

test('piece by piece: a map of the pieces, one given its own fill (params-advanced, #21; C26 to C29)', async ({
  page,
}) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await unpin(page);
  await fill(page).selectOption('grid');
  await page.getByText('Advanced: piece by piece').click();
  const map = page.getByTestId('piece-map');
  await expect(map.getByRole('button')).toHaveCount(15); // 3 across, 5 up
  await expect(map.getByRole('button').first()).toHaveText('1,5'); // the top row first, as seen
  await map.getByRole('button', { name: 'Column 2, row 1' }).click();
  const own = page.getByLabel('Fill of column 2, row 1');
  await expect(own).toHaveValue('');
  await own.selectOption('sealed');
  await expect(page.getByTestId('plan-piece-fills')).toHaveText('Column 2, row 1: sealed.');
  await expect(map.getByRole('button', { name: 'Column 2, row 1' })).toHaveAttribute('data-own', 'yes');

  // The download: that piece is a plain box, its neighbours carry the grid.
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const files = unzipSync(await readFile((await file.path()) ?? ''));
  expect(files['piece-c2-r1-197.7x198.6.stl']?.length).toBe(684);
  expect(files['piece-c1-r1-197.7x198.6.stl']?.length ?? 0).toBeGreaterThan(10 * 684);
  await page.keyboard.press('Escape');

  await own.selectOption('');
  await expect(page.getByTestId('plan-piece-fills')).toBeEmpty();
});
