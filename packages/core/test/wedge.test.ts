// The wedge a tilted sash leaves (sash-wedge, #159; docs/research/sash-wedge.md): from the
// opening W × H and the gap d at the top, the sash's tilt; the strip across the top, W by the chord
// from the frame head to the sash's top; and each side triangle, its legs H, its base the chord,
// the edge strips along its legs meeting near the hinge, and a chain of pieces from there up.
import { describe, expect, it } from 'vitest';
import { tiltWedge, tiltWedgeProblem } from '../src/index.js';

const LIMITS = { edgeStripMm: 15, maxPieceMm: 200, jointMm: 5, minPieceMm: 20 };
const SASH = { widthMm: 800, heightMm: 1200, gapMm: 150 };

describe('the tilted wedge', () => {
  it('the sash’s tilt and the strip across the top', () => {
    const w = tiltWedge(SASH, LIMITS);
    expect(w.tiltDeg).toBeCloseTo((Math.asin(150 / 1200) * 180) / Math.PI, 9);
    expect(w.tiltDeg).toBeCloseTo(7.18, 2);
    // The chord from the frame head to the sash's top: 2H·sin(α/2).
    expect(w.top.lengthMm).toBe(800);
    expect(w.top.depthMm).toBeCloseTo(150.3, 1);
  });

  it('each side triangle: legs H, base the chord, its axis H·cos(α/2)', () => {
    const { side, top } = tiltWedge(SASH, LIMITS);
    expect(side.legMm).toBe(1200);
    expect(side.baseMm).toBeCloseTo(top.depthMm, 9);
    expect(side.axisMm).toBeCloseTo(1197.6, 1);
    // Its width at a distance along the axis grows from nothing at the hinge to the base.
    expect(side.widthAtMm(0)).toBe(0);
    expect(side.widthAtMm(side.axisMm)).toBeCloseTo(side.baseMm, 9);
  });

  it('the leg strips meet near the hinge; a chain of pieces from there, a joint short of the top', () => {
    const { side } = tiltWedge(SASH, LIMITS);
    // Strips 15 mm wide square to the legs meet on the axis 15 / sin(α/2) from the hinge: 239.5 mm.
    expect(side.tipMm).toBeCloseTo(239.5, 1);
    expect(side.widthAtMm(side.tipMm)).toBeCloseTo(30 / Math.cos(Math.asin(150 / 1200) / 2), 9);
    const { pieces, jointsMm } = side.chain;
    // From the tip, the pieces and their joints, and a joint's room for the corner at the top.
    const filled =
      side.tipMm + pieces.reduce((a, b) => a + b, 0) + jointsMm.reduce((a, b) => a + b, 0) + LIMITS.jointMm;
    expect(filled).toBeCloseTo(side.axisMm, 6);
    // 953.1 mm in the fewest equal pieces no longer than 200 mm: 5.
    expect(pieces).toHaveLength(5);
    for (const p of pieces) expect(p).toBeLessThanOrEqual(200);
    expect(jointsMm).toEqual([5, 5, 5, 5]);
  });
});

describe('what is wrong with a tilted wedge', () => {
  it('a gap too small for the top strip’s two edge strips, or as large as the opening is tall', () => {
    expect(tiltWedgeProblem(SASH, LIMITS)).toBeUndefined();
    expect(tiltWedgeProblem({ ...SASH, gapMm: 25 }, LIMITS)).toBe(
      'The gap at the top is 25 mm; it needs at least 50 mm, for an edge strip each side of the top strip and ' +
        'a piece between them.',
    );
    expect(tiltWedgeProblem({ ...SASH, gapMm: 1200 }, LIMITS)).toBe(
      'The gap at the top is 1200 mm: a tilted sash’s top moves in less than the window is tall.',
    );
    expect(tiltWedgeProblem({ ...SASH, gapMm: 0 }, LIMITS)).toBe('Enter the gap at the top, in mm, greater than 0.');
  });
});
