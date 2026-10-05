// The strip and the cross piece as solids (backlog item connector-strip, #10). MPL-2.0 like
// the rest of the code (Q36); what it generates belongs to the user.
//
// Each is built from boxes in its own frame: u along the strip, v across it (two slots and
// the web), w through the wall (flange, slot, flange). A pose maps that frame onto the axes:
// in the wall, around a panel lying from z = 0 to its thickness; downloaded, standing on
// the flanges (Q53), so the web is a short bridge and nothing overhangs.

import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import { stripThicknessMm, stripWidthMm } from './joint.js';

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
    return engine.Manifold.cube([x[1] - x[0], y[1] - y[0], z[1] - z[0]]).translate([
      x[0],
      y[0],
      z[0],
    ]);
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

export function stripSolid(
  engine: Engine,
  lengthMm: number,
  joint: JointParams,
  panelMm: number,
  pose: StripPose,
): Manifold {
  requirePositive('lengthMm', lengthMm);
  const { width, thick, web, inner, below } = dimensions(joint, panelMm);
  const along: Range = [0, lengthMm];
  const boxes: Frame[] = [
    { u: along, v: [0, width], w: [0, joint.flangeMm] },
    { u: along, v: [0, width], w: [thick - joint.flangeMm, thick] },
    { u: along, v: web, w: inner },
  ];
  const lowered = (w: Range): Range => [w[0] - below, w[1] - below];
  return solidOf(engine, boxes, ({ u, v, w }) => {
    if (pose === 'wall-vertical') return [v, u, lowered(w)];
    if (pose === 'wall-horizontal') return [u, v, lowered(w)];
    return [u, w, v]; // print: across the strip is up, so it stands on its flanges
  });
}

export function crossSolid(
  engine: Engine,
  joint: JointParams,
  panelMm: number,
  pose: CrossPose,
): Manifold {
  const { width, thick, web, inner, below } = dimensions(joint, panelMm);
  const all: Range = [0, width];
  // Here u and v are the two directions in the wall's plane.
  const boxes: Frame[] = [
    { u: all, v: all, w: [0, joint.flangeMm] },
    { u: all, v: all, w: [thick - joint.flangeMm, thick] },
    { u: web, v: all, w: inner },
    { u: all, v: web, w: inner },
  ];
  return solidOf(engine, boxes, ({ u, v, w }) =>
    pose === 'wall' ? [u, v, [w[0] - below, w[1] - below]] : [u, w, v],
  );
}
