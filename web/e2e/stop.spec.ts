// The sash stop on the page (sash-stop, #118): none to start with; given the gap along the sash's
// track, the plan says what to print and how it comes out, and the page says the wall is not a lock.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('a strut for the slider’s bottom track, and the wall is not a lock', async ({ page }) => {
  const stop = page.getByLabel('Sash stop length (mm)');
  await expect(stop).toHaveValue('0');
  await expect(page.getByText('The wall is not a lock.')).toBeVisible();
  await expect(page.getByTestId('plan-stop')).toHaveText('');
  await stop.fill('150');
  await expect(page.getByTestId('plan-stop')).toHaveText(
    'Sash stop: a strut 14 mm wide and 20 mm tall, 149 mm long in one piece. Lay it in the bottom track from the ' +
      'sash’s edge to the frame, standing 10 mm out: it stops the sash opening further, and lifts out by hand ' +
      'from inside. The wall itself is not a lock.',
  );
  await stop.fill('9');
  await expect(page.getByTestId('error-sashStopMm')).toHaveText('Make it at least 10 mm, or 0 for none.');
});
