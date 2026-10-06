// The maximum size of one piece (backlog item printer-default, #4).
//
// Pieces are printed on the user's own printer (Q5), so the maximum is a parameter. Until
// the user picks a printer or enters their own size, the page uses one safe default: 200 x
// 200 mm (Q38), which fits every full-size printer in docs/printer-beds.md with 10 mm to
// spare. The two small-bed printers there (180 x 180 mm) need "custom".

import { printerById } from './printers.js';

export interface PieceSize {
  widthMm: number;
  heightMm: number;
}

export const DEFAULT_MAX_PIECE: Readonly<PieceSize> = Object.freeze({ widthMm: 200, heightMm: 200 });

// A listed printer's largest piece is its bed less this much each way (Q117), as the default
// leaves at least 10 mm (Q38). It is a setting; it does not apply to the default or "custom",
// which are piece sizes already.
export const DEFAULT_BED_MARGIN_MM = 10;

export type PrinterChoice =
  { kind: 'default' } | { kind: 'custom'; widthMm: number; heightMm: number } | { kind: 'model'; id: string }; // from the printer list (Q115)

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

// As listed: the bed's X is the piece's width. planWall turns it where that needs fewer
// pieces (Q116).
export function maxPieceSize(choice: PrinterChoice, bedMarginMm = DEFAULT_BED_MARGIN_MM): PieceSize {
  if (choice.kind === 'default') return { ...DEFAULT_MAX_PIECE };
  if (choice.kind === 'model') {
    const printer = printerById(choice.id);
    if (printer === undefined) throw new RangeError(`No printer ${JSON.stringify(choice.id)} on the list`);
    return { widthMm: printer.bedXMm - bedMarginMm, heightMm: printer.bedYMm - bedMarginMm };
  }
  requirePositive('widthMm', choice.widthMm);
  requirePositive('heightMm', choice.heightMm);
  return { widthMm: choice.widthMm, heightMm: choice.heightMm };
}
