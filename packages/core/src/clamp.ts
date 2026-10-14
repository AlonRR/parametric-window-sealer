// The clamps (backlog item clamps, #32; Q16): an appliance measured roughly, through an opening in
// one piece, gripped by four printed jaws that slide on bolts through slots in them. MPL-2.0 like
// the rest of the code (Q36); the parts it makes belong to whoever makes them.
//
// Chosen without asking (Q144; docs/choices.md). The opening is the appliance's measured size and
// half the jaws' travel each side; each jaw slides that travel, so the clamp grips anything from
// the measured size less the travel to the measured size plus it, each way. A jaw is a flat foot
// on the panel's room face with a lip standing at its inner edge, against the appliance; two M4
// bolts through slots in the foot and holes in the panel hold it where it is slid to. The jaws at
// the top and bottom reach past the opening's corners; the ones at the sides fit between them at
// the tightest. A clamp sits in one piece, centred, clear of the strips, as a cutout does (C40).
//
// The piece's solid is clampPanel, with the clamp as a fitting in fittings/clamp.ts.
import type { Manifold } from 'manifold-3d';
import type { Rectangle } from './cutout.js';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { plainPanel } from './panel.js';
import type { PanelSize } from './panel.js';
import { PORT_EDGE_CLEARANCE_MM, PORT_SEGMENTS } from './port.js';

export interface ClampSetting {
  widthMm: number; // the appliance's measured outside, seen from the room
  heightMm: number;
  column?: number; // from 1, the left seen from the room; left out, the starting piece
  row?: number; // from 1, the bottom
}

export interface ClampParams {
  travelMm: number; // how far each jaw slides
  depthMm: number; // how far a jaw's lip stands out on the room side
}

export const DEFAULT_CLAMP: ClampParams = { travelMm: 10, depthMm: 15 };

// M4 bolts, through holes as the fan's screw holes are (C91).
export const CLAMP_BOLT_HOLE_MM = 4.5;
const LIP_MM = 2.4; // a jaw's lip, as thick as the rim's wall (C42)
const BOLT_OUT_MM = 6; // from the opening's edge out to a bolt's centre
const SLOT_MARGIN_MM = 3; // solid beyond a slot's end
const CORNER_REACH_MM = 4; // the long jaws reach this far past the opening at each end
const END_CLEARANCE_MM = 0.5; // between a short jaw's end and the long jaws, at the tightest

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const grown = (r: Rectangle, by: number): Rectangle => ({
  widthMm: round(r.widthMm + 2 * by),
  heightMm: round(r.heightMm + 2 * by),
});
const mm = (n: number): string => String(Math.round(n * 10) / 10);

const FORM = /^([0-9]*\.?[0-9]+)x([0-9]*\.?[0-9]+)(?:@([0-9]+),([0-9]+))?$/;

// The --clamp form, as --cutout's (C44): 120x80, or 120x80@2,1; several separated by spaces.
export function parseClamps(text: string): { ok: true; clamps: ClampSetting[] } | { ok: false; message: string } {
  const clamps: ClampSetting[] = [];
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
          `Clamp ${i + 1}: write each as the appliance’s measured width x height in mm, then optionally ` +
          '@column,row, as 120x80 or 120x80@2,1.',
      };
    }
    clamps.push(column === undefined ? { widthMm, heightMm } : { widthMm, heightMm, column, row });
  }
  return { ok: true, clamps };
}

export function formatClamps(clamps: readonly ClampSetting[]): string {
  return clamps
    .map((c) => {
      const piece = c.column === undefined && c.row === undefined ? '' : `@${c.column ?? ''},${c.row ?? ''}`;
      return `${c.widthMm}x${c.heightMm}${piece}`;
    })
    .join(' ');
}

// The opening: the appliance and half the travel each side.
export const clampOpeningMm = (c: Rectangle, clamp: ClampParams): Rectangle => grown(c, clamp.travelMm / 2);

