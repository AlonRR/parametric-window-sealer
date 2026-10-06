// Backlog item layout (#3): divide the opening into a grid (Q11) with a mode per axis,
// place the filler where the user asks or split it for symmetry (Q12), and warn, without
// refusing, when a piece is under the minimum the joint needs (Q12, Q37).
import { describe, expect, it } from 'vitest';
import { divideAxis, layoutGrid } from '../src/layout.js';
import type { AxisSpec } from '../src/layout.js';

const axis = (over: Partial<AxisSpec>): AxisSpec => ({
  lengthMm: 1000,
  maxPieceMm: 400,
  mode: 'full-plus-filler',
  filler: 'end',
  minPieceMm: 50,
  ...over,
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('divideAxis, all equal', () => {
  it('uses the fewest pieces that fit, all the same length', () => {
    const { pieces } = divideAxis(axis({ mode: 'equal' }));
    expect(pieces).toHaveLength(3);
    for (const p of pieces) expect(p).toBeCloseTo(1000 / 3, 9);
  });

  it('an exact multiple gives full-size pieces', () => {
    expect(divideAxis(axis({ mode: 'equal', lengthMm: 800 })).pieces).toEqual([400, 400]);
  });

  it('an opening no longer than one piece is one piece', () => {
    expect(divideAxis(axis({ mode: 'equal', lengthMm: 250 })).pieces).toEqual([250]);
  });
});

describe('divideAxis, full pieces plus one filler', () => {
  it.each([
    ['end', [400, 400, 200]],
    ['start', [200, 400, 400]],
    ['middle', [400, 200, 400]],
    ['split', [100, 400, 400, 100]],
  ] as const)('filler at %s', (filler, expected) => {
    expect(divideAxis(axis({ filler })).pieces).toEqual(expected);
  });

  it('middle with an odd count puts the filler after the first half, rounded down', () => {
    expect(divideAxis(axis({ lengthMm: 1300, filler: 'middle' })).pieces).toEqual([400, 100, 400, 400]);
  });

  it('an exact multiple has no filler, whatever its position', () => {
    for (const filler of ['start', 'end', 'middle', 'split'] as const) {
      expect(divideAxis(axis({ lengthMm: 800, filler })).pieces).toEqual([400, 400]);
    }
  });

  it('an opening shorter than one full piece is a single piece', () => {
    expect(divideAxis(axis({ lengthMm: 250 })).pieces).toEqual([250]);
  });

  it('floating-point dust is not a filler: 3 x 400.1 mm is exactly 1200.3 mm', () => {
    expect(divideAxis(axis({ lengthMm: 1200.3, maxPieceMm: 400.1 })).pieces).toEqual([400.1, 400.1, 400.1]);
  });
});

describe('divideAxis, small pieces warn and are kept (Q12)', () => {
  it('a filler under the minimum is reported with its index and length', () => {
    const { pieces, warnings } = divideAxis(axis({ lengthMm: 810 }));
    expect(pieces).toHaveLength(3);
    expect(pieces[2]).toBeCloseTo(10, 9);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ index: 2, minPieceMm: 50 });
    expect(warnings[0]?.lengthMm).toBeCloseTo(10, 9);
  });

  it('a piece exactly at the minimum does not warn', () => {
    expect(divideAxis(axis({ lengthMm: 850 })).warnings).toEqual([]);
  });

  it('splitting can push both halves under the minimum: two warnings', () => {
    const { pieces, warnings } = divideAxis(axis({ lengthMm: 850, filler: 'split' }));
    expect(pieces).toEqual([25, 400, 400, 25]);
    expect(warnings.map((w) => w.index)).toEqual([0, 3]);
  });

  it('a whole opening under the minimum warns in either mode', () => {
    expect(divideAxis(axis({ lengthMm: 30 })).warnings).toHaveLength(1);
    expect(divideAxis(axis({ lengthMm: 30, mode: 'equal' })).warnings).toHaveLength(1);
  });
});

