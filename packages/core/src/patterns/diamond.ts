// Diamonds (pattern-diamond, #19), chosen without asking (Q144; docs/choices.md): point-up
// diamonds in a lattice, as a leaded window (C22), 20 mm wide and 30 mm tall with 3 mm bars (C23),
// sized by its own width, height and bar (C24).
import type { PatternTile } from '../pattern.js';
import { mm } from '../words.js';
import { definePattern } from './define.js';

export interface DiamondParams {
  widthMm: number; // each diamond, across its side corners
  heightMm: number; // across its top and bottom corners
  barMm: number; // the solid between two openings
}

export const DEFAULT_DIAMOND: DiamondParams = { widthMm: 20, heightMm: 30, barMm: 3 };

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

export const DIAMOND = definePattern({
  kind: 'diamond',
  name: 'Diamond',
  words: 'diamonds',
  group: 'The diamonds, width and height corner to corner, and the bars between them, in mm.',
  sizes: [
    {
      key: 'widthMm',
      field: 'diamondWidthMm',
      flag: 'diamond-width',
      label: 'Diamond width, corner to corner (mm)',
      help: 'The diamonds: their width, corner to corner.',
      start: DEFAULT_DIAMOND.widthMm,
    },
    {
      key: 'heightMm',
      field: 'diamondHeightMm',
      flag: 'diamond-height',
      label: 'Diamond height, corner to corner (mm)',
      help: 'The diamonds: their height, corner to corner.',
      start: DEFAULT_DIAMOND.heightMm,
    },
    {
      key: 'barMm',
      field: 'diamondBarMm',
      flag: 'diamond-bar',
      label: 'Diamond bar (mm)',
      note: 'The solid between two diamonds: at least 0.8 mm.',
      help: 'The bars between the diamonds; at least 0.8 mm.',
      start: DEFAULT_DIAMOND.barMm,
      bar: true,
    },
  ],
  tile: (size) => diamondTile({ widthMm: size('widthMm'), heightMm: size('heightMm'), barMm: size('barMm') }),
  describe: (size) =>
    `diamonds ${mm(size('widthMm'))} mm wide and ${mm(size('heightMm'))} mm tall and ${mm(size('barMm'))} mm bars`,
});
