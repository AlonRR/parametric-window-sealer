// A tilted sash's whole wedge as printed parts (sash-wedge, #159): the two side triangles, the top
// strip between them, and a corner piece at each end of it holding the triangle's top and the top
// strip's end at 90°. Assembled in the wedge's frame, x along the triangles' axis from the hinge, y
// across it (the frame at +y, the sash at -y), z along the top strip from the left triangle's outer
// face, they must not overlap, must leave no hole through any face, must stay inside the wedge, must
// carry the gasket's groove round the corners, and must each fit the printer.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  EXAMPLE_TRACK,
  edgeProfile,
  loadEngine,
  tapeFit,
  tiltWedge,
  PIN_SLOT_MM,
  pinDepthMm,
  stripWidthMm,
  tiltWedgeSolids,
  wedgeCorner,
} from '../src/index.js';
import type { EdgeParams, JointParams, SealParams } from '../src/index.js';

const engine = await loadEngine();
const { Manifold: M } = engine;
const PANEL = 3;
const MAX = 200;
const WIDTH = 420;
const SEAL: SealParams = { ...EXAMPLE_PARAMS.seal, kind: 'tpu' };
const EDGES: EdgeParams = {
  window: 'frame',
  roles: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
  track: EXAMPLE_TRACK,
};
const PROFILE = edgeProfile('left', EDGES, DEFAULT_JOINT, tapeFit(SEAL));
// Without the ribs, which press into the panels on purpose, nothing may overlap.
const PLAIN: JointParams = { ...DEFAULT_JOINT, gripMm: 0 };
const CORNER = wedgeCorner(PROFILE, PLAIN, PANEL);
const WEDGE = tiltWedge(
  { widthMm: WIDTH, heightMm: 1200, gapMm: 150 },
  { edgeStripMm: PROFILE.heightMm, maxPieceMm: MAX, jointMm: 5, minPieceMm: 20, corner: CORNER },
);
const half = ((WEDGE.tiltDeg / 2) * Math.PI) / 180;
const [tan, cos] = [Math.tan(half), Math.cos(half)];
const { axisMm } = WEDGE.side;
const parts = tiltWedgeSolids(engine, WEDGE, PROFILE, PLAIN, PANEL, MAX);
const sides = parts.sides.flatMap((s) => [...s.legs, ...s.panels, ...s.joints]);
const all: Manifold[] = [...sides, ...parts.corners, ...parts.top.edges, ...parts.top.panels, ...parts.top.joints];
const union = M.union(all);
const tape = PROFILE.tape;
if (tape === undefined) throw new Error('no gasket');
const { standOutMm: out, groove } = tape;
const inSlot = PLAIN.slotMm - PLAIN.slideMm / 2;
const xCorner = axisMm - CORNER.belowTopMm; // the corner's lower face, where the leg strips stop
const xTop = axisMm - PROFILE.widthMm / 2; // the top strip's mid-plane

const volumeOf = (m: Manifold) => {
  const v = m.volume();
  m.delete();
  return v;
};
const solidAt = (x: number, y: number, z: number, size = 0.05) =>
  volumeOf(M.cube([size, size, size], true).translate([x, y, z]).intersect(union));
// A point inMm in from the frame's face (sign 1) or the sash's (sign -1), square to it, at x along
// the axis.
const onFace = (sign: 1 | -1, x: number, inMm: number): [number, number] => [x, sign * (x * tan - inMm / cos)];
// Both corners: the left's z, and the right's, mirrored.
const bothEnds = (z: number) => [z, WIDTH - z];

describe('the corner between the top strip and a side triangle', () => {
  it('reaches down the triangle and along the top strip by the joint’s and the edge strip’s sizes', () => {
    // Half an edge strip, half a panel, the fit and a flange: 7.5 + 1.5 + 0.2 + 1.6 mm.
    expect(CORNER.belowTopMm).toBeCloseTo(10.8, 9);
    // A panel, the fit, a web under the slot, and the slot: 3 + 0.2 + 2 + 8 mm.
    expect(CORNER.deepMm).toBeCloseTo(13.2, 9);
    // Each face's panel goes into its slot as far as into a joint strip's: 6.5 mm.
    expect(CORNER.roomMm).toBeCloseTo(10.8 - 6.5, 9);
    expect(CORNER.reachMm).toBeCloseTo(13.2 - 6.5, 9);
  });
});

