// A wall behind a roller shutter on the page (shutter-rails, #158): the window type sets the edges as a
// hung window's and the track to a guide rail's starting sizes, and the plan says how the wall sits in
// the rails; another window type puts the example track back.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('behind a roller shutter: the edges, the rail’s sizes and the plan’s line', async ({ page }) => {
  await page.getByLabel('Window type').selectOption({ label: 'Behind a roller shutter' });
  await expect(page.getByLabel('Top edge')).toHaveValue('sash');
  await expect(page.getByLabel('Bottom edge')).toHaveValue('sill');
  await expect(page.getByLabel('Left edge')).toHaveValue('track');
  await expect(page.getByLabel('Right edge')).toHaveValue('track');
  await expect(page.locator('input[name="trackWidthMm"]')).toHaveValue('9');
  await expect(page.locator('input[name="leftDepthMm"]')).toHaveValue('20');
  await expect(page.locator('input[name="rightDepthMm"]')).toHaveValue('20');
  await expect(page.getByTestId('plan-shutter')).toHaveText(
    'Behind a roller shutter: the side strips are 8 mm thick, to pass the guide rails’ brushes or seals, and ' +
      'sit 20 mm into the rails. Lower the shutter only until its end bar rests on the wall’s top edge, and hold ' +
      'it there by its strap or crank: the wall does not carry the shutter’s weight. Before a storm, take the wall ' +
      'out and close the shutter.',
  );
  await page.getByLabel('Window type').selectOption('slider');
  await expect(page.locator('input[name="trackWidthMm"]')).toHaveValue('15');
  await expect(page.locator('input[name="leftDepthMm"]')).toHaveValue('10');
  await expect(page.getByTestId('plan-shutter')).toHaveText('');
});
