// Pieces cut from sheet (sheet-pieces, #112): polycarbonate, acrylic, foam board or corrugated
// plastic, cut by hand to the plan's sizes, with only the strips, cross pieces, edge strips and
// fittings printed. The strips' slots follow the panel's thickness, so the sheet's thickness is the
// panel thickness. A piece with a fitting or a pattern of its own is still printed; while one is,
// every piece keeps to the printer's size, as the pieces share one grid.
import type { PinPlacement } from './joint.js';
import type { GridLayout, GridPiece } from './layout.js';
import { fittingIn, fittingSource, placedFittings } from './fittings/index.js';
import { fillFor } from './piece-fill.js';
import type { Params } from './params.js';
import { mm } from './words.js';

export type PieceSource = 'printed' | 'sheet';
export const PIECE_SOURCES: readonly PieceSource[] = ['printed', 'sheet'];

export interface SheetParams {
  source: PieceSource; // where the pieces without a fitting or pattern come from
  widthMm: number; // the sheet's size: the largest piece cut from it, which can be turned
  heightMm: number;
}

export const DEFAULT_SHEET: SheetParams = { source: 'printed', widthMm: 1000, heightMm: 2000 };

type SheetSource = Pick<
  Params,
  | 'sheet'
  | 'fill'
  | 'pieceFills'
  | 'ports'
  | 'cutouts'
  | 'fans'
  | 'clamps'
  | 'inserts'
  | 'collar'
  | 'rim'
  | 'clamp'
  | 'insert'
  | 'thicknessMm'
  | 'seal'
>;

// Each fitting in the plan's words.
const FITTING_WORDS: Record<string, string> = {
  port: 'hose port',
  cutout: 'cutout',
  fan: 'fan mount',
  clamp: 'clamp',
  insert: 'sliding insert',
};

// Why a piece is printed though the rest are cut, by column and row from 1; nothing if it is cut.
export function printedFor(params: SheetSource, column: number, row: number): string | undefined {
  const fitting = fittingIn(placedFittings(fittingSource(params)), column, row);
  if (fitting !== undefined) return `its ${FITTING_WORDS[fitting.kind] ?? fitting.kind}`;
  if (fillFor(params, column, row).kind !== 'sealed') return 'its pattern';
  return undefined;
}

// Whether a piece of the plan, by column and row from 0, is cut from sheet.
export const isCut = (params: SheetSource, cell: Pick<GridPiece, 'column' | 'row'>): boolean =>
  params.sheet.source === 'sheet' && printedFor(params, cell.column + 1, cell.row + 1) === undefined;

// Whether any piece must be printed: then every piece keeps to the printer's size.
export const anyPrinted = (params: SheetSource): boolean =>
  params.sheet.source === 'printed' ||
  [params.ports, params.cutouts, params.fans, params.clamps, params.inserts].some((list) => list.length > 0) ||
  params.fill.kind !== 'sealed' ||
  params.pieceFills.some((f) => f.kind !== 'sealed');

// The pins that go through a printed piece, which has a slot for each; a cut piece is drilled.
export function slotPins(params: SheetSource, plan: GridLayout, pins: readonly PinPlacement[]): PinPlacement[] {
  if (params.sheet.source === 'printed') return [...pins];
  const printed = plan.pieces.filter((c) => !isCut(params, c));
  return pins.filter((p) =>
    printed.some((c) => p.xMm > c.xMm && p.xMm < c.xMm + c.widthMm && p.yMm > c.yMm && p.yMm < c.yMm + c.heightMm),
  );
}

// The plan's lines for a wall cut from sheet: what to cut, by size; which pieces to print and why;
// and the pins' holes to drill. Nothing while every piece is printed.
export function describeSheet(params: SheetSource, plan: GridLayout, pinCount: number): string[] {
  if (params.sheet.source === 'printed') return [];
  const cut = plan.pieces.filter((c) => isCut(params, c));
  const sizes = new Map<string, number>();
  for (const c of cut) {
    const size = `${mm(c.widthMm)} × ${mm(c.heightMm)} mm`;
    sizes.set(size, (sizes.get(size) ?? 0) + 1);
  }
  const groups = [...sizes].map(([size, n], i) =>
    i === 0 ? `${n} ${n === 1 ? 'piece' : 'pieces'} of ${size}` : `${n} of ${size}`,
  );
  const last = groups.pop();
  const list = groups.length > 0 ? `${groups.join(', ')} and ${last}` : (last ?? '');
  const lines = cut.length > 0 ? [`Cut from ${mm(params.thicknessMm)} mm sheet: ${list}.`] : [];
  const printed = plan.pieces
    .filter((c) => !isCut(params, c))
    .map((c) => `column ${c.column + 1}, row ${c.row + 1}, for ${printedFor(params, c.column + 1, c.row + 1) ?? ''}`);
  if (printed.length === 1) {
    lines.push(`Print the piece in ${printed[0]}; as a piece is printed, every piece keeps to the printer’s size.`);
  } else if (printed.length > 1) {
    const lastPrinted = printed.pop();
    lines.push(
      `Print the pieces in ${printed.join(', ')} and ${lastPrinted}; as pieces are printed, every piece keeps to ` +
        'the printer’s size.',
    );
  }
  if (pinCount > 0 && cut.length > 0) {
    lines.push('With the pieces in place, drill each pin’s hole through the cut pieces, through the strip’s hole.');
  }
  return lines;
}
