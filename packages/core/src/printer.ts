// The maximum size of one piece (backlog item printer-default, #4).
//
// Pieces are printed on the user's own printer (Q5), so the maximum is a parameter. Until
// the user picks a printer or enters their own size, the page uses one safe default: 200 x
// 200 mm (Q38), which fits every full-size printer in docs/printer-beds.md with 10 mm to
// spare. The two small-bed printers there (180 x 180 mm) need "custom".

export interface PieceSize {
  widthMm: number;
  heightMm: number;
}

export const DEFAULT_MAX_PIECE: Readonly<PieceSize> = Object.freeze({ widthMm: 200, heightMm: 200 });

export type PrinterChoice = { kind: 'default' } | { kind: 'custom'; widthMm: number; heightMm: number };

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function maxPieceSize(choice: PrinterChoice): PieceSize {
  if (choice.kind === 'default') return { ...DEFAULT_MAX_PIECE };
  requirePositive('widthMm', choice.widthMm);
  requirePositive('heightMm', choice.heightMm);
  return { widthMm: choice.widthMm, heightMm: choice.heightMm };
}
