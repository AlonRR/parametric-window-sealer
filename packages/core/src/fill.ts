// The panel fill (Q8, Q10, Q141): sealed, or a pattern from the list, cut through or in relief.
// The patterns are built on the pattern framework (pattern.ts). The first is the grid
// (pattern-grid, #16): square openings, 15 mm with 3 mm bars to start with (Q139), both of
// which can change (Q140), a bar no thinner than 0.8 mm (Q143). A pattern starts in relief, so
// the wall stays sealed (Q142).
import type { JointParams } from './joint.js';
import { DEFAULT_RELIEF_PCT, patternBorderMm } from './pattern.js';
import type { PatternChoice, PatternStyle, PatternTile } from './pattern.js';

export type FillKind = 'sealed' | 'grid';

export const FILL_KINDS: readonly FillKind[] = ['sealed', 'grid'];

export const PATTERN_STYLES: readonly PatternStyle[] = ['relief', 'through'];

export interface GridParams {
  openingMm: number; // each square opening's side
  barMm: number; // the solid between two openings
}

// The pattern's settings are kept while sealed, so choosing a pattern again starts where it was.
export interface FillParams {
  kind: FillKind;
  style: PatternStyle;
  reliefPct: number; // a relief's depth, as a percentage of the panel's thickness (Q138)
  grid: GridParams;
}

export const DEFAULT_GRID: GridParams = { openingMm: 15, barMm: 3 };

export const SEALED: FillParams = { kind: 'sealed', style: 'relief', reliefPct: DEFAULT_RELIEF_PCT, grid: DEFAULT_GRID };

// Two lines from a 0.4 mm nozzle, as the walls beside the tape's groove (Q131, Q143).
export const MIN_BAR_MM = 0.8;

export function gridTile(grid: GridParams): PatternTile {
  const h = grid.openingMm / 2;
  const pitch = grid.openingMm + grid.barMm;
  return {
    pitchXMm: pitch,
    pitchYMm: pitch,
    rowShiftMm: 0,
    openings: [
      [
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ],
    ],
    barMm: grid.barMm,
  };
}

// The pattern buildPieces takes, or nothing for a sealed wall; the border follows the joint (Q134).
export function fillPattern(fill: FillParams, joint: JointParams): (PatternChoice & { borderMm: number }) | undefined {
  if (fill.kind === 'sealed') return undefined;
  return { tile: gridTile(fill.grid), style: fill.style, reliefPct: fill.reliefPct, borderMm: patternBorderMm(joint) };
}
