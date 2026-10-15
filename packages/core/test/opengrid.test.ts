// openGrid (organiser-opengrid, #34): a board matching openGrid's Full board, 6.8 mm thick, its cells
// 28 mm apart each way. Each cell is an opening 25 mm across with 45° corners and a 0.4 mm chamfer at
// both faces, and a groove 26.4 mm across from 2.4 to 4.4 mm in from either face, where a snap's
// sides click in; its corners are cut further than the opening's.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  EXAMPLE_PARAMS,
  OPENGRID,
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

describe('openGrid', () => {
  it('its board and its lattice', () => {
    expect(OPENGRID).toMatchObject({
      kind: 'opengrid',
      boardMm: 6.8,
      pitchXMm: 28,
      pitchYMm: 28,
      rowShiftMm: 0,
      widthMm: 26.4,
      heightMm: 26.4,
    });
    expect(ORGANISERS.map((o) => o.kind)).toContain('opengrid');
  });

  it('one cell: the opening, its chamfer at both faces, and the groove behind them', () => {
    const cut = OPENGRID.cut(engine);
    // Whether the cell is open at a point, at a depth from the room face (z = 6.8 at the face).
    const open = (x: number, y: number, depth: number) => probe(cut, x, y, 6.8 - depth) > 0;
    try {
      // The opening 25 mm across, from both faces.
      for (const depth of [1, 5.9]) {
        expect(open(12.4, 0, depth)).toBe(true);
        expect(open(12.6, 0, depth)).toBe(false);
      }
      // The groove, 26.4 mm across, 2.4 to 4.4 mm in, and narrower either side of it.
      for (const depth of [2.5, 3.4, 4.3]) expect(open(13.1, 0, depth)).toBe(true);
      expect(open(13.3, 0, 3.4)).toBe(false);
      for (const depth of [2.2, 4.6]) expect(open(13.1, 0, depth)).toBe(false);
      expect(open(0, 13.1, 3.4)).toBe(true);
      // The chamfer: 25.8 mm across at each face, 25 mm by 0.4 mm in.
      expect(open(12.75, 0, 0.1)).toBe(true);
      expect(open(12.75, 0, 0.6)).toBe(false);
      expect(open(12.75, 0, 6.7)).toBe(true);
      // 45° corners: the opening's sides run 8.19 mm either way of their middles, the groove's 6.92.
      expect(open(10.2, 10.2, 1)).toBe(true);
      expect(open(10.5, 10.5, 1)).toBe(false);
      expect(open(9.9, 9.9, 3.4)).toBe(true);
      expect(open(10.2, 10.2, 3.4)).toBe(false);
      // Through the board and 1 mm past both faces.
      const box = cut.boundingBox();
      expect(box.min[2]).toBeCloseTo(-1, 6);
      expect(box.max[2]).toBeCloseTo(7.8, 6);
      expect(box.max[0]).toBeCloseTo(13.2, 6);
    } finally {
      cut.delete();
    }
  });

  it('whole cells 28 mm apart, on the lattice centred on the wall', () => {
    const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };
    const at = organiserOpenings(OPENGRID, [100, 100], piece, 10);
    // 44 to 156 mm each way: five cells across and five up.
    expect(at).toHaveLength(25);
    expect(at).toContainEqual([100, 100]);
    expect(at).toContainEqual([44, 156]);
  });

  it('a piece with an openGrid board: raised to 6.8 mm inside its border, every cell through it', () => {
    const plan = layoutGrid({
      widthMm: 200,
      heightMm: 200,
      maxPieceWidthMm: 200,
      maxPieceHeightMm: 200,
      minPieceMm: 34,
      width: { mode: 'equal' },
      height: { mode: 'equal' },
    });
    const cut = OPENGRID.cut(engine);
    const slab = engine.Manifold.cube([40, 40, 6.8]).translate([-20, -20, 0]);
    const inBoard = cut.intersect(slab);
    const cell = inBoard.volume();
    for (const m of [cut, slab, inBoard]) m.delete();
    const built = buildPiecesWith(
      engine,
      plan,
      3,
      [],
      { organiser: OPENGRID, borderMm: 10 },
      undefined,
      undefined,
      () => false,
    );
    const solid = built[0]?.solid;
    if (solid === undefined) throw new Error('no piece');
    try {
      expect(solid.boundingBox().max[2]).toBeCloseTo(6.8, 6);
      expect(solid.genus()).toBe(25);
      expect(solid.volume()).toBeCloseTo(200 * 200 * 3 + 180 * 180 * 3.8 - 25 * cell, 0);
    } finally {
      for (const b of built) b.solid.delete();
    }
  });

  it('the setting and the plan', () => {
    expect(read({ fill: 'opengrid' }).fill.kind).toBe('opengrid');
    expect(errors({ fill: 'opengrid', thicknessMm: '7' })).toEqual({
      fill: 'openGrid snaps fit a board 6.8 mm thick: make the pieces at most 6.8 mm thick, or choose another fill.',
    });
    const p = read({ fill: 'opengrid' });
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: an openGrid board: cells 25 mm across with a groove 26.4 mm across behind each face, 28 mm apart ' +
        'each way, as openGrid’s Full board, in a board 6.8 mm thick, raised 3.8 mm on the room side inside each ' +
        'piece’s border; cut through: air passes through the wall.',
    );
  });
});
