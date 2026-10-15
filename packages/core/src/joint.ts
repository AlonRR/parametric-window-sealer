// The joint between pieces (backlog item connector-strip, #10): where the strips and the
// cross pieces go. The shapes themselves are in joint-geometry.ts.
//
// An H-profile strip, proud of both faces, takes the full edge of the pieces on either side
// (Q13, Q50). The plan puts each piece in the middle of its slide (Q56), so a joint takes
// the web plus the slide. A cross piece, a square as wide as the strip, sits where four
// pieces meet; strips stop half the slide short of it, so a joint next to a crossing can
// still close up (Q57). At the wall's outer edge a strip stops short of the edge strip
// (Q74), or runs flush with the pieces when there is none (Q59).
//
// A strip holds the panels by crush ribs on the insides of its flanges, which reach a little past
// the panel's faces and are squeezed as it goes in, so the joint holds however exactly the printer
// prints; the flat of the flanges keeps the fit as clearance. A pin of filament goes through each
// strip's middle and through a slot in the piece as long as the slide, so a piece can still slide
// but cannot pull out of its strip (joint-lock, #110).

import type { GridLayout } from './layout.js';

export interface JointParams {
  slotMm: number; // how deep a piece can go into the strip
  slideMm: number; // how far a piece can move in its slot
  webMm: number; // the wall between the two slots
  flangeMm: number; // each face of the strip
  fitMm: number; // clearance between each panel face and the strip
  gripMm: number; // how far the ribs reach past each panel face, to be squeezed; 0 for no ribs
  pins: boolean; // a pin through each strip's middle, in a slot in each piece
}

// The owner's starting numbers, adjustable under advanced (Q51).
export const DEFAULT_JOINT: JointParams = {
  slotMm: 8,
  slideMm: 3,
  webMm: 2,
  flangeMm: 1.6,
  fitMm: 0.2,
  gripMm: 0.15,
  pins: true,
};

// A rib is a ridge across the slot, 1 mm wide at its foot and pointed, rising from flush over the
// first 1 mm of the slot's mouth so the panel finds its way in; one in about each 25 mm of strip.
export const RIB_BASE_MM = 1;
export const RIB_LEAD_MM = 1;
export const RIB_PITCH_MM = 25;

// The pins are cut from 1.75 mm filament: snug in the strip's holes, free in the piece's slots.
export const PIN_MM = 1.75;
export const PIN_HOLE_MM = 1.8;
export const PIN_SLOT_MM = 2;

// A pin needs this much of the slot beyond the slide: about 1 mm of flange between it and the
// slot's mouth, and 1 mm of piece between its slot and the piece's edge.
export const PIN_HOLD_MM = 4;

export const jointWidthMm = (j: JointParams): number => j.webMm + j.slideMm;
export const stripWidthMm = (j: JointParams): number => 2 * j.slotMm + j.webMm;
export const stripThicknessMm = (j: JointParams, panelMm: number): number => panelMm + 2 * j.fitMm + 2 * j.flangeMm;

// The smallest piece the joints can hold (min-piece-from-joint, #53): the slot depth the
// strips take at both edges, plus a strip's width between them, so every strip between
// two crossings is at least as long as it is wide (Q37, Q76).
export const minPieceMm = (j: JointParams): number => 2 * j.slotMm + stripWidthMm(j);

// Where the ribs stand along a strip: an even number, so none is at the middle where the pins go.
export function ribPlacesMm(lengthMm: number): number[] {
  const count = Math.max(2, 2 * Math.round(lengthMm / (2 * RIB_PITCH_MM)));
  return Array.from({ length: count }, (_, i) => ((i + 0.5) * lengthMm) / count);
}

// A pin's centre, in from its slot's mouth: halfway to where a piece spread out to the end of its
// slide stops, so the flange and the piece keep as much on either side of it.
export const pinDepthMm = (j: JointParams): number => (j.slotMm - j.slideMm) / 2;

// A pin goes right through the strip.
export const pinLengthMm = (j: JointParams, panelMm: number): number => stripThicknessMm(j, panelMm);

// How far in from a piece's edge a pin's centre can be: from the piece spread out to the end of its
// slide, to the piece pushed home against the web. Its slot in the piece runs that far.
export const pinSlotRangeMm = (j: JointParams): { fromMm: number; toMm: number } => ({
  fromMm: j.slotMm - j.slideMm - pinDepthMm(j),
  toMm: j.slotMm - pinDepthMm(j),
});

export interface StripPlacement {
  axis: 'vertical' | 'horizontal'; // along a joint between two columns, or two rows
  xMm: number; // the strip's lower-left corner, seen from the front
  yMm: number;
  lengthMm: number;
}

export interface CrossPlacement {
  xMm: number; // the centre, seen from the front
  yMm: number;
}

export interface JointPlan {
  strips: StripPlacement[];
  crosses: CrossPlacement[];
}

// Where each run of pieces starts along one axis, and the centre of each joint after it.
function runs(lengths: number[], joints: number[]) {
  const starts: number[] = [];
  const centres: number[] = [];
  let at = 0;
  lengths.forEach((length, i) => {
    starts.push(at);
    at += length;
    const joint = joints[i];
    if (joint !== undefined) {
      centres.push(at + joint / 2);
      at += joint;
    }
  });
  return { starts, centres };
}

