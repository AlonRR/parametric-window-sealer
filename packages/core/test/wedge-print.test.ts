// A tilted sash's wedge as files to print (sash-wedge, #159): each part once, lying as it prints on
// the bed, named by what it is and where, and how many to print; the right triangle and corner are
// the left ones turned over, and a leg's strips are the same on the frame and on the sash, so each
// is printed as many times. With a TPU seal, the gaskets for the grooves, in straight runs up each
// leg and along the top; and the plan's lines.
import { afterAll, describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_COLLAR,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  EXAMPLE_TRACK,
  describeWedge,
  edgeProfile,
  flatPort,
  loadEngine,
  stripWidthMm,
  tapeFit,
  sashWedge,
  sashWedgeSolids,
  wedgeCorner,
  wedgeGasketRuns,
  wedgePrintParts,
} from '../src/index.js';
import type { EdgeParams, FlatPort, JointParams, SealParams } from '../src/index.js';

const engine = await loadEngine();
const { Manifold: M } = engine;
const PANEL = 3;
const MAX = 200;
const SEAL: SealParams = { ...EXAMPLE_PARAMS.seal, kind: 'tpu' };
const FIT = tapeFit(SEAL);
if (FIT === undefined) throw new Error('no fit');
const EDGES: EdgeParams = {
  window: 'frame',
  roles: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
  track: EXAMPLE_TRACK,
};
const PROFILE = edgeProfile('left', EDGES, DEFAULT_JOINT, FIT);
const PLAIN: JointParams = { ...DEFAULT_JOINT, gripMm: 0 };
const CORNER = wedgeCorner(PROFILE, PLAIN, PANEL);
const wedgeOf = (widthMm: number) =>
  sashWedge(
    { widthMm, heightMm: 1200, gapMm: 150 },
    { edgeStripMm: PROFILE.heightMm, maxPieceMm: MAX, jointMm: 5, minPieceMm: 20, corner: CORNER },
  );
const WEDGE = wedgeOf(800);
const made = flatPort(WEDGE, PROFILE, PLAIN, PANEL, MAX, 150, DEFAULT_COLLAR);
if ('problem' in made) throw new Error(made.problem);
const PORT: FlatPort = made;
const GASKET = { fit: FIT, heightMm: SEAL.tape.thicknessMm };
const parts = wedgePrintParts(engine, WEDGE, PROFILE, PLAIN, PANEL, MAX, PORT, GASKET);
const byName = new Map(parts.map((p) => [p.name, p]));
const named = (pattern: RegExp) => parts.filter((p) => pattern.test(p.name));
const half = ((WEDGE.tiltDeg / 2) * Math.PI) / 180;

const volumeOf = (m: Manifold) => {
  const v = m.volume();
  m.delete();
  return v;
};
const size = (m: Manifold) => {
  const { min, max } = m.boundingBox();
  return [0, 1, 2].map((k) => (max[k] ?? 0) - (min[k] ?? 0)) as [number, number, number];
};
// What of a part lies within the lowest layer: what stands on the bed.
const onBed = (m: Manifold) => {
  const [x, y] = size(m);
  return volumeOf(m.intersect(M.cube([x + 2, y + 2, 0.05]).translate([-1, -1, 0]))) / 0.05;
};

