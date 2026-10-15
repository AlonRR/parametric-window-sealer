// A model of the appliance on the page (mesh-appliance, #35): an answer to "What is in the window?",
// its file chosen, the side facing the room and its piece, the plan's line, what is wrong with a
// file, and its piece among the downloaded files.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

// A binary STL box, x across, y deep and z high, as a modelling program draws an appliance.
function boxStl(x: number, y: number, z: number): Buffer {
  const corners = [
    [0, 0, 0],
    [x, 0, 0],
    [x, y, 0],
    [0, y, 0],
    [0, 0, z],
    [x, 0, z],
    [x, y, z],
    [0, y, z],
  ];
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ];
  const bytes = Buffer.alloc(84 + 50 * 12);
  bytes.writeUInt32LE(12, 80);
  faces.forEach((c, i) => {
    for (const [a, v] of (corners[c] ?? []).entries()) {
      bytes.writeFloatLE(v, 84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a);
    }
  });
  return bytes;
}

const box = (page: Page) => page.getByTestId('model');
const line = (page: Page) => page.getByTestId('plan-model');
const file = (page: Page) => box(page).getByLabel('The model’s file');
const choose = async (page: Page, name: string, buffer: Buffer) => {
  await page.getByRole('radio', { name: 'Something else: cut round its 3D model' }).check();
  await file(page).setInputFiles({ name, mimeType: 'application/octet-stream', buffer });
};

test('a model of the appliance: its file, the side facing the room, its piece, and the plan says so', async ({
  page,
}) => {
  await expect(box(page)).toBeHidden();
  await page.getByRole('radio', { name: 'Something else: cut round its 3D model' }).check();
  await expect(page.getByTestId('error-modelFile')).toHaveText('Choose the model’s file: an STL, OBJ or 3MF file.');
  await choose(page, 'ac.stl', boxStl(120, 50, 80));
  await expect(box(page).getByTestId('model-name')).toHaveText('Using ac.stl.');
  await expect(page.getByTestId('error-modelFile')).toHaveText('');
  await expect(line(page)).toHaveText(
    'Model: the appliance in the STL file, 120 × 80 mm seen from its front, in column 2, row 1, through an ' +
      'opening 1 mm clear of its outline, in a 15 mm rim.',
  );
  await expect(box(page).getByLabel('Column')).toHaveValue('2');
  await expect(box(page).getByLabel('Row')).toHaveValue('1');
  await box(page).getByLabel('Which side of the model faces the room').selectOption('right');
  await expect(line(page)).toContainText('50 × 80 mm seen from its right side, in column 2, row 1');
  await box(page).getByLabel('Column').fill('1');
  await box(page).getByLabel('Row').fill('3');
  await expect(line(page)).toContainText('in column 1, row 3');
  // Another answer and back: the file is kept.
  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(line(page)).toHaveText('');
  await page.getByRole('radio', { name: 'Something else: cut round its 3D model' }).check();
  await expect(line(page)).toContainText('in column 1, row 3');
});

test('says what is wrong with a file, and with a model too big for its piece', async ({ page }) => {
  await choose(page, 'notes.txt', Buffer.from('notes'));
  await expect(page.getByTestId('error-modelFile')).toHaveText(
    'The file is not a mesh: choose an STL, OBJ or 3MF file.',
  );
  await expect(line(page)).toHaveText('');
  await choose(page, 'wide.stl', boxStl(300, 50, 80));
  await expect(page.getByTestId('error-modelFile')).toHaveText(
    'The model’s outline, 300 × 80 mm seen from the room, needs a piece at least 326.8 × 106.8 mm; column 2, row 1 ' +
      'is 197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  );
  await box(page).getByLabel('Column').fill('2');
  await expect(page.getByTestId('error-modelFile')).toHaveText('Model: give both its column and its row.');
});

test('the download holds the model’s piece', async ({ page }) => {
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await choose(page, 'ac.stl', boxStl(120, 50, 80));
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
  const piece = files['piece-c2-r1-197.7x198.6-model-120x80.stl'];
  expect(piece).toBeDefined();
  // A binary STL: the opening and the rim's walls are more triangles than a plain piece's.
  const plain = files['piece-c1-r1-197.7x198.6.stl']?.length ?? 0;
  expect(piece?.length ?? 0).toBeGreaterThan(plain);
});