describe('divideAxis, invariants over many inputs', () => {
  const lengths = [1, 49.9, 50, 399.99, 400, 400.01, 777.7, 1000, 1234.5, 2399.999, 5000];
  const cases = lengths.flatMap((lengthMm) =>
    (['equal', 'full-plus-filler'] as const).flatMap((mode) =>
      (['start', 'end', 'middle', 'split'] as const).map((filler) => ({ lengthMm, mode, filler })),
    ),
  );

  it(`${cases.length} cases: pieces sum to the opening, none over the maximum, none empty`, () => {
    for (const c of cases) {
      const { pieces } = divideAxis(axis(c));
      expect(sum(pieces)).toBeCloseTo(c.lengthMm, 9);
      for (const p of pieces) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThanOrEqual(400 + 1e-9);
      }
    }
  });
});

describe('divideAxis, invalid input is refused', () => {
  it.each([
    ['zero length', { lengthMm: 0 }],
    ['negative length', { lengthMm: -5 }],
    ['NaN length', { lengthMm: Number.NaN }],
    ['infinite length', { lengthMm: Number.POSITIVE_INFINITY }],
    ['zero maximum', { maxPieceMm: 0 }],
    ['negative minimum', { minPieceMm: -1 }],
  ])('%s', (_label, over) => {
    expect(() => divideAxis(axis(over))).toThrow(RangeError);
  });
});

describe('layoutGrid', () => {
  const grid = layoutGrid({
    widthMm: 1000,
    heightMm: 600,
    maxPieceWidthMm: 400,
    maxPieceHeightMm: 400,
    minPieceMm: 50,
    width: { mode: 'full-plus-filler', filler: 'end' },
    height: { mode: 'equal' },
  });

  it('divides each axis by its own mode (Q11)', () => {
    expect(grid.columns).toEqual([400, 400, 200]);
    expect(grid.rows).toEqual([300, 300]);
  });

  it('gives every piece its grid position, origin and size', () => {
    expect(grid.pieces).toHaveLength(6);
    expect(grid.pieces[0]).toEqual({ column: 0, row: 0, xMm: 0, yMm: 0, widthMm: 400, heightMm: 300 });
    expect(grid.pieces[5]).toEqual({
      column: 2,
      row: 1,
      xMm: 800,
      yMm: 300,
      widthMm: 200,
      heightMm: 300,
    });
  });

  it('tiles the opening exactly: piece areas add up to the whole', () => {
    const area = sum(grid.pieces.map((p) => p.widthMm * p.heightMm));
    expect(area).toBeCloseTo(1000 * 600, 6);
  });

  it('labels each warning with its axis', () => {
    const narrow = layoutGrid({
      widthMm: 810,
      heightMm: 600,
      maxPieceWidthMm: 400,
      maxPieceHeightMm: 400,
      minPieceMm: 50,
      width: { mode: 'full-plus-filler', filler: 'end' },
      height: { mode: 'equal' },
    });
    expect(narrow.warnings).toHaveLength(1);
    expect(narrow.warnings[0]).toMatchObject({ axis: 'width', index: 2 });
  });
});

// Backlog item connector-strip (#10): each joint takes the web plus the slide (Q56), so the
// pieces and the joints between them fill the opening together.
describe('divideAxis, with a joint between pieces (Q56)', () => {
  const joined = (over: Partial<AxisSpec>) => axis({ jointMm: 5, jointSpreadMm: 3, ...over });

  it('all equal: the fewest pieces that fit with their joints', () => {
    const { pieces, jointsMm } = divideAxis(joined({ mode: 'equal' }));
    expect(pieces).toHaveLength(3);
    for (const p of pieces) expect(p).toBeCloseTo((1000 - 2 * 5) / 3, 9);
    expect(jointsMm).toEqual([5, 5]);
  });

  it('all equal: full pieces exactly, when they and their joints fill the opening', () => {
    expect(divideAxis(joined({ mode: 'equal', lengthMm: 805 })).pieces).toEqual([400, 400]);
  });

  it.each([
    ['end', [400, 400, 190]],
    ['start', [190, 400, 400]],
    ['middle', [400, 190, 400]],
    ['split', [92.5, 400, 400, 92.5]],
  ] as const)('full plus filler at %s: the filler takes what the joints leave', (filler, expected) => {
    const { pieces, jointsMm } = divideAxis(joined({ filler }));
    expect(pieces).toEqual(expected);
    expect(jointsMm).toEqual(expected.slice(1).map(() => 5));
  });

  it('full plus filler: no filler when full pieces and joints fill the opening', () => {
    expect(divideAxis(joined({ lengthMm: 805 })).pieces).toEqual([400, 400]);
  });

  it('no joint at all (the default) leaves the layout as before', () => {
    expect(divideAxis(axis({})).jointsMm).toEqual([0, 0]);
  });
});