// What the jaws grip: the measured size, give or take the travel, each way.
export const clampRangeMm = (c: Rectangle, clamp: ClampParams): { from: Rectangle; to: Rectangle } => ({
  from: grown(c, -clamp.travelMm / 2),
  to: grown(c, clamp.travelMm / 2),
});

// How far a jaw's foot reaches out from its lip: past the bolt at the far end of its slot.
const footMm = (clamp: ClampParams): number =>
  round(BOLT_OUT_MM + clamp.travelMm + CLAMP_BOLT_HOLE_MM / 2 + SLOT_MARGIN_MM);

// The panel the jaws cover, slid right out: the opening and a foot each side.
export const clampFootprintMm = (c: Rectangle, clamp: ClampParams): Rectangle =>
  grown(clampOpeningMm(c, clamp), footMm(clamp));

// The smallest piece, each way, that holds the jaws clear of the strips (as Q108).
export const clampPieceMm = (c: Rectangle, clamp: ClampParams, joint: JointParams): Rectangle =>
  grown(clampFootprintMm(c, clamp), joint.slotMm + PORT_EDGE_CLEARANCE_MM);

// The bolts: through a jaw's foot, as thick as the panel, and the panel, with a washer each side
// and a nut, to the next whole mm.
export const clampBoltMm = (thicknessMm: number): number => Math.ceil(2 * thicknessMm + 6 - 1e-9);

// Each jaw's length: the long ones across the top and bottom, past the corners; the short ones at
// the sides, between the long ones when they are slid tightest.
const longJawMm = (c: Rectangle, clamp: ClampParams): number =>
  round(clampOpeningMm(c, clamp).widthMm + 2 * CORNER_REACH_MM);
const shortJawMm = (c: Rectangle, clamp: ClampParams): number =>
  round(clampRangeMm(c, clamp).from.heightMm - 2 * END_CLEARANCE_MM);

// The least a jaw can be: room for its two slots, a quarter of the way in from each end.
const LEAST_JAW_MM = 4 * (CLAMP_BOLT_HOLE_MM / 2 + SLOT_MARGIN_MM);
const leastApplianceMm = (clamp: ClampParams): number => round(clamp.travelMm + 2 * END_CLEARANCE_MM + LEAST_JAW_MM);

// In the piece's file name: piece-c2-r1-197.7x198.6-clamp-120x80.stl.
export const clampTag = (c: Rectangle): string => `-clamp-${mm(c.widthMm)}x${mm(c.heightMm)}`;

