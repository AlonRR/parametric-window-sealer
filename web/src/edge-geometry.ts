// The edge strip as a solid (backlog item track-edge, #11). MPL-2.0 like the rest of the
// code (Q36); what it generates belongs to the user.
//
// Built from boxes in its own frame: u along the edge, v from the strip's outer face (in
// the track's bottom, on the sill, against the sash) to the slot's mouth, w through the
// wall, centred on the panel's mid-plane. A pose maps that frame onto the axes: in the
// wall along one of its edges, with the panel lying from z = 0 to its thickness; or
// downloaded, standing on its base with the slot open upward (Q53).

import type { Manifold } from 'manifold-3d';
import type { EdgeName } from './edge';
import type { Engine } from './engine';
import type { JointParams } from './joint';

export type EdgePose = EdgeName | 'print';

type Range = [number, number];

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function edgeStripSolid(
  engine: Engine,
  lengthMm: number,
  profile: { widthMm: number; heightMm: number },
  joint: JointParams,
  panelMm: number,
  pose: EdgePose,
): Manifold {
  requirePositive('lengthMm', lengthMm);
  requirePositive('panel thickness', panelMm);
  const { widthMm: width, heightMm: height } = profile;
  const slot: Range = [-joint.fitMm, panelMm + joint.fitMm];
  // The walls either side of the slot are kept at least as thick as the joint's flanges.
  if ((width - (slot[1] - slot[0])) / 2 < joint.flangeMm - 1e-9) {
    throw new RangeError(
      `An edge strip ${width} mm wide leaves walls thinner than the ${joint.flangeMm} mm flanges`,
    );
  }
  if (height <= joint.slotMm) {
    throw new RangeError(`An edge strip ${height} mm tall has no base under its slot`);
  }
  const across: Range = [panelMm / 2 - width / 2, panelMm / 2 + width / 2];
  const floor = height - joint.slotMm; // the base under the slot
  const along: Range = [0, lengthMm];
  const boxes: { u: Range; v: Range; w: Range }[] = [
    { u: along, v: [0, floor], w: across },
    { u: along, v: [floor, height], w: [across[0], slot[0]] },
    { u: along, v: [floor, height], w: [slot[1], across[1]] },
  ];
  const flip = (v: Range): Range => [height - v[1], height - v[0]];
  const place = ({ u, v, w }: (typeof boxes)[number]): [Range, Range, Range] => {
    switch (pose) {
      case 'bottom':
        return [u, v, w];
      case 'top':
        return [u, flip(v), w];
      case 'left':
        return [v, u, w];
      case 'right':
        return [flip(v), u, w];
      case 'print':
        return [u, [w[0] - across[0], w[1] - across[0]], v];
    }
  };
  const parts = boxes.map((b) => {
    const [x, y, z] = place(b);
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
