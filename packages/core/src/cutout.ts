// The measured cutout (backlog item measured-cutout, #23; Q16): an opening for an appliance
// measured by the user, with a gasket taking up the last few mm. MPL-2.0 like the rest of the
// code (Q36); the parts it makes belong to whoever makes them.
//
// Chosen without asking (Q144; docs/choices.md). A cutout sits inside one piece, centred, and
// stays clear of the strips, as the hose port does (Q105, Q108; C40); a larger appliance is the
// window AC's fitting (#24). It is a rectangle of the appliance's measured outside, seen from the
// room, and the appliance passes right through (C41). A rim stands round it on the room side,
// 15 mm deep with a 2.4 mm wall and 1 mm clearance a side to start with (C42). With a seal, the
// rim is lined with it: foam tape in a groove round the rim's inside, taking the clearance's
// place, or a TPU frame in that groove gripping the appliance (C43). Several are written as the
// ports are (C44), and one without a piece starts in the port's starting piece (C47).
//
// The piece's solid is cutoutPanel, with the cutout as a fitting in fittings/measured-cutout.ts.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { PORT_EDGE_CLEARANCE_MM } from './port.js';
import type { TapeFit } from './tape.js';
import { TPU_GRIP_MM } from './tpu.js';

export interface CutoutSetting {
  widthMm: number; // the appliance's measured outside, seen from the room
  heightMm: number;
  column?: number; // from 1, the left seen from the room; left out, the starting piece
  row?: number; // from 1, the bottom
}

export interface RimParams {
  depthMm: number; // how far it stands out on the room side
  wallMm: number;
  clearanceMm: number; // per side, between the appliance and the rim
}

export const DEFAULT_RIM: RimParams = { depthMm: 15, wallMm: 2.4, clearanceMm: 1 };

export interface Rectangle {
  widthMm: number;
  heightMm: number;
}

const FORM = /^([0-9]*\.?[0-9]+)x([0-9]*\.?[0-9]+)(?:@([0-9]+),([0-9]+))?$/;

// The --cutout form: 120x80, or 120x80@2,1; several separated by spaces.
export function parseCutouts(text: string): { ok: true; cutouts: CutoutSetting[] } | { ok: false; message: string } {
  const cutouts: CutoutSetting[] = [];
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
          `Cutout ${i + 1}: write each as the appliance’s measured width x height in mm, then optionally ` +
          '@column,row, as 120x80 or 120x80@2,1.',
      };
    }
    cutouts.push(column === undefined ? { widthMm, heightMm } : { widthMm, heightMm, column, row });
  }
  return { ok: true, cutouts };
}