// The pieces along one joint, each with a strip from crossing to crossing. Next to a
// crossing the strip stops the cross piece's half width plus half the slide from the
// crossing's centre; at the wall's edge it stops the inset short of the edge (Q59, Q74).
function stripSpans(lengths: number[], starts: number[], crossings: number[], j: JointParams, insetMm: number) {
  const reach = stripWidthMm(j) / 2 + j.slideMm / 2;
  return lengths.flatMap((length, i) => {
    const before = crossings[i - 1];
    const after = crossings[i];
    const from = before === undefined ? (starts[i] ?? 0) + insetMm : before + reach;
    const to = after === undefined ? (starts[i] ?? 0) + length - insetMm : after - reach;
    return to - from > 0 ? [{ from, length: to - from }] : [];
  });
}

// edgeInsetMm: how far short of the wall's outer edge a strip stops; with edge strips
// (track-edge, #11) that is jointStripInsetMm in edge.ts.
export function planJoints(layout: GridLayout, joint: JointParams, edgeInsetMm = 0): JointPlan {
  const half = stripWidthMm(joint) / 2;
  const cols = runs(layout.columns, layout.columnJointsMm);
  const rows = runs(layout.rows, layout.rowJointsMm);
  const strips: StripPlacement[] = [
    ...cols.centres.flatMap((x) =>
      stripSpans(layout.rows, rows.starts, rows.centres, joint, edgeInsetMm).map((s) => ({
        axis: 'vertical' as const,
        xMm: x - half,
        yMm: s.from,
        lengthMm: s.length,
      })),
    ),
    ...rows.centres.flatMap((y) =>
      stripSpans(layout.columns, cols.starts, cols.centres, joint, edgeInsetMm).map((s) => ({
        axis: 'horizontal' as const,
        xMm: s.from,
        yMm: y - half,
        lengthMm: s.length,
      })),
    ),
  ];
  const crosses = rows.centres.flatMap((yMm) => cols.centres.map((xMm) => ({ xMm, yMm })));
  return { strips, crosses };
}

export interface PinPlacement {
  axis: 'vertical' | 'horizontal'; // the strip it goes through
  xMm: number; // its centre, seen from the front
  yMm: number;
}

// Two pins through each strip, at its middle, one in each slot; none when the joint has no pins.
export function planPins(joints: JointPlan, joint: JointParams): PinPlacement[] {
  if (!joint.pins) return [];
  const [near, far] = [pinDepthMm(joint), stripWidthMm(joint) - pinDepthMm(joint)];
  return joints.strips.flatMap((s) =>
    s.axis === 'vertical'
      ? [near, far].map((across) => ({ axis: s.axis, xMm: s.xMm + across, yMm: s.yMm + s.lengthMm / 2 }))
      : [near, far].map((across) => ({ axis: s.axis, xMm: s.xMm + s.lengthMm / 2, yMm: s.yMm + across })),
  );
}

export interface PinSlot {
  edge: 'left' | 'right' | 'bottom' | 'top'; // the piece's edge the pin's strip is on
  alongMm: number; // where along that edge, from the piece's lower-left corner
}

// The pins that go through a piece, as slots in it: each pin is in the piece it lies in, nearest
// the edge whose strip it goes through.
export function pinSlotsIn(
  cell: { xMm: number; yMm: number; widthMm: number; heightMm: number },
  pins: readonly PinPlacement[],
): PinSlot[] {
  const inside = (p: PinPlacement) =>
    p.xMm > cell.xMm && p.xMm < cell.xMm + cell.widthMm && p.yMm > cell.yMm && p.yMm < cell.yMm + cell.heightMm;
  return pins.filter(inside).map((p) => {
    const [x, y] = [p.xMm - cell.xMm, p.yMm - cell.yMm];
    return p.axis === 'vertical'
      ? { edge: x < cell.widthMm - x ? 'left' : 'right', alongMm: y }
      : { edge: y < cell.heightMm - y ? 'bottom' : 'top', alongMm: x };
  });
}

export interface PartShape {
  kind: 'strip' | 'cross';
  lengthMm: number;
  widthMm: number;
  count: number;
  tpu?: true; // printed in TPU, with the TPU seal (seal-tpu, #22; C34)
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// Identical parts are one shape with a count (Q58). Strip lengths are rounded to 0.1 mm,
// the precision of the file names: well inside the 1.5 mm clearance at a strip's ends.
export function partShapes(plan: JointPlan, joint: JointParams): PartShape[] {
  const widthMm = tenth(stripWidthMm(joint));
  const counts = new Map<number, number>();
  for (const s of plan.strips) {
    const length = tenth(s.lengthMm);
    counts.set(length, (counts.get(length) ?? 0) + 1);
  }
  const strips = [...counts]
    .sort(([a], [b]) => b - a)
    .map(([lengthMm, count]) => ({ kind: 'strip' as const, lengthMm, widthMm, count }));
  const crosses =
    plan.crosses.length > 0 ? [{ kind: 'cross' as const, lengthMm: widthMm, widthMm, count: plan.crosses.length }] : [];
  return [...strips, ...crosses];
}
