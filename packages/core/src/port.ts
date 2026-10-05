// The round hose port (backlog item hose-port, #12; the owner's decisions Q102 to Q111).
//
// The hose's round end (Q102) slides into a short collar on the room side (Q104, Q106) and
// stops against a lip. The lip is the panel itself: its hole is smaller than the collar, so
// the piece prints flat, collar up, with no supports. The collar's sizes are starting values
// that a test print confirms (Q107). The port is centred in one piece (Q105) and stays clear
// of the strips along each edge, or no port is made (Q108).
//
// Frame, as every piece: width along X, height along Y, thickness along Z from 0, seen from
// the room (Q106): column 0 at the left, row 0 at the bottom, the collar towards the viewer.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { plainPanel } from './panel-geometry.js';
import type { PanelSize } from './panel-geometry.js';

export interface CollarParams {
  depthMm: number; // how far the hose end goes in
  wallMm: number; // the collar's wall
  clearanceMm: number; // per side, between the hose end and the collar
  lipMm: number; // how far the panel reaches in past the collar's inside: what the hose stops on
}

export const DEFAULT_COLLAR: CollarParams = { depthMm: 20, wallMm: 2.4, clearanceMm: 0.5, lipMm: 5 };

export interface HosePort {
  hoseMm: number; // the hose end's outside diameter (Q102)
  column: number; // from 0, the left seen from the room
  row: number; // from 0, the bottom
}

// Clear of the strips: the slot depth along each edge, and this much more (Q108).
export const PORT_EDGE_CLEARANCE_MM = 2;

// Sides of the polygon drawn for each circle: 128 keeps a 150 mm circle within 0.03 mm.
export const PORT_SEGMENTS = 128;

export const collarInnerMm = (hoseMm: number, c: CollarParams): number => hoseMm + 2 * c.clearanceMm;
export const collarOuterMm = (hoseMm: number, c: CollarParams): number => collarInnerMm(hoseMm, c) + 2 * c.wallMm;
export const portHoleMm = (hoseMm: number, c: CollarParams): number => collarInnerMm(hoseMm, c) - 2 * c.lipMm;

// The smallest piece, each way, that holds the port clear of the strips.
export const portPieceMm = (hoseMm: number, c: CollarParams, joint: JointParams): number =>
  collarOuterMm(hoseMm, c) + 2 * (joint.slotMm + PORT_EDGE_CLEARANCE_MM);

// The bottom row's middle piece; with an even number of columns, the one left of centre (Q110).
export function defaultPortPiece(plan: GridLayout): { column: number; row: number } {
  return { column: Math.floor((plan.columns.length - 1) / 2), row: 0 };
}

const mm = (n: number): string => String(Math.round(n * 10) / 10);

export function checkPort(
  plan: GridLayout,
  port: HosePort,
  collar: CollarParams,
  joint: JointParams,
): { ok: true } | { ok: false; message: string } {
  const where = `column ${port.column + 1}, row ${port.row + 1}`;
  const piece = plan.pieces.find((p) => p.column === port.column && p.row === port.row);
  if (piece === undefined) {
    const { length: columns } = plan.columns;
    const { length: rows } = plan.rows;
    return { ok: false, message: `There is no ${where}: the wall has ${columns} columns and ${rows} rows.` };
  }
  const needs = portPieceMm(port.hoseMm, collar, joint);
  if (piece.widthMm >= needs && piece.heightMm >= needs) return { ok: true };
  return {
    ok: false,
    message:
      `A ${mm(port.hoseMm)} mm hose port needs a piece at least ${mm(needs)} × ${mm(needs)} mm; ` +
      `${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  };
}

// The piece with the port: the panel with the hole, and the collar standing on its room side.
export function portPanel(engine: Engine, size: PanelSize, hoseMm: number, collar: CollarParams): Manifold {
  const hole = portHoleMm(hoseMm, collar);
  if (!(hole > 0)) {
    throw new RangeError(`The lip (${collar.lipMm} mm) closes a ${hoseMm} mm hose's port; make it smaller`);
  }
  const { Manifold } = engine;
  const centre: [number, number, number] = [size.widthMm / 2, size.heightMm / 2, 0];
  const t = size.thicknessMm;
  const parts: Manifold[] = [];
  const keep = <T extends Manifold>(m: T): T => {
    parts.push(m);
    return m;
  };
  try {
    const panel = keep(plainPanel(engine, size));
    const cut = keep(Manifold.cylinder(t + 2, hole / 2, hole / 2, PORT_SEGMENTS).translate([centre[0], centre[1], -1]));
    const outer = keep(Manifold.cylinder(collar.depthMm, collarOuterMm(hoseMm, collar) / 2, -1, PORT_SEGMENTS));
    const inner = keep(Manifold.cylinder(collar.depthMm + 2, collarInnerMm(hoseMm, collar) / 2, -1, PORT_SEGMENTS).translate([0, 0, -1]));
    const ring = keep(outer.subtract(inner).translate([centre[0], centre[1], t]));
    const holed = keep(panel.subtract(cut));
    return holed.add(ring);
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}
