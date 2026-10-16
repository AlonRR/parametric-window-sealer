// The wedge a tilted sash leaves (sash-wedge, #159; docs/research/sash-wedge.md): a sash hinged at
// the bottom, its top tilted into the room, leaves a strip open along the top and a thin triangle at
// each side. Their shapes follow from the opening seen inside the frame, W wide and H tall, and the
// gap d at the top, from the frame to the tilted sash.
//
// Each side triangle stands in the plane of a jamb, its apex at the hinge: its legs are the jamb and
// the sash's side, both H long, and its base the chord from the frame head to the sash's top. An
// edge strip runs along each leg, down to the hinge; near the hinge, where the two strips meet,
// each is cut off at the axis and together they close it. From there up it is a chain of pieces
// along its axis, joined end to end, up to the corner with the top strip. The top strip is a chain
// of pieces too, from where one corner reaches along it to where the other does.
//
// A sash hinged at the side and turned part way leaves the same wedge turned on its side: its
// triangles lie at the head and the sill, the sash's width long, and its strip runs up the latch
// side, the window's height long. It is built the same, in the same frame, its size given turned:
// the strip's length the window's height and the triangles' the width. Only its words differ, and
// the names of its strip's and its triangles' files.
import { divideAxis } from './layout.js';
import type { AxisLayout } from './layout.js';
import { capitalised, mm } from './words.js';

// Which way the sash opens: tilted in at the top on hinges at the bottom, or turned part way on
// hinges at the side.
export type SashForm = 'tilt' | 'turn';

export interface WedgeWords {
  sash: string; // the sash, with its article
  opens: string; // how it opens, in the plan's first line
  gap: string; // where the gap is, from the frame to the sash
  edge: string; // the sash's edge that moves into the room
  across: string; // what the window is, along the triangles
  strip: string; // the strip, without its article
  triangles: string; // where the triangles are, with their articles
  base: string; // a triangle's short side
  out: string; // how far from the hinge a triangle's chain starts
  nearer: string; // the part of a triangle nearer the hinge than its chain
  wide: string; // a triangle's end at the strip
  legs: string; // the gasket's run along a triangle's legs
  along: string; // the gasket's run along the strip
  stems: { triangle: string; strip: string }; // the parts' file names
}

export const WEDGE_WORDS: Record<SashForm, WedgeWords> = {
  tilt: {
    sash: 'a tilted sash',
    opens: 'leans',
    gap: 'the gap at the top',
    edge: 'top',
    across: 'tall',
    strip: 'top strip',
    triangles: 'a triangle each side',
    base: 'its top',
    out: 'above the hinge',
    nearer: 'below that',
    wide: 'top',
    legs: 'up each leg',
    along: 'along the top',
    stems: { triangle: 'side', strip: 'top' },
  },
  turn: {
    sash: 'a turned sash',
    opens: 'turns',
    gap: 'the gap at the latch side',
    edge: 'latch side',
    across: 'wide',
    strip: 'latch-side strip',
    triangles: 'a triangle at the head and one at the sill',
    base: 'its end at the latch side',
    out: 'out from the hinge',
    nearer: 'nearer the hinge',
    wide: 'wide end',
    legs: 'along each leg',
    along: 'up the latch side',
    stems: { triangle: 'triangle', strip: 'latch' },
  },
};

// In the wedge's own frame: the strip's length, the triangles' legs, and the gap at their wide end.
// For a tilted sash, the opening's width, its height and the gap at the top; for a turned one, its
// height, its width and the gap at the latch side.
export interface SashWedgeSize {
  widthMm: number; // along the strip
  heightMm: number; // along the sash, from the hinge to the strip
  gapMm: number; // at the strip, from the frame to the sash
}

export interface WedgeLimits {
  edgeStripMm: number; // how wide an edge strip is, square to its edge, across the face it closes
  maxPieceMm: number; // the longest piece the printer makes
  jointMm: number; // what a joint takes between two pieces
  minPieceMm: number; // the narrowest piece the joints hold
  corner: {
    roomMm: number; // along a triangle's axis, from the top of its chain to its top
    reachMm: number; // along the top strip, from the triangle's outer face to where its pieces start
  };
}

export interface WedgeSide {
  legMm: number; // the jamb and the sash's side
  baseMm: number; // the chord from the frame head to the sash's top
  axisMm: number; // from the hinge to the middle of the base
  widthAtMm: (alongMm: number) => number; // across the triangle, that far along its axis
  tipMm: number; // along the axis, where the two legs' edge strips meet: they close it below
  chain: AxisLayout; // the pieces from there up, and the joints between them
}

// Its parts are named as a tilted sash's: top is the strip, side each triangle.
export interface SashWedge {
  form: SashForm;
  tiltDeg: number; // how far the sash leans or turns in
  top: { lengthMm: number; depthMm: number; chain: AxisLayout }; // the strip along the sash's free edge
  side: WedgeSide;
}

export function sashWedge(size: SashWedgeSize, limits: WedgeLimits, form: SashForm = 'tilt'): SashWedge {
  const tilt = Math.asin(size.gapMm / size.heightMm);
  const half = tilt / 2;
  const baseMm = 2 * size.heightMm * Math.sin(half);
  const axisMm = size.heightMm * Math.cos(half);
  const tipMm = limits.edgeStripMm / Math.sin(half);
  const along = (lengthMm: number): AxisLayout =>
    divideAxis({
      lengthMm,
      maxPieceMm: limits.maxPieceMm,
      mode: 'equal',
      filler: 'end',
      minPieceMm: limits.minPieceMm,
      jointMm: limits.jointMm,
    });
  const chain = along(axisMm - tipMm - limits.corner.roomMm);
  return {
    form,
    tiltDeg: (tilt * 180) / Math.PI,
    top: { lengthMm: size.widthMm, depthMm: baseMm, chain: along(size.widthMm - 2 * limits.corner.reachMm) },
    side: {
      legMm: size.heightMm,
      baseMm,
      axisMm,
      widthAtMm: (alongMm) => 2 * alongMm * Math.tan(half),
      tipMm,
      chain,
    },
  };
}

// What is wrong with the gap, if anything: the strip needs an edge strip each side and a piece
// between them, and a sash's free edge moves in less than the triangles are long.
export function sashWedgeProblem(
  size: SashWedgeSize,
  limits: WedgeLimits,
  form: SashForm = 'tilt',
): string | undefined {
  const { gapMm, heightMm } = size;
  const w = WEDGE_WORDS[form];
  if (!(gapMm > 0)) return `Enter ${w.gap}, in mm, greater than 0.`;
  const gap = `${capitalised(w.gap)} is ${mm(gapMm)} mm`;
  if (gapMm >= heightMm) {
    return `${gap}: ${w.sash}’s ${w.edge} moves in less than the window is ${w.across}.`;
  }
  // The chord, as sashWedge finds it; at least twice an edge strip, so the strips meet below the top.
  const least = 2 * limits.edgeStripMm + limits.minPieceMm;
  if (2 * heightMm * Math.sin(Math.asin(gapMm / heightMm) / 2) < least - 1e-9) {
    return `${gap}; it needs at least ${mm(least)} mm, for an edge strip each side of the ${w.strip} and a piece between them.`;
  }
  return undefined;
}
