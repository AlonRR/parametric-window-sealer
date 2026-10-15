// The tile drawn on the page (draw-tile, #39): corners and circles typed in or placed by clicking,
// written into the SVG tile the plan reads; undone, removed and cleared; the cell's proportions and
// a square's size on the wall; saved as a file that reads back the same.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const editor = (page: Page) => page.getByTestId('tile-editor');
const line = (page: Page) => page.getByTestId('plan-fill');
const note = (page: Page) => page.getByTestId('svg-tile-name');
const status = (page: Page) => editor(page).getByTestId('tile-status');
const shapes = (page: Page) => editor(page).getByTestId('tile-shapes').getByRole('listitem');
const drawing = (page: Page) => page.locator('input[name="fillDrawing"]');
const button = (page: Page, name: string) => editor(page).getByRole('button', { name, exact: true });

async function open(page: Page) {
  await page.locator('select[name="fill"]').selectOption('svg');
  await editor(page).getByText('Draw a tile').click();
}

async function corner(page: Page, x: number, y: number) {
  await editor(page).getByLabel('Across').fill(String(x));
  await editor(page).getByLabel('Down').fill(String(y));
  await button(page, 'Add a corner').click();
}

async function circle(page: Page, x: number, y: number, radius: number) {
  await editor(page).getByLabel('Across').fill(String(x));
  await editor(page).getByLabel('Down').fill(String(y));
  await editor(page).getByLabel('Radius').fill(String(radius));
  await button(page, 'Add a circle').click();
}

// A click on the cell at a point in squares: the canvas shows the cell with two squares round it.
async function click(page: Page, x: number, y: number) {
  const canvas = editor(page).getByTestId('tile-canvas');
  const box = await canvas.boundingBox();
  if (box === null) throw new Error('the canvas is not shown');
  const [across, down] = await canvas.evaluate((svg: SVGSVGElement) => [
    svg.viewBox.baseVal.width,
    svg.viewBox.baseVal.height,
  ]);
  await page.mouse.click(box.x + ((x + 2) * box.width) / (across ?? 1), box.y + ((y + 2) * box.height) / (down ?? 1));
}

const fillLine = (size: string, openings: string) =>
  `Fill: an SVG tile ${size} mm with ${openings}, cut 1.5 mm into the room side.`;

test('corners and a circle typed in, then undone, removed and cleared', async ({ page }) => {
  await open(page);
  for (const [x, y] of [
    [2, 2],
    [8, 2],
    [8, 8],
    [2, 8],
  ] as const) {
    await corner(page, x, y);
  }
  await expect(status(page)).toHaveText(
    'Drawing a shape: 4 corners. Click its first corner, or Finish the shape, to finish it.',
  );
  // Not used until it is finished: the wall keeps the starting drawing.
  await expect(note(page)).toHaveText('Using the starting drawing: one round opening.');
  await button(page, 'Finish the shape').click();
  await expect(note(page)).toHaveText('Using your drawn tile: 1 shape.');
  await expect(line(page)).toHaveText(fillLine('20 × 20', '1 opening'));
  await circle(page, 14, 14, 3);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '2 openings'));
  await expect(shapes(page)).toHaveText([/^Shape 1: 4 corners/, /^Shape 2: a circle 6 squares across/]);
  await expect(note(page)).toHaveText('Using your drawn tile: 2 shapes.');

  await button(page, 'Undo').click();
  await expect(shapes(page)).toHaveText([/^Shape 1: 4 corners/]);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '1 opening'));
  await shapes(page).first().getByRole('button', { name: 'Remove' }).click();
  await expect(shapes(page)).toHaveCount(0);
  await expect(note(page)).toHaveText('Using your drawn tile: no shapes.');
  await expect(page.getByTestId('error-fillDrawing')).toHaveText(
    'The drawing has no filled shapes: draw each opening as a filled shape.',
  );

  await circle(page, 10, 10, 4);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '1 opening'));
  await button(page, 'Clear').click();
  await expect(shapes(page)).toHaveCount(0);
  await expect(note(page)).toHaveText('Using your drawn tile: no shapes.');
});

test('a shape needs three corners, and a circle a radius', async ({ page }) => {
  await open(page);
  await corner(page, 2, 2);
  await corner(page, 8, 2);
  await button(page, 'Finish the shape').click();
  await expect(status(page)).toHaveText('A shape needs at least three corners: 2 so far.');
  await circle(page, 10, 10, 0);
  await expect(status(page)).toHaveText('Type a radius above 0 squares for the circle.');
  await editor(page).getByLabel('Across').fill('ten');
  await button(page, 'Add a corner').click();
  await expect(status(page)).toHaveText('Type a number of squares across and down.');
  await expect(note(page)).toHaveText('Using the starting drawing: one round opening.');
});