export function checkClamp(
  plan: GridLayout,
  clamp: Rectangle & { column: number; row: number }, // column and row from 0
  params: ClampParams,
  joint: JointParams,
): { ok: true } | { ok: false; message: string } {
  const least = leastApplianceMm(params);
  if (clamp.widthMm < least - 1e-9 || clamp.heightMm < least - 1e-9) {
    return {
      ok: false,
      message:
        `its jaws close in by ${mm(params.travelMm)} mm, so measure an appliance at least ${mm(least)} mm each way ` +
        'for them, or make their travel shorter.',
    };
  }
  const where = `column ${clamp.column + 1}, row ${clamp.row + 1}`;
  const piece = plan.pieces.find((p) => p.column === clamp.column && p.row === clamp.row);
  if (piece === undefined) {
    return {
      ok: false,
      message: `there is no ${where}: the wall has ${plan.columns.length} columns and ${plan.rows.length} rows.`,
    };
  }
  const needs = clampPieceMm(clamp, params, joint);
  if (piece.widthMm >= needs.widthMm - 1e-9 && piece.heightMm >= needs.heightMm - 1e-9) return { ok: true };
  return {
    ok: false,
    message:
      `a ${mm(clamp.widthMm)} × ${mm(clamp.heightMm)} mm appliance with clamps needs a piece at least ` +
      `${mm(needs.widthMm)} × ${mm(needs.heightMm)} mm; ${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  };
}

// A jaw as it prints: the same sizes are one shape, with how many to print.
export interface JawShape {
  kind: 'jaw';
  lengthMm: number;
  widthMm: number; // its foot, out from the lip's face
  depthMm: number; // its lip, from the panel's face
  footMm: number; // its foot's thickness: the panel's
  travelMm: number; // its slots' length, centre to centre
  count: number;
}

export function jawShapes(clamps: readonly Rectangle[], params: ClampParams, thicknessMm: number): JawShape[] {
  const shapes = new Map<number, JawShape>();
  const add = (lengthMm: number) => {
    const seen = shapes.get(lengthMm) ?? {
      kind: 'jaw' as const,
      lengthMm,
      widthMm: footMm(params),
      depthMm: Math.max(params.depthMm, thicknessMm),
      footMm: thicknessMm,
      travelMm: params.travelMm,
      count: 0,
    };
    seen.count += 2;
    shapes.set(lengthMm, seen);
  };
  for (const c of clamps) {
    add(longJawMm(c, params));
    add(shortJawMm(c, params));
  }
  return [...shapes.values()];
}

// A slot, or a round hole when it has no length: the hull of two bolt holes along y.
function slot(engine: Engine, x: number, fromY: number, toY: number, heightMm: number): Manifold {
  const { Manifold } = engine;
  const r = CLAMP_BOLT_HOLE_MM / 2;
  const at = (y: number) => Manifold.cylinder(heightMm, r, r, PORT_SEGMENTS).translate([x, y, 0]);
  const [a, b] = [at(fromY), at(toY)];
  const hull = Manifold.hull([a, b]);
  a.delete();
  b.delete();
  return hull;
}

// A jaw lying as it prints: its foot on the bed, its lip along the edge at y = 0, which faces the
// appliance; a slot a quarter of the way in from each end, from where the bolt sits with the jaw
// slid right out to where it sits slid right in.
export function jawSolid(engine: Engine, shape: JawShape): Manifold {
  const { Manifold } = engine;
  const made: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    made.push(m);
    return m;
  };
  try {
    const foot = keep(Manifold.cube([shape.lengthMm, shape.widthMm, shape.footMm]));
    const lip = keep(Manifold.cube([shape.lengthMm, LIP_MM, shape.depthMm]));
    const slots = [shape.lengthMm / 4, (3 * shape.lengthMm) / 4].map((x) =>
      keep(keep(slot(engine, x, BOLT_OUT_MM, BOLT_OUT_MM + shape.travelMm, shape.footMm + 2)).translate([0, 0, -1])),
    );
    return keep(foot.add(lip)).subtract(keep(Manifold.union(slots)));
  } finally {
    for (const m of made) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The piece with a clamp: the opening right through the panel, centred, and a bolt hole under
// each of the jaws' slots, 6 mm out from the opening. Nothing stands proud of the panel: the jaws
// are printed beside it.
export function clampPanel(engine: Engine, size: PanelSize, c: Rectangle, params: ClampParams): Manifold {
  const { Manifold } = engine;
  const [cx, cy] = [size.widthMm / 2, size.heightMm / 2];
  const t = size.thicknessMm;
  const opening = clampOpeningMm(c, params);
  const [long, short] = [longJawMm(c, params), shortJawMm(c, params)];
  const [ox, oy] = [opening.widthMm / 2 + BOLT_OUT_MM, opening.heightMm / 2 + BOLT_OUT_MM];
  const bolts: [number, number][] = [];
  for (const side of [-1, 1]) {
    for (const along of [-1, 1]) bolts.push([(along * long) / 4, side * oy], [side * ox, (along * short) / 4]);
  }
  const made: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    made.push(m);
    return m;
  };
  const r = CLAMP_BOLT_HOLE_MM / 2;
  try {
    const panel = keep(plainPanel(engine, size));
    const hole = keep(keep(Manifold.cube([opening.widthMm, opening.heightMm, t + 2], true)).translate([cx, cy, t / 2]));
    const holes = bolts.map(([x, y]) =>
      keep(keep(Manifold.cylinder(t + 2, r, r, PORT_SEGMENTS)).translate([cx + x, cy + y, -1])),
    );
    return panel.subtract(keep(Manifold.union([hole, ...holes])));
  } finally {
    for (const m of made) m.delete(); // WebAssembly memory: free everything but the result
  }
}
