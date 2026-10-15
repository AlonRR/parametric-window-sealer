// The Honeycomb Storage Wall (organiser-hsw, #37): a board matching the author's own wall, 8 mm
// thick. Hexagonal cells 20 mm across their flats, the flats at the top and bottom, 23.6 mm apart;
// from the room face each opening has a chamfer, runs 20 mm across to 5.1 mm in, widens to 22 mm by
// 6 mm in, and stays 22 mm to the back: the ledge the inserts' clips catch behind.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  EXAMPLE_PARAMS,
  HSW,
  ORGANISERS,
  buildPiecesWith,
  describePlan,
  layoutGrid,
  loadEngine,
  organiserOpenings,
  planWall,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.04) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the Honeycomb Storage Wall', () => {
  it('its board and its lattice: neighbours 23.6 mm apart', () => {
    expect(HSW).toMatchObject({ kind: 'hsw', boardMm: 8, pitchYMm: 11.8, heightMm: 22 });
    expect(HSW.pitchXMm).toBeCloseTo(23.6 * Math.sqrt(3), 9);
    expect(HSW.rowShiftMm).toBeCloseTo((23.6 * Math.sqrt(3)) / 2, 9);
    expect(HSW.widthMm).toBeCloseTo(44 / Math.sqrt(3), 9);
    expect(ORGANISERS.map((o) => o.kind)).toEqual(['skadis', 'opengrid', 'hsw']);
  });

  it('one cell: 20 mm across its flats, the flats at the top and bottom, a ledge 5.1 mm in', () => {
    const cut = HSW.cut(engine);
    // Whether the cell is open at a point, at a depth from the room face (z = 8 at the face).
    const open = (x: number, y: number, depth: number) => probe(cut, x, y, 8 - depth) > 0;
    try {
      // 20 mm between the flats at the top and bottom, through the front; its corners 11.55 mm out.
      for (const depth of [1, 3, 5]) {
        expect(open(0, 9.9, depth)).toBe(true);
        expect(open(0, 10.1, depth)).toBe(false);
        expect(open(11.4, 0, depth)).toBe(true);
        expect(open(11.7, 0, depth)).toBe(false);
      }
      // 22 mm across behind the ledge, to the back face: not the 21.8 mm some versions use.
      for (const depth of [6.1, 7, 7.9]) {
        expect(open(0, 10.95, depth)).toBe(true);
        expect(open(0, 11.1, depth)).toBe(false);
      }
      expect(open(0, 10.5, 5)).toBe(false); // the ledge, in front of the wider part
      // The chamfer at the room face: 20.8 mm across there.
      expect(open(0, 10.3, 0.05)).toBe(true);
      expect(open(0, 10.3, 0.6)).toBe(false);
      // Through the board and 1 mm past both faces.
      const box = cut.boundingBox();
      expect(box.min[2]).toBeCloseTo(-1, 6);
      expect(box.max[2]).toBeCloseTo(9, 6);
    } finally {
      cut.delete();
    }
  });

  it('whole cells on the lattice centred on the wall: straight up 23.6 mm, and beside at 30°', () => {
    const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };
    const at = organiserOpenings(HSW, [100, 100], piece, 10);
    const has = (x: number, y: number) => at.some(([ax, ay]) => Math.abs(ax - x) < 1e-6 && Math.abs(ay - y) < 1e-6);
    expect(has(100, 100)).toBe(true);
    expect(has(100, 123.6)).toBe(true);
    expect(has(100 + 23.6 * Math.cos(Math.PI / 6), 100 + 11.8)).toBe(true);
    expect(has(100 + 11.8, 100)).toBe(false);
    for (const [x, y] of at) {
      expect(x - HSW.widthMm / 2).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(y + 11).toBeLessThanOrEqual(190 + 1e-9);
    }
  });

  it('a piece with the board: raised to 8 mm inside its border, every cell through it', () => {
    const plan = layoutGrid({
      widthMm: 200,
      heightMm: 200,
      maxPieceWidthMm: 200,
      maxPieceHeightMm: 200,
      minPieceMm: 34,
      width: { mode: 'equal' },
      height: { mode: 'equal' },
    });
    const cells = organiserOpenings(HSW, [100, 100], { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 }, 10).length;
    const built = buildPiecesWith(
      engine,
      plan,
      3,
      [],
      { organiser: HSW, borderMm: 10 },
      undefined,
      undefined,
      () => false,
    );
    const solid = built[0]?.solid;
    if (solid === undefined) throw new Error('no piece');
    try {
      expect(cells).toBeGreaterThan(20);
      expect(solid.boundingBox().max[2]).toBeCloseTo(8, 6);
      expect(solid.genus()).toBe(cells);
    } finally {
      for (const b of built) b.solid.delete();
    }
  });

  it('the setting and the plan', () => {
    expect(read({ fill: 'hsw' }).fill.kind).toBe('hsw');
    expect(errors({ fill: 'hsw', thicknessMm: '9' })).toEqual({
      fill:
        'Honeycomb Storage Wall inserts fit a board 8 mm thick: make the pieces at most 8 mm thick, or choose ' +
        'another fill.',
    });
    const p = read({ fill: 'hsw' });
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: a Honeycomb Storage Wall board: hexagonal cells 20 mm across their flats, flats at the top and ' +
        'bottom, 23.6 mm apart, each widening to 22 mm behind a ledge 5.1 mm in, in a board 8 mm thick, raised ' +
        '5 mm on the room side inside each piece’s border; cut through: air passes through the wall.',
    );
  });
});
