// Organiser boards on the page: Skådis (organiser-skadis, #33), openGrid (organiser-opengrid, #34) and
// the Honeycomb Storage Wall (organiser-hsw, #37) in the fill's list after the patterns, each with its
// note and no style, and its line in the plan; refused on pieces thicker than the board; a piece of
// its own; its slots in the downloaded pieces.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const fill = (page: Page) => page.locator('select[name="fill"]');
const line = (page: Page) => page.getByTestId('plan-fill');
const SKADIS_LINE =
  'Fill: a Skådis pegboard: upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every other row ' +
  'shifted 20 mm, in a board 4.8 mm thick, raised 1.8 mm on the room side inside each piece’s border; cut ' +
  'through: air passes through the wall.';

test('Skådis in the fill’s list, with its note and no style; its line in the plan', async ({ page }) => {
  await expect(fill(page).locator('optgroup[label="Organiser boards"] option')).toHaveText([
    'Skådis pegboard',
    'openGrid board',
    'Honeycomb Storage Wall',
  ]);
  await fill(page).selectOption('skadis');
  await expect(page.getByText('For Skådis accessories: a board 4.8 mm thick')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeHidden();
  await expect(line(page)).toHaveText(SKADIS_LINE);
  await fill(page).selectOption('grid');
  await expect(page.getByText('For Skådis accessories: a board 4.8 mm thick')).toBeHidden();
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeVisible();
});

test('openGrid: its note and its line in the plan', async ({ page }) => {
  await fill(page).selectOption('opengrid');
  await expect(page.getByText('For openGrid snaps: a board 6.8 mm thick')).toBeVisible();
  await expect(page.getByText('For Skådis accessories')).toBeHidden();
  await expect(line(page)).toHaveText(
    'Fill: an openGrid board: cells 25 mm across with a groove 26.4 mm across behind each face, 28 mm apart ' +
      'each way, as openGrid’s Full board, in a board 6.8 mm thick, raised 3.8 mm on the room side inside each ' +
      'piece’s border; cut through: air passes through the wall.',
  );
});

test('the Honeycomb Storage Wall: its note and its line in the plan', async ({ page }) => {
  await fill(page).selectOption('hsw');
  await expect(page.getByText('For Honeycomb Storage Wall inserts: a board 8 mm thick')).toBeVisible();
  await expect(line(page)).toHaveText(
    'Fill: a Honeycomb Storage Wall board: hexagonal cells 20 mm across their flats, flats at the top and ' +
      'bottom, 23.6 mm apart, each widening to 22 mm behind a ledge 5.1 mm in, in a board 8 mm thick, raised ' +
      '5 mm on the room side inside each piece’s border; cut through: air passes through the wall.',
  );
});

test('refused on pieces thicker than its board', async ({ page }) => {
  await fill(page).selectOption('skadis');
  await page.getByLabel('Panel thickness (mm)').fill('5');
  await expect(page.getByTestId('error-fill')).toHaveText(
    'Skådis accessories fit a board 4.8 mm thick: make the pieces at most 4.8 mm thick, or choose another fill.',
  );
  await page.getByLabel('Panel thickness (mm)').fill('4.8');
  await expect(page.getByTestId('error-fill')).toHaveText('');
  await expect(line(page)).toHaveText(
    'Fill: a Skådis pegboard: upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every other row ' +
      'shifted 20 mm, in a board 4.8 mm thick; cut through: air passes through the wall.',
  );
});

test('a piece of its own, its slots in the download', async ({ page }) => {
  test.slow();
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await page.getByText('Advanced: the joint between pieces').click();
  await page.getByLabel('Pin each strip').uncheck();
  await page.getByText('Advanced: piece by piece').click();
  const map = page.getByTestId('piece-map');
  await map.getByRole('button', { name: 'Column 2, row 1' }).click();
  const own = page.getByLabel('Fill of column 2, row 1');
  await own.selectOption('skadis');
  await expect(page.getByTestId('plan-piece-fills')).toHaveText(SKADIS_LINE.replace('Fill: ', 'Column 2, row 1: '));
  // Chosen again, the piece shows its own board.
  await map.getByRole('button', { name: 'Column 1, row 1' }).click();
  await map.getByRole('button', { name: 'Column 2, row 1' }).click();
  await expect(own).toHaveValue('skadis');

  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const files = unzipSync(await readFile((await file.path()) ?? ''));
  const plain = files['piece-c1-r1-197.7x198.6.stl']?.length ?? 0;
  // A sealed piece as printed has under 300 triangles; one with a Skådis board has every slot's walls.
  expect(plain).toBeLessThan(84 + 50 * 300);
  expect(files['piece-c2-r1-197.7x198.6.stl']?.length ?? 0).toBeGreaterThan(10 * plain);
});