// Q60 to Q63: full pieces that leave less room than a joint takes. The example the owner
// was shown: 612 mm with 200 mm pieces and 5 mm joints leaves 2 mm after three full pieces.
describe('divideAxis, full pieces that leave less than a joint (Q60 to Q63)', () => {
  const tight = (over: Partial<AxisSpec>) =>
    axis({ maxPieceMm: 200, minPieceMm: 30, jointMm: 5, jointSpreadMm: 3, lengthMm: 612, ...over });

  it('reports the leftover and the full pieces that leave it', () => {
    const { leftover } = divideAxis(tight({}));
    expect(leftover?.leftoverMm).toBeCloseTo(2, 9);
    expect(leftover?.fullPieces).toBe(3);
  });

  it('spreads the pieces by default (Q61): full pieces, each joint wider by its share', () => {
    const { pieces, jointsMm, leftover } = divideAxis(tight({}));
    expect(leftover?.used).toBe('spread');
    expect(pieces).toEqual([200, 200, 200]);
    expect(jointsMm[0]).toBeCloseTo(6, 9);
    expect(jointsMm[1]).toBeCloseTo(6, 9);
  });

  it('offers all three resolutions (Q62), each with its own pieces', () => {
    const options = divideAxis(tight({})).leftover?.options;
    expect(options?.spread.possible).toBe(true);
    expect(options?.equal).toMatchObject({ possible: true, pieces: [149.25, 149.25, 149.25, 149.25] });
    expect(options?.shorten).toMatchObject({ possible: true, pieces: [200, 200, 167, 30] });
  });

  it.each([
    ['equal', [149.25, 149.25, 149.25, 149.25]],
    ['shorten', [200, 200, 167, 30]],
  ] as const)('uses %s when the user chooses it', (choice, expected) => {
    const { pieces, jointsMm, leftover } = divideAxis(tight({ leftover: choice }));
    expect(leftover?.used).toBe(choice);
    expect(pieces).toEqual(expected);
    expect(jointsMm).toEqual(expected.slice(1).map(() => 5));
  });

  it.each([
    ['start', [30, 167, 200, 200]],
    ['middle', [167, 30, 200, 200]],
    ['split', [30, 200, 200, 132, 30]],
  ] as const)('shortening with the filler at %s shortens the full piece next to it', (filler, expected) => {
    const { pieces } = divideAxis(tight({ filler, leftover: 'shorten' }));
    expect(pieces).toEqual(expected);
  });

  it('with no joint to spread, equal pieces is used (Q63), whatever was chosen', () => {
    const { pieces, leftover } = divideAxis(tight({ lengthMm: 203 }));
    expect(leftover?.fullPieces).toBe(1);
    expect(leftover?.options.spread.possible).toBe(false);
    expect(leftover?.used).toBe('equal');
    expect(pieces).toEqual([99, 99]);
  });

  it('when the joints would spread more than their slide, equal pieces is used (Q63)', () => {
    const { pieces, leftover } = divideAxis(tight({ lengthMm: 409 }));
    expect(leftover?.leftoverMm).toBeCloseTo(4, 9);
    expect(leftover?.options.spread.possible).toBe(false);
    expect(leftover?.used).toBe('equal');
    expect(pieces).toEqual([133, 133, 133]);
  });

  it('spreading exactly the whole slide is still possible', () => {
    // Two full pieces and one joint leave 3 mm: the joint spreads by all 3 mm of its slide.
    const { jointsMm, leftover } = divideAxis(tight({ lengthMm: 408 }));
    expect(leftover?.used).toBe('spread');
    expect(jointsMm[0]).toBeCloseTo(8, 9);
  });

  it('a split filler needs two joints, so more sizes leave too little', () => {
    const { leftover } = divideAxis(tight({ lengthMm: 618, filler: 'split' }));
    expect(leftover?.leftoverMm).toBeCloseTo(8, 9);
    expect(leftover?.used).toBe('equal'); // 4 mm per joint is more than the 3 mm slide
  });

  it('a chosen resolution that cannot work falls back to the default', () => {
    const { leftover } = divideAxis(tight({ lengthMm: 203, leftover: 'spread' }));
    expect(leftover?.used).toBe('equal');
  });

  it('all equal never has a leftover, and neither does a layout without joints', () => {
    expect(divideAxis(tight({ mode: 'equal' })).leftover).toBeUndefined();
    expect(divideAxis(tight({ jointMm: 0 })).leftover).toBeUndefined();
    expect(divideAxis(tight({ lengthMm: 620 })).leftover).toBeUndefined(); // a 5 mm filler fits
  });
});

