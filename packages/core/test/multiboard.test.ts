// Multiboard (organiser-multiboard, #36): a board matching Multiboard's tiles, 6.2 mm thick, its
// cells 25 mm apart each way. At each cell's centre an octagonal hole, 23.4 mm across its flats at
// both faces and narrowing to 21.4 mm 2 mm in, threaded at 2.5 mm a turn; at each cell's corner a
// round hole 6 mm across, its mouths 8 mm across, threaded at 3.125 mm a turn. Built in full, and
// not offered by the page, the command's help or the MCP server's schema for now.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  EXAMPLE_PARAMS,
  FILL_KINDS,
  MULTIBOARD,
  OFFERED_FILL_KINDS,
  OFFERED_ORGANISERS,
  ORGANISERS,
  SETTINGS,
  boardOpenings,
  buildPiecesWith,
  describePlan,
  layoutGrid,
  loadEngine,
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
const BOARD = 6.2;
// Whether a hole's cut is open at a point, at a height above the outside face (z = 0).
const opener = (cut: Manifold) => (x: number, y: number, z: number) => probe(cut, x, y, z) > 0;
const SMALL = MULTIBOARD.others?.[0];
// The groove's runs along z at one point of a hole's side, scanned in 0.01 mm steps: each run where
// the cut is open, from its first open step to its last.
const runs = (cut: Manifold, x: number, y: number, from: number, to: number): [number, number][] => {
  const found: [number, number][] = [];
  let start: number | undefined;
  for (let i = 0; from + i * 0.01 <= to + 1e-9; i++) {
    const z = from + i * 0.01;
    const isOpen = probe(cut, x, y, z, 0.01) > 0;
    if (isOpen && start === undefined) start = z;
    if (!isOpen && start !== undefined) {
      found.push([start, z - 0.01]);
      start = undefined;
    }
  }
  if (start !== undefined) found.push([start, to]);
  return found;
};
// The run round a height: its middle and its width, each to within the scan's step and the
// probe's reach along a sloping flank.
const runAt = (found: [number, number][], z: number) => {
  const [a, b] = found.find(([from, to]) => from <= z && z <= to) ?? [Number.NaN, Number.NaN];
  return { middle: (a + b) / 2, width: b - a };
};

