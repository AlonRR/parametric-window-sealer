// A whole piece of your own on the page (mesh-custom-piece, #41): its file chosen under Advanced,
// the side facing the room and its piece, the plan's line, what is wrong with it, taking it away,
// and the piece among the downloaded files.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

// A binary STL plate 250 mm square and 5 mm deep, lying flat as a piece is drawn to print.
function plateStl(): Buffer {
  const corners = [0, 0, 0, 250, 0, 0, 250, 250, 0, 0, 250, 0, 0, 0, 5, 250, 0, 5, 250, 250, 5, 0, 250, 5];
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

const box = (page: Page) => page.getByTestId('custom-piece');
const line = (page: Page) => page.getByTestId('plan-custom-piece');
const choose = async (page: Page) => {
  await page.getByText('Advanced: a whole piece of your own').click();
  await box(page).getByLabel('The piece’s file').setInputFiles({
    name: 'piece.stl',
    mimeType: 'application/octet-stream',
    buffer: plateStl(),
  });
};

test('a whole piece of your own: its file, its piece, and the plan says so; taken away again', async ({ page }) => {
  await choose(page);
  await expect(box(page).getByTestId('custom-piece-name')).toHaveText('Using piece.stl.');
  await expect(line(page)).toHaveText(
    'Custom piece: the piece in column 2, row 1, from the STL file: 250 × 250 mm seen from its top and 5 mm deep, ' +
      'trimmed to fit inside a 10 mm frame as thick as the pieces, for the joints.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await box(page).getByLabel('Column').fill('1');
  await box(page).getByLabel('Row').fill('3');
  await expect(line(page)).toContainText('the piece in column 1, row 3');
  await box(page).getByRole('button', { name: 'No piece of your own' }).click();
  await expect(line(page)).toHaveText('');
  await expect(box(page).getByTestId('custom-piece-name')).toHaveText('No file chosen yet.');
});

test('says when it is too small for its piece, seen from the side named', async ({ page }) => {
  await choose(page);
  await box(page).getByLabel('Which side of the piece faces the room').selectOption('front');
  await expect(page.getByTestId('error-customPieceFile')).toHaveText(
    'The custom piece is 250 × 5 mm seen from the room; column 2, row 1 needs one at least 177.7 × 178.6 mm, its ' +
      'area inside the 10 mm border the joints take, or the wall would be left open round it. Draw it larger, or ' +
      'make the pieces smaller.',
  );
});

test('the download holds the custom piece', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await choose(page);
  await expect(line(page)).not.toHaveText('');
  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const files = unzipSync(await readFile((await download.path()) ?? ''));
  // As printed, on its outside face: the plate stands 5 mm from it, a sealed piece 3 mm.
  expect(topOf(files['piece-c2-r1-197.7x198.6-custom-250x250.stl'])).toBeCloseTo(5, 3);
  expect(topOf(files['piece-c1-r1-197.7x198.6.stl'])).toBeCloseTo(3, 3);
});
