// The strip and the cross piece as solids (backlog item connector-strip, #10). MPL-2.0 like
// the rest of the code (Q36); what it generates belongs to the user.
//
// Each is built from boxes in its own frame: u along the strip, v across it (two slots and
// the web), w through the wall (flange, slot, flange). A pose maps that frame onto the axes:
// in the wall, around a panel lying from z = 0 to its thickness; downloaded, standing on
// the flanges (Q53), so the web is a short bridge and nothing overhangs.
//
// A strip has crush ribs on the insides of its flanges and a hole for a pin through its middle
// in each slot (joint-lock, #110). It is built lying along x in its frame and turned for its pose:
// it is the same mirrored across or through, so a quarter turn does what swapping two axes would.

import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams, PinSlot } from './joint.js';
import {
  PIN_HOLE_MM,
  PIN_MM,
  PIN_SLOT_MM,
  RIB_BASE_MM,
  RIB_LEAD_MM,
  pinDepthMm,
  pinLengthMm,
  pinSlotRangeMm,
  ribPlacesMm,
  stripThicknessMm,
  stripWidthMm,
} from './joint.js';
import type { PanelSize } from './panel.js';
import { WEEP_LENGTH_MM, WEEP_MM, weepPlacesMm } from './rain.js';

// Enough sides that a pin's hole is round to a few hundredths of a mm.
const PIN_SEGMENTS = 32;

export type StripPose = 'wall-vertical' | 'wall-horizontal' | 'print';
export type CrossPose = 'wall' | 'print';

type Range = [number, number];
type Frame = { u: Range; v: Range; w: Range };

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

function solidOf(engine: Engine, boxes: Frame[], place: (f: Frame) => [Range, Range, Range]) {
  const parts = boxes.map((f) => {
    const [x, y, z] = place(f);
    return engine.Manifold.cube([x[1] - x[0], y[1] - y[0], z[1] - z[0]]).translate([x[0], y[0], z[0]]);
  });
  const solid = engine.Manifold.union(parts);
  for (const p of parts) p.delete();
  return solid;
}

function dimensions(joint: JointParams, panelMm: number) {
  requirePositive('panel thickness', panelMm);
  const width = stripWidthMm(joint);
  const thick = stripThicknessMm(joint, panelMm);
  const web: Range = [(width - joint.webMm) / 2, (width + joint.webMm) / 2];
  const inner: Range = [joint.flangeMm, thick - joint.flangeMm]; // the slot, panel plus fit
  // In the wall the panel lies from z = 0, so the strip starts a flange and a fit below it.
  const below = joint.flangeMm + joint.fitMm;
  return { width, thick, web, inner, below };
}

// The ribs, each a ridge across its slot from the mouth to the web, pointed, reaching the grip
// past the panel's face; over the first RIB_LEAD_MM in from the mouth it grows from a point.
function ribs(engine: Engine, lengthMm: number, joint: JointParams, panelMm: number): Manifold[] {
  const height = joint.fitMm + joint.gripMm;
  if (joint.gripMm <= 0 || height <= 0) return [];
  const { width, thick } = dimensions(joint, panelMm);
  const half = RIB_BASE_MM / 2;
  const lead = Math.min(RIB_LEAD_MM, joint.slotMm);
  // Each slot by its mouth and the way in; each flange by its inner face and the way out from it.
  const slots = [
    { mouth: 0, inward: 1 },
    { mouth: width, inward: -1 },
  ];
  const faces = [
    { face: joint.flangeMm, outward: 1 },
    { face: thick - joint.flangeMm, outward: -1 },
  ];
  return ribPlacesMm(lengthMm).flatMap((u) =>
    slots.flatMap(({ mouth, inward }) =>
      faces.map(({ face, outward }) => {
        const [v0, v1, v2] = [mouth, mouth + inward * lead, mouth + inward * joint.slotMm];
        const tip = face + outward * height;
        const foot = (v: number): [number, number, number][] => [
          [u - half, v, face],
          [u + half, v, face],
        ];
        return engine.Manifold.hull([[u, v0, face], ...foot(v1), [u, v1, tip], ...foot(v2), [u, v2, tip]]);
      }),
    ),
  );
}

