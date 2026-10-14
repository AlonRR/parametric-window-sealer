// The fan mount (backlog item fan-mount, #28; Q15, Q16): a square-framed fan from a list, screwed
// to one piece over a round opening. MPL-2.0 like the rest of the code (Q36); the parts it makes
// belong to whoever makes them.
//
// Chosen without asking (Q144; docs/choices.md). The sizes are the four common square frames, with
// the hole spacing and the opening of Arctic's own mounting drawings (C90); the panel's screw holes
// are 4.5 mm, as Delta's mounting panel cutout has them (C91). A fan sits in one piece, centred,
// its frame clear of the strips, as a hose port is (C92). Its sources are in docs/fan-sizes.md.
//
// The piece's solid is fanPanel, with the fan as a fitting in fittings/fan-mount.ts.
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { PORT_EDGE_CLEARANCE_MM } from './port.js';

export interface FanSize {
  sizeMm: number; // the frame, each way
  holeSpacingMm: readonly [number, number]; // centre to centre: the least and the most the makers draw
  openingMm: number; // the round opening the air passes through
}

// Sizes in mm from Arctic's mounting hole drawings for its 80, 92, 120 and 140 mm fans; Delta's
// datasheets give the same spacing for 80 and 120 mm. Noctua spaces its 140 mm fans' holes
// 124.5 mm apart, so the 140 mm holes are slots from 124.5 to 125 mm (C93).
export const FANS: readonly FanSize[] = [
  { sizeMm: 80, holeSpacingMm: [71.5, 71.5], openingMm: 76.3 },
  { sizeMm: 92, holeSpacingMm: [82.5, 82.5], openingMm: 88.4 },
  { sizeMm: 120, holeSpacingMm: [105, 105], openingMm: 116 },
  { sizeMm: 140, holeSpacingMm: [124.5, 125], openingMm: 134.2 },
];

// The screw holes through the panel: Delta's mounting panel cutout (4.5 ± 0.3 mm).
export const FAN_SCREW_HOLE_MM = 4.5;

export const fanSize = (sizeMm: number): FanSize | undefined => FANS.find((f) => f.sizeMm === sizeMm);

// A fan as the user gives it: column and row count from 1, at the bottom left seen from the room,
// as the ports do. Left out, they are the starting piece (Q105).
export interface FanSetting {
  sizeMm: number;
  column?: number;
  row?: number;
}

const FAN_FORM = /^([0-9]+)(?:@([0-9]+),([0-9]+))?$/;
const mm = (n: number): string => String(Math.round(n * 10) / 10);
const sizesInWords = (): string => {
  const sizes = FANS.map((f) => mm(f.sizeMm));
  return `${sizes.slice(0, -1).join(', ')} and ${sizes.at(-1) ?? ''} mm`;
};

// The --fan form: 120, or 120@2,1; several separated by spaces.
export function parseFans(text: string): { ok: true; fans: FanSetting[] } | { ok: false; message: string } {
  const fans: FanSetting[] = [];
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    const m = FAN_FORM.exec(word);
    const sizeMm = Number(m?.[1]);
    const column = m?.[2] === undefined ? undefined : Number(m[2]);
    const row = m?.[3] === undefined ? undefined : Number(m[3]);
    if (m === null || column === 0 || row === 0) {
      return {
        ok: false,
        message: `Fan ${i + 1}: write each as its size in mm, then optionally @column,row, as 120 or 120@2,1.`,
      };
    }
    if (fanSize(sizeMm) === undefined) {
      return {
        ok: false,
        message: `Fan ${i + 1}: ${mm(sizeMm)} mm is not a listed fan size; the sizes are ${sizesInWords()}.`,
      };
    }
    fans.push(column === undefined ? { sizeMm } : { sizeMm, column, row });
  }
  return { ok: true, fans };
}

export function formatFans(fans: readonly FanSetting[]): string {
  return fans
    .map((f) =>
      f.column === undefined && f.row === undefined ? `${f.sizeMm}` : `${f.sizeMm}@${f.column ?? ''},${f.row ?? ''}`,
    )
    .join(' ');
}

// The smallest piece, each way, that holds the fan's frame clear of the strips (as Q108).
export const fanPieceMm = (sizeMm: number, joint: JointParams): number =>
  sizeMm + 2 * (joint.slotMm + PORT_EDGE_CLEARANCE_MM);

// In the piece's file name: piece-c2-r1-197.7x198.6-fan-120.stl.
export const fanTag = (sizeMm: number): string => `-fan-${mm(sizeMm)}`;

// A fan in its piece, by column and row from 0: the piece is there and holds the frame.
export function checkFan(
  plan: GridLayout,
  fan: { sizeMm: number; column: number; row: number },
  joint: JointParams,
): { ok: true } | { ok: false; message: string } {
  const where = `column ${fan.column + 1}, row ${fan.row + 1}`;
  const piece = plan.pieces.find((p) => p.column === fan.column && p.row === fan.row);
  if (piece === undefined) {
    const [columns, rows] = [plan.columns.length, plan.rows.length];
    return { ok: false, message: `There is no ${where}: the wall has ${columns} columns and ${rows} rows.` };
  }
  const needs = fanPieceMm(fan.sizeMm, joint);
  if (piece.widthMm >= needs && piece.heightMm >= needs) return { ok: true };
  return {
    ok: false,
    message:
      `A ${mm(fan.sizeMm)} mm fan needs a piece at least ${mm(needs)} × ${mm(needs)} mm; ` +
      `${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
      'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
  };
}