test('shapes placed by clicking on the cell, on the nearest half square', async ({ page }) => {
  await open(page);
  await click(page, 3.1, 3.2);
  await click(page, 10, 2.9);
  await click(page, 10.2, 10);
  await expect(status(page)).toHaveText(
    'Drawing a shape: 3 corners. Click its first corner, or Finish the shape, to finish it.',
  );
  await click(page, 3, 3); // its first corner again
  await expect(shapes(page)).toHaveText([/^Shape 1: 3 corners/]);
  await expect(drawing(page)).toHaveValue(/<polygon points="3,3 10,3 10,10"\/>/);

  await editor(page)
    .getByRole('radio', { name: /A circle/ })
    .check();
  await click(page, 15, 15);
  await expect(status(page)).toHaveText('Drawing a circle: click a point on its rim.');
  await click(page, 15, 18.1);
  await expect(shapes(page)).toHaveText([/^Shape 1: 3 corners/, /^Shape 2: a circle 6 squares across/]);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '2 openings'));
  // The cell repeated three times each way: nine copies of each shape.
  await expect(editor(page).getByTestId('tile-repeat').locator('polygon, circle')).toHaveCount(18);
});

test('the cell’s proportions, and a square’s size on the wall', async ({ page }) => {
  await open(page);
  await expect(editor(page).getByTestId('tile-scale')).toHaveText('At a tile width of 20 mm, a square is 1 mm.');
  await circle(page, 5, 5, 3);
  await editor(page).getByLabel('Cell width (squares)').fill('10');
  await expect(line(page)).toHaveText(fillLine('20 × 40', '1 opening'));
  await expect(editor(page).getByTestId('tile-scale')).toHaveText('At a tile width of 20 mm, a square is 2 mm.');
  await page.getByText('Advanced: the pattern').click();
  await page.getByLabel('Tile width (mm)').fill('30');
  await expect(editor(page).getByTestId('tile-scale')).toHaveText('At a tile width of 30 mm, a square is 3 mm.');
  await expect(line(page)).toHaveText(fillLine('30 × 60', '1 opening'));

  await editor(page).getByLabel('Cell height (squares)').fill('0');
  await expect(status(page)).toHaveText('Make the cell a whole number of squares each way, from 1 to 100.');
  await expect(line(page)).toHaveText(fillLine('30 × 60', '1 opening'));
});

test('saved as an SVG file that reads back the same', async ({ page }) => {
  await open(page);
  await expect(button(page, 'Save as an SVG file')).toBeDisabled();
  // Squares, not circles: a curve is many short edges, and each shape rebuilds the preview.
  for (const [x, y] of [
    [2, 2],
    [8, 2],
    [8, 8],
    [2, 8],
  ] as const) {
    await corner(page, x, y);
  }
  await button(page, 'Finish the shape').click();
  for (const [x, y] of [
    [12, 12],
    [18, 12],
    [15, 18],
  ] as const) {
    await corner(page, x, y);
  }
  await button(page, 'Finish the shape').click();
  const [file] = await Promise.all([page.waitForEvent('download'), button(page, 'Save as an SVG file').click()]);
  expect(file.suggestedFilename()).toBe('tile.svg');
  const text = await readFile((await file.path()) ?? '', 'utf8');
  await expect(drawing(page)).toHaveValue(text);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '2 openings'));

  await page
    .getByTestId('svg-tile')
    .getByLabel('SVG file')
    .setInputFiles({ name: 'tile.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(text) });
  await expect(note(page)).toHaveText('Using tile.svg.');
  await expect(drawing(page)).toHaveValue(text);
  await expect(line(page)).toHaveText(fillLine('20 × 20', '2 openings'));
  // The file stays in use until a shape is drawn again.
  await editor(page).getByLabel('Cell width (squares)').fill('10');
  await expect(note(page)).toHaveText('Using tile.svg.');
  await expect(line(page)).toHaveText(fillLine('20 × 20', '2 openings'));
  await circle(page, 5, 5, 2);
  await expect(note(page)).toHaveText('Using your drawn tile: 3 shapes.');
  await expect(line(page)).toHaveText(fillLine('20 × 40', '3 openings'));
});
