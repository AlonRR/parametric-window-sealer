// The flattened hose port in a tilted sash's top strip (sash-wedge, #159; docs/research/sash-wedge.md).
//
// A round 150 mm hose does not fit the 100 to 160 mm gap a tilted sash leaves, so the port is a flat
// slot through one of the top strip's pieces, the one nearest its middle. The slot is as wide
// across the strip as the room between its edge strips allows, and as long along it as gives it the
// hose's own area, if the piece is long enough; otherwise as long as the piece allows, and the share
// of the hose's area it has is said. On the room side, printed as one with the piece, the slot's
// walls rise straight until clear of the edge strips, then a hollow transition leads up to the round
// collar the hose slides into, as the round port's collar does (port.ts): the hose stops on a lip at
// the collar's foot. A round collar is wider than the gap, so it is moved toward the room, off the
// frame's face. The piece prints panel down, collar up: the transition's walls lean at most
// PORT_SLOPE_DEG off upright, so it needs no supports.
//
// Frame, as wedge-geometry.ts's: x along the side triangles' axis from the hinge, y across it (the
// frame's face at +y, the sash's at -y), z along the top strip from the left triangle's outer face.
import type { JointParams } from './joint.js';
import { DEFAULT_COLLAR } from './port.js';
import type { CollarParams } from './port.js';
import { wedgeCorner } from './wedge-geometry.js';
import type { TiltWedge } from './wedge.js';
import { mm } from './words.js';

export const PORT_MARGIN_MM = 2; // clear of the edge strips, the joint strips over the piece's ends, and the frame's face
export const PORT_SLOPE_DEG = 40; // the transition's walls lean at most this far off upright

export interface FlatPort {
  hoseMm: number;
  collar: CollarParams;
  piece: number; // which of the top strip's pieces it is in, from the left, from 0
  centreMm: number; // along the top strip, the slot's middle
  slot: { widthMm: number; lengthMm: number }; // across the top strip, and along it
  areaShare: number; // the slot's area over the hose's
  straightToMm: number; // along the axis, how far the walls rise straight
  collarFromMm: number; // where the transition ends and the collar starts
  collarAxisMm: number; // across the axis, the collar's middle
}

// The largest step, square to the axis, between a rectangle a × b either side of the axis and a
// circle of radius r with its middle at y across it: the most a wall from one to the other leans
// out in any direction, as its height.
function largestStep(a: number, b: number, r: number, y: number): number {
  let most = 0;
  for (let i = 0; i < 720; i++) {
    const t = (i * Math.PI) / 360;
    const [c, s] = [Math.cos(t), Math.sin(t)];
    most = Math.max(most, Math.abs(y * c + r - (a * Math.abs(c) + b * Math.abs(s))));
  }
  return most;
}

export function flatPort(
  wedge: TiltWedge,
  profile: { widthMm: number; heightMm: number },
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
  hoseMm: number,
  collar: CollarParams = DEFAULT_COLLAR,
): FlatPort | { problem: string } {
  const inside = hoseMm / 2 + collar.clearanceMm;
  const outside = inside + collar.wallMm;
  if (2 * outside > maxPieceMm) {
    return {
      problem: `A ${mm(hoseMm)} mm hose’s collar is wider than the printer makes a piece: ${mm(maxPieceMm)} mm.`,
    };
  }
  const half = ((wedge.tiltDeg / 2) * Math.PI) / 180;
  const [tan, cos] = [Math.tan(half), Math.cos(half)];
  const { axisMm } = wedge.side;
  const xTop = axisMm - profile.widthMm / 2;
  const mouth = xTop * tan - profile.heightMm / cos; // the top strip's edge strips' slots' mouths
  const widthMm = 2 * (mouth - PORT_MARGIN_MM) - 2 * collar.wallMm;
  if (!(widthMm > 0)) {
    return {
      problem: 'The top strip has no room for a port between its edge strips: the gap at the top is too small.',
    };
  }

  // The piece nearest the top strip's middle; of two as near, the first.
  const { pieces, jointsMm } = wedge.top.chain;
  const middle = wedge.top.lengthMm / 2;
  let at = wedgeCorner(profile, joint, panelMm).reachMm;
  let best = { piece: 0, centreMm: 0, lengthMm: 0 };
  let nearest = Infinity;
  pieces.forEach((length, i) => {
    const centreMm = at + length / 2;
    if (Math.abs(centreMm - middle) < nearest - 1e-9) {
      nearest = Math.abs(centreMm - middle);
      best = { piece: i, centreMm, lengthMm: length };
    }
    at += length + (jointsMm[i] ?? 0);
  });
  // Clear of the joint strips over the piece's ends, which reach in as far as a piece goes into them.
  const inSlot = joint.slotMm - joint.slideMm / 2;
  const room = best.lengthMm - 2 * (inSlot + PORT_MARGIN_MM) - 2 * collar.wallMm;
  if (!(room > 0)) return { problem: 'The top strip’s pieces are too short for a port.' };
  const area = Math.PI * (hoseMm / 2) ** 2;
  const lengthMm = Math.min(area / widthMm, room);

  // Straight up past the edge strips' tops, which are the triangles' top; then the transition.
  const straightToMm = axisMm + 1;
  const lip = inside - collar.lipMm;
  const offFrame = (x: number) => Math.min(0, x * tan - outside - PORT_MARGIN_MM);
  const rise = (y: number) =>
    Math.max(
      largestStep(widthMm / 2 + collar.wallMm, lengthMm / 2 + collar.wallMm, outside, y),
      largestStep(widthMm / 2, lengthMm / 2, lip, y),
    ) /
      Math.tan((PORT_SLOPE_DEG * Math.PI) / 180) +
    1;
  // Kept off the frame's face where it is nearest, at the transition's top: first as if that were
  // where the walls stop rising straight, then where the transition that needs ends.
  const first = rise(offFrame(straightToMm));
  const collarAxisMm = offFrame(straightToMm + first);
  const collarFromMm = straightToMm + Math.max(first, rise(collarAxisMm));
  return {
    hoseMm,
    collar,
    piece: best.piece,
    centreMm: best.centreMm,
    slot: { widthMm, lengthMm },
    areaShare: (widthMm * lengthMm) / area,
    straightToMm,
    collarFromMm,
    collarAxisMm,
  };
}
