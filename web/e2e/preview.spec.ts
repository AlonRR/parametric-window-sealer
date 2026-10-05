// The 3D preview in a real browser (preview-3d, #9; three.js, Q49). Pixels are counted on
// the drawn canvas: a preview that only claims to be ready while drawing nothing must fail,
// and the "bad value" test is the control that shows an empty preview counts as empty.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const preview = (page: Page) => page.getByTestId('preview');

// The share of the canvas that is not background (#f4f4f4).
const drawnShare = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas');
    if (!canvas) return -1;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d');
    if (!ctx) return -1;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
    let drawn = 0;
    for (let i = 0; i < data.length; i += 4) {
      const off = Math.abs(data[i]! - 244) + Math.abs(data[i + 1]! - 244) + Math.abs(data[i + 2]! - 244);
      if (off > 24) drawn += 1;
    }
    return drawn / (data.length / 4);
  });

const signature = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas');
    return canvas?.toDataURL() ?? '';
  });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
});

test('draws the example wall: 15 pieces, 22 strips, 8 cross pieces and 18 edge strips', async ({ page }) => {
  await expect(preview(page)).toHaveAttribute('data-pieces', '15');
  await expect(preview(page)).toHaveAttribute('data-strips', '22');
  await expect(preview(page)).toHaveAttribute('data-crosses', '8');
  await expect(preview(page)).toHaveAttribute('data-edges', '18');
  expect(await drawnShare(page)).toBeGreaterThan(0.05);
});

test('follows the form: a wider opening shows more pieces', async ({ page }) => {
  await page.getByLabel('Opening width (mm)').fill('1000');
  await expect(preview(page)).toHaveAttribute('data-pieces', '25');
  expect(await drawnShare(page)).toBeGreaterThan(0.05);
});

test('a bad value empties the preview and says why (the control for the pixel count)', async ({
  page,
}) => {
  await page.getByLabel('Opening width (mm)').fill('wide');
  await expect(preview(page)).toHaveAttribute('data-pieces', '0');
  await expect(page.getByTestId('preview-message')).toHaveText(
    'Fix the marked fields to see the preview.',
  );
  expect(await drawnShare(page)).toBeLessThan(0.001);
  await page.getByLabel('Opening width (mm)').fill('600');
  await expect(preview(page)).toHaveAttribute('data-pieces', '15');
  expect(await drawnShare(page)).toBeGreaterThan(0.05);
});

test('redrawing frees the old pieces: graphics memory holds only the current wall', async ({
  page,
}) => {
  const width = page.getByLabel('Opening width (mm)');
  const steps = [
    ['700', '20'],
    ['800', '20'],
    ['1000', '25'],
    ['600', '15'],
  ] as const;
  for (const [value, pieces] of steps) {
    await width.fill(value);
    await expect(preview(page)).toHaveAttribute('data-pieces', pieces);
  }
  // 15 pieces, 22 strips, 8 cross pieces and 18 edge strips, each a solid and an outline.
  await expect(preview(page)).toHaveAttribute('data-geometries', String(2 * (15 + 22 + 8 + 18)));
});

test('turns when dragged', async ({ page }) => {
  const canvas = page.getByTestId('preview').locator('canvas');
  // The mouse acts on what is on screen; the preview sits below the form.
  await canvas.scrollIntoViewIfNeeded();
  const before = await signature(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => signature(page)).not.toBe(before);
  expect(await drawnShare(page)).toBeGreaterThan(0.02);
});