export function formatCutouts(cutouts: readonly CutoutSetting[]): string {
  return cutouts
    .map(
      (c) =>
        `${c.widthMm}x${c.heightMm}${c.column === undefined && c.row === undefined ? '' : `@${c.column ?? ''},${c.row ?? ''}`}`,
    )
    .join(' ');
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const grown = (r: Rectangle, by: number): Rectangle => ({
  widthMm: round(r.widthMm + 2 * by),
  heightMm: round(r.heightMm + 2 * by),
});

// The opening: the appliance and the clearance each side.
export const rimInnerMm = (c: Rectangle, rim: RimParams): Rectangle => grown(c, rim.clearanceMm);
export const rimOuterMm = (c: Rectangle, rim: RimParams): Rectangle => grown(c, rim.clearanceMm + rim.wallMm);

// The smallest piece, each way, that holds the rim clear of the strips (Q108).
export const cutoutPieceMm = (c: Rectangle, rim: RimParams, joint: JointParams): Rectangle =>
  grown(rimOuterMm(c, rim), joint.slotMm + PORT_EDGE_CLEARANCE_MM);

// The rim lined with the seal (C43): it takes the clearance, and the wall grows by its groove so
// as much stays behind it, as in the hose port's collar (Q129).
export function linedRim(rim: RimParams, fit: TapeFit | undefined): RimParams {
  if (fit === undefined) return rim;
  return { ...rim, clearanceMm: fit.standOutMm, wallMm: round(rim.wallMm + fit.grooveDepthMm) };
}

const mm = (n: number): string => String(Math.round(n * 10) / 10);

// In the piece's file name: piece-c2-r1-197.7x198.6-cutout-120x80.stl (C46).
export const cutoutTag = (cutout: Rectangle): string => `-cutout-${mm(cutout.widthMm)}x${mm(cutout.heightMm)}`;

export function checkCutout(
  plan: GridLayout,
  cutout: Rectangle & { column: number; row: number }, // column and row from 0
  rim: RimParams,
  joint: JointParams,
): { ok: true } | { ok: false; message: string } {
  const where = `column ${cutout.column + 1}, row ${cutout.row + 1}`;
  const piece = plan.pieces.find((p) => p.column === cutout.column && p.row === cutout.row);
  if (piece === undefined) {
    return {
      ok: false,
      message: `there is no ${where}: the wall has ${plan.columns.length} columns and ${plan.rows.length} rows.`,
    };
  }
  const needs = cutoutPieceMm(cutout, rim, joint);
  if (piece.widthMm >= needs.widthMm - 1e-9 && piece.heightMm >= needs.heightMm - 1e-9) return { ok: true };
  return {
    ok: false,
    message:
      `a ${mm(cutout.widthMm)} × ${mm(cutout.heightMm)} mm cutout needs a piece at least ` +
      `${mm(needs.widthMm)} × ${mm(needs.heightMm)} mm; ${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  };
}

// With the TPU seal, a frame in the rim's groove (C43): from the groove's floor in to the
// appliance less the grip each side, as deep as the tape is wide. The same sizes are one shape.
export interface FrameShape {
  kind: 'frame';
  widthMm: number; // the appliance
  heightMm: number;
  outerWidthMm: number;
  outerHeightMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  depthMm: number;
  count: number;
}

export function frameShapes(cutouts: readonly CutoutSetting[], rim: RimParams, fit: TapeFit): FrameShape[] {
  const shapes = new Map<string, FrameShape>();
  for (const c of cutouts) {
    const key = `${c.widthMm}x${c.heightMm}`;
    const outer = grown(rimInnerMm(c, rim), fit.grooveDepthMm);
    const inner = grown(c, -TPU_GRIP_MM);
    const seen = shapes.get(key) ?? {
      kind: 'frame' as const,
      widthMm: c.widthMm,
      heightMm: c.heightMm,
      outerWidthMm: outer.widthMm,
      outerHeightMm: outer.heightMm,
      innerWidthMm: inner.widthMm,
      innerHeightMm: inner.heightMm,
      depthMm: fit.widthMm,
      count: 0,
    };
    seen.count += 1;
    shapes.set(key, seen);
  }
  return [...shapes.values()];
}

// A rectangular ring standing on z = 0, centred on the origin: the frame as it prints, and the
// rim and its groove in a piece.
export function rectangularRing(engine: Engine, outer: Rectangle, inner: Rectangle, heightMm: number): Manifold {
  const { Manifold } = engine;
  const box = Manifold.cube([outer.widthMm, outer.heightMm, heightMm], true);
  const hole = Manifold.cube([inner.widthMm, inner.heightMm, heightMm + 2], true);
  const ring = box.subtract(hole);
  const solid = ring.translate([0, 0, heightMm / 2]);
  for (const m of [box, hole, ring]) m.delete();
  return solid;
}

export function frameSolid(engine: Engine, shape: FrameShape): Manifold {
  const outer = { widthMm: shape.outerWidthMm, heightMm: shape.outerHeightMm };
  const inner = { widthMm: shape.innerWidthMm, heightMm: shape.innerHeightMm };
  if (!(inner.widthMm > 0 && inner.heightMm > 0 && outer.widthMm > inner.widthMm && outer.heightMm > inner.heightMm)) {
    throw new RangeError(
      `A frame from ${inner.widthMm} × ${inner.heightMm} to ${outer.widthMm} × ${outer.heightMm} mm has no wall`,
    );
  }
  return rectangularRing(engine, outer, inner, shape.depthMm);
}