describe('the wedge’s parts to print', () => {
  it('each named for what it is and where, and once each', () => {
    expect(new Set(parts.map((p) => p.name)).size).toBe(parts.length);
    expect(byName.get('wedge-corner-print-2')).toBeDefined();
    expect(named(/^wedge-side-\d+-of-5-print-2$/)).toHaveLength(5);
    expect(named(/^wedge-side-joint-\d+-of-4-print-2$/)).toHaveLength(4);
    expect(named(/^wedge-leg-\d+-of-6-print-4$/)).toHaveLength(6);
    expect(named(/^wedge-top-\d+-of-4-print-1$/)).toHaveLength(3);
    expect(byName.get('wedge-top-2-of-4-port-150-print-1')).toBeDefined();
    expect(named(/^wedge-top-edge-\d+-of-4-print-2$/)).toHaveLength(4);
    expect(named(/^wedge-top-joint-\d+-of-3-print-1$/)).toHaveLength(3);
    for (const p of parts) expect(p.name).toMatch(/-print-(\d+)$/);
    for (const p of parts) expect(p.name.endsWith(`-print-${p.count}`), p.name).toBe(true);
  });

  it('as many printed as the assembled wedge has, and as much of each', () => {
    const whole = sashWedgeSolids(engine, WEDGE, PROFILE, PLAIN, PANEL, MAX, PORT);
    const all = [
      ...whole.sides.flatMap((s) => [...s.legs, ...s.panels, ...s.joints]),
      ...whole.corners,
      ...whole.top.edges,
      ...whole.top.panels,
      ...whole.top.joints,
    ];
    const printed = parts.filter((p) => !p.name.startsWith('gasket-'));
    expect(printed.reduce((n, p) => n + p.count, 0)).toBe(all.length);
    const volume = (list: { solid: Manifold; count: number }[]) =>
      list.reduce((v, p) => v + p.solid.volume() * p.count, 0);
    expect(volume(printed)).toBeCloseTo(volume(all.map((solid) => ({ solid, count: 1 }))), 0);
    for (const m of all) m.delete();
  });

  it('each on the bed from the origin, and no longer or wider than the printer makes', () => {
    for (const { name, solid } of parts) {
      const { min } = solid.boundingBox();
      for (const k of [0, 1, 2]) expect(min[k] ?? 0, name).toBeCloseTo(0, 6);
      const [x, y] = size(solid);
      expect(Math.max(x, y), name).toBeLessThanOrEqual(MAX + 1e-6);
    }
  });

  it('the panels lie flat; the port’s piece on its panel, collar up', () => {
    for (const { name, solid } of named(/^wedge-(side|top)-\d+-of-\d+-print/)) {
      expect(size(solid)[2], name).toBeCloseTo(PANEL, 6);
    }
    const port = byName.get('wedge-top-2-of-4-port-150-print-1')?.solid;
    if (port === undefined) throw new Error('no port piece');
    expect(size(port)[2]).toBeGreaterThan(PANEL + DEFAULT_COLLAR.depthMm);
    // Its panel on the bed: as much as the plain pieces, less the slot.
    const plain = named(/^wedge-top-1-of-4-print-1$/)[0]?.solid;
    if (plain === undefined) throw new Error('no plain piece');
    const slot = PORT.slot.widthMm * PORT.slot.lengthMm;
    expect(onBed(port)).toBeGreaterThan(0.95 * (onBed(plain) - slot));
  });

  it('the edge strips on their outer faces, slots up; the top strip’s flat on their bevel', () => {
    const groove = FIT.grooveWidthMm;
    for (const { name, solid } of [...named(/^wedge-leg-/), ...named(/^wedge-top-edge-/)]) {
      const [x, y] = size(solid);
      const [length, across] = x > y ? [x, y] : [y, x];
      // Both walls beside the groove stand on the bed along the strip's length.
      expect(onBed(solid), name).toBeGreaterThan(0.9 * length * (Math.min(across, PROFILE.widthMm) - groove));
    }
    for (const { name, solid } of named(/^wedge-leg-/)) {
      expect(size(solid)[2], name).toBeCloseTo(PROFILE.heightMm - FIT.standOutMm, 6);
    }
    // A leg strip's slot opens up, over its base, at the middle of its width.
    const leg = byName.get('wedge-leg-3-of-6-print-4')?.solid;
    if (leg === undefined) throw new Error('no leg strip');
    const [length, across, tall] = size(leg);
    const probe = (z: number) =>
      volumeOf(
        M.cube([1, 0.1, 0.1], true)
          .translate([length / 2, across / 2, z])
          .intersect(leg),
      );
    expect(probe(tall - 1)).toBe(0);
    expect(probe(FIT.grooveDepthMm + 0.5)).toBeGreaterThan(0);
  });

  it('the corner on its whole upper face, the joint strips on their flanges', () => {
    const corner = byName.get('wedge-corner-print-2')?.solid;
    if (corner === undefined) throw new Error('no corner');
    expect(size(corner)[2]).toBeCloseTo(CORNER.belowTopMm, 6);
    // Its upper face: across the top, between the gaskets' room, and as deep as it is along the top.
    const { axisMm } = WEDGE.side;
    const across = 2 * (axisMm * Math.tan(half) - FIT.standOutMm / Math.cos(half));
    expect(onBed(corner)).toBeGreaterThan(0.98 * across * (CORNER.deepMm - (PANEL / 2 - PROFILE.widthMm / 2)));
    for (const { name, solid } of [...named(/^wedge-side-joint-/), ...named(/^wedge-top-joint-/)]) {
      expect(size(solid)[2], name).toBeCloseTo(stripWidthMm(PLAIN), 6);
    }
  });
});