describe('the tilted wedge’s parts', () => {
  it('as many as the chains and the printer make', () => {
    expect(parts.sides).toHaveLength(2);
    expect(parts.corners).toHaveLength(2);
    expect(parts.top.panels).toHaveLength(WEDGE.top.chain.pieces.length);
    expect(parts.top.joints).toHaveLength(WEDGE.top.chain.pieces.length - 1);
    // Each edge strip along the top, 420 - 2 × 13.2 mm long, in two segments; two sides.
    expect(parts.top.edges).toHaveLength(4);
    for (const m of all) expect(m.volume()).toBeGreaterThan(0);
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

  it('nothing outside the wedge: between the frame’s face and the sash’s, below the top', () => {
    const outline = new engine.CrossSection([
      [
        [0, 0],
        [axisMm, -axisMm * tan],
        [axisMm, axisMm * tan],
      ],
    ]);
    const inside = outline.extrude(WIDTH + 100).translate([0, 0, -50]);
    try {
      expect(inside.volume()).toBeGreaterThan(0);
      expect(volumeOf(union.subtract(inside))).toBeLessThan(1e-3);
    } finally {
      inside.delete();
      outline.delete();
    }
  });

  it('seen through the top strip, no hole from one triangle to the other but the gaskets’ along its edges', () => {
    let probed = 0;
    const reach = xTop * tan - (out + 0.05) / cos;
    for (let z = 1; z < WIDTH - 1; z += 13) {
      for (const f of [-1, -0.9, -0.5, 0, 0.5, 0.9, 1]) {
        const needle = M.cube([30, 0.05, 0.05], true).translate([xTop, f * reach, z]);
        expect(volumeOf(needle.intersect(union)), `at z ${z}, y ${(f * reach).toFixed(1)}`).toBeGreaterThan(0);
        needle.delete();
        probed++;
      }
    }
    expect(probed).toBeGreaterThanOrEqual(220);
  });

  it('seen through each triangle near its top, no hole up to the top strip', () => {
    let probed = 0;
    for (let x = xCorner - 30; x < axisMm - 0.5; x += 0.7) {
      const reach = x * tan - (out + 0.05) / cos;
      for (const f of [-1, -0.6, 0, 0.6, 1]) {
        for (const z of bothEnds(PANEL / 2)) {
          const needle = M.cube([0.05, 0.05, 20], true).translate([x, f * reach, z]);
          expect(volumeOf(needle.intersect(union)), `at x ${x.toFixed(1)}, z ${z}`).toBeGreaterThan(0);
          needle.delete();
          probed++;
        }
      }
    }
    expect(probed).toBeGreaterThanOrEqual(400);
  });

  it('the triangle’s top panel in the corner’s slot, and the top strip’s end in its other, each half a slide short', () => {
    for (const [i, zMid] of bothEnds(PANEL / 2).entries()) {
      const top = xCorner + inSlot; // the triangle's chain ends here
      expect(solidAt(top - 0.5, 0, zMid), `corner ${i}`).toBeGreaterThan(0);
      expect(solidAt(top + 0.5, 0, zMid), `corner ${i}`).toBe(0);
    }
    for (const [i, end] of bothEnds(CORNER.reachMm).entries()) {
      const inward = i === 0 ? 1 : -1;
      expect(solidAt(xTop, 0, end + inward * 0.5), `corner ${i}`).toBeGreaterThan(0);
      expect(solidAt(xTop, 0, end - inward * 0.5), `corner ${i}`).toBe(0);
    }
  });

  it('the top strip’s panels in its edge strips’ slots, half a slide short of their floors', () => {
    // The slots' mouths are the profile's height in from each face, square to it, at the mid-plane.
    const mouth = xTop * tan - PROFILE.heightMm / cos;
    for (const sign of [1, -1]) {
      expect(solidAt(xTop, sign * (mouth + inSlot - 0.5), WIDTH / 2), `side ${sign}`).toBeGreaterThan(0);
      expect(solidAt(xTop, sign * (mouth + inSlot + 0.5), WIDTH / 2), `side ${sign}`).toBe(0);
    }
  });

  it('a pin through each of the top strip’s joint strips, on its middle, through a slot in the panel either side', () => {
    const { pieces, jointsMm } = WEDGE.top.chain;
    const flange = PLAIN.fitMm + PLAIN.flangeMm / 2; // into a flange, from the panel's face
    const throughStrip = [xTop - PANEL / 2 - flange, xTop, xTop + PANEL / 2 + flange];
    let at = CORNER.reachMm;
    let probed = 0;
    jointsMm.forEach((gap, i) => {
      at += (pieces[i] ?? 0) + gap;
      const centre = at - gap / 2;
      const inFromSide = stripWidthMm(PLAIN) / 2 - pinDepthMm(PLAIN);
      for (const z of [centre - inFromSide, centre + inFromSide]) {
        // Through the strip's flange each side, the panel, and the slot in it.
        for (const x of throughStrip) {
          expect(solidAt(x, 0, z, 0.1), `joint ${i} at z ${z.toFixed(1)}, x ${x.toFixed(1)}`).toBe(0);
          expect(solidAt(x, PIN_SLOT_MM, z, 0.1), `joint ${i} beside its pin`).toBeGreaterThan(0);
        }
        probed++;
      }
    });
    expect(probed).toBe(2 * jointsMm.length);
  });

  describe('on the frame’s face and the sash’s', () => {
    const faces = [1, -1] as const;

    it('every part short of them by the gasket’s stand-out, which the squeezed gasket fills', () => {
      // Along a leg strip, the corner, and the top strip's edge strip at both its edges: bevelled.
      const besideGroove = (PROFILE.widthMm + groove.widthMm) / 4;
      for (const sign of faces) {
        const places: [number, number][] = [
          [600, PANEL / 2 - besideGroove], // a leg strip
          [xCorner + 1, PANEL / 2 - besideGroove], // the corner
          [xTop - besideGroove, WIDTH / 2], // the top strip's edge strip, its lower edge
          [xTop + besideGroove, WIDTH / 2], // and its upper
        ];
        for (const [x, z] of places) {
          const [px, py] = onFace(sign, x, out / 2);
          expect(solidAt(px, py, z), `face ${sign} at x ${x.toFixed(1)}, z ${z}`).toBe(0);
          const [qx, qy] = onFace(sign, x, out + 0.1);
          expect(solidAt(qx, qy, z), `face ${sign} at x ${x.toFixed(1)}, z ${z}`).toBeGreaterThan(0);
        }
      }
    });

    it('the gasket’s groove runs up each leg, round each corner and along the top strip', () => {
      // Up the leg strip and into the corner at the panel's mid-plane, turning at the top strip's
      // mid-plane, along the corner and on along the top strip's edge strip.
      for (const sign of faces) {
        for (const [i, mid] of bothEnds(PANEL / 2).entries()) {
          const inward = i === 0 ? 1 : -1;
          const path: [number, number][] = [
            [xCorner - 5, mid],
            [xCorner + 1, mid],
            [xTop, mid],
            [xTop, mid + inward * (CORNER.deepMm - 2)],
            [xTop, mid + inward * (CORNER.deepMm + 2)],
            [xTop, WIDTH / 2],
          ];
          for (const [x, z] of path) {
            const [gx, gy] = onFace(sign, x, out + groove.depthMm / 2);
            expect(solidAt(gx, gy, z), `face ${sign}, corner ${i}, groove at x ${x.toFixed(1)}, z ${z}`).toBe(0);
            const [bx, by] = onFace(sign, x, out + groove.depthMm + 0.5);
            expect(
              solidAt(bx, by, z),
              `face ${sign}, corner ${i}, under the groove at x ${x.toFixed(1)}`,
            ).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  it('each part fits the printer', () => {
    for (const m of [...parts.corners, ...parts.top.edges, ...parts.top.panels, ...parts.top.joints]) {
      const { min, max } = m.boundingBox();
      const sizes = [0, 1, 2].map((k) => (max[k] ?? 0) - (min[k] ?? 0)).sort((a, b) => b - a);
      expect(sizes[0]).toBeLessThanOrEqual(MAX + 1e-6);
    }
  });
});
