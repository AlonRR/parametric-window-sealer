// The panel fill (Q8, Q10, Q141): sealed, or a pattern from the list, cut through or in relief.
// The patterns are built on the pattern framework (pattern.ts). The first is the grid
// (pattern-grid, #16): square openings, 15 mm with 3 mm bars to start with (Q139), both of
// which can change (Q140), a bar no thinner than 0.8 mm (Q143). A pattern starts in relief, so
// the wall stays sealed (Q142). The second is the hexagon (pattern-hexagon, #17), chosen without
// asking (Q144; docs/choices.md): a pointy-top honeycomb (C13), 15 mm across the flats with
// 3 mm bars to start with (C14), with sizes of its own (C15). The third is bricks (pattern-brick,
// #18): a running bond (C18) of 30 × 12 mm openings with 3 mm bars (C19), sized by its own width,
// height and bar (C20). The fourth is diamonds (pattern-diamond, #19): point-up diamonds in a
// lattice, as a leaded window (C22), 20 mm wide and 30 mm tall with 3 mm bars (C23), sized by
// its own width, height and bar (C24).
import type { JointParams } from './joint.js';
import { DEFAULT_RELIEF_PCT, patternBorderMm } from './pattern.js';
import type { PatternChoice, PatternStyle, PatternTile } from './pattern.js';

export type FillKind = 'sealed' | 'grid' | 'hexagon' | 'brick' | 'diamond';

export const FILL_KINDS: readonly FillKind[] = ['sealed', 'grid', 'hexagon', 'brick', 'diamond'];

export const PATTERN_STYLES: readonly PatternStyle[] = ['relief', 'through'];

export interface GridParams {
  openingMm: number; // each square opening's side
  barMm: number; // the solid between two openings
}

export interface HexagonParams {
  openingMm: number; // each hexagonal opening, across the flats
  barMm: number; // the solid between two openings
}

export interface BrickParams {
  widthMm: number; // each brick-shaped opening
  heightMm: number;
  barMm: number; // the solid between two openings, as mortar
}

export interface DiamondParams {
  widthMm: number; // each diamond, across its side corners
  heightMm: number; // across its top and bottom corners
  barMm: number; // the solid between two openings
}

// The pattern's settings are kept while sealed, so choosing a pattern again starts where it was.
export interface FillParams {
  kind: FillKind;
  style: PatternStyle;
  reliefPct: number; // a relief's depth, as a percentage of the panel's thickness (Q138)
  grid: GridParams;
  hexagon: HexagonParams;
  brick: BrickParams;
  diamond: DiamondParams;
}

export const DEFAULT_GRID: GridParams = { openingMm: 15, barMm: 3 };

export const DEFAULT_HEXAGON: HexagonParams = { openingMm: 15, barMm: 3 };

export const DEFAULT_BRICK: BrickParams = { widthMm: 30, heightMm: 12, barMm: 3 };

export const DEFAULT_DIAMOND: DiamondParams = { widthMm: 20, heightMm: 30, barMm: 3 };

export const SEALED: FillParams = {
  kind: 'sealed',
  style: 'relief',
  reliefPct: DEFAULT_RELIEF_PCT,
  grid: DEFAULT_GRID,
  hexagon: DEFAULT_HEXAGON,
  brick: DEFAULT_BRICK,
  diamond: DEFAULT_DIAMOND,
};

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

// Pointy-top hexagons along rows: flats a bar apart along a row, and every other row shifted half
// a pitch, so the slanted flats are a bar apart too.
export function hexagonTile(hexagon: HexagonParams): PatternTile {
  const pitch = hexagon.openingMm + hexagon.barMm;
  const half = hexagon.openingMm / 2;
  const r = hexagon.openingMm / Math.sqrt(3); // to a corner
  return {
    pitchXMm: pitch,
    pitchYMm: (pitch * Math.sqrt(3)) / 2,
    rowShiftMm: pitch / 2,
    openings: [
      [
        [half, r / 2],
        [0, r],
        [-half, r / 2],
        [-half, -r / 2],
        [0, -r],
        [half, -r / 2],
      ],
    ],
    barMm: hexagon.barMm,
  };
}

// A running bond: every other row shifted half a brick.
export function brickTile(brick: BrickParams): PatternTile {
  const [w, h] = [brick.widthMm / 2, brick.heightMm / 2];
  const pitch = brick.widthMm + brick.barMm;
  return {
    pitchXMm: pitch,
    pitchYMm: brick.heightMm + brick.barMm,
    rowShiftMm: pitch / 2,
    openings: [
      [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
      ],
    ],
    barMm: brick.barMm,
  };
}

// Diamonds point-up, each touching its four diagonal neighbours across a bar: the lattice is the
// diamonds' own, spread by the factor that opens a bar between their parallel edges.
export function diamondTile(diamond: DiamondParams): PatternTile {
  const [a, b] = [diamond.widthMm / 2, diamond.heightMm / 2];
  const spread = 1 + (diamond.barMm * Math.hypot(a, b)) / (2 * a * b);
  return {
    pitchXMm: 2 * spread * a,
    pitchYMm: spread * b,
    rowShiftMm: spread * a,
    openings: [
      [
        [a, 0],
        [0, b],
        [-a, 0],
        [0, -b],
      ],
    ],
    barMm: diamond.barMm,
  };
}

// The pattern buildPieces takes, or nothing for a sealed wall; the border follows the joint (Q134).
export function fillPattern(fill: FillParams, joint: JointParams): (PatternChoice & { borderMm: number }) | undefined {
  if (fill.kind === 'sealed') return undefined;
  const tiles: Record<Exclude<FillKind, 'sealed'>, () => PatternTile> = {
    grid: () => gridTile(fill.grid),
    hexagon: () => hexagonTile(fill.hexagon),
    brick: () => brickTile(fill.brick),
    diamond: () => diamondTile(fill.diamond),
  };
  const tile = tiles[fill.kind]();
  return { tile, style: fill.style, reliefPct: fill.reliefPct, borderMm: patternBorderMm(joint) };
}