describe('the gaskets for the wedge’s grooves', () => {
  const groove = FIT.grooveWidthMm;
  const runs = wedgeGasketRuns(WEDGE, PROFILE, PANEL);

  it('on each face, a run up each leg past the corner’s turn, and one along the top from turn to turn', () => {
    // Up the leg to the top strip's mid-plane and half the groove on, and from the leg's groove's
    // inner edge at one end of the top to the other's.
    const xTop = WEDGE.side.axisMm - PROFILE.widthMm / 2;
    expect(runs.legMm).toBeCloseTo(xTop / Math.cos(half) + groove / 2, 6);
    expect(runs.topMm).toBeCloseTo(800 - PANEL - groove, 6);
  });

  it('in TPU, in pieces the printer makes, as long in all as the runs on both faces of both sides', () => {
    const gaskets = named(/^gasket-/);
    expect(gaskets.length).toBeGreaterThan(0);
    let [length, pieces] = [0, 0];
    for (const { name, solid, count } of gaskets) {
      const [x] = size(solid);
      expect(x, name).toBeLessThanOrEqual(MAX + 1e-6);
      length += x * count;
      pieces += count;
    }
    // Each piece to a tenth of a mm, as a wall's gaskets are, so equal lengths share a file.
    expect(Math.abs(length - (4 * runs.legMm + 2 * runs.topMm))).toBeLessThanOrEqual(0.05 * pieces + 1e-9);
    expect(pieces).toBe(4 * 6 + 2 * 4);
  });

  it('none without a TPU seal', () => {
    const plainParts = wedgePrintParts(engine, WEDGE, PROFILE, PLAIN, PANEL, MAX, PORT);
    try {
      expect(plainParts.filter((p) => p.name.startsWith('gasket-'))).toEqual([]);
    } finally {
      for (const p of plainParts) p.solid.delete();
    }
  });
});

describe('the wedge’s plan', () => {
  it('the tilt, the faces, the pieces, the port and the gasket', () => {
    expect(describeWedge(WEDGE, PORT, wedgeGasketRuns(WEDGE, PROFILE, PANEL), 'tpu')).toEqual([
      'The sash leans 7.2° in. The wedge it leaves: a top strip 800 mm long and 150.3 mm deep, and a triangle each ' +
        'side, 1200 mm on its two long sides and 150.3 mm across its top.',
      'Each triangle: 5 pieces end to end with 4 joint strips, from 191.6 mm above the hinge; below that its edge ' +
        'strips close it. A corner piece joins its top to the top strip.',
      'The top strip: 4 pieces with 3 joint strips, between the two corner pieces.',
      'The hose port is in the top strip’s piece 2: a 116.5 × 151.7 mm slot, the 150 mm hose’s own area, leading to ' +
        'a collar the hose slides into.',
      'Gaskets in TPU, on the frame’s face and on the sash’s: 1197.2 mm up each leg and round its corner, and 787.5 ' +
        'mm along the top; 6363.9 mm in all.',
    ]);
  });

  it('a slot short of the hose’s area says how much it has; tape is bought by the length', () => {
    const narrow = wedgeOf(420);
    const port = flatPort(narrow, PROFILE, PLAIN, PANEL, MAX, 150, DEFAULT_COLLAR);
    if ('problem' in port) throw new Error(port.problem);
    const lines = describeWedge(narrow, port, wedgeGasketRuns(narrow, PROFILE, PANEL), 'tape');
    expect(lines).toContain(
      'The hose port is in the top strip’s piece 2: a 116.5 × 110.4 mm slot, 73% of the 150 mm hose’s area, as long ' +
        'as the piece allows: the air meets more resistance than in the hose.',
    );
    expect(lines.at(-1)).toBe(
      'Tape, on the frame’s face and on the sash’s: 1197.2 mm up each leg and round its corner, and 407.5 mm along ' +
        'the top; 5603.9 mm in all.',
    );
    expect(describeWedge(narrow, undefined, wedgeGasketRuns(narrow, PROFILE, PANEL), 'tape')).toHaveLength(4);
  });
});

afterAll(() => {
  for (const p of parts) p.solid.delete();
});
