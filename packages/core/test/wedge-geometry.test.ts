// A tilted sash's side triangle as printed parts (sash-wedge, #159): an edge strip along each leg
// down to the hinge, meeting the other there; panels between the strips' slots; joint strips
// between the panels, cut along the legs. Assembled in the triangle's own frame, they must not
// overlap, must leave no hole through the face, must stay inside it, and must each fit the printer.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  edgeProfile,
  loadEngine,
  tapeFit,
  tiltWedge,
  wedgeSideSolids,
  EXAMPLE_TRACK,
  PIN_SLOT_MM,
  pinDepthMm,
  stripWidthMm,
} from '../src/index.js';
import type { EdgeParams, JointParams, SealParams } from '../src/index.js';
import { EXAMPLE_PARAMS } from '../src/index.js';

const engine = await loadEngine();
const { Manifold: M } = engine;
const PANEL = 3;
const MAX = 200;
const SEAL: SealParams = { ...EXAMPLE_PARAMS.seal, kind: 'tpu' };
const FIT = tapeFit(SEAL);
const EDGES: EdgeParams = {
  window: 'frame',
  roles: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
  track: EXAMPLE_TRACK,
};
const PROFILE = edgeProfile('left', EDGES, DEFAULT_JOINT, FIT);
const WEDGE = tiltWedge(
  { widthMm: 800, heightMm: 1200, gapMm: 150 },
  { edgeStripMm: PROFILE.heightMm, maxPieceMm: MAX, jointMm: 5, minPieceMm: 20 },
);
const half = ((WEDGE.tiltDeg / 2) * Math.PI) / 180;
// Without the ribs, which press into the panels on purpose, nothing may overlap.
const PLAIN: JointParams = { ...DEFAULT_JOINT, gripMm: 0 };
const parts = wedgeSideSolids(engine, WEDGE, PROFILE, PLAIN, PANEL, MAX);
const all: Manifold[] = [...parts.legs, ...parts.panels, ...parts.joints];
const top = WEDGE.side.axisMm - 5; // the corner's room is left at the top

const volumeOf = (m: Manifold) => {
  const v = m.volume();
  m.delete();
  return v;
};

