// The edge strip as a solid (backlog item track-edge, #11). MPL-2.0 like the rest of the
// code (Q36); what it generates belongs to the user.
//
// Built from boxes in its own frame: u along the edge, v from the strip's outer face (in
// the track's bottom, on the sill, against the sash) to the slot's mouth, w through the
// wall, centred on the panel's mid-plane. A pose maps that frame onto the axes: in the
// wall along one of its edges, with the panel lying from z = 0 to its thickness; or
// downloaded, standing on its base with the slot open upward (Q53).
//
// With tape (seal-tape, #15) a groove runs along the outer face under the slot, and along
// each side where the profile says (Q120, Q127). Standing on its outer face, the strip bridges
// the groove there. edgeTapeSolid is the squeezed tape in those grooves, for the preview only
// (Q132): tape is bought, not printed.

import type { Manifold } from 'manifold-3d';
import type { EdgeGroove, EdgeName, EdgeTape } from './edge.js';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import { TAPE_GROOVE_PLAY_MM, TAPE_GROOVE_WALL_MM } from './tape.js';

export type EdgePose = EdgeName | 'print';

type Range = [number, number];
type Box = { u: Range; v: Range; w: Range };

// Boxes in the strip's frame as one solid in a pose; height is the strip's, across its extent
// through the wall.
function placed(engine: Engine, boxes: Box[], pose: EdgePose, height: number, across: Range): Manifold {
  const flip = (v: Range): Range => [height - v[1], height - v[0]];
  const place = ({ u, v, w }: Box): [Range, Range, Range] => {
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
      default: {
        const unknown: never = pose;
        throw new Error(`No pose ${String(unknown)}`);
      }
    }
  };
  const parts = boxes.map((b) => {
    const [x, y, z] = place(b);
    return engine.Manifold.cube([x[1] - x[0], y[1] - y[0], z[1] - z[0]]).translate([x[0], y[0], z[0]]);
  });
  const solid = engine.Manifold.union(parts);
  for (const p of parts) p.delete();
  return solid;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function edgeStripSolid(
  engine: Engine,
  lengthMm: number,
  profile: { widthMm: number; heightMm: number; groove?: EdgeGroove; tape?: EdgeTape },
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
    throw new RangeError(`An edge strip ${width} mm wide leaves walls thinner than the ${joint.flangeMm} mm flanges`);
  }
  if (height <= joint.slotMm) {
    throw new RangeError(`An edge strip ${height} mm tall has no base under its slot`);
  }
  const groove = profile.groove ?? profile.tape?.groove;
  if (groove !== undefined) {
    if ((width - groove.widthMm) / 2 < TAPE_GROOVE_WALL_MM - 1e-9) {
      throw new RangeError(
        `A ${groove.widthMm} mm groove leaves an edge strip ${width} mm wide walls thinner than ${TAPE_GROOVE_WALL_MM} mm`,
      );
    }
    if (groove.side !== undefined && (width - (slot[1] - slot[0])) / 2 - groove.depthMm < joint.flangeMm - 1e-9) {
      throw new RangeError(`Side grooves ${groove.depthMm} mm deep leave the slot's walls thinner than the flanges`);
    }
  }
  const across: Range = [panelMm / 2 - width / 2, panelMm / 2 + width / 2];
  const floor = height - joint.slotMm; // the base under the slot
  const along: Range = [0, lengthMm];
  const boxes: Box[] = [
    { u: along, v: [0, floor], w: across },
    { u: along, v: [floor, height], w: [across[0], slot[0]] },
    { u: along, v: [floor, height], w: [slot[1], across[1]] },
  ];
  // Grooves, cut through past the ends and the faces so no skin is left.
  const through: Range = [-1, lengthMm + 1];
  const cuts: Box[] = [];
  if (groove !== undefined && groove.depthMm > 0) {
    const mid = panelMm / 2;
    cuts.push({ u: through, v: [-1, groove.depthMm], w: [mid - groove.widthMm / 2, mid + groove.widthMm / 2] });
    if (groove.side !== undefined) {
      const v: Range = [groove.side.fromMm, groove.side.toMm];
      cuts.push({ u: through, v, w: [across[0] - 1, across[0] + groove.depthMm] });
      cuts.push({ u: through, v, w: [across[1] - groove.depthMm, across[1] + 1] });
    }
  }
  const solid = placed(engine, boxes, pose, height, across);
  if (cuts.length === 0) return solid;
  const grooves = placed(engine, cuts, pose, height, across);
  const cut = solid.subtract(grooves);
  for (const m of [grooves, solid]) m.delete();
  return cut;
}

// The squeezed tape along an edge strip, in the strip's pose: the tape's width, centred in each
// groove, from the groove's floor out to where it is squeezed against the track, sash or sill.
export function edgeTapeSolid(
  engine: Engine,
  lengthMm: number,
  profile: { widthMm: number; heightMm: number; tape: EdgeTape },
  panelMm: number,
  pose: EdgePose,
): Manifold {
  requirePositive('lengthMm', lengthMm);
  const { widthMm: width, heightMm: height, tape } = profile;
  const { groove, standOutMm: out } = tape;
  const tapeMm = groove.widthMm - TAPE_GROOVE_PLAY_MM;
  const across: Range = [panelMm / 2 - width / 2, panelMm / 2 + width / 2];
  const along: Range = [0, lengthMm];
  const mid = panelMm / 2;
  const boxes: Box[] = [{ u: along, v: [-out, groove.depthMm], w: [mid - tapeMm / 2, mid + tapeMm / 2] }];
  if (groove.side !== undefined) {
    const centre = (groove.side.fromMm + groove.side.toMm) / 2;
    const v: Range = [centre - tapeMm / 2, centre + tapeMm / 2];
    boxes.push({ u: along, v, w: [across[0] - out, across[0] + groove.depthMm] });
    boxes.push({ u: along, v, w: [across[1] - groove.depthMm, across[1] + out] });
  }
  return placed(engine, boxes, pose, height, across);
}
