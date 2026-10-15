// The panel fill: sealed, or a pattern from the list, cut through or in relief, or an organiser's
// board, cut through. A pattern starts in relief, so the wall stays sealed. The patterns are
// declared one to a file in patterns/ (fill-registry, #96) and built on the pattern framework
// (pattern.ts); the organisers one to a file in organisers/, built by organiser.ts.
import type { JointParams } from './joint.js';
import { ORGANISERS, organiserOf } from './organisers/index.js';
import type { OrganiserDefinition, OrganiserKind } from './organisers/index.js';
import { DEFAULT_RELIEF_PCT, patternBorderMm, reliefDepthMm } from './pattern.js';
import type { PatternChoice, PatternStyle } from './pattern.js';
import { PATTERNS, SAMPLE_SVG_TILE, patternOf, patternSizes, sizesOf } from './patterns/index.js';
import type { PatternKind, PatternSizes } from './patterns/index.js';
import { mm } from './words.js';

export type FillKind = 'sealed' | PatternKind | OrganiserKind;

export const FILL_KINDS: readonly FillKind[] = [
  'sealed',
  ...PATTERNS.map((p) => p.kind),
  ...ORGANISERS.map((o) => o.kind),
];

// A fill with a pattern's style and depth: a pattern, not sealed and not an organiser's board.
export const isPatternKind = (kind: FillKind): kind is PatternKind => patternOf(kind) !== undefined;

export const PATTERN_STYLES: readonly PatternStyle[] = ['relief', 'through'];

// Every pattern's sizes are kept while sealed, so choosing a pattern again starts where it was.
export interface FillParams extends PatternSizes {
  kind: FillKind;
  style: PatternStyle;
  reliefPct: number; // a relief's depth, as a percentage of the panel's thickness (Q138)
  drawing: string; // the SVG tile's drawing, the text of an SVG file (svg-tile, #27)
}

export const SEALED: FillParams = {
  kind: 'sealed',
  style: 'relief',
  reliefPct: DEFAULT_RELIEF_PCT,
  drawing: SAMPLE_SVG_TILE,
  ...patternSizes((_, size) => size.start),
};

// The pattern buildPieces takes, or nothing for a sealed wall; the border follows the joint (Q134).
export function fillPattern(fill: FillParams, joint: JointParams): (PatternChoice & { borderMm: number }) | undefined {
  const pattern = patternOf(fill.kind);
  if (pattern === undefined) return undefined;
  const tile = pattern.tile(sizesOf(fill, pattern.kind), fill.drawing);
  return { tile, style: fill.style, reliefPct: fill.reliefPct, borderMm: patternBorderMm(joint) };
}

// What buildPieces cuts into a piece for its fill: a pattern, or an organiser's board, each inside
// the joint's border, clear of the strips; nothing for a sealed piece.
export type FillChoice = (PatternChoice & { borderMm: number }) | { organiser: OrganiserDefinition; borderMm: number };

export function fillChoice(fill: FillParams, joint: JointParams): FillChoice | undefined {
  const organiser = organiserOf(fill.kind);
  return organiser === undefined ? fillPattern(fill, joint) : { organiser, borderMm: patternBorderMm(joint) };
}

// The fill in the plan's words: sealed, or the pattern, its sizes and how it is cut, or the
// organiser's board, how far it stands up from the pieces, and that it is cut through.
export function fillWords(fill: FillParams, thicknessMm: number): string {
  const organiser = organiserOf(fill.kind);
  if (organiser !== undefined) {
    const up = organiser.boardMm - thicknessMm;
    const raised = up > 1e-9 ? `, raised ${mm(up)} mm on the room side inside each piece’s border` : '';
    return (
      `${organiser.words}: ${organiser.describe}, in a board ${mm(organiser.boardMm)} mm thick${raised}; ` +
      'cut through: air passes through the wall.'
    );
  }
  const pattern = patternOf(fill.kind);
  if (pattern === undefined) return 'sealed.';
  const words = pattern.describe(sizesOf(fill, pattern.kind), fill.drawing);
  return fill.style === 'through'
    ? `${words}, cut through: air passes through the wall.`
    : `${words}, cut ${mm(reliefDepthMm(thicknessMm, fill.reliefPct))} mm into the room side.`;
}
