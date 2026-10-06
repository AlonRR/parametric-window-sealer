// The panel fill (Q8, Q10, Q141): sealed, or a pattern from the list, cut through or in relief. A
// pattern starts in relief, so the wall stays sealed (Q142). The patterns are declared one to a
// file in patterns/ (fill-registry, #96) and built on the pattern framework (pattern.ts).
import type { JointParams } from './joint.js';
import { DEFAULT_RELIEF_PCT, patternBorderMm, reliefDepthMm } from './pattern.js';
import type { PatternChoice, PatternStyle } from './pattern.js';
import { PATTERNS, patternOf, patternSizes, sizesOf } from './patterns/index.js';
import type { PatternKind, PatternSizes } from './patterns/index.js';
import { mm } from './words.js';

export type FillKind = 'sealed' | PatternKind;

export const FILL_KINDS: readonly FillKind[] = ['sealed', ...PATTERNS.map((p) => p.kind)];

export const PATTERN_STYLES: readonly PatternStyle[] = ['relief', 'through'];

// Every pattern's sizes are kept while sealed, so choosing a pattern again starts where it was.
export interface FillParams extends PatternSizes {
  kind: FillKind;
  style: PatternStyle;
  reliefPct: number; // a relief's depth, as a percentage of the panel's thickness (Q138)
}

export const SEALED: FillParams = {
  kind: 'sealed',
  style: 'relief',
  reliefPct: DEFAULT_RELIEF_PCT,
  ...patternSizes((_, size) => size.start),
};

// Two lines from a 0.4 mm nozzle, as the walls beside the tape's groove (Q131, Q143).
export const MIN_BAR_MM = 0.8;

// The pattern buildPieces takes, or nothing for a sealed wall; the border follows the joint (Q134).
export function fillPattern(fill: FillParams, joint: JointParams): (PatternChoice & { borderMm: number }) | undefined {
  const pattern = patternOf(fill.kind);
  if (pattern === undefined) return undefined;
  const tile = pattern.tile(sizesOf(fill, pattern.kind));
  return { tile, style: fill.style, reliefPct: fill.reliefPct, borderMm: patternBorderMm(joint) };
}

// The fill in the plan's words (Q141): sealed, or the pattern, its sizes and how it is cut.
export function fillWords(fill: FillParams, thicknessMm: number): string {
  const pattern = patternOf(fill.kind);
  if (pattern === undefined) return 'sealed.';
  const words = pattern.describe(sizesOf(fill, pattern.kind));
  return fill.style === 'through'
    ? `${words}, cut through: air passes through the wall.`
    : `${words}, cut ${mm(reliefDepthMm(thicknessMm, fill.reliefPct))} mm into the room side.`;
}
