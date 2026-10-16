// A pivot window (pivot-window, #162; docs/pivot.md). Its sash turns on an axis across its middle,
// the top half into the room and the bottom half out. Below the axis the frame is clear from
// inside, and a wall goes in as in a frame with no track, its top edge pressed by the sash where it
// crosses the frame; above it, the sash leaves the gap a tilted sash leaves, and a tilted sash's
// wedge closes it, its point at the axis. One window type gives both, in one plan and one download.
//
// The settings are the wall's, with the pivot's height and the gap at the top; the wall below takes
// everything a wall takes, and the wedge above is as a tilted sash's is: joined with strips, sealed
// and printed, a single skin, with no fitting.
import { WINDOW_PRESETS } from './edge.js';
import { WEDGE_WORDS } from './wedge.js';
import type { WedgeWords } from './wedge.js';
import { NO_MODEL } from './appliance-model.js';
import { NO_CUSTOM_PIECE } from './custom-piece.js';
import { SEALED } from './fill.js';
import type { Params } from './params.js';
import { roofLines } from './roof.js';
import { mm } from './words.js';

export interface PivotParams {
  atMm: number; // the pivot's height from the opening's bottom, where the sash crosses the frame
  gapMm: number; // at the top, from the frame to the sash's outer face
  pitchDeg: number; // from level: 90 upright, less for a centre-pivot roof window
}

// The middle of the example opening, the gap a tilted sash starts with, and upright.
export const EXAMPLE_PIVOT: PivotParams = { atMm: 500, gapMm: 130, pitchDeg: 90 };

export const PIVOT_PITCH_MESSAGE =
  'A pivot window lies at 15 to 90° from level: 90 for an upright one, less in a roof.';

const isPivot = (p: Params) => p.edges.window === 'pivot';

// The wall below the pivot, as a wall in a frame with no track.
export function pivotWall(p: Params): Params {
  if (!isPivot(p)) return p;
  return { ...p, openingHeightMm: p.pivot.atMm, edges: { ...p.edges, window: 'frame' } };
}

// The wedge above the pivot, as a tilted sash's, its point at the pivot.
export function pivotWedge(p: Params): Params {
  return {
    ...p,
    openingHeightMm: p.openingHeightMm - p.pivot.atMm,
    edges: { ...p.edges, window: 'tilt', roles: WINDOW_PRESETS.tilt },
    tilt: { gapMm: p.pivot.gapMm },
    joint: { ...p.joint, style: 'strips' },
    wall: 'single',
    sheet: { ...p.sheet, source: 'printed' },
    fill: SEALED,
    pieceFills: [],
    ports: [],
    cutouts: [],
    notches: [],
    fans: [],
    clamps: [],
    inserts: [],
    model: NO_MODEL,
    customPiece: NO_CUSTOM_PIECE,
  };
}

// The wedge's words, its point at the pivot.
export const PIVOT_WEDGE_WORDS: WedgeWords = { ...WEDGE_WORDS.tilt, out: 'above the pivot' };

// The wedge's parts in a pivot window's download, each named apart from the wall's.
export const pivotWedgeName = (name: string): string => (name.startsWith('wedge-') ? name : `wedge-${name}`);

// On a roof, the wall below the pivot lies on its slope, as a roof window's does.
export function pivotRoofLines(p: Params): string[] {
  if (!isPivot(p) || p.pivot.pitchDeg >= 90) return [];
  return roofLines(p.pivot.pitchDeg, p.ports.length > 0);
}

// The plan's line for a pivot window: where each half goes, and the hinges between them.
export function describePivot(p: Params): string[] {
  if (!isPivot(p)) return [];
  return [
    `A pivot window: the wall goes below the pivot, ${mm(p.pivot.atMm)} mm up, its top edge pressed by the sash ` +
      'where it crosses the frame; the wedge goes above it, its point at the pivot. Check that the pivot’s ' +
      'hinges, at the jambs, clear the wall’s top corners and the wedge’s points; a notch in a side edge makes ' +
      'room for one that does not.',
  ];
}
