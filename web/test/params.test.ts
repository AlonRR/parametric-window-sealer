// Backlog item params-basic (#5): the basic parameter panel. The form's values arrive as
// strings; readParams checks them, planWall divides the opening, describePlan says what
// the user will get. Defaults: Q39 (3 mm), Q40 (30 mm placeholder minimum), Q41 (all
// equal), Q42 (a 600 x 1000 mm example opening), Q51 (the joint's starting dimensions).
// With connector-strip (#10) each joint takes 5 mm (Q56), and full pieces that leave less
// than a joint warn with a choice of resolutions (Q60 to Q64).
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
import { DEFAULT_JOINT } from '../src/joint';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });

describe('the starting values', () => {
  it('are the decided defaults', () => {
    expect(EXAMPLE_PARAMS).toEqual({
      openingWidthMm: 600,
      openingHeightMm: 1000,
      printer: { kind: 'default' },
      width: { mode: 'equal', filler: 'end', leftover: 'spread' },
      height: { mode: 'equal', filler: 'end', leftover: 'spread' },
      thicknessMm: 3,
      joint: DEFAULT_JOINT,
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

  it('reads the joint under advanced (Q51), allowing no slide and no fit', () => {
    const r = read({ slotMm: '10', slideMm: '0', webMm: '2.5', flangeMm: '2', fitMm: '0' });
    expect(r.ok && r.params.joint).toEqual({
      slotMm: 10,
      slideMm: 0,
      webMm: 2.5,
      flangeMm: 2,
      fitMm: 0,
    });
  });

  it.each([
    ['slotMm', '0'],
    ['webMm', '0'],
    ['flangeMm', ''],
    ['slideMm', '-1'],
    ['fitMm', 'loose'],
  ] as const)('refuses a joint %s of "%s", naming the field', (field, value) => {
    const r = read({ [field]: value });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual([field]);
  });

  it('refuses a slide as deep as the slot: a piece must stay in its slot', () => {
    const r = read({ slotMm: '8', slideMm: '8' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({
        slideMm: 'Make it less than the slot depth, so a piece always stays in its slot.',
      });
    }
  });

  it('refuses a custom piece size no wider than a joint', () => {
    const r = read({ printer: 'custom', customWidthMm: '5', customHeightMm: '200' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({ customWidthMm: 'Make it more than a joint’s 5 mm.' });
    }
  });

  it('refuses a joint as wide as the default piece size', () => {
    const r = read({ webMm: '150', slideMm: '50', slotMm: '60' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({
        webMm: 'Make the web and the slide together less than the 200 mm piece size.',
      });
    }
  });

  it('reads the leftover choice per axis, and refuses one not on the list', () => {
    const r = read({ widthLeftover: 'shorten', heightLeftover: 'equal' });
    expect(r.ok && [r.params.width.leftover, r.params.height.leftover]).toEqual([
      'shorten',
      'equal',
    ]);
    const bad = read({ widthLeftover: 'squeeze' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors)).toEqual(['widthLeftover']);
  });

  it('refuses a mode or filler position that is not on the list', () => {
    const r = read({ widthMode: 'diagonal', heightFiller: 'top' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['heightFiller', 'widthMode']);
  });
});

describe('planWall', () => {
  it('the example: 600 x 1000 mm at 200 x 200 mm, all equal, with 5 mm joints', () => {
    const plan = planWall(EXAMPLE_PARAMS);
    expect(plan.columns).toEqual([590 / 3, 590 / 3, 590 / 3]);
    expect(plan.rows).toEqual([196, 196, 196, 196, 196]);
    expect(plan.columnJointsMm).toEqual([5, 5]);
    expect(plan.pieces).toHaveLength(15);
    expect(plan.warnings).toEqual([]);
  });

  it('uses the custom size and the placeholder minimum', () => {
    const plan = planWall({
      ...EXAMPLE_PARAMS,
      openingWidthMm: 640,
      width: { mode: 'full-plus-filler', filler: 'end', leftover: 'spread' },
      printer: { kind: 'custom', widthMm: 200, heightMm: 250 },
    });
    expect(plan.columns).toEqual([200, 200, 200, 25]);
    expect(plan.rows).toEqual([246.25, 246.25, 246.25, 246.25]);
    expect(plan.warnings).toEqual([{ axis: 'width', index: 3, lengthMm: 25, minPieceMm: 30 }]);
  });

  it('the joint sets the width between pieces: no slide leaves just the web', () => {
    const plan = planWall({ ...EXAMPLE_PARAMS, joint: { ...DEFAULT_JOINT, slideMm: 0 } });
    expect(plan.columnJointsMm).toEqual([2, 2]);
    expect(plan.columns[0]).toBeCloseTo(596 / 3, 9);
  });

  it('passes each axis its leftover choice (Q60)', () => {
    const plan = planWall({
      ...EXAMPLE_PARAMS,
      openingWidthMm: 612,
      width: { mode: 'full-plus-filler', filler: 'end', leftover: 'equal' },
    });
    expect(plan.columns).toEqual([149.25, 149.25, 149.25, 149.25]);
    expect(plan.leftovers[0]).toMatchObject({ axis: 'width', used: 'equal' });
  });
});

describe('describePlan', () => {
  const fillerWidth = (openingWidthMm: number) => ({
    ...EXAMPLE_PARAMS,
    openingWidthMm,
    width: { mode: 'full-plus-filler' as const, filler: 'end' as const, leftover: 'spread' as const },
  });
  const describe_ = (p: typeof EXAMPLE_PARAMS) => describePlan(planWall(p), p);

  it('summarises the example, joints included', () => {
    expect(describe_(EXAMPLE_PARAMS)).toEqual({
      headline: '15 pieces: 3 across, 5 up, 3 mm thick',
      columns: 'Widths: 196.7, 196.7, 196.7 mm',
      rows: 'Heights: 196, 196, 196, 196, 196 mm',
      joints: 'Joints: 22 strips in 4 lengths, and 8 cross pieces; each joint 5 mm wide.',
      warnings: [],
      leftovers: [],
    });
  });

  it('rounds to 0.1 mm and uses the singular for one', () => {
    const row = describe_({ ...EXAMPLE_PARAMS, openingWidthMm: 1000, openingHeightMm: 150 });
    expect(row.columns).toBe('Widths: 196, 196, 196, 196, 196 mm');
    expect(row.joints).toBe('Joints: 4 strips in 1 length; each joint 5 mm wide.');
    const one = describe_({ ...EXAMPLE_PARAMS, openingWidthMm: 100, openingHeightMm: 150 });
    expect(one.headline).toBe('1 piece: 1 across, 1 up, 3 mm thick');
    expect(one.joints).toBe('No joints: the wall is one piece.');
    expect(describe_({ ...EXAMPLE_PARAMS, openingWidthMm: 700 }).columns).toBe(
      'Widths: 171.3, 171.3, 171.3, 171.3 mm',
    );
    expect(describe_({ ...EXAMPLE_PARAMS, openingWidthMm: 500 }).columns).toBe(
      'Widths: 163.3, 163.3, 163.3 mm',
    );
  });

  it('words each small-piece warning with its position and the placeholder', () => {
    expect(describe_(fillerWidth(640)).warnings).toEqual([
      'Column 4 is 25 mm wide, under the 30 mm minimum (a placeholder for now).',
    ]);
  });

  it('offers the three resolutions when full pieces leave too little (Q60 to Q64)', () => {
    expect(describe_(fillerWidth(612)).leftovers).toEqual([
      {
        axis: 'width',
        message: 'Width: 3 full 200 mm pieces leave 2 mm, too little for another joint and a filler.',
        used: 'spread',
        options: [
          {
            value: 'spread',
            label: 'Spread the pieces 1 mm further apart at each joint (they can spread up to 3 mm)',
            possible: true,
          },
          { value: 'equal', label: 'Equal pieces: 4 of 149.3 mm', possible: true },
          {
            value: 'shorten',
            label: 'Shorten one full piece: 200, 200, 167 and 30 mm',
            possible: true,
          },
        ],
      },
    ]);
  });

  it('says why spreading cannot work, and uses equal pieces instead (Q63)', () => {
    const [none] = describe_(fillerWidth(203)).leftovers;
    expect(none?.message).toBe(
      'Width: 1 full 200 mm piece leaves 3 mm, too little for another joint and a filler.',
    );
    expect(none?.used).toBe('equal');
    expect(none?.options.map((o) => [o.label, o.possible])).toEqual([
      ['Spread the pieces: there is no joint to spread', false],
      ['Equal pieces: 2 of 99 mm', true],
      ['Shorten one full piece: 168 and 30 mm', true],
    ]);
    const [far] = describe_(fillerWidth(409)).leftovers;
    expect(far?.options[0]).toEqual({
      value: 'spread',
      label: 'Spread the pieces: each joint would spread 4 mm, more than the 3 mm it can',
      possible: false,
    });
  });

  it('names the height axis for a leftover in the rows', () => {
    const [rows] = describe_({
      ...EXAMPLE_PARAMS,
      openingHeightMm: 612,
      height: { mode: 'full-plus-filler', filler: 'end', leftover: 'spread' },
    }).leftovers;
    expect(rows?.axis).toBe('height');
    expect(rows?.message.startsWith('Height: 3 full 200 mm pieces leave 2 mm')).toBe(true);
  });
});
