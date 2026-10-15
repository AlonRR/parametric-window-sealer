// The Honeycomb Storage Wall (organiser-hsw, #37): a board for its inserts, matching the author's
// own wall, 8 mm thick (docs/organisers.md). Hexagonal cells 20 mm across their flats, flats at
// the top and bottom, 23.6 mm apart: straight up, and in the columns either side 20.44 mm across and
// 11.8 mm up. From the room face, each opening has a 0.4 mm chamfer, runs 20 mm across to 5.1 mm
// deep, widens to 22 mm by 6 mm deep, and stays 22 mm to the back: the inserts' clips catch behind
// that ledge. Measured from the author's published wall; the cells' orientation follows his
// pictures (inferred).
import type { Point } from '../pattern.js';
import { defineOrganiser } from './define.js';
import { loftedCut } from './loft.js';

const BOARD_MM = 8;
const PITCH_MM = 23.6; // between neighbours: 20 mm openings and 3.6 mm walls

// A hexagon round the cell's centre, `across` mm between its top and bottom flats.
const hexagon = (across: number): Point[] => {
  const r = across / Math.sqrt(3); // centre to corner
  return [
    [r, 0],
    [r / 2, across / 2],
    [-r / 2, across / 2],
    [-r, 0],
    [-r / 2, -across / 2],
    [r / 2, -across / 2],
  ];
};

export const HSW = defineOrganiser({
  kind: 'hsw',
  name: 'Honeycomb Storage Wall',
  words: 'a Honeycomb Storage Wall board',
  accessories: 'Honeycomb Storage Wall inserts',
  boardMm: BOARD_MM,
  // As rows: each row's cells two columns apart, the rows half a pitch apart, every other one
  // shifted a column.
  pitchXMm: PITCH_MM * Math.sqrt(3),
  pitchYMm: PITCH_MM / 2,
  rowShiftMm: (PITCH_MM * Math.sqrt(3)) / 2,
  widthMm: (22 * 2) / Math.sqrt(3),
  heightMm: 22,
  cut: (engine) =>
    loftedCut(engine, BOARD_MM, [
      { depthMm: 0, ring: hexagon(20.8) },
      { depthMm: 0.5, ring: hexagon(20) },
      { depthMm: 5.1, ring: hexagon(20) },
      { depthMm: 6, ring: hexagon(22) },
      { depthMm: 8, ring: hexagon(22) },
    ]),
  describe:
    'hexagonal cells 20 mm across their flats, flats at the top and bottom, 23.6 mm apart, each widening to ' +
    '22 mm behind a ledge 5.1 mm in',
});