describe('divideAxis with joints, invariants over many inputs', () => {
  const lengths = [1, 49.9, 203, 405, 408, 409, 612, 618, 777.7, 1000, 1234.5, 5000];
  const cases = lengths.flatMap((lengthMm) =>
    (['equal', 'full-plus-filler'] as const).flatMap((mode) =>
      (['start', 'end', 'middle', 'split'] as const).flatMap((filler) =>
        (['spread', 'equal', 'shorten'] as const).map((leftover) => ({
          lengthMm,
          mode,
          filler,
          leftover,
        })),
      ),
    ),
  );

  it(`${cases.length} cases: pieces and joints fill the opening, joints within their slide`, () => {
    for (const c of cases) {
      const { pieces, jointsMm } = divideAxis(
        axis({ ...c, maxPieceMm: 200, minPieceMm: 30, jointMm: 5, jointSpreadMm: 3 }),
      );
      expect(jointsMm).toHaveLength(pieces.length - 1);
      expect(sum(pieces) + sum(jointsMm)).toBeCloseTo(c.lengthMm, 9);
      for (const p of pieces) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThanOrEqual(200 + 1e-9);
      }
      for (const j of jointsMm) {
        expect(j).toBeGreaterThanOrEqual(5 - 1e-9);
        expect(j).toBeLessThanOrEqual(5 + 3 + 1e-9);
      }
    }
  });
});

describe('divideAxis, invalid joints are refused', () => {
  it.each([
    ['negative joint', { jointMm: -1 }],
    ['a joint as wide as the largest piece', { jointMm: 400 }],
    ['negative spread', { jointMm: 5, jointSpreadMm: -1 }],
  ])('%s', (_label, over) => {
    expect(() => divideAxis(axis(over))).toThrow(RangeError);
  });
});

describe('layoutGrid with joints', () => {
  const grid = layoutGrid({
    widthMm: 612,
    heightMm: 1000,
    maxPieceWidthMm: 200,
    maxPieceHeightMm: 200,
    minPieceMm: 30,
    jointMm: 5,
    jointSpreadMm: 3,
    width: { mode: 'full-plus-filler', filler: 'end' },
    height: { mode: 'equal' },
  });

  it('places each piece after the pieces and joints before it', () => {
    expect(grid.columnJointsMm.map((j) => Math.round(j * 1e6) / 1e6)).toEqual([6, 6]);
    expect(grid.rowJointsMm).toEqual([5, 5, 5, 5]);
    const second = grid.pieces.find((p) => p.column === 1 && p.row === 1);
    expect(second?.xMm).toBeCloseTo(206, 9);
    expect(second?.yMm).toBeCloseTo(196 + 5, 9);
  });

  it('the last piece ends at the opening edge on both axes', () => {
    const last = grid.pieces.at(-1);
    expect((last?.xMm ?? 0) + (last?.widthMm ?? 0)).toBeCloseTo(612, 9);
    expect((last?.yMm ?? 0) + (last?.heightMm ?? 0)).toBeCloseTo(1000, 9);
  });

  it('labels each leftover with its axis', () => {
    expect(grid.leftovers).toHaveLength(1);
    expect(grid.leftovers[0]).toMatchObject({ axis: 'width', used: 'spread', fullPieces: 3 });
  });

  it('passes each axis its own leftover choice', () => {
    const chosen = layoutGrid({
      widthMm: 612,
      heightMm: 612,
      maxPieceWidthMm: 200,
      maxPieceHeightMm: 200,
      minPieceMm: 30,
      jointMm: 5,
      jointSpreadMm: 3,
      width: { mode: 'full-plus-filler', filler: 'end', leftover: 'equal' },
      height: { mode: 'full-plus-filler', filler: 'end', leftover: 'shorten' },
    });
    expect(chosen.columns).toEqual([149.25, 149.25, 149.25, 149.25]);
    expect(chosen.rows).toEqual([200, 200, 167, 30]);
  });
});
