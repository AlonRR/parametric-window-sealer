// The sliding insert (backlog item sliding-insert, #38; Q16, Q150): two shutters that slide in
// rails on the room face of one piece, closing in round the appliance from each side, each locked
// by a bolt. MPL-2.0 like the rest of the code (Q36); the parts it makes belong to whoever makes them.
//
// The opening is the appliance's height and a clearance above and below, and its width and the
// shutters' travel: each shutter's inner edge can stand anywhere over the travel, so the insert
// closes round anything from the width less the travel to the width plus it. The shutters run in
// two dovetail rails printed on the piece above and below the opening, their bevelled edges in the
// rails' grooves, and an M4 bolt through a slot in each holds it where it is slid to. Unlike the
// clamps, nothing is left open but the clearance above and below the appliance.
//
// The piece's solid is insertPanel, with the insert as a fitting in fittings/insert.ts.
import type { Manifold } from 'manifold-3d';
import type { Rectangle } from './cutout.js';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { plainPanel } from './panel.js';
import type { PanelSize } from './panel.js';
import { PORT_EDGE_CLEARANCE_MM, PORT_SEGMENTS } from './port.js';

export interface InsertSetting {
  widthMm: number; // the appliance, seen from the room
  heightMm: number;
  column?: number;
  row?: number;
}

export interface InsertParams {
  travelMm: number; // how far each shutter slides
  clearanceMm: number; // above and below the appliance
}

export const DEFAULT_INSERT: InsertParams = { travelMm: 20, clearanceMm: 1 };

const BOLT_HOLE_MM = 4.5; // M4, as the clamps' and the fan's
const SHUTTER_MM = 2.4; // a shutter's thickness
const GROOVE_MM = 2.8; // the rails' grooves: a shutter and 0.4 mm play
const CAP_MM = 2.4; // the rail above its groove
const REACH_MM = 4; // how far a groove reaches past the opening at the face; it narrows at 45 degrees
const RAIL_BEYOND_MM = 4; // solid rail beyond the groove
const PLAY_MM = 0.3; // between a shutter's edge and its groove
const BOLT_OUT_MM = 6; // from the opening's edge out to the bolt
const SLOT_END_MM = 6; // from the slot's far end to the shutter's outer edge: half a hole and more

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const mm = (n: number): string => String(Math.round(n * 10) / 10);

const FORM = /^([0-9]*\.?[0-9]+)x([0-9]*\.?[0-9]+)(?:@([0-9]+),([0-9]+))?$/;

// The --insert form, as --cutout's: 120x80, or 120x80@2,1; several separated by spaces.
export function parseInserts(text: string): { ok: true; inserts: InsertSetting[] } | { ok: false; message: string } {
  const inserts: InsertSetting[] = [];
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    const m = FORM.exec(word);
    const [widthMm, heightMm] = [Number(m?.[1]), Number(m?.[2])];
    const column = m?.[3] === undefined ? undefined : Number(m[3]);
    const row = m?.[4] === undefined ? undefined : Number(m[4]);
    if (m === null || !(widthMm > 0) || !(heightMm > 0) || column === 0 || row === 0) {
      return {
        ok: false,
        message:
          `Insert ${i + 1}: write each as the appliance’s width x height in mm, then optionally @column,row, ` +
          'as 120x80 or 120x80@2,1.',
      };
    }
    inserts.push(column === undefined ? { widthMm, heightMm } : { widthMm, heightMm, column, row });
  }
  return { ok: true, inserts };
}

export function formatInserts(inserts: readonly InsertSetting[]): string {
  return inserts
    .map((c) => {
      const piece = c.column === undefined && c.row === undefined ? '' : `@${c.column ?? ''},${c.row ?? ''}`;
      return `${c.widthMm}x${c.heightMm}${piece}`;
    })
    .join(' ');
}

