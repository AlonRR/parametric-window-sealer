// Backlog item connector-strip (#10): the strip and the cross piece as solids. An H-profile
// strip proud of both faces (Q50) whose slots take the panel's full edge with the fit as
// clearance (Q51); a cross piece the strip's width square with a + shaped web (Q57). In the
// wall they sit around the panel (z from 0 to the thickness); downloaded, they stand on
// their flanges (Q53), so no part of them overhangs.
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine';
import type { Engine } from '../src/engine';
import { DEFAULT_JOINT } from '../src/joint';
import { crossSolid, stripSolid } from '../src/joint-geometry';
import type { Manifold } from 'manifold-3d';

const T = 3; // panel thickness
const W = 18; // strip width: two 8 mm slots and a 2 mm web
const THICK = 6.6; // 3 + 2 x 0.2 + 2 x 1.6
const L = 100;

const STRIP_VOLUME = L * (2 * 1.6 * W + 2 * (T + 0.4));
const CROSS_VOLUME = 2 * 1.6 * W * W + (T + 0.4) * 2 * (2 * W - 2);

const box = (engine: Engine, min: [number, number, number], max: [number, number, number]) =>
  engine.Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]]).translate(min);

function overlap(solid: Manifold, other: Manifold): number {
  const both = solid.intersect(other);
  const v = both.volume();
  both.delete();
  other.delete();
  return v;
}

const bounds = (m: Manifold) => {
  const b = m.boundingBox();
  return [...Array.from(b.min), ...Array.from(b.max)].map((x) => Math.round(x * 1e6) / 1e6);
};

describe('stripSolid', () => {
  it('in the wall, along a vertical joint: around the panel, proud of both faces', async () => {
    const engine = await loadEngine();
    const s = stripSolid(engine, L, DEFAULT_JOINT, T, 'wall-vertical');
    expect(bounds(s)).toEqual([0, 0, -1.8, W, L, T + 1.8]);
    expect(s.volume()).toBeCloseTo(STRIP_VOLUME, 6);
    expect(s.genus()).toBe(0);
    s.delete();
  });

  it('in the wall, along a horizontal joint: the same strip turned', async () => {
    const engine = await loadEngine();
    const s = stripSolid(engine, L, DEFAULT_JOINT, T, 'wall-horizontal');
    expect(bounds(s)).toEqual([0, 0, -1.8, L, W, T + 1.8]);
    expect(s.volume()).toBeCloseTo(STRIP_VOLUME, 6);
    s.delete();
  });

  it('downloaded, it stands on its two flanges (Q53): only their edges touch the bed', async () => {
    const engine = await loadEngine();
    const s = stripSolid(engine, L, DEFAULT_JOINT, T, 'print');
    expect(bounds(s)).toEqual([0, 0, 0, L, THICK, W]);
    expect(s.volume()).toBeCloseTo(STRIP_VOLUME, 6);
    expect(s.slice(0.05).area()).toBeCloseTo(2 * 1.6 * L, 6);
    // Control: lying flat, the whole flange would lie on the bed.
    const flat = stripSolid(engine, L, DEFAULT_JOINT, T, 'wall-vertical').translate([0, 0, 1.8]);
    expect(flat.slice(0.05).area()).toBeCloseTo(W * L, 6);
    s.delete();
    flat.delete();
  });

  it('a panel edge slides into a slot with the fit to spare, as far as the web', async () => {
    const engine = await loadEngine();
    const s = stripSolid(engine, L, DEFAULT_JOINT, T, 'wall-vertical');
    // The right slot runs from the web (x = 10) to the strip's edge (x = 18).
    const panel = (fromX: number, thickness: number) =>
      box(engine, [fromX, 0, (T - thickness) / 2], [fromX + 40, L, (T + thickness) / 2]);
    expect(overlap(s, panel(18 - 6.5, T))).toBeCloseTo(0, 6); // as planned (Q56)
    expect(overlap(s, panel(10, T))).toBeCloseTo(0, 6); // fully home
    expect(overlap(s, panel(10, T + 0.4))).toBeCloseTo(0, 6); // exactly the fit
    // Controls: past the web, or thicker than the slot, and the panel hits the strip.
    expect(overlap(s, panel(9.9, T))).toBeGreaterThan(0);
    expect(overlap(s, panel(10, T + 0.5))).toBeGreaterThan(0);
    s.delete();
  });

  it.each([
    ['zero length', 0],
    ['negative length', -5],
  ])('refuses %s', async (_label, length) => {
    const engine = await loadEngine();
    expect(() => stripSolid(engine, length, DEFAULT_JOINT, T, 'print')).toThrow(RangeError);
  });
});

describe('crossSolid', () => {
  it('in the wall: a square as wide as the strip, around the panel', async () => {
    const engine = await loadEngine();
    const c = crossSolid(engine, DEFAULT_JOINT, T, 'wall');
    expect(bounds(c)).toEqual([0, 0, -1.8, W, W, T + 1.8]);
    expect(c.volume()).toBeCloseTo(CROSS_VOLUME, 6);
    expect(c.genus()).toBe(0);
    c.delete();
  });

  it('takes the four panel corners where they meet, with the fit to spare', async () => {
    const engine = await loadEngine();
    const c = crossSolid(engine, DEFAULT_JOINT, T, 'wall');
    // As planned, each corner is 6.5 mm into the square, from the outside in.
    const corners: [number, number][] = [
      [-40, -40],
      [W - 6.5, -40],
      [-40, W - 6.5],
      [W - 6.5, W - 6.5],
    ];
    for (const [x, y] of corners) {
      expect(overlap(c, box(engine, [x, y, 0], [x + 46.5, y + 46.5, T]))).toBeCloseTo(0, 6);
    }
    // Control: a corner pushed past the web hits it.
    expect(overlap(c, box(engine, [9.9, 9.9, 0], [50, 50, T]))).toBeGreaterThan(0);
    c.delete();
  });

  it('downloaded, it stands on its flanges and one web bar (Q53)', async () => {
    const engine = await loadEngine();
    const c = crossSolid(engine, DEFAULT_JOINT, T, 'print');
    expect(bounds(c)).toEqual([0, 0, 0, W, THICK, W]);
    expect(c.volume()).toBeCloseTo(CROSS_VOLUME, 6);
    expect(c.slice(0.05).area()).toBeCloseTo(2 * 1.6 * W + 2 * (T + 0.4), 6);
    c.delete();
  });
});
