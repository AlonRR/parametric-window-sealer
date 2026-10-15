// A wall pressed into a frame with no track on the page (compression-edge, #120): the window type sets
// all four edges, the TPU seal is needed, and the plan says what holds it.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('a frame with no track: all four edges in it, held by the TPU gaskets', async ({ page }) => {
  await page.getByLabel('Window type').selectOption('frame');
  for (const edge of ['Top edge', 'Bottom edge', 'Left edge', 'Right edge']) {
    await expect(page.getByLabel(edge)).toHaveValue('frame');
  }
  await expect(page.getByTestId('error-seal')).toHaveText(
    'An edge pressed into a frame is held by the squeeze of its printed TPU gasket: choose printed TPU as the seal.',
  );
  await page.getByRole('radio', { name: 'Printed TPU' }).check();
  await expect(page.getByTestId('error-seal')).toHaveText('');
  await expect(page.getByTestId('plan-frame')).toHaveText(
    'In a frame: the TPU gaskets on the top, bottom, left and right edges stand 2.4 mm out of their grooves ' +
      'and are squeezed to 0.4 mm as the wall goes in. Their squeeze is all that holds it: push it in square ' +
      'from the room side, and check it holds before letting go.',
  );
});
