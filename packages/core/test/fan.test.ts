// The fan mount (fan-mount, #28; Q15, Q16): a square-framed fan from a list, screwed to one
// piece over an opening, its sizes from the makers' own drawings (docs/fan-sizes.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FANS,
  FAN_SCREW_HOLE_MM,
  buildPiecesWith,
  describePlan,
  fanPanel,
  fanPieceMm,
  fittingSource,
  formatFans,
  loadEngine,
  parseFans,
  placedFittings,
  planFiles,
  planWall,
  plainPanel,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();

describe('the fans listed (docs/fan-sizes.md)', () => {
  it('are the four common square frames, with the hole spacing and opening Arctic draws', () => {
    expect(FANS).toEqual([
      { sizeMm: 80, holeSpacingMm: [71.5, 71.5], openingMm: 76.3 },
      { sizeMm: 92, holeSpacingMm: [82.5, 82.5], openingMm: 88.4 },
      { sizeMm: 120, holeSpacingMm: [105, 105], openingMm: 116 },
      // Noctua's 140 mm fans space their holes 124.5 mm apart, Arctic's 125: a slot takes both.
      { sizeMm: 140, holeSpacingMm: [124.5, 125], openingMm: 134.2 },
    ]);
  });

  it('are the table in docs/fan-sizes.md, row for row', () => {
    const doc = readFileSync(new URL('../../../docs/fan-sizes.md', import.meta.url), 'utf8');
    const rows = doc
      .split('\n')
      .filter((line) => /^\| [0-9]/.test(line))
      .map((line) => line.split('|').map((cell) => cell.trim()));
    const fromDoc = rows.map(([, size = '', spacing = '', opening = '']) => {
      const [least = '', most = least] = spacing.split(' to ');
      return { sizeMm: Number(size), holeSpacingMm: [Number(least), Number(most)], openingMm: Number(opening) };
    });
    expect(fromDoc).toHaveLength(4);
    expect(FANS).toEqual(fromDoc);
  });

  it('take a 4.5 mm screw hole in the panel, as Delta’s mounting panel cutout has', () => {
    expect(FAN_SCREW_HOLE_MM).toBe(4.5);
  });

  it('need a piece the frame fits in, clear of the strips as a port is (Q108)', () => {
    expect(fanPieceMm(120, DEFAULT_JOINT)).toBeCloseTo(120 + 2 * (8 + 2), 9);
    expect(fanPieceMm(80, { ...DEFAULT_JOINT, slotMm: 10 })).toBeCloseTo(80 + 2 * (10 + 2), 9);
  });
});

describe('the --fan form', () => {
  it('reads a listed size, optionally with its piece, several separated by spaces', () => {
    expect(parseFans('')).toEqual({ ok: true, fans: [] });
    expect(parseFans('120')).toEqual({ ok: true, fans: [{ sizeMm: 120 }] });
    expect(parseFans(' 120@2,1  80@1,3 ')).toEqual({
      ok: true,
      fans: [
        { sizeMm: 120, column: 2, row: 1 },
        { sizeMm: 80, column: 1, row: 3 },
      ],
    });
  });

  it('refuses a size not on the list, naming the ones that are', () => {
    expect(parseFans('100')).toEqual({
      ok: false,
      message: 'Fan 1: 100 mm is not a listed fan size; the sizes are 80, 92, 120 and 140 mm.',
    });
    for (const text of ['120@0,1', '120@2', 'big', '120x120', '-120']) {
      const read = parseFans(text);
      expect(read.ok, text).toBe(false);
    }
  });

  it('writes back what it reads', () => {
    for (const text of ['', '120', '120@2,1', '80 140@3,2']) {
      const read = parseFans(text);
      expect(read.ok).toBe(true);
      if (read.ok) expect(formatFans(read.fans)).toBe(text);
    }
  });
});