describe('Multiboard', () => {
  it('its board and its two lattices: the large holes at the cells’ centres, the small at their corners', () => {
    expect(MULTIBOARD).toMatchObject({
      kind: 'multiboard',
      boardMm: 6.2,
      pitchXMm: 25,
      pitchYMm: 25,
      rowShiftMm: 0,
      widthMm: 23.4,
      heightMm: 23.4,
    });
    expect(MULTIBOARD.others).toHaveLength(1);
    expect(SMALL).toMatchObject({ offsetXMm: 12.5, offsetYMm: 12.5, widthMm: 8, heightMm: 8 });
  });

  it('a large hole: octagonal, narrowing from both faces, threaded right-handed at 2.5 mm a turn', () => {
    const cut = MULTIBOARD.cut(engine);
    const open = opener(cut);
    try {
      // Its flats on the axes, 23.4 mm across at both faces, 21.4 mm from 2 mm in.
      for (const z of [0.05, BOARD - 0.05]) {
        expect(open(11.6, 0, z)).toBe(true);
        expect(open(11.8, 0, z)).toBe(false);
        expect(open(0, 11.6, z)).toBe(true);
      }
      for (const z of [2.1, BOARD - 2.1]) {
        expect(open(10.6, 0, z)).toBe(true);
        expect(open(11.4, 0, z)).toBe(false);
      }
      // 1 mm in, half way: 22.4 mm across. Each probe where the thread's groove is not.
      expect(open(11.1, 0, 1)).toBe(true);
      expect(open(11.3, 0, 1)).toBe(false);
      expect(open(-11.1, 0, BOARD - 1)).toBe(true);
      expect(open(-11.3, 0, BOARD - 1)).toBe(false);
      // Its corners at 22.5°: past the thread, open 11.5 mm out.
      const corner = Math.PI / 8;
      expect(open(11.5 * Math.cos(corner), 11.5 * Math.sin(corner), 3.1)).toBe(true);
      // The thread's groove, 11.0 mm out on a flat, where the hole is 21.4 mm across: 1 mm wide each
      // 2.5 mm, its middle at z = 2.5 on the +x flat and a quarter turn higher on the +y flat, a
      // right-handed thread.
      const onX = runs(cut, 11.0, 0, 1.5, 4.7);
      expect(onX).toHaveLength(2);
      expect(runAt(onX, 2.5).middle).toBeCloseTo(2.5, 1);
      expect(runAt(onX, 2.5).width).toBeCloseTo(1, 1);
      expect(onX[1]?.[0]).toBeCloseTo(4.5, 1);
      const onY = runs(cut, 0, 11.0, 1.5, 4.7);
      expect(onY).toHaveLength(1);
      expect(runAt(onY, 3.125).middle).toBeCloseTo(3.125, 1);
      expect(runAt(onY, 3.125).width).toBeCloseTo(1, 1);
      // The groove goes no further out than 11.25 mm.
      expect(open(11.35, 0, 2.5)).toBe(false);
      // Through the board and 1 mm past both faces.
      const box = cut.boundingBox();
      expect(box.min[2]).toBeCloseTo(-1, 6);
      expect(box.max[2]).toBeCloseTo(BOARD + 1, 6);
      expect(box.max[0]).toBeCloseTo(11.7, 6);
      expect(cut.genus()).toBe(0);
    } finally {
      cut.delete();
    }
  });

  it('a small hole: round, its mouths 8 mm across, threaded right-handed at 3.125 mm a turn', () => {
    if (SMALL === undefined) throw new Error('no small hole');
    const cut = SMALL.cut(engine);
    const open = opener(cut);
    try {
      // 8 mm across at both faces, 6 mm from 1 mm in: a 45° mouth.
      for (const z of [0.05, BOARD - 0.05]) {
        expect(open(3.85, 0, z)).toBe(true);
        expect(open(4.05, 0, z)).toBe(false);
      }
      expect(open(3.45, 0, 0.5)).toBe(true);
      expect(open(3.6, 0, 0.5)).toBe(false);
      expect(open(2.9, 0, 3.1)).toBe(true);
      // The groove, 3.2 mm out: 1.75 mm wide each 3.125 mm, its middle at z = 3.125 at +x and a
      // quarter turn higher at +y.
      const onX = runs(cut, 3.2, 0, 1, 5.2);
      expect(onX).toHaveLength(1);
      expect(runAt(onX, 3.125).middle).toBeCloseTo(3.125, 1);
      expect(runAt(onX, 3.125).width).toBeCloseTo(1.75, 1);
      // At +y the groove before it, its middle at 0.781, reaches past the mouth to 1.656.
      const onY = runs(cut, 0, 3.2, 1, 5.2);
      expect(onY).toHaveLength(2);
      expect(onY[0]?.[1]).toBeCloseTo(1.656, 1);
      expect(runAt(onY, 3.906).middle).toBeCloseTo(3.906, 1);
      expect(runAt(onY, 3.906).width).toBeCloseTo(1.75, 1);
      // No further out than 3.5 mm.
      expect(open(3.6, 0, 3.125)).toBe(false);
      const box = cut.boundingBox();
      expect(box.min[2]).toBeCloseTo(-1, 6);
      expect(box.max[2]).toBeCloseTo(BOARD + 1, 6);
      expect(cut.genus()).toBe(0);
    } finally {
      cut.delete();
    }
  });

  it('whole holes of both kinds in a piece, on lattices centred on the wall', () => {
    const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };
    const [large, small, ...more] = boardOpenings(MULTIBOARD, [100, 100], piece, 10);
    expect(more).toEqual([]);
    // Large: 25 to 175 mm each way, seven by seven. Small: 37.5 to 162.5, six by six.
    expect(large?.at).toHaveLength(49);
    expect(large?.at).toContainEqual([100, 100]);
    expect(large?.at).toContainEqual([25, 175]);
    expect(small?.at).toHaveLength(36);
    expect(small?.at).toContainEqual([112.5, 112.5]);
    expect(small?.at).toContainEqual([37.5, 162.5]);
    expect(small?.at).not.toContainEqual([12.5, 12.5]);
    // Clear of a port, as every board's openings are.
    const port = boardOpenings(MULTIBOARD, [100, 100], piece, 10, { xMm: 100, yMm: 100, radiusMm: 30 });
    expect(port[0]?.at).not.toContainEqual([100, 100]);
    expect(port[1]?.at).not.toContainEqual([112.5, 112.5]);
    expect(port[1]?.at).toContainEqual([137.5, 137.5]);
  });

  it('a piece with the board: raised to 6.2 mm inside its border, every hole of both kinds through it', () => {
    const plan = layoutGrid({
      widthMm: 200,
      heightMm: 200,
      maxPieceWidthMm: 200,
      maxPieceHeightMm: 200,
      minPieceMm: 34,
      width: { mode: 'equal' },
      height: { mode: 'equal' },
    });
    const built = buildPiecesWith(
      engine,
      plan,
      3,
      [],
      { organiser: MULTIBOARD, borderMm: 10 },
      undefined,
      undefined,
      () => false,
    );
    const solid = built[0]?.solid;
    if (solid === undefined) throw new Error('no piece');
    try {
      expect(solid.boundingBox().max[2]).toBeCloseTo(6.2, 6);
      expect(solid.genus()).toBe(49 + 36);
      // The border stays as thick as the piece; the board stands inside it.
      expect(probe(solid, 5, 100, 4)).toBe(0);
      expect(probe(solid, 5, 100, 1.5)).toBeGreaterThan(0);
      expect(probe(solid, 100, 100, 3)).toBe(0); // a large hole
      expect(probe(solid, 112.5, 112.5, 3)).toBe(0); // a small one
      expect(probe(solid, 109, 109, 3)).toBeGreaterThan(0); // the web between them, 12.7 mm out
    } finally {
      for (const b of built) b.solid.delete();
    }
  });

  it('the setting by name, the board’s thickness, a piece of its own, and the plan', () => {
    expect(read({ fill: 'multiboard' }).fill.kind).toBe('multiboard');
    expect(errors({ fill: 'multiboard', thicknessMm: '7' })).toEqual({
      fill: 'Multiboard parts fit a board 6.2 mm thick: make the pieces at most 6.2 mm thick, or choose another fill.',
    });
    expect(read({ pieceFills: '2,1=multiboard' }).pieceFills).toEqual([{ column: 2, row: 1, kind: 'multiboard' }]);
    const p = read({ fill: 'multiboard' });
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: a Multiboard board: octagonal holes 23.4 mm across with a thread of 2.5 mm a turn at the cells’ ' +
        'centres, and round holes 6 mm across with a thread of 3.125 mm a turn at their corners, 25 mm apart each ' +
        'way, as Multiboard’s tiles, in a board 6.2 mm thick, raised 3.2 mm on the room side inside each piece’s ' +
        'border; cut through: air passes through the wall.',
    );
  });
});

describe('hidden for now: built, but not offered', () => {
  it('in the library’s lists, and read by name', () => {
    expect(ORGANISERS.map((o) => o.kind)).toContain('multiboard');
    expect(FILL_KINDS).toContain('multiboard');
    expect(MULTIBOARD.hidden).toBe(true);
    expect(OFFERED_ORGANISERS.map((o) => o.kind)).toEqual(['skadis', 'opengrid', 'hsw']);
    expect(OFFERED_FILL_KINDS).not.toContain('multiboard');
    expect(OFFERED_FILL_KINDS).toEqual(FILL_KINDS.filter((k) => k !== 'multiboard'));
  });

  it('not among the fill setting’s choices or in its help, which the command and the server list', () => {
    const fill = SETTINGS.find((s) => s.field === 'fill');
    expect(fill?.values).toEqual(OFFERED_FILL_KINDS);
    expect(fill?.help).not.toMatch(/multiboard/i);
    expect(fill?.help).toContain('a Honeycomb Storage Wall board');
  });
});
