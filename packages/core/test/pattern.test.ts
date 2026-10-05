// The pattern framework (backlog item patterns-core, #20; Q133 to Q138). A tile repeated across
// the whole wall, so the pattern lines up across the joints (Q135); inside a solid border of
// the slot depth plus 2 mm on each piece (Q134), and a solid ring round a hose port's collar
// (Q137); openings cut short at a border, a sliver thinner than the tile's bars left solid
// (Q135); cut through, or cut into the room side to a percentage of the thickness (Q136, Q138).
// The first real pattern is the grid (#16); these tests use a test tile.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLAR,
  DEFAULT_JOINT,
  DEFAULT_RELIEF_PCT,
  EXAMPLE_PARAMS,
  buildPieces,
  collarOuterMm,
  loadEngine,
  patternBorderMm,
  patternedPanel,
  pieceOpenings,
  planWall,
  plainPanel,
  reliefDepthMm,
} from '../src/index.js';
import type { CrossSection } from 'manifold-3d';
import type { PatternTile } from '../src/index.js';

// 12 mm square openings every 20 mm: bars of 8 mm.
const SQUARES: PatternTile = {
  pitchXMm: 20,
  pitchYMm: 20,
  rowShiftMm: 0,
  openings: [
    [
      [-6, -6],
      [6, -6],
      [6, 6],
      [-6, 6],
    ],
  ],
  barMm: 8,
};

// Each opening's centre, in the frame given.
const centres = (cs: CrossSection, dx = 0, dy = 0) =>
  cs.toPolygons().map((ring) => {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2 + dx, (Math.min(...ys) + Math.max(...ys)) / 2 + dy];
  });

describe('the rules', () => {
  it('a border of the slot depth plus 2 mm, following the joint (Q134)', () => {
    expect(patternBorderMm(DEFAULT_JOINT)).toBe(10);
    expect(patternBorderMm({ ...DEFAULT_JOINT, slotMm: 12 })).toBe(14);
  });

  it('a relief half the panel deep to start with (Q138)', () => {
    expect(DEFAULT_RELIEF_PCT).toBe(50);
    expect(reliefDepthMm(3, 50)).toBe(1.5);
    expect(reliefDepthMm(4, 25)).toBe(1);
  });
});

describe('pieceOpenings', () => {
  const piece = { xMm: 0, yMm: 0, widthMm: 100, heightMm: 100 };

  it('inside a 10 mm border: openings cut to 6 mm, under a bar, stay solid, leaving 3 × 3 whole ones', async () => {
    const engine = await loadEngine();
    // Tiles centred on the wall's centre, 50 mm: at 10, 30, 50, 70 and 90 mm each way.
    const o = pieceOpenings(engine, SQUARES, [50, 50], piece, 10);
    expect(o.numContour()).toBe(9);
    expect(o.area()).toBeCloseTo(9 * 144, 6);
    const b = o.bounds();
    expect([b.min[0], b.min[1], b.max[0], b.max[1]]).toEqual([24, 24, 76, 76]);
    o.delete();
  });

  it('inside a 5 mm border: those cut to 11 mm, more than a bar, are kept, cut short', async () => {
    const engine = await loadEngine();
    const o = pieceOpenings(engine, SQUARES, [50, 50], piece, 5);
    expect(o.numContour()).toBe(25);
    // 9 whole, 12 cut on one side to 11 × 12 mm, 4 corners cut to 11 × 11 mm.
    expect(o.area()).toBeCloseTo(9 * 144 + 12 * 132 + 4 * 121, 6);
    const b = o.bounds();
    expect([b.min[0], b.min[1], b.max[0], b.max[1]]).toEqual([5, 5, 95, 95]);
    o.delete();
  });

  it('one pattern across the wall: two pieces either side of a joint stay on the same lattice (Q135)', async () => {
    const engine = await loadEngine();
    // Two 100 mm pieces with a 5 mm joint between them: the wall is 205 mm wide.
    const left = { xMm: 0, yMm: 0, widthMm: 100, heightMm: 100 };
    const right = { xMm: 105, yMm: 0, widthMm: 100, heightMm: 100 };
    const centre: [number, number] = [102.5, 50];
    const a = pieceOpenings(engine, SQUARES, centre, left, 10);
    const b = pieceOpenings(engine, SQUARES, centre, right, 10);
    const all = [...centres(a, left.xMm), ...centres(b, right.xMm)];
    expect(all.length).toBeGreaterThan(0);
    for (const [x, y] of all) {
      // Whole openings only here, so each centre is a lattice point.
      expect(Math.abs(((x ?? 0) - 102.5 + 1000) % 20)).toBeCloseTo(0, 6);
      expect(Math.abs(((y ?? 0) - 50 + 1000) % 20)).toBeCloseTo(0, 6);
    }
    a.delete();
    b.delete();
  });

  it('every other row shifted, for brick and hexagon tiles', async () => {
    const engine = await loadEngine();
    const bricks = { ...SQUARES, rowShiftMm: 10 };
    const o = pieceOpenings(engine, bricks, [50, 50], { xMm: 0, yMm: 0, widthMm: 200, heightMm: 100 }, 10);
    const rows = new Map<number, number[]>();
    for (const [x, y] of centres(o)) rows.set(Math.round(y ?? 0), [...(rows.get(Math.round(y ?? 0)) ?? []), x ?? 0]);
    // Row 0 (y = 50) is on the lattice; rows ±1 (y = 30, 70) are shifted by 10 mm.
    for (const x of rows.get(50) ?? []) expect(Math.abs((x - 50 + 1000) % 20)).toBeCloseTo(0, 6);
    for (const y of [30, 70]) {
      expect(rows.get(y)?.length).toBeGreaterThan(0);
      for (const x of rows.get(y) ?? []) expect(Math.abs((x - 60 + 1000) % 20)).toBeCloseTo(0, 6);
    }
    o.delete();
  });

  it('nothing in a piece no wider than its two borders', async () => {
    const engine = await loadEngine();
    const o = pieceOpenings(engine, SQUARES, [10, 50], { xMm: 0, yMm: 0, widthMm: 20, heightMm: 100 }, 10);
    expect(o.isEmpty()).toBe(true);
    o.delete();
  });

  it('a solid ring round a port: nothing within the keep-out circle (Q137)', async () => {
    const engine = await loadEngine();
    const big = { xMm: 0, yMm: 0, widthMm: 300, heightMm: 300 };
    const radius = collarOuterMm(150, DEFAULT_COLLAR) / 2 + 10;
    const o = pieceOpenings(engine, SQUARES, [150, 150], big, 10, { xMm: 150, yMm: 150, radiusMm: radius });
    expect(o.numContour()).toBeGreaterThan(0);
    const disc = engine.CrossSection.circle(radius, 128).translate([150, 150]);
    const inside = o.intersect(disc);
    expect(inside.area()).toBeCloseTo(0, 6);
    for (const m of [o, disc, inside]) m.delete();
  });
});