describe('the side triangle’s parts', () => {
  it('as many as the chain and the printer make', () => {
    expect(parts.panels).toHaveLength(WEDGE.side.chain.pieces.length);
    expect(parts.joints).toHaveLength(WEDGE.side.chain.pieces.length - 1);
    // Each leg 1200 mm long, in the fewest segments of at most 200 mm: 6, two legs.
    expect(parts.legs).toHaveLength(12);
  });

  it('no two overlap', () => {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        if (a === undefined || b === undefined) continue;
        expect(volumeOf(a.intersect(b)), `parts ${i} and ${j}`).toBeLessThan(1e-3);
      }
    }
  });

  it('seen through the face, no hole from the hinge to the corner’s room at the top, but the gaskets’ along the legs', () => {
    const out = PROFILE.tape?.standOutMm ?? 0;
    const union = M.union(all);
    let probed = 0;
    try {
      for (let x = 2; x < top; x += 23) {
        // Out to just inside the gaskets' room along each leg; near the hinge it is all theirs.
        const reach = x * Math.tan(half) - (out + 0.05) / Math.cos(half);
        if (reach < 0) continue;
        for (const f of [0, 0.3, 0.6, 0.9, 1]) {
          for (const sign of [1, -1]) {
            const y = sign * f * reach;
            const needle = M.cube([0.05, 0.05, 60], true).translate([x, y, PANEL / 2]);
            expect(volumeOf(needle.intersect(union)), `at x ${x.toFixed(1)}, y ${y.toFixed(2)}`).toBeGreaterThan(0);
            needle.delete();
            probed++;
          }
        }
      }
      expect(probed).toBeGreaterThanOrEqual(500);
    } finally {
      union.delete();
    }
  });

  it('each joint strip’s ribs grip the panels either side of it, and nothing else', () => {
    const ribbed = wedgeSideSolids(engine, WEDGE, PROFILE, DEFAULT_JOINT, PANEL, MAX);
    try {
      ribbed.joints.forEach((strip, i) => {
        for (const panel of [ribbed.panels[i], ribbed.panels[i + 1]]) {
          if (panel === undefined) throw new Error(`no panel beside joint ${i}`);
          expect(volumeOf(strip.intersect(panel)), `joint ${i}`).toBeGreaterThan(1e-3);
        }
        for (const leg of ribbed.legs) expect(volumeOf(strip.intersect(leg))).toBeLessThan(1e-3);
      });
    } finally {
      for (const m of [...ribbed.legs, ...ribbed.panels, ...ribbed.joints]) m.delete();
    }
  });

  it('a pin through each joint strip’s middle, on the axis, through a slot in the panel either side', () => {
    const { pieces, jointsMm } = WEDGE.side.chain;
    const union = M.union(all);
    const solidAt = (x: number, y: number) =>
      volumeOf(
        M.cube([0.1, 0.1, 0.1], true)
          .translate([x, y, PANEL / 2])
          .intersect(union),
      );
    try {
      let at = WEDGE.side.tipMm;
      jointsMm.forEach((gap, i) => {
        at += (pieces[i] ?? 0) + gap;
        const centre = at - gap / 2;
        const inFromSide = stripWidthMm(PLAIN) / 2 - pinDepthMm(PLAIN);
        for (const x of [centre - inFromSide, centre + inFromSide]) {
          expect(solidAt(x, 0), `joint ${i} at x ${x.toFixed(1)}`).toBe(0);
          expect(solidAt(x, PIN_SLOT_MM), `joint ${i} beside its pin`).toBeGreaterThan(0);
        }
      });
    } finally {
      union.delete();
    }
  });

  it('each panel’s slanted edges in the leg strips’ slots, half a slide short of their floors', () => {
    const union = M.union(all);
    const inSlot = PLAIN.slotMm - PLAIN.slideMm / 2;
    const edge = PROFILE.heightMm - inSlot; // in from the leg's face, square to it
    const x = WEDGE.side.tipMm + (WEDGE.side.chain.pieces[0] ?? 0) / 2;
    // In from the upper leg by inMm, square to it, at x along the axis.
    const solidAt = (inMm: number) =>
      volumeOf(
        M.cube([0.1, 0.1, 0.1], true)
          .translate([x, (x * Math.sin(half) - inMm) / Math.cos(half), PANEL / 2])
          .intersect(union),
      );
    try {
      expect(solidAt(edge + 0.5)).toBeGreaterThan(0);
      expect(solidAt(edge - 0.5)).toBe(0);
    } finally {
      union.delete();
    }
  });

  it('nothing outside the legs', () => {
    const union = M.union(all);
    const outline = new engine.CrossSection([
      [
        [0, 0],
        [top + 50, -(top + 50) * Math.tan(half)],
        [top + 50, (top + 50) * Math.tan(half)],
      ],
    ]);
    const inside = outline.extrude(200).translate([0, 0, -100]);
    try {
      expect(inside.volume()).toBeGreaterThan(0);
      expect(volumeOf(union.subtract(inside))).toBeLessThan(1e-3);
    } finally {
      for (const m of [union, inside]) m.delete();
      outline.delete();
    }
  });

  it('each panel fits the printer; each joint and leg segment is no longer than it makes', () => {
    for (const p of parts.panels) {
      const { min, max } = p.boundingBox();
      expect(max[0] - min[0]).toBeLessThanOrEqual(MAX + 1e-6);
      expect(max[1] - min[1]).toBeLessThanOrEqual(MAX + 1e-6);
    }
    for (const j of parts.joints) {
      const { min, max } = j.boundingBox();
      expect(max[1] - min[1]).toBeLessThanOrEqual(MAX + 1e-6);
    }
    for (const leg of parts.legs) {
      const { min, max } = leg.boundingBox();
      expect(Math.hypot(max[0] - min[0], max[1] - min[1])).toBeLessThanOrEqual(MAX + PROFILE.heightMm);
    }
  });

  describe('along each leg, halfway up', () => {
    const tape = PROFILE.tape;
    if (tape === undefined) throw new Error('no gasket');
    const { standOutMm: out, groove } = tape;
    // In from the leg by inMm along its inward normal, at z through the wall.
    const solidAt = (sign: 1 | -1, inMm: number, z: number) => {
      const s = 600;
      const x = s * Math.cos(half) + inMm * Math.sin(half);
      const y = sign * (s * Math.sin(half) - inMm * Math.cos(half));
      const union = M.union(all);
      try {
        return volumeOf(M.cube([0.05, 0.05, 0.05], true).translate([x, y, z]).intersect(union));
      } finally {
        union.delete();
      }
    };
    const beside = PANEL / 2 - (PROFILE.widthMm + groove.widthMm) / 4; // in the wall beside the groove

    it('the strip stops short of the leg by the gasket’s stand-out, which the squeezed gasket fills', () => {
      for (const sign of [1, -1] as const) {
        expect(solidAt(sign, out / 2, beside), `leg ${sign}`).toBe(0);
        expect(solidAt(sign, out + 0.1, beside), `leg ${sign}`).toBeGreaterThan(0);
      }
    });

    it('the gasket’s groove runs along its face', () => {
      for (const sign of [1, -1] as const) {
        expect(solidAt(sign, out + groove.depthMm / 2, PANEL / 2), `leg ${sign}`).toBe(0);
        expect(solidAt(sign, out + groove.depthMm + 0.5, PANEL / 2), `leg ${sign}`).toBeGreaterThan(0);
      }
    });
  });
});
