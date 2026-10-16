// The flattened hose port in a tilted sash's top strip (sash-wedge, #159): a flat slot through one
// of the top strip's pieces, as wide as the room between its edge strips allows and as long as
// gives it the hose's own area where the piece is long enough, and on the room side a hollow
// transition from the slot up to the round collar the hose slides into, printed as one with the
// piece, panel down, collar up.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_COLLAR,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  EXAMPLE_TRACK,
  edgeProfile,
  flatPort,
  loadEngine,
  tapeFit,
  tiltWedge,
  tiltWedgeSolids,
  wedgeCorner,
} from '../src/index.js';
import type { EdgeParams, JointParams, SealParams } from '../src/index.js';

const engine = await loadEngine();
const { Manifold: M } = engine;
const PANEL = 3;
const MAX = 200;
const HOSE = 150;
const SEAL: SealParams = { ...EXAMPLE_PARAMS.seal, kind: 'tpu' };
const EDGES: EdgeParams = {
  window: 'frame',
  roles: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
  track: EXAMPLE_TRACK,
};
const PROFILE = edgeProfile('left', EDGES, DEFAULT_JOINT, tapeFit(SEAL));
const PLAIN: JointParams = { ...DEFAULT_JOINT, gripMm: 0 };
const CORNER = wedgeCorner(PROFILE, PLAIN, PANEL);
const wedgeOf = (widthMm: number, gapMm: number) =>
  tiltWedge(
    { widthMm, heightMm: 1200, gapMm },
    { edgeStripMm: PROFILE.heightMm, maxPieceMm: MAX, jointMm: 5, minPieceMm: 20, corner: CORNER },
  );
const portOf = (widthMm: number, gapMm: number) => {
  const port = flatPort(wedgeOf(widthMm, gapMm), PROFILE, PLAIN, PANEL, MAX, HOSE, DEFAULT_COLLAR);
  if ('problem' in port) throw new Error(port.problem);
  return port;
};
const HOSE_AREA = Math.PI * (HOSE / 2) ** 2;

describe('the flattened port’s size', () => {
  it('as wide as the room between the top strip’s edge strips allows, as long as gives it the hose’s area', () => {
    const port = portOf(800, 150);
    // The edge strips' mouths 62.65 mm either side of the middle; 2 mm clear of each, inside the
    // transition's 2.4 mm wall.
    expect(port.slot.widthMm).toBeCloseTo(2 * (62.65 - 2) - 2 * 2.4, 1);
    expect(port.slot.widthMm * port.slot.lengthMm).toBeCloseTo(HOSE_AREA, 6);
    expect(port.slot.lengthMm).toBeCloseTo(151.7, 1);
    expect(port.areaShare).toBeCloseTo(1, 9);
  });

  it('on the top strip’s piece nearest its middle, centred on it', () => {
    const wedge = wedgeOf(800, 150);
    const port = portOf(800, 150);
    const { pieces, jointsMm } = wedge.top.chain;
    // Four pieces: the second and third are as near the middle; the first of them.
    expect(port.piece).toBe(1);
    expect(port.centreMm).toBeCloseTo(CORNER.reachMm + (pieces[0] ?? 0) + (jointsMm[0] ?? 0) + (pieces[1] ?? 0) / 2, 9);
  });

  it('no longer than the piece allows clear of the joint strips over its ends, its share of the hose’s area said', () => {
    // A 420 mm window: three pieces of 132.2 mm; 6.5 mm under each joint strip's flange and 2 mm
    // clear of it each end, inside the wall: 110.4 mm.
    const port = portOf(420, 150);
    expect(port.slot.lengthMm).toBeCloseTo(132.2 - 2 * (6.5 + 2) - 2 * 2.4, 1);
    expect(port.areaShare).toBeCloseTo((port.slot.widthMm * port.slot.lengthMm) / HOSE_AREA, 9);
    expect(port.areaShare).toBeCloseTo(0.728, 3);
  });

  it('the collar moved toward the room as far as keeps it 2 mm off the frame’s face, and little further', () => {
    const wedge = wedgeOf(800, 150);
    const port = portOf(800, 150);
    const tan = Math.tan(((wedge.tiltDeg / 2) * Math.PI) / 180);
    const outside = HOSE / 2 + DEFAULT_COLLAR.clearanceMm + DEFAULT_COLLAR.wallMm;
    // Where the collar starts, the frame's face is furthest in.
    const off = port.collarFromMm * tan - (port.collarAxisMm + outside);
    expect(off).toBeGreaterThanOrEqual(2 - 1e-9);
    expect(off).toBeLessThan(2.5);
    expect(port.collarAxisMm).toBeLessThan(0);
  });

  it('a hose too wide for the printer, or a slot with no room across or along, is a problem', () => {
    const wedge = wedgeOf(800, 150);
    const tooWide = flatPort(wedge, PROFILE, PLAIN, PANEL, MAX, 400, DEFAULT_COLLAR);
    expect(tooWide).toEqual({
      problem: 'A 400 mm hose’s collar is wider than the printer makes a piece: 200 mm.',
    });
    const narrow = flatPort(wedgeOf(800, 30), PROFILE, PLAIN, PANEL, MAX, HOSE, DEFAULT_COLLAR);
    expect(narrow).toEqual({
      problem: 'The top strip has no room for a port between its edge strips: the gap at the top is too small.',
    });
    // A window 30 mm wide: one piece of 16.6 mm, shorter than the joint strips over its ends.
    expect(flatPort(wedgeOf(30, 150), PROFILE, PLAIN, PANEL, MAX, HOSE, DEFAULT_COLLAR)).toEqual({
      problem: 'The top strip’s pieces are too short for a port.',
    });
  });
});

