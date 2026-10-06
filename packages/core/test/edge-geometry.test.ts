// Backlog item track-edge (#11): the edge strip as a solid. A block as wide as the track
// (less the clearance) and as tall as the track is deep, with the joint's slot at the top
// taking the panel's edge (Q65, Q69). In the wall it sits around the panel, which lies
// from z = 0 to its thickness; downloaded, it stands on its base with the slot open
// upward, so nothing overhangs (Q53).
import type { Manifold } from 'manifold-3d';
import { describe, expect, it } from 'vitest';
import { edgeStripSolid } from '../src/edge-geometry.js';
import { loadEngine } from '../src/engine.js';
import type { Engine } from '../src/engine.js';
import { DEFAULT_JOINT } from '../src/joint.js';

const T = 3; // panel thickness
const L = 100;
const PROFILE = { widthMm: 14, heightMm: 10 };
const VOLUME = L * (14 * 10 - (T + 0.4) * 8); // the block less the slot

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

// Centred on the panel's mid-plane: 1.5 mm, 7 mm either side.
const Z = [1.5 - 7, 1.5 + 7];

describe('edgeStripSolid', () => {
  it('along the bottom edge: the slot opens upward, centred on the panel', async () => {
    const engine = await loadEngine();
    const s = edgeStripSolid(engine, L, PROFILE, DEFAULT_JOINT, T, 'bottom');
    expect(bounds(s)).toEqual([0, 0, Z[0], L, 10, Z[1]]);
    expect(s.volume()).toBeCloseTo(VOLUME, 6);
    expect(s.genus()).toBe(0);
    s.delete();
  });

  it.each([
    ['bottom', [0, 0, Z[0], L, 10, Z[1]]],
    ['top', [0, 0, Z[0], L, 10, Z[1]]],
    ['left', [0, 0, Z[0], 10, L, Z[1]]],
    ['right', [0, 0, Z[0], 10, L, Z[1]]],
  ] as const)('along the %s edge it lies along that edge', async (pose, expected) => {
    const engine = await loadEngine();
    const s = edgeStripSolid(engine, L, PROFILE, DEFAULT_JOINT, T, pose);
    expect(bounds(s)).toEqual(expected);
    expect(s.volume()).toBeCloseTo(VOLUME, 6);
    s.delete();
  });

  it('the panel edge slides in with the fit to spare, from the side the slot faces', async () => {
    const engine = await loadEngine();
    // Planned 6.5 mm into the 8 mm slot (Q56): the panel's edge 6.5 mm below the mouth.
    const cases = [
      ['bottom', [0, 10 - 6.5, 0], [L, 60, T]],
      ['top', [0, -50, 0], [L, 6.5, T]],
      ['left', [10 - 6.5, 0, 0], [60, L, T]],
      ['right', [-50, 0, 0], [6.5, L, T]],
    ] as const;
    for (const [pose, min, max] of cases) {
      const s = edgeStripSolid(engine, L, PROFILE, DEFAULT_JOINT, T, pose);
      expect(overlap(s, box(engine, [...min], [...max]))).toBeCloseTo(0, 6);
      s.delete();
    }
    // Controls: past the slot's bottom, or thicker than the slot, the panel hits the strip.
    const s = edgeStripSolid(engine, L, PROFILE, DEFAULT_JOINT, T, 'bottom');
    expect(overlap(s, box(engine, [0, 2, 0], [L, 60, T]))).toBeCloseTo(0, 6); // fully home
    expect(overlap(s, box(engine, [0, 1.9, 0], [L, 60, T]))).toBeGreaterThan(0);
    expect(overlap(s, box(engine, [0, 3.5, -0.3], [L, 60, T + 0.3]))).toBeGreaterThan(0);
    s.delete();
  });

  it('downloaded, it stands on its whole base with the slot open upward (Q53)', async () => {
    const engine = await loadEngine();
    const s = edgeStripSolid(engine, L, PROFILE, DEFAULT_JOINT, T, 'print');
    expect(bounds(s)).toEqual([0, 0, 0, L, 14, 10]);
    expect(s.volume()).toBeCloseTo(VOLUME, 6);
    expect(s.slice(0.05).area()).toBeCloseTo(L * 14, 4); // the whole base on the bed
    expect(s.slice(9.95).area()).toBeCloseTo(L * (14 - (T + 0.4)), 4); // two walls at the top
    s.delete();
  });

  it('refuses a strip too narrow to keep walls as thick as the joint’s flanges', async () => {
    const engine = await loadEngine();
    expect(() => edgeStripSolid(engine, L, { widthMm: 6.5, heightMm: 10 }, DEFAULT_JOINT, T, 'print')).toThrow(
      RangeError,
    );
    expect(() => edgeStripSolid(engine, 0, PROFILE, DEFAULT_JOINT, T, 'print')).toThrow(RangeError);
  });
});
