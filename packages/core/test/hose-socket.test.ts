// Seal the hose first (hose-socket, #114), from the design review against published work: hoses fall
// out of push-fit kits under their own weight, and a gap by the hose draws its hot exhaust back in.
// The port can hold the hose by a twist-lock of its own: a printed ring clamped on the hose end with
// an M4 bolt, whose three pins twist into slots near the collar's mouth. A cap closes the port when
// the AC is off, and a screen can fill its hole.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_COLLAR,
  DEFAULT_SOCKET,
  EXAMPLE_PARAMS,
  RING_WALL_MM,
  capShapes,
  capSolid,
  collarInnerMm,
  describePlan,
  loadEngine,
  partName,
  planFiles,
  planWall,
  portPanel,
  readParams,
  ringShapes,
  ringSolid,
  socketEndMm,
  toFormValues,
  windowBandMm,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });
const ok = (over: FormValues): Params => {
  const r = read(over);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const names = (p: Params) => planFiles(p, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
const TWIST = { ...DEFAULT_SOCKET, lock: 'twist' as const };

// How much of the solid fills a small cube centred here.
const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.2) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};
// A point at this radius and angle (degrees, anticlockwise from x seen from the room) about (cx, cy).
const at = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy + r * Math.sin((deg * Math.PI) / 180),
];

describe('the starting values', () => {
  it('push-fit, with a cap and no screen', () => {
    expect(DEFAULT_SOCKET).toEqual({ lock: 'push', cap: true, screen: false });
    expect(EXAMPLE_PARAMS.socket).toEqual(DEFAULT_SOCKET);
    expect([example.portLock, example.portCap, example.portScreen]).toEqual(['push', 'yes', 'no']);
  });
});

describe('the twist-lock’s sizes, for a 150 mm hose', () => {
  it('puts the ring in the collar: the hose end and the ring’s 2.4 mm wall each side', () => {
    expect(RING_WALL_MM).toBe(2.4);
    expect(socketEndMm(150, TWIST)).toBeCloseTo(154.8, 9);
    expect(socketEndMm(150, DEFAULT_SOCKET)).toBe(150);
    expect(collarInnerMm(socketEndMm(150, TWIST), DEFAULT_COLLAR)).toBeCloseTo(155.8, 9);
  });

  it('cuts its slots’ windows 1.8 mm below the collar’s mouth, 4.6 mm tall, for 4 mm pins', () => {
    expect(windowBandMm(DEFAULT_COLLAR)).toEqual({ fromMm: 13.6, toMm: 18.2 });
  });
});

describe('the collar with a twist-lock', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };
  const end = socketEndMm(150, TWIST);
  const wallR = collarInnerMm(end, DEFAULT_COLLAR) / 2 + 1.2; // the middle of the collar's wall
  const z = (fromCollarBottom: number) => 3 + fromCollarBottom;

  it('has three slots, each straight down from the mouth, then turning 20° clockwise seen from the room', () => {
    const solid = portPanel(engine, size, end, DEFAULT_COLLAR, undefined, TWIST);
    try {
      for (const a of [0, 120, 240]) {
        const [ex, ey] = at(100, 100, wallR, a);
        expect(probe(solid, ex, ey, z(19.5)), `entry at ${a}°`).toBe(0);
        expect(probe(solid, ex, ey, z(16)), `entry at ${a}° down to the window`).toBe(0);
        expect(probe(solid, ex, ey, z(12), 0.1), `wall below the slot at ${a}°`).toBeGreaterThan(0);
        const [wx, wy] = at(100, 100, wallR, a - 15);
        expect(probe(solid, wx, wy, z(16)), `window at ${a - 15}°`).toBe(0);
        expect(probe(solid, wx, wy, z(19.2), 0.1), `band over the window at ${a - 15}°`).toBeGreaterThan(0);
        const [nx, ny] = at(100, 100, wallR, a + 15);
        expect(probe(solid, nx, ny, z(16), 0.1), `no window anticlockwise at ${a + 15}°`).toBeGreaterThan(0);
      }
    } finally {
      solid.delete();
    }
  });

  it('is the push-fit collar without them (control)', () => {
    const solid = portPanel(engine, size, end, DEFAULT_COLLAR);
    try {
      const [ex, ey] = at(100, 100, wallR, 0);
      expect(probe(solid, ex, ey, z(19.5), 0.1)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });
});

