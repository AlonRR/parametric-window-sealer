// The wall's outer edges (backlog item track-edge, #11). Every edge gets an edge strip
// (Q65, Q68, Q72): half a joint strip, its slot taking the panel's edge, with a body that
// fills the window's track or meets the sash or the sill. The shapes are in
// edge-geometry.ts.
//
// Each edge has a role, preset by window type (Q66, Q75). The user measures the opening as
// seen, plus each track's depth (Q67). A strip in a track is as tall as the track is deep,
// its slot at the top, so nothing shows above the track (Q69); it keeps a 2 mm base under
// the slot, so in a shallow track it stands out. The panel sits in the middle of the
// slot's slide (Q56), so it reaches that far into a track, and stops short of a sash or
// a sill by the strip's height less that.
//
// With tape (seal-tape, #15) the outer face has a groove for it, with 2 mm kept over the groove
// (Q126), and the squeezed tape standing out of it is part of the edge's height (Q125): in a
// track the strip is that much shorter, at a sash or a sill the wall that much smaller. Tape on
// the sides of a strip in a track takes the place of the clearance (Q127).
//
// A window AC (window-ac, #24; Q15) is a fourth role, chosen without asking (Q144;
// docs/choices.md): an edge against the unit, its top or its side, is shaped as at a sash or a
// sill, a flat face with the seal on it (C49). Where the unit is, seen from the room, sets which
// edge meets it (C50): below the wall, as in a slider, or beside it, as in a hung window (C53).
//
// Behind a roller shutter (shutter-rails, #158) the wall's edges are a hung window's: its sides in
// the shutter's guide rails, its top under the lowered shutter's end bar, its bottom on the sill.
// Choosing it also sets the track to a guide rail's starting sizes (docs/shutter.md).

import { evenSegments } from './joint.js';
import type { JointParams } from './joint.js';
import type { TapeFit } from './tape.js';

export type EdgeName = 'top' | 'bottom' | 'left' | 'right';
// An edge pressed into a frame with no track (compression-edge, #120) is shaped as one against a
// sash, a flat face with the seal on it; its printed TPU gasket, squeezed, is what holds the wall.
export type EdgeRole = 'track' | 'sash' | 'sill' | 'unit' | 'frame';
// A tilted sash (sash-wedge, #159) is closed by a wedge, not a wall: its edges are all pressed
// against the frame or the sash, held by their gaskets' squeeze.
export type WindowType = 'slider' | 'hung' | 'frame' | 'shutter' | 'tilt';

export const EDGES: readonly EdgeName[] = ['top', 'bottom', 'left', 'right'];

