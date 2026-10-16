// The wedge a tilted sash leaves (sash-wedge, #159; docs/research/sash-wedge.md): a sash hinged at
// the bottom, its top tilted into the room, leaves a strip open along the top and a thin triangle at
// each side. Their shapes follow from the opening seen inside the frame, W wide and H tall, and the
// gap d at the top, from the frame to the tilted sash.
//
// Each side triangle stands in the plane of a jamb, its apex at the hinge: its legs are the jamb and
// the sash's side, both H long, and its base the chord from the frame head to the sash's top. It is
// printed as a chain of pieces along its axis, joined end to end; near the hinge, where it is
// narrower than the edge strips along its two legs, as one solid tip.
import { evenSegments } from './joint.js';
import { divideAxis } from './layout.js';
import type { AxisLayout } from './layout.js';
import { mm } from './words.js';

export interface TiltWedgeSize {
  widthMm: number; // the opening seen inside the frame
  heightMm: number;
  gapMm: number; // at the top, from the frame to the tilted sash
}

export interface WedgeLimits {
  edgeStripMm: number; // how wide an edge strip is, across the face it closes
  maxPieceMm: number; // the longest piece the printer makes
  jointMm: number; // what a joint takes between two pieces
  minPieceMm: number; // the narrowest piece the joints hold
}

export interface WedgeSide {
  legMm: number; // the jamb and the sash's side
  baseMm: number; // the chord from the frame head to the sash's top
  axisMm: number; // from the hinge to the middle of the base
  widthAtMm: (alongMm: number) => number; // across the triangle, that far along its axis
  tipMm: number; // along the axis, where it is as wide as its two edge strips: solid below
  tipSegmentsMm: number[]; // the tip in segments the printer makes, from the hinge
  chain: AxisLayout; // the pieces above the tip, and the joints between them, from the tip up
}

export interface TiltWedge {
  tiltDeg: number; // how far the sash leans in
  top: { lengthMm: number; depthMm: number }; // the strip across the top
  side: WedgeSide;
}

export function tiltWedge(size: TiltWedgeSize, limits: WedgeLimits): TiltWedge {
  const tilt = Math.asin(size.gapMm / size.heightMm);
  const half = tilt / 2;
  const baseMm = 2 * size.heightMm * Math.sin(half);
  const axisMm = size.heightMm * Math.cos(half);
  const tipMm = limits.edgeStripMm / Math.tan(half);
  const chain = divideAxis({
    lengthMm: axisMm - tipMm - limits.jointMm,
    maxPieceMm: limits.maxPieceMm,
    mode: 'equal',
    filler: 'end',
    minPieceMm: limits.minPieceMm,
    jointMm: limits.jointMm,
  });
  return {
    tiltDeg: (tilt * 180) / Math.PI,
    top: { lengthMm: size.widthMm, depthMm: baseMm },
    side: {
      legMm: size.heightMm,
      baseMm,
      axisMm,
      widthAtMm: (alongMm) => 2 * alongMm * Math.tan(half),
      tipMm,
      tipSegmentsMm: evenSegments(0, tipMm, limits.maxPieceMm).map(([, length]) => length),
      chain,
    },
  };
}

// What is wrong with the gap, if anything: the top strip needs an edge strip each side and a piece
// between them, and a sash's top tilts in less than the window is tall.
export function tiltWedgeProblem(size: TiltWedgeSize, limits: WedgeLimits): string | undefined {
  const { gapMm, heightMm } = size;
  if (!(gapMm > 0)) return 'Enter the gap at the top, in mm, greater than 0.';
  if (gapMm >= heightMm) {
    return `The gap at the top is ${mm(gapMm)} mm: a tilted sash’s top moves in less than the window is tall.`;
  }
  // The chord, as tiltWedge finds it; at least twice an edge strip, so the tip ends below the top.
  const least = 2 * limits.edgeStripMm + limits.minPieceMm;
  if (2 * heightMm * Math.sin(Math.asin(gapMm / heightMm) / 2) < least - 1e-9) {
    return (
      `The gap at the top is ${mm(gapMm)} mm; it needs at least ${mm(least)} mm, for an edge strip each side ` +
      'of the top strip and a piece between them.'
    );
  }
  return undefined;
}