// The opening: half the travel each side of the width, the clearance above and below.
export const insertOpeningMm = (c: Rectangle, p: InsertParams): Rectangle => ({
  widthMm: round(c.widthMm + p.travelMm),
  heightMm: round(c.heightMm + 2 * p.clearanceMm),
});

// A shutter: from its inner edge past the bolt's slot, the travel long.
const shutterWidthMm = (p: InsertParams): number => round(p.travelMm + BOLT_OUT_MM + SLOT_END_MM);

// Where the grooves reach at the face, from the opening's centre.
const grooveMm = (c: Rectangle, p: InsertParams): number => round(insertOpeningMm(c, p).heightMm / 2 + REACH_MM);

// The rails and the shutters slid right out.
export const insertFootprintMm = (c: Rectangle, p: InsertParams): Rectangle => ({
  widthMm: round(insertOpeningMm(c, p).widthMm + 2 * shutterWidthMm(p)),
  heightMm: round(2 * (grooveMm(c, p) + RAIL_BEYOND_MM)),
});

export const insertPieceMm = (c: Rectangle, p: InsertParams, joint: JointParams): Rectangle => {
  const f = insertFootprintMm(c, p);
  const border = 2 * (joint.slotMm + PORT_EDGE_CLEARANCE_MM);
  return { widthMm: round(f.widthMm + border), heightMm: round(f.heightMm + border) };
};

// The bolt: through a shutter and the panel, with a washer each side and a nut.
export const insertBoltMm = (thicknessMm: number): number => Math.ceil(SHUTTER_MM + thicknessMm + 6 - 1e-9);

export const insertTag = (c: Rectangle): string => `-insert-${mm(c.widthMm)}x${mm(c.heightMm)}`;

