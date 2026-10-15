// Rain on the outside face on the page (rain-face, #117): on to start with, the plan saying to fit
// the weep holes outside; off, no line.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('the weep holes start on, the plan saying which way to fit them', async ({ page }) => {
  const rain = page.getByLabel('The outside of the wall gets rain');
  await expect(rain).toBeChecked();
  await expect(page.getByTestId('plan-rain')).toHaveText(
    'Rain: every strip and edge strip has weep holes in one flange to let water out of its slots; fit each ' +
      'with that flange outside. A groove under each edge strip stops water creeping under it to the room.',
  );
  await page.getByRole('radio', { name: 'Foam tape' }).check();
  await expect(page.getByTestId('plan-rain')).not.toContainText('A groove under each edge strip');
  await rain.uncheck();
  await expect(page.getByTestId('plan-rain')).toHaveText('');
});
