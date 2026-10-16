// Multiboard (organiser-multiboard, #36): a board for Multiboard's pegs, snaps and other parts,
// matching its tiles, 6.2 mm thick, its cells 25 mm apart (docs/organisers.md). At each cell's
// centre an octagonal hole, its flats square to the board's sides, 23.4 mm across at both faces and
// narrowing to 21.4 mm 2 mm in, with a thread of 2.5 mm a turn from 21.4 out to 22.5 mm
// across; at each corner a round hole 6 mm across, its mouths widening at 45° to 8 mm, with a thread
// of 3.125 mm a turn out to 7 mm. Both threads right-handed, the same from both faces. Multiboard
// publishes none of these sizes: they come from community models, the thickness and the small
// thread measured from its own files (relayed).
import type { Point } from '../pattern.js';
import type { Engine } from '../engine.js';
import { defineOrganiser } from './define.js';
import { loftedCut } from './loft.js';
import type { Level } from './loft.js';
import { threadGroove } from './thread.js';
import type { Thread } from './thread.js';

const BOARD_MM = 6.2;
const PITCH_MM = 25;
const SIDES = 36; // a round hole's, as many as the thread's steps a turn

// A regular polygon round the hole's centre, its sides `half` from it, one side's middle on +x.
const polygon = (sides: number, half: number): Point[] => {
  const corner = half / Math.cos(Math.PI / sides);
  return Array.from({ length: sides }, (_, i): Point => {
    const a = (Math.PI * (2 * i + 1)) / sides;
    return [corner * Math.cos(a), corner * Math.sin(a)];
  });
};

// A hole the same from both faces: `face` across at each, narrowing to `throat` by `inMm` in.
const mouths = (sides: number, face: number, throat: number, inMm: number): Level[] => [
  { depthMm: 0, ring: polygon(sides, face / 2) },
  { depthMm: inMm, ring: polygon(sides, throat / 2) },
  { depthMm: BOARD_MM - inMm, ring: polygon(sides, throat / 2) },
  { depthMm: BOARD_MM, ring: polygon(sides, face / 2) },
];

const LARGE_THREAD: Thread = { innerMm: 10.7, outerMm: 11.25, innerWidthMm: 1.6, outerWidthMm: 0.5, pitchMm: 2.5 };
const SMALL_THREAD: Thread = { innerMm: 3, outerMm: 3.5, innerWidthMm: 2.5, outerWidthMm: 0.625, pitchMm: 3.125 };

// The hole and its thread through the board, 1 mm past both faces.
const threaded = (engine: Engine, levels: readonly Level[], thread: Thread) => {
  const hole = loftedCut(engine, BOARD_MM, levels);
  const groove = threadGroove(engine, thread, -1, BOARD_MM + 1);
  const cut = hole.add(groove);
  hole.delete();
  groove.delete();
  return cut;
};

export const MULTIBOARD = defineOrganiser({
  kind: 'multiboard',
  name: 'Multiboard',
  words: 'a Multiboard board',
  accessories: 'Multiboard parts',
  boardMm: BOARD_MM,
  pitchXMm: PITCH_MM,
  pitchYMm: PITCH_MM,
  rowShiftMm: 0,
  widthMm: 23.4,
  heightMm: 23.4,
  cut: (engine) => threaded(engine, mouths(8, 23.4, 21.4, 2), LARGE_THREAD),
  others: [
    {
      offsetXMm: PITCH_MM / 2,
      offsetYMm: PITCH_MM / 2,
      widthMm: 8,
      heightMm: 8,
      cut: (engine) => threaded(engine, mouths(SIDES, 8, 6, 1), SMALL_THREAD),
    },
  ],
  describe:
    'octagonal holes 23.4 mm across with a thread of 2.5 mm a turn at the cells’ centres, and round holes 6 mm ' +
    'across with a thread of 3.125 mm a turn at their corners, 25 mm apart each way, as Multiboard’s tiles',
  hidden: true,
});
