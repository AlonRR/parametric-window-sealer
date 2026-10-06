// The round hose port (backlog item hose-port, #12; the owner's decisions Q102 to Q111).
//
// The hose's round end (Q102) slides into a short collar on the room side (Q104, Q106) and
// stops against a lip. The lip is the panel itself: its hole is smaller than the collar, so
// the piece prints flat, collar up, with no supports. The collar's sizes are starting values
// that a test print confirms (Q107). The port is centred in one piece (Q105) and stays clear
// of the strips along each edge, or no port is made (Q108).
//
// The piece's solid is portPanel, with the port as a fitting in fittings/hose-port.ts. Frame, as
// every piece: width along X, height along Y, thickness along Z from 0, seen from the room
// (Q106): column 0 at the left, row 0 at the bottom, the collar towards the viewer.
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';

export interface CollarParams {
  depthMm: number; // how far the hose end goes in
  wallMm: number; // the collar's wall
  clearanceMm: number; // per side, between the hose end and the collar
  lipMm: number; // how far the panel reaches in past the collar's inside: what the hose stops on
}

export const DEFAULT_COLLAR: CollarParams = { depthMm: 20, wallMm: 2.4, clearanceMm: 0.5, lipMm: 5 };

// The hose sizes the page lists, as outside diameters in mm (Q103): 150 mm from three part
// listings of two makers, 130 mm from one (docs/status.md has the sources). The user can
// always give their own measurement instead.
export const COMMON_HOSE_MM = [150, 130] as const;

// A port as the user gives it: column and row count from 1, at the bottom left seen from the
// room, as the messages and file names do. Left out, they are the starting piece (Q105).
export interface PortSetting {
  hoseMm: number;
  column?: number;
  row?: number;
}

const PORT_FORM = /^([0-9]*\.?[0-9]+)(?:@([0-9]+),([0-9]+))?$/;

// The --port form (Q114): 150, or 150@2,1; several separated by spaces.
export function parsePorts(text: string): { ok: true; ports: PortSetting[] } | { ok: false; message: string } {
  const ports: PortSetting[] = [];
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    const m = PORT_FORM.exec(word);
    const hoseMm = Number(m?.[1]);
    const column = m?.[2] === undefined ? undefined : Number(m[2]);
    const row = m?.[3] === undefined ? undefined : Number(m[3]);
    if (m === null || !(hoseMm > 0) || column === 0 || row === 0) {
      return {
        ok: false,
        message:
          `Port ${i + 1}: write each as the hose end's outside diameter in mm, ` +
          'then optionally @column,row, as 150 or 150@2,1.',
      };
    }
    ports.push(column === undefined ? { hoseMm } : { hoseMm, column, row });
  }
  return { ok: true, ports };
}

export function formatPorts(ports: readonly PortSetting[]): string {
  return ports
    .map((p) =>
      p.column === undefined && p.row === undefined ? `${p.hoseMm}` : `${p.hoseMm}@${p.column ?? ''},${p.row ?? ''}`,
    )
    .join(' ');
}

export interface HosePort {
  hoseMm: number; // the hose end's outside diameter (Q102)
  column: number; // from 0, the left seen from the room
  row: number; // from 0, the bottom
}

// Sides of the polygon drawn for each circle: 128 keeps a 150 mm circle within 0.03 mm.
export const PORT_SEGMENTS = 128;

// Clear of the strips: the slot depth along each edge, and this much more (Q108).
export const PORT_EDGE_CLEARANCE_MM = 2;

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

// In the piece's file name: piece-c2-r1-197.7x198.6-port-150.stl.
export const portTag = (hoseMm: number): string => `-port-${mm(hoseMm)}`;

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