export function checkInsert(
  plan: GridLayout,
  insert: Rectangle & { column: number; row: number }, // from 0
  p: InsertParams,
  joint: JointParams,
): { ok: true } | { ok: false; message: string } {
  const least = round(p.travelMm + 10);
  if (insert.widthMm < least - 1e-9) {
    return {
      ok: false,
      message:
        `its shutters close in by ${mm(p.travelMm)} mm, so measure an appliance at least ${mm(least)} mm wide ` +
        'for them, or make their travel shorter.',
    };
  }
  const where = `column ${insert.column + 1}, row ${insert.row + 1}`;
  const piece = plan.pieces.find((q) => q.column === insert.column && q.row === insert.row);
  if (piece === undefined) {
    return {
      ok: false,
      message: `there is no ${where}: the wall has ${plan.columns.length} columns and ${plan.rows.length} rows.`,
    };
  }
  const needs = insertPieceMm(insert, p, joint);
  if (piece.widthMm >= needs.widthMm - 1e-9 && piece.heightMm >= needs.heightMm - 1e-9) return { ok: true };
  return {
    ok: false,
    message:
      `a ${mm(insert.widthMm)} × ${mm(insert.heightMm)} mm appliance in a sliding insert needs a piece at least ` +
      `${mm(needs.widthMm)} × ${mm(needs.heightMm)} mm; ${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  };
}

// A shutter as it prints; the same sizes are one shape.
export interface ShutterShape {
  kind: 'shutter';
  widthMm: number; // from its inner edge, along the rails
  heightMm: number; // across, at its bottom face; 2 × its thickness less at the top
  travelMm: number;
  count: number;
}

export function shutterShapes(inserts: readonly Rectangle[], p: InsertParams): ShutterShape[] {
  const shapes = new Map<string, ShutterShape>();
  for (const c of inserts) {
    const heightMm = round(2 * (grooveMm(c, p) - PLAY_MM));
    const widthMm = shutterWidthMm(p);
    const key = `${widthMm}x${heightMm}`;
    const seen = shapes.get(key) ?? { kind: 'shutter' as const, widthMm, heightMm, travelMm: p.travelMm, count: 0 };
    seen.count += 2;
    shapes.set(key, seen);
  }
  return [...shapes.values()];
}

// A prism from x0 to x1 whose cross-section is the hull of a strip at the bottom and one at the top.
function bevelled(
  engine: Engine,
  [x0, x1]: [number, number],
  bottom: [number, number, number], // y from, y to, at z
  top: [number, number, number],
): Manifold {
  const { Manifold } = engine;
  const strip = ([y0, y1, z]: [number, number, number], dz: number) =>
    Manifold.cube([x1 - x0, y1 - y0, 1e-3]).translate([x0, y0, z + dz]);
  const [a, b] = [strip(bottom, 0), strip(top, -1e-3)];
  const hull = Manifold.hull([a, b]);
  a.delete();
  b.delete();
  return hull;
}

// A shutter lying as it prints: its inner edge at x = 0, its bevelled edges along x, and a slot
// from 6 mm in, the travel long, for its bolt.
export function shutterSolid(engine: Engine, shape: ShutterShape): Manifold {
  const { Manifold } = engine;
  const h = shape.heightMm / 2;
  const plate = bevelled(engine, [0, shape.widthMm], [-h, h, 0], [-(h - SHUTTER_MM), h - SHUTTER_MM, SHUTTER_MM]);
  const r = BOLT_HOLE_MM / 2;
  const at = (x: number) => Manifold.cylinder(SHUTTER_MM + 2, r, r, PORT_SEGMENTS).translate([x, 0, -1]);
  const [a, b] = [at(BOLT_OUT_MM), at(BOLT_OUT_MM + shape.travelMm)];
  const slot = Manifold.hull([a, b]);
  const result = plate.subtract(slot);
  for (const m of [plate, a, b, slot]) m.delete();
  return result;
}

// The piece with an insert: the opening, a bolt hole each side 6 mm beyond it, and the two rails
// on the room face above and below it, each with its dovetail groove facing the opening.
export function insertPanel(engine: Engine, size: PanelSize, c: Rectangle, p: InsertParams): Manifold {
  const { Manifold } = engine;
  const [cx, cy, t] = [size.widthMm / 2, size.heightMm / 2, size.thicknessMm];
  const opening = insertOpeningMm(c, p);
  const reach = grooveMm(c, p);
  const half = insertFootprintMm(c, p).widthMm / 2;
  const made: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    made.push(m);
    return m;
  };
  try {
    let solid = keep(plainPanel(engine, size));
    const hole = keep(keep(Manifold.cube([opening.widthMm, opening.heightMm, t + 2], true)).translate([cx, cy, t / 2]));
    const r = BOLT_HOLE_MM / 2;
    const bolts = [-1, 1].map((s) =>
      keep(
        keep(Manifold.cylinder(t + 2, r, r, PORT_SEGMENTS)).translate([
          cx + s * (opening.widthMm / 2 + BOLT_OUT_MM),
          cy,
          -1,
        ]),
      ),
    );
    solid = keep(solid.subtract(keep(Manifold.union([hole, ...bolts]))));
    const edge = opening.heightMm / 2;
    const rails = [-1, 1].map((s) => {
      // Built for the top rail (s = 1), then mirrored for the bottom one.
      const block = keep(
        keep(Manifold.cube([2 * half, reach + RAIL_BEYOND_MM - edge, GROOVE_MM + CAP_MM])).translate([-half, edge, 0]),
      );
      const groove = keep(
        bevelled(engine, [-half - 1, half + 1], [edge - 1, reach + 1, -1], [edge - 1, reach - GROOVE_MM, GROOVE_MM]),
      );
      const rail = keep(block.subtract(groove));
      const placed = s === 1 ? rail : keep(rail.mirror([0, 1, 0]));
      return keep(placed.translate([cx, cy, t]));
    });
    return solid.add(keep(Manifold.union(rails)));
  } finally {
    for (const m of made) m.delete();
  }
}
