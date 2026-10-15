// Each fitting in its piece (Q105, Q110; C47): the piece given by its column and row from 1, or
// the bottom row's middle one; then the kind's own check there (Q108); and one fitting to a piece
// (Q113). Every kind places its fittings through here, after the kinds before it.
import type { GridLayout } from '../layout.js';
import { defaultPortPiece } from '../port.js';
import type { InPiece } from './define.js';

export interface Placing<G extends Partial<InPiece>> {
  label: string; // names each in a message: "Port 1"
  plural: string; // names two of them: "Ports 1 and 2"
  given: readonly G[];
  check(item: G & InPiece): string | undefined; // what is wrong with it in that piece, after "Port 1: "
}

// The kinds placed before, which a fitting may not share a piece with.
export interface Placed {
  label: string;
  placed: readonly InPiece[];
  alone?: true; // a wall has one at most: "the model", not "model 1"
}

export function placeFittings<G extends Partial<InPiece>>(
  plan: GridLayout,
  placing: Placing<G>,
  earlier: readonly Placed[] = [],
): { ok: true; placed: (G & InPiece)[] } | { ok: false; problem: string } {
  const start = defaultPortPiece(plan);
  const placed: (G & InPiece)[] = [];
  for (const [i, item] of placing.given.entries()) {
    const label = `${placing.label} ${i + 1}`;
    const here = { ...item, column: item.column ?? start.column + 1, row: item.row ?? start.row + 1 };
    const { column, row } = here;
    const where = `column ${column}, row ${row}; give each its own piece.`;
    const problem = placing.check(here);
    if (problem !== undefined) return { ok: false, problem: `${label}: ${problem}` };
    for (const kind of earlier) {
      const other = kind.placed.findIndex((p) => p.column === column && p.row === row);
      if (other >= 0) {
        return { ok: false, problem: `${label} and ${kind.label.toLowerCase()} ${other + 1} are both in ${where}` };
      }
    }
    const other = placed.findIndex((p) => p.column === column && p.row === row);
    if (other >= 0) return { ok: false, problem: `${placing.plural} ${other + 1} and ${i + 1} are both in ${where}` };
    placed.push(here);
  }
  return { ok: true, placed };
}

// One fitting of a kind a wall has at most one of (the model, the custom piece): its piece given
// by column and row from 1, or 0 and 0 for the starting piece; then its own check there; and a
// piece of its own, apart from the kinds placed before it. Named in messages: "The model".
export function placeOne<S extends InPiece>(
  plan: GridLayout,
  setting: S,
  name: string,
  check: (at: InPiece) => string | undefined,
  earlier: readonly Placed[] = [],
): { ok: true; placed: S } | { ok: false; problem: string } {
  const start = defaultPortPiece(plan);
  const at =
    setting.column === 0 && setting.row === 0
      ? { column: start.column + 1, row: start.row + 1 }
      : { column: setting.column, row: setting.row };
  const problem = check(at);
  if (problem !== undefined) return { ok: false, problem };
  for (const kind of earlier) {
    const other = kind.placed.findIndex((p) => p.column === at.column && p.row === at.row);
    if (other >= 0) {
      return {
        ok: false,
        problem:
          `${name} and ${kind.alone ? `the ${kind.label.toLowerCase()}` : `${kind.label.toLowerCase()} ${other + 1}`} ` +
          `are both in column ${at.column}, row ${at.row}; ` +
          'give each its own piece.',
      };
    }
  }
  return { ok: true, placed: { ...setting, ...at } };
}