// The strip lying along x, across it y, through it z from its outer face.
// With weeps, holes through the flange at w = 0, the outside in the wall, at the floor of both slots
// (rain-face, #117).
function stripInFrame(engine: Engine, lengthMm: number, joint: JointParams, panelMm: number, weeps: boolean): Manifold {
  const { width, thick, web, inner } = dimensions(joint, panelMm);
  const along: Range = [0, lengthMm];
  const boxes: Frame[] = [
    { u: along, v: [0, width], w: [0, joint.flangeMm] },
    { u: along, v: [0, width], w: [thick - joint.flangeMm, thick] },
    { u: along, v: web, w: inner },
  ];
  const plain = solidOf(engine, boxes, ({ u, v, w }) => [u, v, w]);
  const extra = ribs(engine, lengthMm, joint, panelMm);
  let solid = plain;
  if (extra.length > 0) {
    solid = engine.Manifold.union([plain, ...extra]);
    for (const m of [plain, ...extra]) m.delete();
  }
  const r = PIN_HOLE_MM / 2;
  const pins = joint.pins
    ? [pinDepthMm(joint), width - pinDepthMm(joint)].map((v) =>
        engine.Manifold.cylinder(thick + 2, r, r, PIN_SEGMENTS).translate([lengthMm / 2, v, -1]),
      )
    : [];
  const weepBoxes: Frame[] = weeps
    ? weepPlacesMm(lengthMm).flatMap((u) =>
        [web[1], web[0] - WEEP_MM].map((v) => ({
          u: [u - WEEP_LENGTH_MM / 2, u + WEEP_LENGTH_MM / 2] as Range,
          v: [v, v + WEEP_MM] as Range,
          w: [-1, joint.flangeMm + 0.1] as Range,
        })),
      )
    : [];
  const holes = [...pins, ...weepBoxes.map((f) => solidOf(engine, [f], ({ u, v, w }) => [u, v, w]))];
  if (holes.length === 0) return solid;
  const cut = engine.Manifold.union(holes);
  const holed = solid.subtract(cut);
  for (const m of [...holes, cut, solid]) m.delete();
  return holed;
}

export function stripSolid(
  engine: Engine,
  lengthMm: number,
  joint: JointParams,
  panelMm: number,
  pose: StripPose,
  weeps = false,
): Manifold {
  requirePositive('lengthMm', lengthMm);
  const { width, thick, below } = dimensions(joint, panelMm);
  const strip = stripInFrame(engine, lengthMm, joint, panelMm, weeps);
  // Along a horizontal joint it lies as built, lowered round the panel; along a vertical one it is
  // turned a quarter round; to print, it is stood on its flanges, across the strip upward.
  const placed =
    pose === 'wall-horizontal'
      ? strip.translate([0, 0, -below])
      : pose === 'wall-vertical'
        ? strip.rotate([0, 0, 90]).translate([width, 0, -below])
        : strip.rotate([90, 0, 0]).translate([0, thick, 0]);
  strip.delete();
  return placed;
}

// A pin, for the preview: through the strip, centred on the origin seen from the front, as the
// strip lies round a panel from z = 0 to its thickness.
export function pinSolid(engine: Engine, joint: JointParams, panelMm: number): Manifold {
  const { below } = dimensions(joint, panelMm);
  const r = PIN_MM / 2;
  return engine.Manifold.cylinder(pinLengthMm(joint, panelMm), r, r, PIN_SEGMENTS).translate([0, 0, -below]);
}

// The slots the pins go through in a piece, lying as it prints: each across its edge, as long as
// the slide, so the piece still slides in its strip.
export function pinSlotCuts(engine: Engine, size: PanelSize, slots: readonly PinSlot[], joint: JointParams): Manifold {
  const { fromMm, toMm } = pinSlotRangeMm(joint);
  const { widthMm: w, heightMm: h, thicknessMm: t } = size;
  const r = PIN_SLOT_MM / 2;
  const ends = (slot: PinSlot): [number, number][] => {
    const a = slot.alongMm;
    switch (slot.edge) {
      case 'left':
        return [
          [fromMm, a],
          [toMm, a],
        ];
      case 'right':
        return [
          [w - fromMm, a],
          [w - toMm, a],
        ];
      case 'bottom':
        return [
          [a, fromMm],
          [a, toMm],
        ];
      case 'top':
        return [
          [a, h - fromMm],
          [a, h - toMm],
        ];
      default: {
        const unknown: never = slot.edge;
        throw new Error(`No edge ${String(unknown)}`);
      }
    }
  };
  const cuts = slots.map((slot) => {
    const discs = ends(slot).map(([x, y]) => engine.Manifold.cylinder(t + 2, r, r, PIN_SEGMENTS).translate([x, y, -1]));
    const hull = engine.Manifold.hull(discs);
    for (const d of discs) d.delete();
    return hull;
  });
  const all = engine.Manifold.union(cuts);
  for (const c of cuts) c.delete();
  return all;
}

export function crossSolid(engine: Engine, joint: JointParams, panelMm: number, pose: CrossPose): Manifold {
  const { width, thick, web, inner, below } = dimensions(joint, panelMm);
  const all: Range = [0, width];
  // Here u and v are the two directions in the wall's plane.
  const boxes: Frame[] = [
    { u: all, v: all, w: [0, joint.flangeMm] },
    { u: all, v: all, w: [thick - joint.flangeMm, thick] },
    { u: web, v: all, w: inner },
    { u: all, v: web, w: inner },
  ];
  return solidOf(engine, boxes, ({ u, v, w }) => (pose === 'wall' ? [u, v, [w[0] - below, w[1] - below]] : [u, w, v]));
}
