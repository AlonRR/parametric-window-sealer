// Bricks (pattern-brick, #18), chosen without asking (Q144; docs/choices.md): a running bond (C18)
// of 30 × 12 mm openings with 3 mm bars (C19), sized by its own width, height and bar (C20).
import type { PatternTile } from '../pattern.js';
import { mm } from '../words.js';
import { definePattern } from './define.js';

export interface BrickParams {
  widthMm: number; // each brick-shaped opening
  heightMm: number;
  barMm: number; // the solid between two openings, as mortar
}

export const DEFAULT_BRICK: BrickParams = { widthMm: 30, heightMm: 12, barMm: 3 };

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

export const BRICK = definePattern({
  kind: 'brick',
  name: 'Brick',
  words: 'bricks',
  group: "The bricks' openings, width and height, and the bars between them, in mm.",
  sizes: [
    {
      key: 'widthMm',
      field: 'brickWidthMm',
      flag: 'brick-width',
      label: 'Brick width (mm)',
      help: "The bricks' openings: their width.",
      start: DEFAULT_BRICK.widthMm,
    },
    {
      key: 'heightMm',
      field: 'brickHeightMm',
      flag: 'brick-height',
      label: 'Brick height (mm)',
      help: "The bricks' openings: their height.",
      start: DEFAULT_BRICK.heightMm,
    },
    {
      key: 'barMm',
      field: 'brickBarMm',
      flag: 'brick-bar',
      label: 'Brick bar (mm)',
      note: 'The solid between two bricks, as mortar: at least 0.8 mm.',
      help: 'The bars between the bricks; at least 0.8 mm.',
      start: DEFAULT_BRICK.barMm,
      bar: true,
    },
  ],
  tile: (size) => brickTile({ widthMm: size('widthMm'), heightMm: size('heightMm'), barMm: size('barMm') }),
  describe: (size) =>
    `bricks of ${mm(size('widthMm'))} × ${mm(size('heightMm'))} mm openings and ${mm(size('barMm'))} mm bars`,
});
