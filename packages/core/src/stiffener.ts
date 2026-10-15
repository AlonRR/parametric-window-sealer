// Strips that stiffen (stiffener-strips, #111), as the owner chose: bought angle. A printed wall more than
// 500 mm across its short span bends a long way in wind, and a fin on the strips cannot stiffen it:
// they stop at every crossing. So the wall is stiffened by bought 20 × 20 × 2 mm aluminium angle on
// its room side, each length across the short span through the middle of a row (or of a column),
// where the joint strips across its way have their pins. A printed clip on each such strip holds the
// angle's flat leg; it is pinned by the strip's own two pins, cut longer to go through it. Lengths
// go in as few rows as leave no gap over 500 mm between them or to the wall's edges.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import { DEFAULT_JOINT, PIN_HOLE_MM, pinDepthMm, stripThicknessMm, stripWidthMm } from './joint.js';
import type { JointParams } from './joint.js';
import type { Params } from './params.js';
import { planParts, planWall } from './plan.js';
import { panelSpan } from './edge.js';
import { tapeFit } from './tape.js';
import { mm } from './words.js';

export const STIFFEN_OVER_MM = 500; // a span over this is stiffened
export const STIFFENER_GAP_MM = 500; // at most, between lengths and to the edges
export const STIFFENER_END_MM = 5; // short of the wall's edge, each end
export const ANGLE = { legMm: 20, thicknessMm: 2 }; // aluminium angle, as sold
export const CLIP_LENGTH_MM = 20; // along the angle
export const CLIP_BASE_MM = 2.4; // between the strip and the angle, which the pins go through
const CLIP_WALL_MM = 2;
const CLIP_PLAY_MM = 0.3; // round the angle's leg, to slide it in
const CLIP_EDGE_MM = 2; // the base past the angle's corner
const PIN_SEGMENTS = 32;

export interface ClipPlace {
  xMm: number; // the middle of its strip's two pins, seen from the room's side as the plan is
  yMm: number;
}

export interface StiffenerLine {
  index: number; // the row (or the column) it goes through, from 0
  atMm: number; // its middle, up the wall (or across it)
  clips: ClipPlace[];
}

export interface StiffenerPlan {
  axis: 'horizontal' | 'vertical'; // across the wall, or up it
  spanMm: number; // the short span it crosses
  lengthMm: number; // each length of angle
  pinMm: number; // the longer pins through a strip and a clip
  pinned: boolean; // false with no pins to clip to
  lines: StiffenerLine[];
}

export interface ClipShape {
  kind: 'clip';
  count: number;
}

// The fewest places, from those given, that leave no gap over the limit between them or to the ends.
function spaced(places: number[], spanMm: number): number[] {
  const sorted = [...new Set(places)].sort((a, b) => a - b);
  const chosen: number[] = [];
  let last = 0;
  while (spanMm - last > STIFFENER_GAP_MM + 1e-9) {
    const reach = sorted.filter((p) => p > last + 1e-9 && p <= last + STIFFENER_GAP_MM + 1e-9);
    const next = reach.length > 0 ? reach[reach.length - 1] : sorted.find((p) => p > last + 1e-9);
    if (next === undefined) break;
    chosen.push(next);
    last = next;
  }
  return chosen;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

export function planStiffeners(p: Params): StiffenerPlan | undefined {
  if (!p.stiffen) return undefined;
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tapeFit(p.seal));
  const horizontal = span.widthMm <= span.heightMm;
  const [spanMm, alongMm] = horizontal ? [span.widthMm, span.heightMm] : [span.heightMm, span.widthMm];
  if (spanMm <= STIFFEN_OVER_MM) return undefined;
  const plan = planWall(p);
  // A length across the wall crosses the vertical strips at their pins, halfway up a row; one up the
  // wall crosses the horizontal strips halfway along a column.
  const half = stripWidthMm(p.joint) / 2;
  const crossed = planParts(p, plan)
    .joints.strips.filter((s) => s.axis === (horizontal ? 'vertical' : 'horizontal'))
    .map((s) =>
      horizontal
        ? { xMm: s.xMm + half, yMm: s.yMm + s.lengthMm / 2, at: s.yMm + s.lengthMm / 2 }
        : { xMm: s.xMm + s.lengthMm / 2, yMm: s.yMm + half, at: s.xMm + s.lengthMm / 2 },
    );
  const mids = horizontal ? middles(plan.rows, plan.rowJointsMm) : middles(plan.columns, plan.columnJointsMm);
  const lines = spaced(
    crossed.map((c) => c.at),
    alongMm,
  ).map((atMm) => ({
    index: nearest(mids, atMm),
    atMm,
    clips: crossed.filter((c) => Math.abs(c.at - atMm) < 1e-6).map(({ xMm, yMm }) => ({ xMm, yMm })),
  }));
  return {
    axis: horizontal ? 'horizontal' : 'vertical',
    spanMm: tenth(spanMm),
    lengthMm: tenth(spanMm - 2 * STIFFENER_END_MM),
    pinMm: tenth(stripThicknessMm(p.joint, p.thicknessMm) + CLIP_BASE_MM),
    pinned: p.joint.pins,
    lines,
  };
}