describe('the ring', () => {
  const [shape] = ringShapes([{ hoseMm: 150, column: 2, row: 1 }], TWIST);
  if (shape === undefined) throw new Error('no ring');

  it('is one for each port, named by its hose, and none with a push-fit port', () => {
    expect(partName(shape)).toBe('ring-150-print-1');
    expect(ringShapes([{ hoseMm: 150, column: 2, row: 1 }], DEFAULT_SOCKET)).toEqual([]);
  });

  it('slides over the hose end, its wall 2.4 mm, split at the top to clamp with a bolt through two lugs', () => {
    const solid = ringSolid(engine, shape, DEFAULT_COLLAR);
    try {
      const { min, max } = solid.boundingBox();
      // Printed standing on its bottom edge: as tall as the collar is deep, and 18 mm more for the lugs.
      expect([min[2], max[2]].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 38]);
      expect(Math.round(max[1] * 1000) / 1000).toBe(77.4 + 9);
      // Over the hose: inside 75.2 mm from the axis (0.2 mm to slide on), out to 77.4 mm.
      for (const a of [30, 200]) {
        const [ix, iy] = at(0, 0, 75.0, a);
        expect(probe(solid, ix, iy, 5, 0.1), `inside at ${a}°`).toBe(0);
        const [wx, wy] = at(0, 0, 76.3, a);
        expect(probe(solid, wx, wy, 5, 0.1), `wall at ${a}°`).toBeGreaterThan(0);
      }
      // The split, at the top (90°), right through.
      expect(probe(solid, 0, 76.3, 5, 0.1)).toBe(0);
      // A bolt hole across the lugs, 5 mm out from the ring, 10.5 mm above their foot.
      expect(probe(solid, 4, 77.4 + 5, 20 + 2 + 10.5, 0.1)).toBe(0);
      expect(probe(solid, 4, 77.4 + 5, 20 + 2 + 14.5, 0.1)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });

  it('has three pins at the windows’ height, bearing on their flat tops, sloped beneath to print', () => {
    const solid = ringSolid(engine, shape, DEFAULT_COLLAR);
    try {
      for (const a of [0, 120, 240]) {
        const [px, py] = at(0, 0, 77.4 + 1.2, a);
        expect(probe(solid, px, py, 16, 0.1), `pin at ${a}°`).toBeGreaterThan(0);
        expect(probe(solid, px, py, 17.85, 0.05), `its top at ${a}°`).toBeGreaterThan(0);
        expect(probe(solid, px, py, 18.2, 0.1), `nothing above it at ${a}°`).toBe(0);
        const [tx, ty] = at(0, 0, 77.4 + 2.3, a);
        expect(probe(solid, tx, ty, 14.4, 0.1), `sloped beneath, at its tip, ${a}°`).toBe(0);
        const [gx, gy] = at(0, 0, 77.4 + 1.2, a + 60);
        expect(probe(solid, gx, gy, 16, 0.1), `none between the pins at ${a + 60}°`).toBe(0);
      }
    } finally {
      solid.delete();
    }
  });
});

describe('the cap', () => {
  it('is one for each port, push-fit, rimmed wider than the collar to grip', () => {
    const [shape] = capShapes([{ hoseMm: 150, column: 2, row: 1 }], DEFAULT_SOCKET);
    if (shape === undefined) throw new Error('no cap');
    expect(partName(shape)).toBe('cap-150-print-1');
    expect(capShapes([{ hoseMm: 150, column: 2, row: 1 }], { ...DEFAULT_SOCKET, cap: false })).toEqual([]);
    const solid = capSolid(engine, shape, DEFAULT_COLLAR);
    try {
      const { min, max } = solid.boundingBox();
      // The disc, 5 mm past the collar's 155.8 mm outside each way, 2.4 mm thick; the skirt 8 mm on it.
      expect([min[0], max[0], min[2], max[2]].map((v) => Math.round(v * 1000) / 1000)).toEqual([-82.9, 82.9, 0, 10.4]);
      // The skirt fits the collar's 151 mm inside with 0.2 mm to spare.
      expect(probe(solid, 75.1, 0, 6, 0.1)).toBeGreaterThan(0);
      expect(probe(solid, 75.4, 0, 6, 0.1)).toBe(0);
      expect(probe(solid, 0, 0, 6)).toBe(0); // hollow
    } finally {
      solid.delete();
    }
  });

  it('fits a twist-lock’s collar the same way, sized for the ring', () => {
    const [shape] = capShapes([{ hoseMm: 150, column: 2, row: 1 }], TWIST);
    if (shape === undefined) throw new Error('no cap');
    const solid = capSolid(engine, shape, DEFAULT_COLLAR);
    try {
      expect(probe(solid, 77.5, 0, 6, 0.1)).toBeGreaterThan(0);
      expect(probe(solid, 77.8, 0, 6, 0.1)).toBe(0);
    } finally {
      solid.delete();
    }
  });
});

describe('the screen', () => {
  it('fills the port’s hole with bars 1.6 mm wide round openings 8 mm across', () => {
    const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };
    const solid = portPanel(engine, size, 150, DEFAULT_COLLAR, undefined, { ...DEFAULT_SOCKET, screen: true });
    const open = portPanel(engine, size, 150, DEFAULT_COLLAR);
    try {
      expect(probe(solid, 100, 100, 1.5)).toBeGreaterThan(0); // bars cross at the centre
      expect(probe(solid, 104.8, 104.8, 1.5)).toBe(0); // an opening
      expect(probe(solid, 109.6, 104.8, 1.5)).toBeGreaterThan(0); // the next bar
      expect(probe(open, 100, 100, 1.5)).toBe(0); // without the screen, open (control)
    } finally {
      solid.delete();
      open.delete();
    }
  });
});