describe('patternedPanel', () => {
  const size = { widthMm: 100, heightMm: 100, thicknessMm: 3 };

  it('cut through: the openings go right through, one hole each', async () => {
    const engine = await loadEngine();
    const o = pieceOpenings(engine, SQUARES, [50, 50], { xMm: 0, yMm: 0, ...size }, 10);
    const panel = patternedPanel(engine, plainPanel(engine, size), o, 3, 'through', DEFAULT_RELIEF_PCT);
    expect(panel.volume()).toBeCloseTo(100 * 100 * 3 - 9 * 144 * 3, 4);
    expect(panel.genus()).toBe(9);
    panel.delete();
    o.delete();
  });

  it('relief: cut into the room side (+Z) to half the thickness; the outside face stays whole (Q136, Q138)', async () => {
    const engine = await loadEngine();
    const o = pieceOpenings(engine, SQUARES, [50, 50], { xMm: 0, yMm: 0, ...size }, 10);
    const panel = patternedPanel(engine, plainPanel(engine, size), o, 3, 'relief', 50);
    expect(panel.volume()).toBeCloseTo(100 * 100 * 3 - 9 * 144 * 1.5, 4);
    expect(panel.genus()).toBe(0);
    // Below 1.5 mm the panel is whole.
    const slab = engine.Manifold.cube([100, 100, 1.5]);
    const kept = panel.intersect(slab);
    expect(kept.volume()).toBeCloseTo(100 * 100 * 1.5, 4);
    for (const m of [panel, slab, kept, o]) m.delete();
  });

  it('nothing to cut leaves the panel as it was', async () => {
    const engine = await loadEngine();
    const none = engine.CrossSection.compose([]);
    const panel = patternedPanel(engine, plainPanel(engine, size), none, 3, 'through', 50);
    expect(panel.volume()).toBeCloseTo(100 * 100 * 3, 6);
    panel.delete();
    none.delete();
  });
});

describe('buildPieces with a pattern', () => {
  it('every piece patterned inside its border, the port’s piece solid round its collar (Q134, Q137)', async () => {
    const engine = await loadEngine();
    const params = { ...EXAMPLE_PARAMS, ports: [{ hoseMm: 150, column: 2, row: 1 }] };
    const plan = planWall(params);
    const pattern = { tile: SQUARES, style: 'through' as const, reliefPct: 50, borderMm: 10 };
    const plain = buildPieces(engine, plan, 3, params.ports, params.collar);
    const patterned = buildPieces(engine, plan, 3, params.ports, params.collar, undefined, pattern);
    expect(patterned).toHaveLength(plain.length);
    for (const [i, piece] of patterned.entries()) {
      const before = plain[i]?.solid.volume() ?? 0;
      expect(piece.solid.volume(), `piece ${i}`).toBeLessThan(before);
      expect(piece.hoseMm).toBe(plain[i]?.hoseMm);
    }
    // The port's piece: nothing cut within 10 mm of the collar's outside.
    const port = patterned.find((p) => p.hoseMm === 150);
    const cell = plan.pieces.find((c) => c.column === 1 && c.row === 0);
    if (!port || !cell) throw new Error('the port’s piece is missing');
    const radius = collarOuterMm(150, DEFAULT_COLLAR) / 2 + 10;
    const ring = engine.Manifold.cylinder(3, radius, -1, 128).translate([cell.widthMm / 2, cell.heightMm / 2, 0]);
    const plainPort = plain.find((p) => p.hoseMm === 150);
    const a = port.solid.intersect(ring);
    const b = plainPort?.solid.intersect(ring);
    expect(a.volume()).toBeCloseTo(b?.volume() ?? -1, 3);
    for (const m of [a, b, ring]) m?.delete();
    for (const p of [...plain, ...patterned]) p.solid.delete();
  });
});
