// Printing defaults against warping (print-defaults, #122). A flat print lifts first at its square
// corners as it cools, and its first layers spread at the bed's edge. So every printed piece has its
// corners rounded and its bed-side edge chamfered, both inside the strips' slots where they do not
// show, and the plan gives brim advice for the material. Whatever stands on a piece's room side, a
// collar or a frame, is kept as it was.
import type { CrossSection, Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { MaterialKind } from './material.js';
import type { PanelSize } from './panel.js';
import { mm } from './words.js';

export const PIECE_CORNER_MM = 3;
export const PIECE_CHAMFER_MM = 1;
const CORNER_SEGMENTS = 32; // round the whole circle: 8 to a corner, within 0.06 mm of a true 3 mm round
const ABOVE_MM = 1000; // kept above the chamfer, so nothing on the room side is cut

// The piece's outline with rounded corners, inset by this much all round.
function outline(engine: Engine, size: PanelSize, insetMm: number) {
  const r = PIECE_CORNER_MM;
  const square = engine.CrossSection.square([size.widthMm - 2 * r, size.heightMm - 2 * r]);
  const placed = square.translate([r, r]);
  const round = placed.offset(r - insetMm, 'Round', 2, CORNER_SEGMENTS);
  square.delete();
  placed.delete();
  return round;
}

// A piece lying as it prints, from z = 0 on the bed, made ready: takes the solid and frees it.
export function printReady(engine: Engine, solid: Manifold, size: PanelSize): Manifold {
  const c = PIECE_CHAMFER_MM;
  const [bed, full] = [outline(engine, size, c), outline(engine, size, 0)];
  const at = (section: typeof bed, z: number): [number, number, number][] =>
    section.toPolygons().flatMap((polygon) => polygon.map(([x, y]): [number, number, number] => [x ?? 0, y ?? 0, z]));
  const foot = engine.Manifold.hull([...at(bed, 0), ...at(full, c)]);
  const tall = full.extrude(ABOVE_MM);
  const body = tall.translate([0, 0, c]);
  const keep = foot.add(body);
  const ready = solid.intersect(keep);
  for (const m of [bed, full, foot, tall, body, keep, solid]) m.delete();
  return ready;
}

// A piece whose outline is not a plain rectangle, a puzzle-dovetailed one (#29), made ready: its
// chamfer in steps that follow the outline in and out of its tabs and sockets, each step as thick as
// a fine layer, and its corners kept square, as four meet at a crossing with nothing over them.
// Takes the solid and frees it; the outline stays the caller's.
export const CHAMFER_STEPS = 4;

export function printReadyOutline(engine: Engine, solid: Manifold, shape: CrossSection): Manifold {
  const c = PIECE_CHAMFER_MM;
  const step = c / CHAMFER_STEPS;
  const made: { delete(): void }[] = [];
  const slabs = Array.from({ length: CHAMFER_STEPS }, (_, k) => {
    const inset = shape.offset(-(c - (k + 0.5) * step), 'Miter');
    const slab = inset.extrude(step);
    made.push(inset, slab);
    return slab.translate([0, 0, k * step]);
  });
  const tall = shape.extrude(ABOVE_MM);
  const body = tall.translate([0, 0, c]);
  const keep = engine.Manifold.union([...slabs, body]);
  const ready = solid.intersect(keep);
  for (const m of [...made, ...slabs, tall, body, keep, solid]) m.delete();
  return ready;
}

const BRIM: Record<MaterialKind, string> = {
  pla: 'In PLA, a brim is seldom needed.',
  petg: 'In PETG, add a 5 mm brim if the corners lift.',
  asa: 'In ASA, add a 5 mm brim, and print in an enclosure or out of draughts: it warps as it cools.',
};

export const describePrinting = (material: MaterialKind): string =>
  `Printing: the pieces’ corners are rounded ${mm(PIECE_CORNER_MM)} mm and their bed-side edges chamfered ` +
  `${mm(PIECE_CHAMFER_MM)} mm against warping. ${BRIM[material]}`;
