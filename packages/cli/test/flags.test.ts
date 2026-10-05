// Every setting on the page has a flag (Q90). The page's form is the list: if the library
// grows a field, the command must grow a flag, or this fails.
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, readParams, toFormValues } from 'parametric-window-sealer';
import type { Params } from 'parametric-window-sealer';
import { SETTING_FLAGS, settingAt } from '../src/flags.js';

const CUSTOM_PRINTER: Params = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 250, heightMm: 210 } };

describe('the setting flags (Q90)', () => {
  it('one flag for each field of the page, and none without one', () => {
    const fields = Object.keys(toFormValues(EXAMPLE_PARAMS)).sort();
    expect(SETTING_FLAGS.map((f) => f.field).sort()).toEqual(fields);
  });

  it('no two flags share a name', () => {
    const names = SETTING_FLAGS.map((f) => f.flag);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(SETTING_FLAGS.map((f) => [f.flag, f] as const))(
    '--%s: its place in a --params file holds the value the page shows',
    (_flag, f) => {
      const params = f.field.startsWith('custom') ? CUSTOM_PRINTER : EXAMPLE_PARAMS;
      expect(String(settingAt(params, f.path))).toBe(toFormValues(params)[f.field]);
    },
  );

  const choices = SETTING_FLAGS.filter((f) => f.values !== undefined);
  it('the choices are the ones the page offers', () => {
    expect(choices.map((f) => f.flag)).toEqual([
      'printer',
      'width-mode',
      'width-filler',
      'width-leftover',
      'height-mode',
      'height-filler',
      'height-leftover',
      'window',
      'top-edge',
      'bottom-edge',
      'left-edge',
      'right-edge',
    ]);
  });

  it.each(choices.map((f) => [f.flag, f] as const))('--%s: every listed value is accepted', (_flag, f) => {
    for (const value of f.values ?? []) {
      const values = { ...toFormValues(CUSTOM_PRINTER), [f.field]: value };
      expect(readParams(values)).toMatchObject({ ok: true });
    }
    const wrong = readParams({ ...toFormValues(CUSTOM_PRINTER), [f.field]: 'not-a-choice' });
    expect(wrong.ok).toBe(false);
  });
});