export const WINDOW_PRESETS: Record<WindowType, Record<EdgeName, EdgeRole>> = {
  slider: { top: 'track', bottom: 'track', left: 'track', right: 'sash' },
  hung: { top: 'sash', bottom: 'sill', left: 'track', right: 'track' },
  frame: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
  shutter: { top: 'sash', bottom: 'sill', left: 'track', right: 'track' },
  tilt: { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' },
};

// Where a window AC is, seen from the room: the edge facing it meets it.
export type UnitPlace = 'below' | 'left' | 'right';
export const UNIT_PLACES: readonly UnitPlace[] = ['below', 'left', 'right'];
const FACING: Record<UnitPlace, EdgeName> = { below: 'bottom', left: 'left', right: 'right' };

export function unitRoles(window: WindowType, place: UnitPlace): Record<EdgeName, EdgeRole> {
  return { ...WINDOW_PRESETS[window], [FACING[place]]: 'unit' };
}

// In a slider the wall stands on the unit, and in a hung window, or under a roller shutter, the unit
// stands beside it, as each is usually opened; in a frame with no track, the unit stands on the sill
// and the wall above it.
export const defaultUnitPlace = (window: WindowType): UnitPlace =>
  window === 'hung' || window === 'shutter' ? 'right' : 'below';

export interface TrackParams {
  widthMm: number; // one width for every edge strip (Q72)
  clearanceMm: number; // per side, between an edge strip and its track (Q70)
  depthMm: Record<EdgeName, number>; // read only for an edge in a track
}

// Example sizes, labelled as such on the page (Q18).
export const EXAMPLE_TRACK: TrackParams = {
  widthMm: 15,
  clearanceMm: 0.5,
  depthMm: { top: 10, bottom: 10, left: 10, right: 10 },
};

// A roller shutter's guide rail, to start with: strips 8 mm thick pass the brushes or rubber seals
// at the rail's mouth, about 9 and 10 mm apart, and fill 20 mm of it, as far as the shutter's own
// slats sit in, leaving a rail 25 mm deep its play (docs/shutter.md).
export const SHUTTER_TRACK: TrackParams = {
  widthMm: 9,
  clearanceMm: 0.5,
  depthMm: { top: 20, bottom: 20, left: 20, right: 20 },
};

// The track a window type starts with, as it presets the edges.
export const windowTrack = (window: WindowType): TrackParams => (window === 'shutter' ? SHUTTER_TRACK : EXAMPLE_TRACK);

export const EDGE_BASE_MM = 2; // under the slot (Q69)

export interface EdgeParams {
  window: WindowType;
  roles: Record<EdgeName, EdgeRole>;
  track: TrackParams;
}

export interface EdgeGroove {
  widthMm: number;
  depthMm: number;
  // On each side too, from..to measured from the outer face, centred on the part of the side
  // inside the track; trackMm names the strip, as two depths can share a size (Q127).
  side?: { fromMm: number; toMm: number; trackMm: number };
}

export interface EdgeTape {
  standOutMm: number; // the squeezed tape beyond the strip's outer face
  groove: EdgeGroove;
}

export interface EdgeProfile {
  widthMm: number; // across the wall's thickness
  heightMm: number; // from the outer face, or the squeezed tape's face, to the slot's mouth
  reachMm: number; // how far the panel goes past the opening's edge (negative: short of it)
  tape?: EdgeTape; // the strip itself is heightMm less tape.standOutMm
}

// How deep the panel sits in an edge strip's slot: the middle of the slide (Q56).
const inSlotMm = (j: JointParams) => j.slotMm - j.slideMm / 2;

export function edgeProfile(edge: EdgeName, edges: EdgeParams, joint: JointParams, tape?: TapeFit): EdgeProfile {
  const inTrack = edges.roles[edge] === 'track';
  const depth = inTrack ? edges.track.depthMm[edge] : 0;
  const out = tape?.standOutMm ?? 0;
  const body = Math.max(depth - out, joint.slotMm + EDGE_BASE_MM + (tape?.grooveDepthMm ?? 0));
  const heightMm = body + out;
  const sides = inTrack && tape?.sides === true;
  const profile: EdgeProfile = {
    widthMm: inTrack ? edges.track.widthMm - 2 * (sides ? out : edges.track.clearanceMm) : edges.track.widthMm,
    heightMm,
    reachMm: depth - heightMm + inSlotMm(joint),
  };
  if (tape === undefined) return profile;
  const groove: EdgeGroove = { widthMm: tape.grooveWidthMm, depthMm: tape.grooveDepthMm };
  if (sides) {
    const inside = Math.min(body, depth - out);
    const fromMm = Math.max(0, (inside - tape.grooveWidthMm) / 2);
    groove.side = { fromMm, toMm: fromMm + tape.grooveWidthMm, trackMm: depth };
  }
  return { ...profile, tape: { standOutMm: out, groove } };
}

// The size the pieces and joints have to fill: the opening, plus each edge's reach.
export function panelSpan(
  openingWidthMm: number,
  openingHeightMm: number,
  edges: EdgeParams,
  joint: JointParams,
  tape?: TapeFit,
): { widthMm: number; heightMm: number } {
  const reach = (e: EdgeName) => edgeProfile(e, edges, joint, tape).reachMm;
  return {
    widthMm: openingWidthMm + reach('left') + reach('right'),
    heightMm: openingHeightMm + reach('bottom') + reach('top'),
  };
}

// A joint strip stops at an edge strip's mouth plus half the slide, as at a cross piece
// (Q57, Q74).
export const jointStripInsetMm = (j: JointParams): number => inSlotMm(j) + j.slideMm / 2;

export interface EdgeStripPlacement {
  edge: EdgeName;
  xMm: number; // lower-left corner of the segment, seen from the front, in the panel's frame
  yMm: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number; // the strip itself; with tape, its squeezed tape lies beyond its outer face
  tape?: EdgeTape;
}

// How far an edge's squeezed tape stands out from its strip; nothing without tape.
const standOutMm = (profile: EdgeProfile): number => profile.tape?.standOutMm ?? 0;

export function planEdges(
  spanWidthMm: number,
  spanHeightMm: number,
  edges: EdgeParams,
  joint: JointParams,
  maxLengthMm: number,
  tape?: TapeFit,
): EdgeStripPlacement[] {
  const inSlot = inSlotMm(joint);
  const p = (e: EdgeName) => edgeProfile(e, edges, joint, tape);
  const [top, bottom, left, right] = [p('top'), p('bottom'), p('left'), p('right')];
  // Across the wall, where each edge's outer face (with tape, the squeezed tape's) and slot
  // mouth lie. The strips through the corners reach the outer faces, tape and all.
  const outer = {
    left: inSlot - left.heightMm,
    right: spanWidthMm - inSlot + right.heightMm,
    bottom: inSlot - bottom.heightMm,
    top: spanHeightMm - inSlot + top.heightMm,
  };
  const mouth = { left: inSlot, right: spanWidthMm - inSlot, bottom: inSlot, top: spanHeightMm - inSlot };
  // One strip runs through each corner, by window type (Q71).
  const across = edges.window === 'slider' ? [outer.left, outer.right] : [mouth.left, mouth.right];
  const up = edges.window === 'slider' ? [mouth.bottom, mouth.top] : [outer.bottom, outer.top];
  const run = (edge: EdgeName, profile: EdgeProfile, [from, to]: number[], place: (at: number) => [number, number]) =>
    evenSegments(from ?? 0, (to ?? 0) - (from ?? 0), maxLengthMm).map(([at, lengthMm]) => {
      const [xMm, yMm] = place(at);
      const strip: EdgeStripPlacement = {
        edge,
        xMm,
        yMm,
        lengthMm,
        widthMm: profile.widthMm,
        heightMm: profile.heightMm - standOutMm(profile),
      };
      return profile.tape === undefined ? strip : { ...strip, tape: profile.tape };
    });
  // The bottom and left strips start past their tape; the top and right ones at the mouth.
  return [
    ...run('bottom', bottom, across, (x) => [x, outer.bottom + standOutMm(bottom)]),
    ...run('top', top, across, (x) => [x, mouth.top]),
    ...run('left', left, up, (y) => [outer.left + standOutMm(left), y]),
    ...run('right', right, up, (y) => [mouth.right, y]),
  ];
}

export interface EdgeShape {
  kind: 'edge';
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  groove?: EdgeGroove;
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// Identical segments are one shape with a count (Q58), to 0.1 mm like the joint strips.
export function edgeShapes(strips: EdgeStripPlacement[]): EdgeShape[] {
  const counts = new Map<string, EdgeShape>();
  for (const s of strips) {
    const shape: EdgeShape = {
      kind: 'edge' as const,
      lengthMm: tenth(s.lengthMm),
      widthMm: tenth(s.widthMm),
      heightMm: tenth(s.heightMm),
      ...(s.tape === undefined ? {} : { groove: s.tape.groove }),
      count: 0,
    };
    const key = `${shape.lengthMm}x${shape.widthMm}x${shape.heightMm}:${JSON.stringify(shape.groove ?? null)}`;
    const seen = counts.get(key) ?? shape;
    seen.count += 1;
    counts.set(key, seen);
  }
  return [...counts.values()].sort((a, b) => b.lengthMm - a.lengthMm || a.widthMm - b.widthMm);
}
