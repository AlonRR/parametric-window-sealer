// A pivot window (pivot-window, #162; docs/pivot.md). Its sash turns on an axis across its middle,
// one half into the room and the other out. On the side that swings out the frame is clear from
// inside, and a wall goes in as in a frame with no track, its edge at the pivot pressed by the sash
// where it crosses the frame; on the side that swings in, the sash leaves the gap a tilted or a
// turned sash leaves, and that sash's wedge closes it, its point at the pivot. One window type gives
// both, in one plan and one download.
//
// On a level axis the top half swings in: the wall goes below the pivot and a tilted sash's wedge
// above it. On an upright one (pivot-vertical, #179) either side may: the wall goes on the other,
// and a turned sash's wedge on the side that swings in, its strip up the free side.
//
// The settings are the wall's, with the pivot's place, the half that swings in and the gap where it
// does; the wall takes everything a wall takes, and the wedge is as every wedge is: joined with
// strips, sealed and printed, a single skin, with no fitting.
import { WINDOW_PRESETS } from './edge.js';
import type { EdgeName, EdgeRole } from './edge.js';
import { WEDGE_WORDS } from './wedge.js';
import type { WedgeWords } from './wedge.js';
import { NO_MODEL } from './appliance-model.js';
import { NO_CUSTOM_PIECE } from './custom-piece.js';
import { SEALED } from './fill.js';
import type { Params } from './params.js';
import { roofLines } from './roof.js';
import { mm } from './words.js';

// The half of the sash that swings into the room: the top, on a level axis, or a side, on an
// upright one.
export type PivotSwing = 'top' | 'left' | 'right';
export const PIVOT_SWINGS: readonly PivotSwing[] = ['top', 'left', 'right'];

export interface PivotParams {
  atMm: number; // the pivot's place where the sash crosses the frame: up from the bottom, or for an upright axis from the left jamb
  gapMm: number; // where the half that swings in is free, from the frame to the sash's outer face
  pitchDeg: number; // from level: 90 upright, less for a centre-pivot roof window; a level axis only
  swingsIn: PivotSwing;
}

// The middle of the example opening, the gap a tilted sash starts with, upright, the top half in.
export const EXAMPLE_PIVOT: PivotParams = { atMm: 500, gapMm: 130, pitchDeg: 90, swingsIn: 'top' };

export const PIVOT_PITCH_MESSAGE =
  'A pivot window lies at 15 to 90° from level: 90 for an upright one, less in a roof.';

const isPivot = (p: Params) => p.edges.window === 'pivot';
const upright = (swing: PivotSwing) => swing !== 'top';

// The wall's edges to start with: the frame all round but the edge at the pivot, which the sash
// presses.
export function pivotRoles(swing: PivotSwing): Record<EdgeName, EdgeRole> {
  const atPivot: Record<PivotSwing, EdgeName> = { top: 'top', right: 'right', left: 'left' };
  return { ...WINDOW_PRESETS.frame, [atPivot[swing]]: 'sash' };
}

// How far the half that swings in reaches from the pivot, and the wall's width or height.
export function pivotSpans(p: Params): { wallMm: number; wedgeMm: number } {
  const { atMm, swingsIn } = p.pivot;
  if (swingsIn === 'top') return { wallMm: atMm, wedgeMm: p.openingHeightMm - atMm };
  const leftMm = atMm;
  const rightMm = p.openingWidthMm - atMm;
  return swingsIn === 'right' ? { wallMm: leftMm, wedgeMm: rightMm } : { wallMm: rightMm, wedgeMm: leftMm };
}

// The wall on the side that swings out, as a wall in a frame with no track.
export function pivotWall(p: Params): Params {
  if (!isPivot(p)) return p;
  const { wallMm } = pivotSpans(p);
  const edges = { ...p.edges, window: 'frame' as const };
  return upright(p.pivot.swingsIn) ? { ...p, openingWidthMm: wallMm, edges } : { ...p, openingHeightMm: wallMm, edges };
}