// Each row's (or column's) middle, along the wall.
function middles(lengths: readonly number[], joints: readonly number[]): number[] {
  let at = 0;
  return lengths.map((length, i) => {
    const middle = at + length / 2;
    at += length + (joints[i] ?? 0);
    return middle;
  });
}

const nearest = (places: number[], at: number): number =>
  places.reduce((best, p, i) => (Math.abs(p - at) < Math.abs((places[best] ?? Infinity) - at) ? i : best), 0);

export function clipShapes(plan: StiffenerPlan | undefined): ClipShape[] {
  if (plan === undefined || !plan.pinned) return [];
  const count = plan.lines.reduce((n, l) => n + l.clips.length, 0);
  return count > 0 ? [{ kind: 'clip', count }] : [];
}

export function describeStiffeners(p: Params): string[] {
  const plan = planStiffeners(p);
  if (plan === undefined) return [];
  const across = plan.axis === 'horizontal' ? 'across' : 'high';
  const start = `Stiffeners: the wall is ${mm(plan.spanMm)} mm ${across}, more than ${mm(STIFFEN_OVER_MM)}`;
  if (p.joint.style === 'dovetails') {
    return [`${start}; the stiffeners clip to the H-strips, so choose them to stiffen it.`];
  }
  if (!plan.pinned) return [`${start}; turn the pins on to clip a stiffener to it.`];
  const clips = plan.lines.reduce((n, l) => n + l.clips.length, 0);
  if (clips === 0) return [];
  const where = plan.axis === 'horizontal' ? 'across its room side through rows' : 'up its room side through columns';
  const which = plan.lines.map((l) => String(l.index + 1));
  const listed =
    which.length < 2 ? (which[0] ?? '') : `${which.slice(0, -1).join(', ')} and ${which[which.length - 1] ?? ''}`;
  const strip = stripThicknessMm(p.joint, p.thicknessMm);
  return [
    `${start}, so stiffen it with ${plan.lines.length} ${plan.lines.length === 1 ? 'length' : 'lengths'} of ` +
      `${mm(ANGLE.legMm)} × ${mm(ANGLE.legMm)} × ${mm(ANGLE.thicknessMm)} mm aluminium angle, each ` +
      `${mm(plan.lengthMm)} mm long, ${where} ${listed}. ${clips} printed clips hold them on the joint strips ` +
      `there: cut those strips’ ${2 * clips} pins ${mm(plan.pinMm)} mm long instead of ${mm(strip)}, to go through ` +
      'the clips too, then slide each angle into its clips, its flat leg against the wall.',
  ];
}

// A clip standing on its end as it prints: across the angle's flat leg along X, from the strip out
// along Y, along the angle up Z. The base takes the two pins of its strip, as far apart as they are;
// the leg slides between the base and a lip from the back wall, open on the side of the angle's
// corner, where its other leg stands out into the room.
export function clipSolid(engine: Engine, joint: JointParams = DEFAULT_JOINT): Manifold {
  const { Manifold } = engine;
  const [leg, t, play, wall, base] = [ANGLE.legMm, ANGLE.thicknessMm, CLIP_PLAY_MM, CLIP_WALL_MM, CLIP_BASE_MM];
  const back = leg + play; // where the back wall starts, from the angle's corner
  const lipAt = base + t + play;
  const box = (x: [number, number], y: [number, number]) =>
    Manifold.cube([x[1] - x[0], y[1] - y[0], CLIP_LENGTH_MM]).translate([x[0] + CLIP_EDGE_MM, y[0], 0]);
  const parts = [
    box([-CLIP_EDGE_MM, back + wall], [0, base]),
    box([back, back + wall], [0, lipAt + wall]),
    box([t + play, back + wall], [lipAt, lipAt + wall]),
  ];
  const body = Manifold.union(parts);
  // The pins go through the base under the middle of the angle's leg, as far apart as a strip's.
  const apart = stripWidthMm(joint) - 2 * pinDepthMm(joint);
  const r = PIN_HOLE_MM / 2;
  const holes = [-apart / 2, apart / 2].map((dz) => {
    const pin = Manifold.cylinder(base + 2, r, r, PIN_SEGMENTS);
    const across = pin.rotate([-90, 0, 0]).translate([leg / 2 + CLIP_EDGE_MM, -1, CLIP_LENGTH_MM / 2 + dz]);
    pin.delete();
    return across;
  });
  const cut = Manifold.union(holes);
  const clip = body.subtract(cut);
  for (const m of [...parts, body, ...holes, cut]) m.delete();
  return clip;
}
