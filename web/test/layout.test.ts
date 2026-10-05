// Backlog item layout (#3): divide the opening into a grid (Q11) with a mode per axis,
// place the filler where the user asks or split it for symmetry (Q12), and warn, without
// refusing, when a piece is under the minimum the joint needs (Q12, Q37).
import { describe, expect, it } from 'vitest';
import { divideAxis, layoutGrid } from '../src/layout';
import type { AxisSpec } from '../src/layout';

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
    expect(divideAxis(axis({ lengthMm: 1300, filler: 'middle' })).pieces).toEqual([
      400, 100, 400, 400,
    ]);
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
    expect(divideAxis(axis({ lengthMm: 1200.3, maxPieceMm: 400.1 })).pieces).toEqual([
      400.1, 400.1, 400.1,
    ]);
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