// The wedge on the side that swings in, its point at the pivot: a tilted sash's on a level axis, a
// turned sash's on an upright one.
export function pivotWedge(p: Params): Params {
  const { wedgeMm } = pivotSpans(p);
  const form = upright(p.pivot.swingsIn)
    ? {
        openingWidthMm: wedgeMm,
        edges: { ...p.edges, window: 'turn' as const, roles: WINDOW_PRESETS.turn },
        turn: { gapMm: p.pivot.gapMm },
      }
    : {
        openingHeightMm: wedgeMm,
        edges: { ...p.edges, window: 'tilt' as const, roles: WINDOW_PRESETS.tilt },
        tilt: { gapMm: p.pivot.gapMm },
      };
  return {
    ...p,
    ...form,
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

// The wedge's words, its point at the pivot; on an upright axis its strip is up the free side, at the
// jamb across from the pivot.
export function pivotWedgeWords(p: Params): WedgeWords {
  if (!upright(p.pivot.swingsIn)) return { ...WEDGE_WORDS.tilt, out: 'above the pivot' };
  return {
    ...WEDGE_WORDS.turn,
    gap: 'the gap at the free side',
    edge: 'free side',
    strip: 'jamb strip',
    base: 'its end at the free side',
    out: 'out from the pivot',
    nearer: 'nearer the pivot',
    along: 'up the free side',
  };
}

// The turned wedge's words for its gap say the latch side; a pivot sash's free side is the side
// across from the pivot.
export const pivotGapWords = (message: string): string => message.replace(/latch side/g, 'free side');

// The wedge's parts in a pivot window's download, each named apart from the wall's, the turned
// wedge's strip named for the jamb.
export const pivotWedgeName = (name: string): string => {
  const own = name.startsWith('wedge-') ? name : `wedge-${name}`;
  return own.replace(/^wedge-latch-/, 'wedge-jamb-');
};

// Where the wall and the wedge go, in words.
export function pivotSides(p: Params): { wall: string; wedge: string } {
  const sides: Record<PivotSwing, { wall: string; wedge: string }> = {
    top: { wall: 'below the pivot', wedge: 'above it' },
    right: { wall: 'left of the pivot', wedge: 'right of it' },
    left: { wall: 'right of the pivot', wedge: 'left of it' },
  };
  return sides[p.pivot.swingsIn];
}

// On a roof, the wall below a level pivot lies on its slope, as a roof window's does.
export function pivotRoofLines(p: Params): string[] {
  if (!isPivot(p) || upright(p.pivot.swingsIn) || p.pivot.pitchDeg >= 90) return [];
  return roofLines(p.pivot.pitchDeg, p.ports.length > 0);
}

// The plan's line for a pivot window: where each half goes, and the hinges between them.
export function describePivot(p: Params): string[] {
  if (!isPivot(p)) return [];
  const { swingsIn, atMm } = p.pivot;
  const { wall, wedge } = pivotSides(p);
  if (!upright(swingsIn)) {
    return [
      `A pivot window: the wall goes ${wall}, ${mm(atMm)} mm up, its top edge pressed by the sash where it ` +
        `crosses the frame; the wedge goes ${wedge}, its point at the pivot. Check that the pivot’s hinges, at ` +
        'the jambs, clear the wall’s top corners and the wedge’s points; a notch in a side edge makes room for ' +
        'one that does not.',
    ];
  }
  const edge = swingsIn === 'right' ? 'right' : 'left';
  return [
    `A pivot window on an upright axis: the wall goes ${wall}, ${mm(atMm)} mm from the left jamb, its ${edge} ` +
      `edge pressed by the sash where it crosses the frame; the wedge goes ${wedge}, its point at the pivot. ` +
      'Check that the pivot’s hinges, at the head and the sill, clear the wall’s corners and the wedge’s points; ' +
      'a notch in the top or bottom edge makes room for one that does not.',
  ];
}
