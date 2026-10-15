// Material advice by place (material-advice, #113), from the design review against published work.
// The user still chooses the material; the plan says what it is, and warns where the wall will get
// near the temperature at which it gave in a loaded oven test: PLA at 60 °C, PETG at 80 °C, ASA at
// 110 °C. In sun at 30 °C a light panel reaches about 50 °C and a dark one about 74 °C, and a hose
// port carries exhaust at 40 to 50 °C.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATERIAL,
  EXAMPLE_PARAMS,
  GIVES_AT_C,
  describePlan,
  hottestC,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });
const ok = (over: FormValues): Params => {
  const r = read(over);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const plan = (over: FormValues) => {
  const p = ok(over);
  return describePlan(planWall(p), p);
};

describe('the starting values', () => {
  it('are PETG in a light colour, out of the sun', () => {
    expect(DEFAULT_MATERIAL).toEqual({ kind: 'petg', colour: 'light', sun: false });
    expect(EXAMPLE_PARAMS.material).toEqual(DEFAULT_MATERIAL);
    expect([example.material, example.colour, example.sun]).toEqual(['petg', 'light', 'no']);
    expect(GIVES_AT_C).toEqual({ pla: 60, petg: 80, asa: 110 });
  });
});

describe('how hot the wall gets', () => {
  it('in sun: the air at 30 °C, and 20 °C more for a light colour or 44 °C for a dark one', () => {
    expect(hottestC({ ...DEFAULT_MATERIAL, sun: true }, false)).toEqual({ c: 50, why: 'sun' });
    expect(hottestC({ ...DEFAULT_MATERIAL, colour: 'dark', sun: true }, false)).toEqual({ c: 74, why: 'sun' });
  });

  it('beside a hose: its exhaust at 50 °C; out of the sun with no hose, nothing to say', () => {
    expect(hottestC(DEFAULT_MATERIAL, true)).toEqual({ c: 50, why: 'hose' });
    expect(hottestC({ ...DEFAULT_MATERIAL, colour: 'dark', sun: true }, true)).toEqual({ c: 74, why: 'sun' });
    expect(hottestC(DEFAULT_MATERIAL, false)).toBeUndefined();
  });
});

describe('the plan', () => {
  it('names the material, and has nothing to warn of for PETG out of the sun', () => {
    const text = plan({});
    expect(text.material).toBe('Material: PETG in a light colour.');
    expect(text.warnings).toEqual([]);
  });

  it('warns of PLA in sun, or beside a hose, within 10 °C of where it gave', () => {
    expect(plan({ material: 'pla', sun: 'yes' }).warnings).toEqual([
      'PLA gave at 60 °C in a loaded oven test, and creeps under load below that; in sun the wall reaches ' +
        'about 50 °C. Print it in PETG or ASA; PLA is for test fits.',
    ]);
    expect(plan({ material: 'pla', ports: '150' }).warnings).toEqual([
      'PLA gave at 60 °C in a loaded oven test, and creeps under load below that; beside the hose the wall ' +
        'reaches about 50 °C. Print it in PETG or ASA; PLA is for test fits.',
    ]);
    expect(plan({ material: 'pla' }).warnings).toEqual([]); // out of the sun, no hose (control)
  });

  it('warns of dark PETG in sun, and not of light', () => {
    expect(plan({ colour: 'dark', sun: 'yes' }).warnings).toEqual([
      'PETG gave at 80 °C in a loaded oven test; in sun the wall reaches about 74 °C. Print it in a light ' +
        'colour, or in ASA.',
    ]);
    expect(plan({ sun: 'yes' }).warnings).toEqual([]);
    expect(plan({ material: 'asa', colour: 'dark', sun: 'yes' }).warnings).toEqual([]);
  });

  it('in sun says how hot, and advises ASA over PETG for the light', () => {
    expect(plan({ sun: 'yes' }).material).toBe(
      'Material: PETG in a light colour. In sun at 30 °C its outside face reaches about 50 °C. ASA lasts ' +
        'better in sun: PETG lost 36 % of its strength after 24 hours of UV-B in one test.',
    );
    expect(plan({ material: 'asa', sun: 'yes' }).material).toBe(
      'Material: ASA in a light colour. In sun at 30 °C its outside face reaches about 50 °C.',
    );
  });
});

describe('the settings', () => {
  it('read the material, colour and sun, refuse others, and read back what they write', () => {
    expect(read({ material: 'abs' })).toMatchObject({ ok: false, errors: { material: expect.any(String) } });
    expect(read({ colour: 'blue' })).toMatchObject({ ok: false, errors: { colour: expect.any(String) } });
    const r = read({ material: 'asa', colour: 'dark', sun: 'yes' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.material).toEqual({ kind: 'asa', colour: 'dark', sun: true });
      expect(readParams(toFormValues(r.params))).toEqual(r);
    }
    const given = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, material: { kind: 'pla' } });
    expect(given.ok && given.params.material).toEqual({ ...DEFAULT_MATERIAL, kind: 'pla' });
  });
});
