// The running page and the library agree (code-params-page, #95; fill-registry, #96): once the
// page has made its own controls, such as each pattern's sizes, every field the library reads has
// exactly one control, or one group of radios.
import { expect, test } from '@playwright/test';
import { FIELD_NAMES } from 'parametric-window-sealer';

test('one control for every field the library reads', async ({ page }) => {
  await page.goto('./');
  const counts = await page.evaluate((names) => {
    const form = document.querySelector('#params');
    return names.map((name) => {
      const all = [...(form?.querySelectorAll(`[name="${name}"]`) ?? [])];
      const radios = all.filter((el) => el instanceof HTMLInputElement && el.type === 'radio').length;
      return { name, controls: radios > 1 && radios === all.length ? 1 : all.length };
    });
  }, FIELD_NAMES);
  expect(counts.filter((c) => c.controls !== 1)).toEqual([]);
  expect(counts).toHaveLength(FIELD_NAMES.length);
});
