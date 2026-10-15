// A double wall on the page (double-wall, #119): single to start with; double, in panels thick
// enough, the plan says what it gains; too thin, it is refused.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('a double wall in 10 mm panels, and refused in 3 mm ones', async ({ page }) => {
  const wall = page.locator('select[name="wall"]');
  await expect(wall).toHaveValue('single');
  await expect(page.getByTestId('plan-double')).toHaveText('');
  await wall.selectOption('double');
  await expect(page.getByTestId('error-wall')).toHaveText(
    'A double wall needs panels at least 6.4 mm thick: two 1.2 mm skins round a 4 mm air gap.',
  );
  await expect(page.getByText('Each plain printed piece is hollow inside the panel thickness')).toBeVisible();
  await page.getByLabel('Panel thickness (mm)').fill('10');
  await expect(page.getByTestId('error-wall')).toHaveText('');
  await expect(page.getByTestId('plan-double')).toContainText(
    'By calculation the wall loses about 3.2 W/m²K where a solid one as thick loses 4.5',
  );
});
