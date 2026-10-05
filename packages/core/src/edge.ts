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

import type { JointParams } from './joint.js';

export type EdgeName = 'top' | 'bottom' | 'left' | 'right';
export type EdgeRole = 'track' | 'sash' | 'sill';
export type WindowType = 'slider' | 'hung';

export const EDGES: readonly EdgeName[] = ['top', 'bottom', 'left', 'right'];

export const WINDOW_PRESETS: Record<WindowType, Record<EdgeName, EdgeRole>> = {
  slider: { top: 'track', bottom: 'track', left: 'track', right: 'sash' },
  hung: { top: 'sash', bottom: 'sill', left: 'track', right: 'track' },
};

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

export const EDGE_BASE_MM = 2; // under the slot (Q69)

export interface EdgeParams {
  window: WindowType;
  roles: Record<EdgeName, EdgeRole>;
  track: TrackParams;
}

export interface EdgeProfile {
  widthMm: number; // across the wall's thickness
  heightMm: number; // from the outer face to the slot's mouth
  reachMm: number; // how far the panel goes past the opening's edge (negative: short of it)
}

// How deep the panel sits in an edge strip's slot: the middle of the slide (Q56).
const inSlotMm = (j: JointParams) => j.slotMm - j.slideMm / 2;

export function edgeProfile(edge: EdgeName, edges: EdgeParams, joint: JointParams): EdgeProfile {
  const inTrack = edges.roles[edge] === 'track';
  const depth = inTrack ? edges.track.depthMm[edge] : 0;
  const heightMm = Math.max(depth, joint.slotMm + EDGE_BASE_MM);
  return {
    widthMm: inTrack ? edges.track.widthMm - 2 * edges.track.clearanceMm : edges.track.widthMm,
    heightMm,
    reachMm: depth - heightMm + inSlotMm(joint),
  };
}

// The size the pieces and joints have to fill: the opening, plus each edge's reach.
export function panelSpan(
  openingWidthMm: number,
  openingHeightMm: number,
  edges: EdgeParams,
  joint: JointParams,
): { widthMm: number; heightMm: number } {
  const reach = (e: EdgeName) => edgeProfile(e, edges, joint).reachMm;
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
  heightMm: number;
}

// The fewest equal segments no longer than the printer can make (Q73).
function segments(fromMm: number, lengthMm: number, maxMm: number): [number, number][] {
  const count = Math.max(1, Math.ceil(lengthMm / maxMm - 1e-9));
  const each = lengthMm / count;
  return Array.from({ length: count }, (_, i) => [fromMm + i * each, each]);
}

export function planEdges(
  spanWidthMm: number,
  spanHeightMm: number,
  edges: EdgeParams,
  joint: JointParams,
  maxLengthMm: number,
): EdgeStripPlacement[] {
  const inSlot = inSlotMm(joint);
  const p = (e: EdgeName) => edgeProfile(e, edges, joint);
  const [top, bottom, left, right] = [p('top'), p('bottom'), p('left'), p('right')];
  // Across the wall, where each strip's outer face and slot mouth lie.
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
  const run = (
    edge: EdgeName,
    profile: EdgeProfile,
    [from, to]: number[],
    place: (at: number) => [number, number],
  ) =>
    segments(from ?? 0, (to ?? 0) - (from ?? 0), maxLengthMm).map(([at, lengthMm]) => {
      const [xMm, yMm] = place(at);
      return { edge, xMm, yMm, lengthMm, widthMm: profile.widthMm, heightMm: profile.heightMm };
    });
  return [
    ...run('bottom', bottom, across, (x) => [x, outer.bottom]),
    ...run('top', top, across, (x) => [x, mouth.top]),
    ...run('left', left, up, (y) => [outer.left, y]),
    ...run('right', right, up, (y) => [mouth.right, y]),
  ];
}

export interface EdgeShape {
  kind: 'edge';
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// Identical segments are one shape with a count (Q58), to 0.1 mm like the joint strips.
export function edgeShapes(strips: EdgeStripPlacement[]): EdgeShape[] {
  const counts = new Map<string, EdgeShape>();
  for (const s of strips) {
    const shape = {
      kind: 'edge' as const,
      lengthMm: tenth(s.lengthMm),
      widthMm: tenth(s.widthMm),
      heightMm: tenth(s.heightMm),
      count: 0,
    };
    const key = `${shape.lengthMm}x${shape.widthMm}x${shape.heightMm}`;
    const seen = counts.get(key) ?? shape;
    seen.count += 1;
    counts.set(key, seen);
  }
  return [...counts.values()].sort((a, b) => b.lengthMm - a.lengthMm || a.widthMm - b.widthMm);
}
