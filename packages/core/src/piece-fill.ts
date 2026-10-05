// Per-piece fills (backlog item params-advanced, #21; Q7, Q10). The wall's fill applies to every
// piece to start with; a piece can have its own. Chosen without asking (Q144; docs/choices.md):
// an override sets a piece's fill and its style, the pattern's sizes staying the wall's (C26),
// and the piece stays on the wall's lattice (C27). In the form and the command they are written
// as `column,row=fill[:style]`, several separated by spaces, as the ports are (C28).
import { FILL_KINDS, PATTERN_STYLES } from './fill.js';
import type { FillKind, FillParams } from './fill.js';
import type { PatternStyle } from './pattern.js';

export interface PieceFill {
  column: number; // from 1, the left seen from the room
  row: number; // from 1, the bottom
  kind: FillKind;
  style?: PatternStyle; // the wall's style if left out
}

const FORM = /^([1-9][0-9]*),([1-9][0-9]*)=([a-z]+)(?::([a-z]+))?$/;

const isKind = (v: string | undefined): v is FillKind => FILL_KINDS.some((k) => k === v);
const isStyle = (v: string | undefined): v is PatternStyle => PATTERN_STYLES.some((s) => s === v);

export function parsePieceFills(text: string): { ok: true; fills: PieceFill[] } | { ok: false; message: string } {
  const fills: PieceFill[] = [];
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    const m = FORM.exec(word);
    const [kind, style] = [m?.[3], m?.[4]];
    const fits = m !== null && isKind(kind) && (style === undefined || (isStyle(style) && kind !== 'sealed'));
    if (!fits) {
      return {
        ok: false,
        message:
          `Piece fill ${i + 1}: write each as column,row=fill, then optionally :style, ` +
          'as 2,1=sealed or 2,1=grid:through.',
      };
    }
    const fill: PieceFill = { column: Number(m[1]), row: Number(m[2]), kind };
    fills.push(style === undefined ? fill : { ...fill, style });
  }
  return { ok: true, fills };
}

export function formatPieceFills(fills: readonly PieceFill[]): string {
  return fills.map((f) => `${f.column},${f.row}=${f.kind}${f.style === undefined ? '' : `:${f.style}`}`).join(' ');
}

// The fill of the piece in a column and row, from 1: its own kind and style if it has one.
export function fillFor(params: { fill: FillParams; pieceFills: readonly PieceFill[] }, column: number, row: number): FillParams {
  const own = params.pieceFills.find((f) => f.column === column && f.row === row);
  if (own === undefined) return params.fill;
  return { ...params.fill, kind: own.kind, style: own.style ?? params.fill.style };
}
