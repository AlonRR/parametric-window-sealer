// Sliding dovetail rails (joint-rails, #30), a joint style beside the H-strips and the puzzle
// dovetails. The pieces meet edge to edge; each has half a dovetail rail along every edge it shares,
// standing on its room side and flush with the joint, so the two halves make one dovetail. A printed
// slider with a dovetail groove slides along it from the joint's end, holding the two pieces together
// in and across the wall's plane; it slides off to take the wall apart. The sliders stop short of the
// edge strips, as the H-strips do, and of the sliders across them where joints cross.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import { evenSegments } from './joint.js';
import type { JointParams } from './joint.js';
import type { GridLayout, GridPiece } from './layout.js';
import { plural } from './words.js';

export const SLIDER = { railHeightMm: 4, railBaseMm: 3, railTopMm: 4, wallMm: 2, gapMm: 1 } as const;

export interface SliderPlacement {
  axis: 'vertical' | 'horizontal'; // along a joint between two columns, or two rows
  xMm: number; // where it starts, on the joint, in the wall's frame
  yMm: number;
  lengthMm: number;
}

export interface SliderShape {
  kind: 'slider';
  lengthMm: number;
  widthMm: number;
  count: number;
}

export interface PieceRails {
  joint: JointParams;
  sliders: readonly SliderPlacement[];
}

// The groove takes the two half rails with the joint's fit a face; the slider's walls and floor stand
// round it.
const grooveFloorMm = (j: JointParams) => 2 * (SLIDER.railTopMm + j.fitMm);
const grooveMouthMm = (j: JointParams) => 2 * (SLIDER.railBaseMm + j.fitMm);
const grooveDepthMm = (j: JointParams) => SLIDER.railHeightMm + j.fitMm;
export const sliderWidthMm = (j: JointParams): number => grooveFloorMm(j) + 2 * SLIDER.wallMm;
export const sliderHeightMm = (j: JointParams): number => SLIDER.wallMm + grooveDepthMm(j);

// Where each joint between pieces is along one axis.
function joints(lengths: readonly number[]): number[] {
  let at = 0;
  return lengths.slice(0, -1).map((length) => (at += length));
}

// Along one joint, from end to end, stopping short of each crossing and of the wall's edges.
function spans(lengths: readonly number[], crossings: readonly number[], edgeInsetMm: number, reachMm: number) {
  let at = 0;
  return lengths.flatMap((length, i) => {
    const [start, end] = [at, at + length];
    at = end;
    const from = i === 0 ? start + edgeInsetMm : (crossings[i - 1] ?? start) + reachMm;
    const to = i === lengths.length - 1 ? end - edgeInsetMm : (crossings[i] ?? end) - reachMm;
    return to - from > 0 ? [{ from, length: to - from }] : [];
  });
}

