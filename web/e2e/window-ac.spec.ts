// The window AC on the page (window-ac, #24): a fourth answer to "What is in the window?" (C50),
// asking where the unit is seen from the room, which sets the edge that meets it (C49); below the
// wall in a slider, to its right in a hung window, to start with (C53); and the plan's line.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const ac = (page: Page) => page.getByRole('radio', { name: 'Window air conditioner' });
const place = (page: Page) => page.getByLabel('Where is the unit, seen from the room?');
const edge = (page: Page, name: string) => page.getByLabel(`${name} edge`);
const units = (page: Page) => page.getByTestId('plan-units');

test('in a slider the wall stands on the unit; the plan says so (C50, C53)', async ({ page }) => {
  await expect(place(page)).toBeHidden();
  await ac(page).check();
  await expect(place(page)).toHaveValue('below');
  await expect(edge(page, 'Bottom')).toHaveValue('unit');
  await expect(units(page)).toHaveText('Window AC: the bottom edge stands on the unit’s top.');
  await expect(page.getByText('Measure the opening left open around the unit')).toBeVisible();

  await place(page).selectOption('left');
  await expect(edge(page, 'Bottom')).toHaveValue('track');
  await expect(edge(page, 'Left')).toHaveValue('unit');
  await expect(units(page)).toHaveText('Window AC: the left edge meets the unit’s side.');
});

test('in a hung window the unit starts on the wall’s right; none puts the edges back', async ({ page }) => {
  await page.getByLabel('Window type').selectOption('hung');
  await ac(page).check();
  await expect(place(page)).toHaveValue('right');
  await expect(edge(page, 'Right')).toHaveValue('unit');
  await expect(edge(page, 'Bottom')).toHaveValue('sill');

  await page.getByRole('radio', { name: 'None, a plain wall' }).check();
  await expect(edge(page, 'Right')).toHaveValue('track');
  await expect(units(page)).toHaveText('');
});

test('changing the window type with the AC chosen moves the unit to that type’s start (C53)', async ({ page }) => {
  await ac(page).check();
  await expect(place(page)).toHaveValue('below');
  await page.getByLabel('Window type').selectOption('hung');
  await expect(place(page)).toHaveValue('right');
  await expect(edge(page, 'Right')).toHaveValue('unit');
  await expect(edge(page, 'Bottom')).toHaveValue('sill');
  await expect(units(page)).toHaveText('Window AC: the right edge meets the unit’s side.');
});

test('any edge can be set against the unit by hand (C49)', async ({ page }) => {
  await edge(page, 'Top').selectOption({ label: 'Against a window AC' });
  await expect(units(page)).toHaveText('Window AC: the top edge meets the unit’s underside.');
});