describe('the piece with a fan', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };

  it('has the opening and four screw holes through it, centred, and nothing else', () => {
    const fan = FANS[2];
    if (fan === undefined) throw new Error('no 120 mm fan');
    const solid = fanPanel(engine, size, fan);
    const plain = plainPanel(engine, size);
    try {
      // The engine draws circles as polygons, so compare with the same engine's cylinders.
      const cylinder = (d: number) => engine.Manifold.cylinder(3, d / 2, d / 2, 128);
      const [opening, hole] = [cylinder(116), cylinder(FAN_SCREW_HOLE_MM)];
      const expected = plain.volume() - opening.volume() - 4 * hole.volume();
      expect(solid.volume()).toBeCloseTo(expected, 3);
      expect(solid.genus()).toBe(5);
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], min[2], max[0], max[1], max[2]]).toEqual([0, 0, 0, 200, 200, 3]);
      // A screw hole's centre, 52.5 mm from the centre each way, is open; the panel just
      // outside the hole is not.
      const probe = (x: number, y: number) =>
        engine.Manifold.cube([0.2, 0.2, 1], true).translate([x, y, 1.5]).intersect(solid).volume();
      expect(probe(100 + 52.5, 100 + 52.5)).toBe(0);
      expect(probe(100 + 52.5 + 3, 100 + 52.5)).toBeGreaterThan(0);
      for (const m of [opening, hole]) m.delete();
    } finally {
      solid.delete();
      plain.delete();
    }
  });

  it('slots the 140 mm fan’s holes so both makers’ spacings fit', () => {
    const fan = FANS[3];
    if (fan === undefined) throw new Error('no 140 mm fan');
    const big = { widthMm: 220, heightMm: 220, thicknessMm: 3 };
    const solid = fanPanel(engine, big, fan);
    try {
      const probe = (x: number, y: number) =>
        engine.Manifold.cube([0.2, 0.2, 1], true)
          .translate([110 + x, 110 + y, 1.5])
          .intersect(solid)
          .volume();
      for (const spacing of [124.5, 124.75, 125]) expect(probe(spacing / 2, spacing / 2), `${spacing}`).toBe(0);
      expect(probe(125 / 2 + 3, 125 / 2)).toBeGreaterThan(0);
      expect(solid.genus()).toBe(5);
    } finally {
      solid.delete();
    }
  });
});

describe('a fan in the wall', () => {
  const example = toFormValues({
    ...EXAMPLE_PARAMS,
    openingWidthMm: 1200,
    openingHeightMm: 900,
    printer: { kind: 'custom', widthMm: 300, heightMm: 300 },
  });
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts with none, and reads them from the fans field', () => {
    expect(EXAMPLE_PARAMS.fans).toEqual([]);
    expect(example.fans).toBe('');
    const r = read({ fans: '120' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.fans).toEqual([{ sizeMm: 120, column: 2, row: 1 }]);
  });

  it('is refused in a piece too small for its frame, or one another fitting has', () => {
    // A 150 mm printer makes every piece smaller than the 160 mm a 140 mm fan needs.
    const small = read({ customWidthMm: '150', customHeightMm: '150', fans: '140' });
    expect(small.ok).toBe(false);
    if (!small.ok) expect(small.errors.fans).toMatch(/^Fan 1: A 140 mm fan needs a piece at least 160 × 160 mm; /);
    const shared = read({ ports: '150@2,1', fans: '120@2,1' });
    expect(shared.ok).toBe(false);
    if (!shared.ok) {
      expect(shared.errors.fans).toBe('Fan 1 and port 1 are both in column 2, row 1; give each its own piece.');
    }
    const twice = read({ fans: '120@3,2 80@3,2' });
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.errors.fans).toBe('Fans 1 and 2 are both in column 3, row 2; give each its own piece.');
  });

  it('reads back what it writes', () => {
    const r = read({ fans: '120 80@3,2' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('is built into its piece, named in its file and given a line in the plan', () => {
    const r = read({ fans: '120@3,2' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const params: Params = r.params;
    const plan = planWall(params);
    const built = buildPiecesWith(engine, plan, 3, placedFittings(fittingSource(params)));
    try {
      const piece = built.find((b) => b.column === 2 && b.row === 1);
      expect(piece?.tag).toBe('-fan-120');
      expect(piece?.solid.genus()).toBe(5);
      expect(built.filter((b) => b.solid.genus() > 0)).toHaveLength(1);
    } finally {
      for (const b of built) b.solid.delete();
    }
    const names = planFiles(params, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.endsWith('-fan-120.stl'))).toEqual([expect.stringMatching(/^piece-c3-r2-/)]);
    expect(describePlan(plan, params).fans).toEqual([
      'Fan: a 120 mm fan, in column 3, row 2: a 116 mm opening, and four 4.5 mm screw holes 105 mm apart.',
    ]);
  });
});
