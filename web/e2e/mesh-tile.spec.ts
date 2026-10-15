// A 3D tile of your own on the page (mesh-tiles, #40): a fill of its own in the fill's list and the
// piece-by-piece list, its file chosen, the side facing the room, the plan's line, and the tiles in
// the downloaded pieces.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

// A binary STL tile 28 mm square and 6 mm deep, lying flat as a tile is drawn to print.
function tileStl(): Buffer {
  const corners = [0, 0, 0, 28, 0, 0, 28, 28, 0, 0, 28, 0, 0, 0, 6, 28, 0, 6, 28, 28, 6, 0, 28, 6];
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ];
  const bytes = Buffer.alloc(84 + 50 * 12);
  bytes.writeUInt32LE(12, 80);
  faces.forEach((c, i) => {
    for (let a = 0; a < 3; a++) {
      bytes.writeFloatLE(corners[3 * c + a] ?? 0, 84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a);
    }
  });
  return bytes;
}

// The highest corner in a binary STL file: how far the piece stands from its outside face.
function topOf(stl: Uint8Array | undefined): number {
  if (stl === undefined) return Number.NaN;
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  let top = -Infinity;
  for (let t = 0; t < view.getUint32(80, true); t++) {
    for (let k = 0; k < 3; k++) top = Math.max(top, view.getFloat32(84 + 50 * t + 12 + 12 * k + 8, true));
  }
  return top;
}

const fill = (page: Page) => page.locator('select[name="fill"]');
const line = (page: Page) => page.getByTestId('plan-fill');
const box = (page: Page) => page.getByTestId('mesh-tile');

test('a 3D tile: in the fill’s list, its file, the side facing the room, and the plan says so', async ({ page }) => {
  await expect(fill(page).locator('optgroup[label="Your own"] option')).toHaveText(['3D tile of your own']);
  await expect(box(page)).toBeHidden();
  await fill(page).selectOption('mesh');
  await expect(page.getByTestId('error-fillMeshFile')).toHaveText('Choose the tile’s file.');
  await expect(page.getByRole('radio', { name: 'Relief' })).toBeHidden();
  await box(page).getByLabel('The tile’s file').setInputFiles({
    name: 'tile.stl',
    mimeType: 'application/octet-stream',
    buffer: tileStl(),
  });
  await expect(box(page).getByTestId('mesh-tile-name')).toHaveText('Using tile.stl.');
  await expect(page.getByTestId('error-fillMeshFile')).toHaveText('');
  await expect(line(page)).toHaveText(
    'Fill: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 6 mm deep, set side by ' +
      'side in whole cells inside each piece’s border, standing 3 mm proud on the room side.',
  );
  await box(page).getByLabel('Which side of the tile faces the room').selectOption('front');
  await expect(line(page)).toContainText('each 28 × 6 mm seen from its front and 28 mm deep');
});

test('a piece of its own, its tiles in the download', async ({ page }) => {
  test.slow();
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await fill(page).selectOption('mesh');
  await box(page).getByLabel('The tile’s file').setInputFiles({
    name: 'tile.stl',
    mimeType: 'application/octet-stream',
    buffer: tileStl(),
  });
  await fill(page).selectOption('sealed');
  await page.getByText('Advanced: the joint between pieces').click();
  await page.getByLabel('Pin each strip').uncheck();
  await page.getByText('Advanced: piece by piece').click();
  await page.getByTestId('piece-map').getByRole('button', { name: 'Column 2, row 1' }).click();
  await page.getByLabel('Fill of column 2, row 1').selectOption('mesh');
  await expect(page.getByTestId('plan-piece-fills')).toContainText('Column 2, row 1: 3D tiles of your own');

  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const files = unzipSync(await readFile((await download.path()) ?? ''));
  // As printed, lying on its outside face: the tiles stand 6 mm from it, a sealed piece 3 mm.
  expect(topOf(files['piece-c2-r1-197.7x198.6.stl'])).toBeCloseTo(6, 3);
  expect(topOf(files['piece-c1-r1-197.7x198.6.stl'])).toBeCloseTo(3, 3);
});
