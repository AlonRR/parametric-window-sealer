// The page as one file that works offline (offline-file, #25; Q24). Chosen without asking (Q144;
// docs/choices.md): one HTML file holding the script, the styles and the geometry engine (C54),
// built with the site and offered from the page by a link (C55), named window-sealer.html (C56),
// and tested opened from the disk with the network cut off (C57).
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

const file = fileURLToPath(new URL('../out/site/window-sealer.html', import.meta.url));
const offline = pathToFileURL(file).href;
const save = 'Save the page as one file that works offline';

test('opened from the disk with no network, it plans, draws and downloads (C54, C57)', async ({ page, context }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await context.route(/^https?:/, (route) => route.abort());
  await page.goto(offline);
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('plan-headline')).toHaveText('15 pieces: 3 across, 5 up, 3 mm thick');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-pieces', '15');

  await page.getByRole('button', { name: 'Download the pieces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download the pieces' });
  await dialog.getByRole('radio', { name: 'STL', exact: true }).check();
  await dialog.getByRole('radio', { name: 'One zip file' }).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const names = Object.keys(unzipSync(await readFile((await download.path()) ?? '')));
  expect(names).toContain('piece-c1-r1-197.7x198.6.stl');

  // Everything came from the file itself: nothing fetched but the page, data and blob URLs.
  expect(asked.filter((u) => u !== offline && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  // And opened from the disk, it does not offer itself again.
  await expect(page.getByRole('link', { name: save })).toBeHidden();
});

test('the hosted page links to the offline file, served beside it (C55, C56)', async ({ page, request }) => {
  await page.goto('./');
  const link = page.getByRole('link', { name: save });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'window-sealer.html');
  await expect(link).toHaveAttribute('download', 'window-sealer.html');
  const served = await request.get('window-sealer.html');
  expect(served.ok()).toBe(true);
  expect(served.headers()['content-type']).toContain('text/html');
  // The page says it is under 2 MB.
  await expect(page.getByText('(under 2 MB)')).toBeVisible();
  expect((await stat(file)).size).toBeLessThan(2 * 1024 * 1024);
});
