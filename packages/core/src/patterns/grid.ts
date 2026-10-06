// The grid (pattern-grid, #16): square openings, 15 mm with 3 mm bars to start with (Q139), both
// of which can change (Q140); a bar no thinner than 0.8 mm (Q143).
import type { PatternTile } from '../pattern.js';
import { mm } from '../words.js';
import { definePattern } from './define.js';

export interface GridParams {
  openingMm: number; // each square opening's side
  barMm: number; // the solid between two openings
}

export const DEFAULT_GRID: GridParams = { openingMm: 15, barMm: 3 };

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

export const GRID = definePattern({
  kind: 'grid',
  name: 'Grid',
  words: 'a grid',
  group: "The grid's square openings and the bars between them, in mm.",
  sizes: [
    {
      key: 'openingMm',
      field: 'gridOpeningMm',
      flag: 'grid-opening',
      label: 'Grid opening (mm)',
      note: "Each square opening's side.",
      help: "The grid's square openings: each side.",
      start: DEFAULT_GRID.openingMm,
    },
    {
      key: 'barMm',
      field: 'gridBarMm',
      flag: 'grid-bar',
      label: 'Grid bar (mm)',
      note: 'The solid between two openings: at least 0.8 mm.',
      help: 'The bars between the grid’s openings; at least 0.8 mm.',
      start: DEFAULT_GRID.barMm,
      bar: true,
    },
  ],
  tile: (size) => gridTile({ openingMm: size('openingMm'), barMm: size('barMm') }),
  describe: (size) => `a grid of ${mm(size('openingMm'))} mm square openings and ${mm(size('barMm'))} mm bars`,
});
