// Holding and closing the hose port (hose-socket, #114). Hoses fall out of push-fit kits under their
// own weight, and a gap by the hose draws its hot exhaust back in. The port can hold the hose by a
// twist-lock of its own, which needs nothing from the AC's maker: a printed ring clamped on the hose
// end by an M4 bolt through two lugs, whose three pins go down slots near the collar's mouth and turn
// clockwise, seen from the room, under the collar's rim. A push-fit cap closes the port while the AC
// is off, against cold air and condensation running back; a screen of bars can fill its hole.
//
// Frames: the collar's as portPanel's, centred on its axis, z up from its foot on the panel. The ring
// stands as it prints, on its foot, axis up, split at +y. The cap lies as it prints, its disc on the
// bed and its skirt up.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import { PORT_SEGMENTS, collarInnerMm, collarOuterMm } from './port.js';
import type { CollarParams, PortSetting } from './port.js';

export type PortLock = 'push' | 'twist';
export const PORT_LOCKS: readonly PortLock[] = ['push', 'twist'];

export interface SocketParams {
  lock: PortLock; // the hose pushed in, or held by a ring that twists in
  cap: boolean; // a cap printed for each port
  screen: boolean; // bars across each port's hole
}

// Push-fit to start with, as it needs no bolt, with a cap and no screen.
export const DEFAULT_SOCKET: SocketParams = { lock: 'push', cap: true, screen: false };

// The ring's wall, as a collar's; it slides over the hose end with this much to spare each side,
// and the bolt closes its split to grip.
export const RING_WALL_MM = 2.4;
export const RING_SLIDE_MM = 0.2;
const SPLIT_MM = 3;

// The lugs either side of the split, above the collar's mouth: each this thick along the bolt, this
// far out from the ring and this tall, sloped 45° beneath so they print standing.
const LUG = { thickMm: 6, outMm: 9, tallMm: 16, aboveMouthMm: 2, boltOutMm: 5, boltUpMm: 10.5 };
const BOLT_HOLE_MM = 4.5;

// The bolt: through both lugs and the split, a washer each side and a nut, two threads to spare.
export const RING_BOLT_MM = Math.ceil(2 * LUG.thickMm + SPLIT_MM + 2 * 0.8 + 3.2 + 2);

// The pins: three, this wide round the ring and this tall, flat on top where they bear.
const PIN = { widthMm: 6, heightMm: 4 };
export const PIN_ANGLES_DEG = [0, 120, 240] as const;
// The slots: the window this much taller than a pin, under a band of collar this tall, the way in
// this much wider; each window runs this far round.
const WINDOW_PLAY_MM = 0.6;
const BAND_MM = 1.8;
const ENTRY_PLAY_MM = 1;
export const TWIST_DEG = 20;

// The cap: its disc reaches this far past the collar to be gripped; its skirt fits the collar's inside
// with this much to spare each side.
const CAP = { rimMm: 5, discMm: 2.4, skirtMm: 8, wallMm: 2.4, playMm: 0.2 };

// The screen: bars this wide round square openings this wide.
const GRILLE = { barMm: 1.6, openingMm: 8 };

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// What sits in the collar: the hose end, or the ring round it.
export const socketEndMm = (hoseMm: number, s: SocketParams): number =>
  s.lock === 'twist' ? hoseMm + 2 * RING_WALL_MM : hoseMm;

// Where the slots' windows are, up from the collar's foot.
export const windowBandMm = (c: CollarParams): { fromMm: number; toMm: number } => ({
  fromMm: round(c.depthMm - BAND_MM - PIN.heightMm - WINDOW_PLAY_MM),
  toMm: round(c.depthMm - BAND_MM),
});

// How deep a collar must be for the slots, and below them a groove for tape this wide.
export const twistDepthMm = (grooveWidthMm: number): number =>
  round(1 + grooveWidthMm + 1 + PIN.heightMm + WINDOW_PLAY_MM + BAND_MM);