describe('the flattened port as printed', () => {
  const WIDTH = 800;
  const wedge = wedgeOf(WIDTH, 150);
  const port = portOf(WIDTH, 150);
  const half = ((wedge.tiltDeg / 2) * Math.PI) / 180;
  const tan = Math.tan(half);
  const { axisMm } = wedge.side;
  const xTop = axisMm - PROFILE.widthMm / 2;
  const parts = tiltWedgeSolids(engine, wedge, PROFILE, PLAIN, PANEL, MAX, port);
  const piece = parts.top.panels[port.piece];
  if (piece === undefined) throw new Error('no piece for the port');
  const others: Manifold[] = [
    ...parts.sides.flatMap((s) => [...s.legs, ...s.panels, ...s.joints]),
    ...parts.corners,
    ...parts.top.edges,
    ...parts.top.panels.filter((_, i) => i !== port.piece),
    ...parts.top.joints,
  ];
  const volumeOf = (m: Manifold) => {
    const v = m.volume();
    m.delete();
    return v;
  };
  const solidAt = (x: number, y: number, z: number) =>
    volumeOf(M.cube([0.1, 0.1, 0.1], true).translate([x, y, z]).intersect(piece));

  it('open from under the panel to the collar’s mouth: straight up through the slot, then on to the lip', () => {
    const top = port.collarFromMm + DEFAULT_COLLAR.depthMm;
    const lip = HOSE / 2 + DEFAULT_COLLAR.clearanceMm - DEFAULT_COLLAR.lipMm;
    let probed = 0;
    for (const fy of [-0.45, 0, 0.45]) {
      for (const fz of [-0.45, 0, 0.45]) {
        // A point in the slot, and one as far round inside the lip: the way between them is open.
        const low = [fy * port.slot.widthMm, port.centreMm + fz * port.slot.lengthMm];
        const high = [port.collarAxisMm + 1.2 * fy * lip, port.centreMm + 1.2 * fz * lip];
        for (let x = xTop - PANEL; x < top; x += 1.7) {
          const k = Math.min(1, Math.max(0, (x - port.straightToMm) / (port.collarFromMm - port.straightToMm)));
          const y = (low[0] ?? 0) + k * ((high[0] ?? 0) - (low[0] ?? 0));
          const z = (low[1] ?? 0) + k * ((high[1] ?? 0) - (low[1] ?? 0));
          expect(solidAt(x, y, z), `at x ${x.toFixed(1)}, y ${y.toFixed(1)}, z ${z.toFixed(1)}`).toBe(0);
          probed++;
        }
      }
    }
    expect(probed).toBeGreaterThanOrEqual(9 * 30);
  });

  it('the hose stops on a lip at the collar’s foot, and the collar’s wall holds it', () => {
    const inside = HOSE / 2 + DEFAULT_COLLAR.clearanceMm;
    const at = (r: number, x: number) => solidAt(x, port.collarAxisMm - r, port.centreMm);
    // Just below the collar's foot, the lip: from the collar's inside in by the lip.
    expect(at(inside - DEFAULT_COLLAR.lipMm / 2, port.collarFromMm - 0.3)).toBeGreaterThan(0);
    expect(at(inside - DEFAULT_COLLAR.lipMm - 1, port.collarFromMm - 0.3)).toBe(0);
    // Above it, the hose's room and the collar's wall.
    expect(at(inside - DEFAULT_COLLAR.lipMm / 2, port.collarFromMm + 1)).toBe(0);
    expect(at(inside + DEFAULT_COLLAR.wallMm / 2, port.collarFromMm + DEFAULT_COLLAR.depthMm - 1)).toBeGreaterThan(0);
    expect(at(inside + DEFAULT_COLLAR.wallMm + 0.5, port.collarFromMm + DEFAULT_COLLAR.depthMm - 1)).toBe(0);
  });

  it('touches no other part, nor the frame’s face, nor the sash’s below its top', () => {
    for (const [i, m] of others.entries()) {
      expect(volumeOf(m.intersect(piece)), `part ${i}`).toBeLessThan(1e-3);
    }
    // The faces as half-spaces, each from its plane outward, the sash's only as high as it goes.
    const far = axisMm + 200;
    const frame = new engine.CrossSection([
      [
        [0, 0],
        [far, far * tan],
        [0, far * tan],
      ],
    ]);
    const sash = new engine.CrossSection([
      [
        [0, 0],
        [0, -axisMm * tan - 300],
        [axisMm, -axisMm * tan - 300],
        [axisMm, -axisMm * tan],
      ],
    ]);
    try {
      for (const face of [frame, sash]) {
        const solid = face.extrude(WIDTH + 100).translate([0, 0, -50]);
        expect(solid.volume()).toBeGreaterThan(0);
        expect(volumeOf(solid.intersect(piece))).toBeLessThan(1e-3);
        solid.delete();
      }
    } finally {
      frame.delete();
      sash.delete();
    }
  });

  it('prints panel down, collar up, nothing hanging more than 40° off upright', () => {
    const mesh = piece.getMesh();
    const { numProp, vertProperties: v, triVerts } = mesh;
    const bottom = xTop - PANEL / 2;
    const limit = -Math.sin((40 * Math.PI) / 180);
    let checked = 0;
    for (let t = 0; t < triVerts.length; t += 3) {
      const p = [0, 1, 2].map((k) => {
        const i = (triVerts[t + k] ?? 0) * numProp;
        return [v[i] ?? 0, v[i + 1] ?? 0, v[i + 2] ?? 0];
      });
      const [a, b, c] = p as [number[], number[], number[]];
      const u = [0, 1, 2].map((k) => (b[k] ?? 0) - (a[k] ?? 0));
      const w = [0, 1, 2].map((k) => (c[k] ?? 0) - (a[k] ?? 0));
      const n = [
        (u[1] ?? 0) * (w[2] ?? 0) - (u[2] ?? 0) * (w[1] ?? 0),
        (u[2] ?? 0) * (w[0] ?? 0) - (u[0] ?? 0) * (w[2] ?? 0),
        (u[0] ?? 0) * (w[1] ?? 0) - (u[1] ?? 0) * (w[0] ?? 0),
      ];
      const size = Math.hypot(...n);
      if (size < 1e-9) continue;
      checked++;
      // Up is +x; a face looking down more steeply than the limit lies on the bed, or it fails.
      if ((n[0] ?? 0) / size < limit) {
        for (const q of p) expect(Math.abs((q[0] ?? 0) - bottom), 'a face hanging over nothing').toBeLessThan(0.01);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('fits the printer', () => {
    const { min, max } = piece.boundingBox();
    expect((max[1] ?? 0) - (min[1] ?? 0)).toBeLessThanOrEqual(MAX);
    expect((max[2] ?? 0) - (min[2] ?? 0)).toBeLessThanOrEqual(MAX);
  });
});
