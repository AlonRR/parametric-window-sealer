// Backlog item params-basic (#5): the basic parameter panel. The form's values arrive as
// strings; readParams checks them, planWall divides the opening, describePlan says what
// the user will get. Defaults: Q39 (3 mm), Q40 (30 mm placeholder minimum), Q41 (all
// equal), Q42 (a 600 x 1000 mm example opening).
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  PLACEHOLDER_MIN_PIECE_MM,
  describePlan,
  planWall,
  readParams,
  toFormValues,
} from '../src/params';
import type { FormValues } from '../src/params';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });

describe('the starting values', () => {
  it('are the decided defaults', () => {
    expect(EXAMPLE_PARAMS).toEqual({
      openingWidthMm: 600,
      openingHeightMm: 1000,
      printer: { kind: 'default' },
      width: { mode: 'equal', filler: 'end' },
      height: { mode: 'equal', filler: 'end' },
      thicknessMm: 3,
    });
    expect(PLACEHOLDER_MIN_PIECE_MM).toBe(30);
  });

  it('survive a round trip through the form', () => {
    expect(readParams(example)).toEqual({ ok: true, params: EXAMPLE_PARAMS });
  });
});

describe('readParams', () => {
  it('accepts decimals and surrounding spaces', () => {
    const r = read({ openingWidthMm: ' 812.5 ' });
    expect(r.ok && r.params.openingWidthMm).toBe(812.5);
  });

  it('reads a custom maximum piece size', () => {
    const r = read({ printer: 'custom', customWidthMm: '170', customHeightMm: '165' });
    expect(r.ok && r.params.printer).toEqual({ kind: 'custom', widthMm: 170, heightMm: 165 });
  });

  it('ignores the custom fields while the default is selected', () => {
    const r = read({ printer: 'default', customWidthMm: 'not a number' });
    expect(r.ok).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['text', 'wide'],
    ['zero', '0'],
    ['negative', '-5'],
    ['infinite', '1e999'],
    ['a comma decimal', '600,5'],
  ])('refuses an opening width that is %s, naming the field', (_label, value) => {
    const r = read({ openingWidthMm: value });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['openingWidthMm']);
  });

  it('reports every bad field at once', () => {
    const r = read({ openingHeightMm: '', thicknessMm: '-1', printer: 'custom', customWidthMm: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['customHeightMm', 'customWidthMm', 'openingHeightMm', 'thicknessMm'].sort(),
      );
    }
  });

  it('refuses a mode or filler position that is not on the list', () => {
    const r = read({ widthMode: 'diagonal', heightFiller: 'top' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['heightFiller', 'widthMode']);
  });
});

describe('planWall', () => {
  it('the example: 600 x 1000 mm at 200 x 200 mm, all equal, is 3 across and 5 up', () => {
    const plan = planWall(EXAMPLE_PARAMS);
    expect(plan.columns).toEqual([200, 200, 200]);
    expect(plan.rows).toEqual([200, 200, 200, 200, 200]);
    expect(plan.pieces).toHaveLength(15);
    expect(plan.warnings).toEqual([]);
  });

  it('uses the custom size and the placeholder minimum', () => {
    const plan = planWall({
      ...EXAMPLE_PARAMS,
      openingWidthMm: 810,
      width: { mode: 'full-plus-filler', filler: 'end' },
      printer: { kind: 'custom', widthMm: 200, heightMm: 250 },
    });
    expect(plan.columns).toEqual([200, 200, 200, 200, expect.closeTo(10, 9)]);
    expect(plan.rows).toEqual([250, 250, 250, 250]);
    expect(plan.warnings).toEqual([
      { axis: 'width', index: 4, lengthMm: expect.closeTo(10, 9), minPieceMm: 30 },
    ]);
  });
});

describe('describePlan', () => {
  it('summarises the example', () => {
    expect(describePlan(planWall(EXAMPLE_PARAMS), 3)).toEqual({
      headline: '15 pieces: 3 across, 5 up, 3 mm thick',
      columns: 'Widths: 200, 200, 200 mm',
      rows: 'Heights: 200, 200, 200, 200, 200 mm',
      warnings: [],
    });
  });

  it('rounds to 0.1 mm and says one piece in the singular', () => {
    const plan = planWall({ ...EXAMPLE_PARAMS, openingWidthMm: 1000, openingHeightMm: 150 });
    const text = describePlan(plan, 3);
    expect(text.columns).toBe('Widths: 200, 200, 200, 200, 200 mm');
    const one = describePlan(
      planWall({ ...EXAMPLE_PARAMS, openingWidthMm: 100, openingHeightMm: 150 }),
      3,
    );
    expect(one.headline).toBe('1 piece: 1 across, 1 up, 3 mm thick');
    const odd = describePlan(planWall({ ...EXAMPLE_PARAMS, openingWidthMm: 700 }), 3);
    expect(odd.columns).toBe('Widths: 175, 175, 175, 175 mm');
    const tenth = describePlan(planWall({ ...EXAMPLE_PARAMS, openingWidthMm: 500 }), 3);
    expect(tenth.columns).toBe('Widths: 166.7, 166.7, 166.7 mm');
  });

  it('words each small-piece warning with its position and the placeholder', () => {
    const plan = planWall({
      ...EXAMPLE_PARAMS,
      openingWidthMm: 810,
      width: { mode: 'full-plus-filler', filler: 'end' },
    });
    expect(describePlan(plan, 3).warnings).toEqual([
      'Column 5 is 10 mm wide, under the 30 mm minimum (a placeholder until the joint is designed).',
    ]);
  });
});