// A ring's sector, as seen from the room, from one angle anticlockwise to another, between two radii.
function sector(engine: Engine, rIn: number, rOut: number, fromDeg: number, toDeg: number, z: number, h: number) {
  const [a, b] = fromDeg <= toDeg ? [fromDeg, toDeg] : [toDeg, fromDeg];
  const steps = Math.max(2, Math.ceil((b - a) / 2));
  // Out along the outer arc, back along the inner one.
  const arc = (r: number, back: boolean) =>
    Array.from({ length: steps + 1 }, (_, i): [number, number] => {
      const step = back ? steps - i : i;
      const t = ((a + ((b - a) * step) / steps) * Math.PI) / 180;
      return [r * Math.cos(t), r * Math.sin(t)];
    });
  const section = new engine.CrossSection([[...arc(rOut, false), ...arc(rIn, true)]], 'Positive');
  const prism = section.extrude(h);
  const placed = prism.translate([0, 0, z]);
  section.delete();
  prism.delete();
  return placed;
}

// The twist-lock's slots in a collar round an end this wide: for each pin a way in from the mouth,
// then a window turning clockwise seen from the room, through the collar's wall.
export function socketSlots(engine: Engine, endMm: number, collar: CollarParams): Manifold {
  const rIn = collarInnerMm(endMm, collar) / 2 - 0.5;
  const rOut = collarOuterMm(endMm, collar) / 2 + 0.5;
  const half = (((PIN.widthMm + ENTRY_PLAY_MM) / 2 / (rIn + 0.5)) * 180) / Math.PI;
  const band = windowBandMm(collar);
  const cuts = PIN_ANGLES_DEG.flatMap((a) => [
    sector(engine, rIn, rOut, a - half, a + half, band.fromMm, collar.depthMm - band.fromMm + 1),
    sector(engine, rIn, rOut, a - TWIST_DEG - half, a + half, band.fromMm, band.toMm - band.fromMm),
  ]);
  const all = engine.Manifold.union(cuts);
  for (const c of cuts) c.delete();
  return all;
}

// A screen across a hole this wide, the panel this thick: bars both ways, centred on the hole.
export function screenBars(engine: Engine, holeMm: number, thicknessMm: number): Manifold {
  const pitch = GRILLE.barMm + GRILLE.openingMm;
  const count = Math.ceil(holeMm / 2 / pitch);
  const bars: Manifold[] = [];
  for (let i = -count; i <= count; i++) {
    const at = i * pitch - GRILLE.barMm / 2;
    bars.push(engine.Manifold.cube([GRILLE.barMm, holeMm + 2, thicknessMm]).translate([at, -holeMm / 2 - 1, 0]));
    bars.push(engine.Manifold.cube([holeMm + 2, GRILLE.barMm, thicknessMm]).translate([-holeMm / 2 - 1, at, 0]));
  }
  const grid = engine.Manifold.union(bars);
  const disc = engine.Manifold.cylinder(thicknessMm, holeMm / 2 + 0.01, -1, PORT_SEGMENTS);
  const screen = grid.intersect(disc);
  for (const m of [...bars, grid, disc]) m.delete();
  return screen;
}

export interface RingShape {
  kind: 'ring';
  hoseMm: number;
  count: number;
}

