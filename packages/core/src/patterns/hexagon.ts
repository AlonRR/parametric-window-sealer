// The hexagon (pattern-hexagon, #17), chosen without asking (Q144; docs/choices.md): a pointy-top
// honeycomb (C13), 15 mm across the flats with 3 mm bars to start with (C14), with sizes of its
// own (C15).
import type { PatternTile } from '../pattern.js';
import { mm } from '../words.js';
import { definePattern } from './define.js';

export interface HexagonParams {
  openingMm: number; // each hexagonal opening, across the flats
  barMm: number; // the solid between two openings
}

export const DEFAULT_HEXAGON: HexagonParams = { openingMm: 15, barMm: 3 };

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

export const HEXAGON = definePattern({
  kind: 'hexagon',
  name: 'Hexagon',
  words: 'a hexagon honeycomb',
  group: "The honeycomb's hexagonal openings, across the flats, and the bars between them, in mm.",
  sizes: [
    {
      key: 'openingMm',
      field: 'hexOpeningMm',
      flag: 'hex-opening',
      label: 'Hexagon opening, across the flats (mm)',
      help: "The honeycomb's hexagonal openings: across the flats.",
      start: DEFAULT_HEXAGON.openingMm,
    },
    {
      key: 'barMm',
      field: 'hexBarMm',
      flag: 'hex-bar',
      label: 'Hexagon bar (mm)',
      note: 'The solid between two openings: at least 0.8 mm.',
      help: 'The bars between the hexagons; at least 0.8 mm.',
      start: DEFAULT_HEXAGON.barMm,
      bar: true,
    },
  ],
  tile: (size) => hexagonTile({ openingMm: size('openingMm'), barMm: size('barMm') }),
  describe: (size) =>
    `a honeycomb of hexagonal openings ${mm(size('openingMm'))} mm across the flats and ${mm(size('barMm'))} mm bars`,
});
