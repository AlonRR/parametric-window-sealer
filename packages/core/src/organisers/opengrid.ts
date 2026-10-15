// openGrid (organiser-opengrid, #34): a board for openGrid's snaps and accessories, matching the
// openGrid "Full" board, 6.8 mm thick, its cells 28 mm apart (docs/organisers.md). Each cell is an
// opening 25.0 mm across with 45° corners, a 0.4 mm chamfer at both faces, and a groove 26.4 mm
// across through the middle of the board, where a snap's flexible sides click in; the same from
// both faces. Measured from the author's own published tiles; the face chamfer's corners follow
// from the chamfer (inferred).
import type { Point } from '../pattern.js';
import { defineOrganiser } from './define.js';
import { loftedCut } from './loft.js';

const BOARD_MM = 6.8;

// An octagon round the cell's centre: its sides half `half` from the centre, each straight side
// running `flat` either way from its middle, the corners cut at 45°.
const octagon = (half: number, flat: number): Point[] => [
  [flat, half],
  [-flat, half],
  [-half, flat],
  [-half, -flat],
  [-flat, -half],
  [flat, -half],
  [half, -flat],
  [half, flat],
];

// A side moved out by d keeps its 45° corners: its straight part grows by d·tan(22.5°) each way.
const FACE = octagon(12.9, 8.19 + 0.4 * Math.tan(Math.PI / 8));
const LIP = octagon(12.5, 8.19);
const GROOVE = octagon(13.2, 6.92);

export const OPENGRID = defineOrganiser({
  kind: 'opengrid',
  name: 'openGrid board',
  words: 'an openGrid board',
  accessories: 'openGrid snaps',
  boardMm: BOARD_MM,
  pitchXMm: 28,
  pitchYMm: 28,
  rowShiftMm: 0,
  widthMm: 26.4,
  heightMm: 26.4,
  cut: (engine) =>
    loftedCut(engine, BOARD_MM, [
      { depthMm: 0, ring: FACE },
      { depthMm: 0.4, ring: LIP },
      { depthMm: 1.4, ring: LIP },
      { depthMm: 2.4, ring: GROOVE },
      { depthMm: 4.4, ring: GROOVE },
      { depthMm: 5.4, ring: LIP },
      { depthMm: 6.4, ring: LIP },
      { depthMm: 6.8, ring: FACE },
    ]),
  describe:
    'cells 25 mm across with a groove 26.4 mm across behind each face, 28 mm apart each way, as openGrid’s ' +
    'Full board',
});
