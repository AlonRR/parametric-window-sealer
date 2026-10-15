// Bolted flanges (joint-bolts, #31), a joint style beside the H-strips, the puzzle dovetails and the
// sliding rails. The pieces meet edge to edge; each has a flange standing on its room side along
// every edge it shares, flush with the joint, so the two flanges stand back to back, and M4 bolts
// through both, a washer each side and a nut, hold the pieces together in and across the wall's
// plane. The flanges run to the crossings and stop short of the edge strips, as the H-strips do.
// M4, as the clamps', the sliding insert's and the fans' bolts are; nothing else is printed for them.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout, GridPiece } from './layout.js';
import { mm, plural } from './words.js';

export const FLANGE = { heightMm: 10, thicknessMm: 3, holeMm: 4.5, pitchMm: 80, endMm: 15 } as const;
const HOLE_SEGMENTS = 32;

export interface FlangePlacement {
  axis: 'vertical' | 'horizontal'; // along a joint between two columns, or two rows
  xMm: number; // where it starts, on the joint, in the wall's frame
  yMm: number;
  lengthMm: number;
  boltsMm: number[]; // each bolt, from where it starts
}

export interface PieceFlanges {
  joint: JointParams;
  flanges: readonly FlangePlacement[];
}

// Through both flanges, a washer each side and a nut, to the next whole mm, as the clamps' bolts.
export const flangeBoltMm = (): number => Math.ceil(2 * FLANGE.thicknessMm + 6 - 1e-9);

// One bolt about each pitch, centred in equal lengths, none nearer an end than endMm.
function bolts(lengthMm: number): number[] {
  const most = Math.floor(lengthMm / (2 * FLANGE.endMm) + 1e-9);
  const count = Math.min(most, Math.max(1, Math.round(lengthMm / FLANGE.pitchMm)));
  return Array.from({ length: count }, (_, i) => Math.round((((i + 0.5) * lengthMm) / count) * 1e6) / 1e6);
}

// Where each joint between pieces is along one axis.
function joints(lengths: readonly number[]): number[] {
  let at = 0;
  return lengths.slice(0, -1).map((length) => (at += length));
}

// Along one joint, piece by piece, stopping short of the wall's edges.
function spans(lengths: readonly number[], edgeInsetMm: number) {
  let at = 0;
  return lengths.map((length, i) => {
    const [start, end] = [at, at + length];
    at = end;
    const from = i === 0 ? start + edgeInsetMm : start;
    const to = i === lengths.length - 1 ? end - edgeInsetMm : end;
    return { from, length: to - from };
  });
}

export function planFlanges(layout: GridLayout, joint: JointParams, edgeInsetMm: number): FlangePlacement[] {
  if (joint.style !== 'bolts') return [];
  const along = (lengths: readonly number[]) => spans(lengths, edgeInsetMm).filter((s) => s.length > 0);
  return [
    ...joints(layout.columns).flatMap((x) =>
      along(layout.rows).map((s) => ({
        axis: 'vertical' as const,
        xMm: x,
        yMm: s.from,
        lengthMm: s.length,
        boltsMm: bolts(s.length),
      })),
    ),
    ...joints(layout.rows).flatMap((y) =>
      along(layout.columns).map((s) => ({
        axis: 'horizontal' as const,
        xMm: s.from,
        yMm: y,
        lengthMm: s.length,
        boltsMm: bolts(s.length),
      })),
    ),
  ];
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// A piece's flanges, in its own frame, standing on its room side, with a hole for each bolt; the
// caller unites them with the piece.
export function flangesOn(
  engine: Engine,
  cell: GridPiece,
  thicknessMm: number,
  flanges: readonly FlangePlacement[],
): Manifold[] {
  const { heightMm: h, thicknessMm: f, holeMm } = FLANGE;
  const [w, ht, t] = [cell.widthMm, cell.heightMm, thicknessMm];
  const made: Manifold[] = [];
  for (const s of flanges) {
    const vertical = s.axis === 'vertical';
    const [line, start] = vertical ? [s.xMm - cell.xMm, s.yMm - cell.yMm] : [s.yMm - cell.yMm, s.xMm - cell.xMm];
    const [across, along] = vertical ? [w, ht] : [ht, w];
    if (start < -1e-6 || start + s.lengthMm > along + 1e-6) continue;
    const at = near(line, across) ? across - f : near(line, 0) ? 0 : undefined;
    if (at === undefined) continue;
    const box = engine.Manifold.cube(vertical ? [f, s.lengthMm, h] : [s.lengthMm, f, h]);
    let flange = box.translate(vertical ? [at, start, t] : [start, at, t]);
    box.delete();
    for (const b of s.boltsMm) {
      const rod = engine.Manifold.cylinder(f + 2, holeMm / 2, holeMm / 2, HOLE_SEGMENTS);
      const turned = rod.rotate(vertical ? [0, 90, 0] : [-90, 0, 0]);
      const placed = turned.translate(vertical ? [at - 1, start + b, t + h / 2] : [start + b, at - 1, t + h / 2]);
      const holed = flange.subtract(placed);
      for (const m of [rod, turned, placed, flange]) m.delete();
      flange = holed;
    }
    made.push(flange);
  }
  return made;
}

export function describeFlanges(flanges: readonly FlangePlacement[]): string {
  if (flanges.length === 0) return 'No joints: the wall is one piece.';
  const count = flanges.reduce((n, f) => n + f.boltsMm.length, 0);
  return (
    `Joints: bolted flanges along the ${plural(flanges.length, 'edge', 'edges')} where pieces meet: ` +
    `${plural(count, 'M4 bolt', 'M4 bolts')}, ${mm(flangeBoltMm())} mm long, each with a nut and 2 washers. Lay the ` +
    'pieces room side up, edge to edge, and bolt each pair of flanges together. They hold the pieces in and across ' +
    'the wall’s plane, and come apart with a screwdriver.'
  );
}