describe('the wall with a hose port', () => {
  it('prints the cap with a push-fit port, and the ring too with a twist-lock', () => {
    expect(names(ok({ ports: '150' })).filter((n) => /^(cap|ring)-/.test(n))).toEqual(['cap-150-print-1.stl']);
    expect(names(ok({ ports: '150', portLock: 'twist' })).filter((n) => /^(cap|ring)-/.test(n))).toEqual([
      'ring-150-print-1.stl',
      'cap-150-print-1.stl',
    ]);
    expect(names(ok({ ports: '150', portCap: 'no' })).filter((n) => /^(cap|ring)-/.test(n))).toEqual([]);
  });

  it('says how the hose is held, and what else there is', () => {
    const p = ok({ ports: '150', portLock: 'twist', portScreen: 'yes' });
    expect(describePlan(planWall(p), p).ports).toEqual([
      'Hose port: a 150 mm hose end, in column 2, row 1. A printed ring clamps on the hose end with an M4 bolt ' +
        'at least 22 mm long, and twists into the collar, clockwise seen from the room. A cap closes the port ' +
        'when the AC is off. A screen fills its hole.',
    ]);
    const push = ok({ ports: '150' });
    expect(describePlan(planWall(push), push).ports).toEqual([
      'Hose port: a 150 mm hose end, in column 2, row 1. A cap closes the port when the AC is off.',
    ]);
  });

  it('cuts tape’s groove at the collar’s foot with a twist-lock, clear of the slots, and centred without (control)', () => {
    const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };
    const groove = { widthMm: 9.5, depthMm: 1 };
    const end = socketEndMm(150, TWIST);
    const twisted = portPanel(engine, size, end, DEFAULT_COLLAR, groove, TWIST);
    const pushed = portPanel(engine, size, 150, DEFAULT_COLLAR, groove);
    try {
      // Just inside the collar's wall, into the groove's depth.
      const [tx, ty] = at(100, 100, collarInnerMm(end, DEFAULT_COLLAR) / 2 + 0.5, 60);
      expect(probe(twisted, tx, ty, 3 + 2, 0.1)).toBe(0); // 1 to 10.5 mm up
      expect(probe(twisted, tx, ty, 3 + 12, 0.1)).toBeGreaterThan(0);
      const [px, py] = at(100, 100, collarInnerMm(150, DEFAULT_COLLAR) / 2 + 0.5, 60);
      expect(probe(pushed, px, py, 3 + 2, 0.1)).toBeGreaterThan(0); // centred: 5.25 to 14.75 mm up
      expect(probe(pushed, px, py, 3 + 12, 0.1)).toBe(0);
    } finally {
      twisted.delete();
      pushed.delete();
    }
  });

  it('moves tape in the collar below the slots, and refuses a collar too shallow for both', () => {
    const taped = { seal: 'tape', tapePort: 'yes', ports: '150', portLock: 'twist' };
    expect(read(taped).ok).toBe(true);
    const shallow = read({ ...taped, collarDepthMm: '12' });
    expect(shallow).toMatchObject({ ok: false });
    if (!shallow.ok) {
      expect(shallow.errors.ports).toBe(
        'Port 1: the tape’s groove and the twist-lock’s slots need a collar at least 17.9 mm deep; make it deeper.',
      );
    }
  });
});

describe('the settings', () => {
  it('read the lock, the cap and the screen, and read back what they write', () => {
    expect(read({ portLock: 'thread' })).toMatchObject({ ok: false, errors: { portLock: expect.any(String) } });
    const r = read({ ports: '150', portLock: 'twist', portCap: 'no', portScreen: 'yes' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.socket).toEqual({ lock: 'twist', cap: false, screen: true });
      expect(readParams(toFormValues(r.params))).toEqual(r);
    }
  });
});