export interface CapShape {
  kind: 'cap';
  hoseMm: number;
  endMm: number; // what the collar was made round: the hose end, or its ring
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

function countBy(ports: readonly PortSetting[]): [number, number][] {
  const counts = new Map<number, number>();
  for (const p of ports) counts.set(tenth(p.hoseMm), (counts.get(tenth(p.hoseMm)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => b - a);
}

// A ring for each port with a twist-lock, the same sizes printed together.
export const ringShapes = (ports: readonly PortSetting[], s: SocketParams): RingShape[] =>
  s.lock === 'twist' ? countBy(ports).map(([hoseMm, count]) => ({ kind: 'ring', hoseMm, count })) : [];

// A cap for each port, if asked for.
export const capShapes = (ports: readonly PortSetting[], s: SocketParams): CapShape[] =>
  s.cap ? countBy(ports).map(([hoseMm, count]) => ({ kind: 'cap', hoseMm, endMm: socketEndMm(hoseMm, s), count })) : [];

// A pin round the ring, its foot on the ring's outside: flat on top, sloped 45° beneath.
function pin(engine: Engine, rOut: number, outMm: number, fromZ: number, deg: number): Manifold {
  const w = PIN.widthMm / 2;
  const top = fromZ + PIN.heightMm;
  const tipFoot = Math.min(fromZ + outMm, top - 0.4);
  const points: [number, number, number][] = [
    [rOut - 0.5, -w, fromZ - 0.5],
    [rOut - 0.5, w, fromZ - 0.5],
    [rOut - 0.5, -w, top],
    [rOut - 0.5, w, top],
    [rOut + outMm, -w, tipFoot],
    [rOut + outMm, w, tipFoot],
    [rOut + outMm, -w, top],
    [rOut + outMm, w, top],
  ];
  const block = engine.Manifold.hull(points);
  const turned = block.rotate([0, 0, deg]);
  block.delete();
  return turned;
}

// The ring, standing as it prints: a split tube over the hose end, as tall as the collar is deep and
// the lugs above it, with three pins at the collar's windows.
export function ringSolid(engine: Engine, shape: RingShape, collar: CollarParams): Manifold {
  const { Manifold } = engine;
  const rIn = shape.hoseMm / 2 + RING_SLIDE_MM;
  const rOut = shape.hoseMm / 2 + RING_WALL_MM;
  const foot = collar.depthMm + LUG.aboveMouthMm;
  const height = foot + LUG.tallMm;
  const parts: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    parts.push(m);
    return m;
  };
  try {
    const tube = keep(
      keep(Manifold.cylinder(height, rOut, -1, PORT_SEGMENTS)).subtract(
        keep(keep(Manifold.cylinder(height + 2, rIn, -1, PORT_SEGMENTS)).translate([0, 0, -1])),
      ),
    );
    // Each lug, seen along the bolt: its foot on the ring, sloped 45° beneath, flat on top.
    const lug = (x0: number) =>
      keep(
        Manifold.hull([
          [x0, rOut - 1, foot],
          [x0 + LUG.thickMm, rOut - 1, foot],
          [x0, rOut - 1, height],
          [x0 + LUG.thickMm, rOut - 1, height],
          [x0, rOut + LUG.outMm, foot + LUG.outMm],
          [x0 + LUG.thickMm, rOut + LUG.outMm, foot + LUG.outMm],
          [x0, rOut + LUG.outMm, height],
          [x0 + LUG.thickMm, rOut + LUG.outMm, height],
        ]),
      );
    const band = windowBandMm(collar);
    const pinFrom = (band.fromMm + band.toMm) / 2 - PIN.heightMm / 2;
    const reach = collar.clearanceMm + collar.wallMm - 0.4;
    const body = keep(
      Manifold.union([
        tube,
        lug(SPLIT_MM / 2),
        lug(-SPLIT_MM / 2 - LUG.thickMm),
        ...PIN_ANGLES_DEG.map((a) => keep(pin(engine, rOut, reach, pinFrom, a))),
      ]),
    );
    const split = keep(
      Manifold.cube([SPLIT_MM, LUG.outMm + RING_WALL_MM + 4, height + 2]).translate([-SPLIT_MM / 2, rIn - 1, -1]),
    );
    const bolt = keep(
      keep(Manifold.cylinder(2 * LUG.thickMm + SPLIT_MM + 2, BOLT_HOLE_MM / 2, -1, 32))
        .rotate([0, 90, 0])
        .translate([-LUG.thickMm - SPLIT_MM / 2 - 1, rOut + LUG.boltOutMm, foot + LUG.boltUpMm]),
    );
    return body.subtract(keep(Manifold.union([split, bolt])));
  } finally {
    for (const m of parts) m.delete();
  }
}

// The cap, as it prints: a disc wider than the collar, and a skirt that fits the collar's inside.
export function capSolid(engine: Engine, shape: CapShape, collar: CollarParams): Manifold {
  const { Manifold } = engine;
  const disc = Manifold.cylinder(CAP.discMm, collarOuterMm(shape.endMm, collar) / 2 + CAP.rimMm, -1, PORT_SEGMENTS);
  const rSkirt = collarInnerMm(shape.endMm, collar) / 2 - CAP.playMm;
  const outer = Manifold.cylinder(CAP.skirtMm, rSkirt, -1, PORT_SEGMENTS);
  const inner = Manifold.cylinder(CAP.skirtMm + 2, rSkirt - CAP.wallMm, -1, PORT_SEGMENTS);
  const movedIn = inner.translate([0, 0, -1]);
  const ring = outer.subtract(movedIn);
  const skirt = ring.translate([0, 0, CAP.discMm]);
  const cap = disc.add(skirt);
  for (const m of [disc, outer, inner, movedIn, ring, skirt]) m.delete();
  return cap;
}