export function planSliders(
  layout: GridLayout,
  joint: JointParams,
  edgeInsetMm: number,
  maxSliderMm = Infinity,
): SliderPlacement[] {
  if (joint.style !== 'rails') return [];
  const reach = sliderWidthMm(joint) / 2 + SLIDER.gapMm;
  const [columns, rows] = [joints(layout.columns), joints(layout.rows)];
  const pieces = (lengths: readonly number[], crossings: readonly number[]) =>
    spans(lengths, crossings, edgeInsetMm, reach).flatMap((s) => evenSegments(s.from, s.length, maxSliderMm));
  return [
    ...columns.flatMap((x) =>
      pieces(layout.rows, rows).map(([yMm, lengthMm]) => ({ axis: 'vertical' as const, xMm: x, yMm, lengthMm })),
    ),
    ...rows.flatMap((y) =>
      pieces(layout.columns, columns).map(([xMm, lengthMm]) => ({
        axis: 'horizontal' as const,
        xMm,
        yMm: y,
        lengthMm,
      })),
    ),
  ];
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// Identical sliders are one shape with a count, their lengths to 0.1 mm as the strips' are.
export function sliderShapes(sliders: readonly SliderPlacement[], joint: JointParams): SliderShape[] {
  const counts = new Map<number, number>();
  for (const s of sliders) counts.set(tenth(s.lengthMm), (counts.get(tenth(s.lengthMm)) ?? 0) + 1);
  const widthMm = tenth(sliderWidthMm(joint));
  return [...counts]
    .sort(([a], [b]) => b - a)
    .map(([lengthMm, count]) => ({ kind: 'slider' as const, lengthMm, widthMm, count }));
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// The half rails along a piece's edges, in its own frame, standing on its room side.
export function railsOn(
  engine: Engine,
  cell: GridPiece,
  thicknessMm: number,
  sliders: readonly SliderPlacement[],
): Manifold[] {
  const { railHeightMm: h, railBaseMm: base, railTopMm: top } = SLIDER;
  const [t, w, ht] = [thicknessMm, cell.widthMm, cell.heightMm];
  // The rail's section across the joint: from the joint inward, the base's width at the face and the
  // top's above it.
  const across = (edge: number, inward: 1 | -1): [number, number][] => [
    [edge, t],
    [edge + inward * base, t],
    [edge + inward * top, t + h],
    [edge, t + h],
  ];
  return sliders.flatMap((s) => {
    if (s.axis === 'vertical') {
      const [from, to] = [s.yMm - cell.yMm, s.yMm - cell.yMm + s.lengthMm];
      if (from < -1e-6 || to > ht + 1e-6) return [];
      const edge = near(s.xMm, cell.xMm + w) ? w : near(s.xMm, cell.xMm) ? 0 : undefined;
      if (edge === undefined) return [];
      const section = across(edge, edge === 0 ? 1 : -1);
      return [
        engine.Manifold.hull([from, to].flatMap((y) => section.map(([x, z]): [number, number, number] => [x, y, z]))),
      ];
    }
    const [from, to] = [s.xMm - cell.xMm, s.xMm - cell.xMm + s.lengthMm];
    if (from < -1e-6 || to > w + 1e-6) return [];
    const edge = near(s.yMm, cell.yMm + ht) ? ht : near(s.yMm, cell.yMm) ? 0 : undefined;
    if (edge === undefined) return [];
    const section = across(edge, edge === 0 ? 1 : -1);
    return [
      engine.Manifold.hull([from, to].flatMap((x) => section.map(([y, z]): [number, number, number] => [x, y, z]))),
    ];
  });
}

// A slider lying as it prints, its groove up: along X, across Y, up Z.
export function sliderSolid(engine: Engine, lengthMm: number, joint: JointParams): Manifold {
  const [width, height, floor] = [sliderWidthMm(joint), sliderHeightMm(joint), SLIDER.wallMm];
  const body = engine.Manifold.cube([lengthMm, width, height]);
  const [wide, narrow, depth] = [grooveFloorMm(joint) / 2, grooveMouthMm(joint) / 2, grooveDepthMm(joint)];
  // The groove narrows from its floor to its mouth, and runs on past the mouth to cut cleanly.
  const past = 1;
  const at = (z: number) => wide - ((wide - narrow) * (z - floor)) / depth;
  const centre = width / 2;
  const groove = engine.Manifold.hull(
    [-1, lengthMm + 1].flatMap((x) =>
      [floor, height + past].flatMap((z) =>
        [-1, 1].map((side): [number, number, number] => [x, centre + side * at(z), z]),
      ),
    ),
  );
  const slider = body.subtract(groove);
  body.delete();
  groove.delete();
  return slider;
}

export function describeSliders(sliders: readonly SliderPlacement[], joint: JointParams): string {
  if (sliders.length === 0) return 'No joints: the wall is one piece.';
  const lengths = sliderShapes(sliders, joint).length;
  return (
    `Joints: sliding dovetail rails, ${plural(sliders.length, 'slider', 'sliders')} in ` +
    `${plural(lengths, 'length', 'lengths')}: lay the pieces room side up, edge to edge, and slide a slider along ` +
    'each pair of rails from its end. They hold the pieces in and across the wall’s plane, and slide off to take ' +
    'the wall apart.'
  );
}
