// Puzzle dovetails (joint-dovetail, #29), a joint style beside the H-strips. The pieces meet
// edge to edge; along each joint the piece on the left, or below, has dovetail tabs that press down
// into sockets in its neighbour, and the joint's fit is carved from both pieces all along, tabs and
// edges alike, so they go together whatever the printer's error within it. They hold the pieces in
// the wall's plane; across it only their fit holds them, which the plan says. Why each size and
// rule is so: docs/choices.md.
import type { CrossSection } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout, GridPiece } from './layout.js';
import { hundredth, mm, plural } from './words.js';

export const DOVETAIL = { depthMm: 6, neckMm: 8, headMm: 12, pitchMm: 60, endMm: 14 } as const;

export interface DovetailTab {
  axis: 'vertical' | 'horizontal'; // on a joint between two columns, pointing right; or two rows, pointing up
  xMm: number; // its neck's middle, on the joint, in the wall's frame
  yMm: number;
}

export interface PieceDovetails {
  joint: JointParams;
  tabs: readonly DovetailTab[];
}

const EPS_MM = 1e-6;

// One tab about each pitch, centred in equal lengths, none nearer an end than endMm.
function along(lengthMm: number): number[] {
  const most = Math.floor(lengthMm / (2 * DOVETAIL.endMm) + EPS_MM);
  const count = Math.min(most, Math.max(1, Math.round(lengthMm / DOVETAIL.pitchMm)));
  return Array.from({ length: count }, (_, i) => ((i + 0.5) * lengthMm) / count);
}

const beside = (plan: GridLayout, cell: GridPiece, columns: number, rows: number) =>
  plan.pieces.find((p) => p.column === cell.column + columns && p.row === cell.row + rows);

export function planDovetails(plan: GridLayout, joint: JointParams): DovetailTab[] {
  if (joint.style !== 'dovetails') return [];
  return plan.pieces.flatMap((cell) => [
    ...(beside(plan, cell, 1, 0) === undefined
      ? []
      : along(cell.heightMm).map((at) => ({
          axis: 'vertical' as const,
          xMm: cell.xMm + cell.widthMm,
          yMm: cell.yMm + at,
        }))),
    ...(beside(plan, cell, 0, 1) === undefined
      ? []
      : along(cell.widthMm).map((at) => ({
          axis: 'horizontal' as const,
          xMm: cell.xMm + at,
          yMm: cell.yMm + cell.heightMm,
        }))),
  ]);
}

// The joints between two pieces: one for each piece's right and upper neighbour.
const jointCount = (plan: GridLayout): number =>
  plan.pieces.filter((c) => beside(plan, c, 1, 0)).length + plan.pieces.filter((c) => beside(plan, c, 0, 1)).length;

// A tab's outline, reaching 1 mm back into its piece so the two join as one.
function tabSection(engine: Engine, t: DovetailTab): CrossSection {
  const { depthMm: d, neckMm: n, headMm: h } = DOVETAIL;
  const [x, y, back] = [t.xMm, t.yMm, 1];
  const points: [number, number][] =
    t.axis === 'vertical'
      ? [
          [x - back, y - n / 2],
          [x, y - n / 2],
          [x + d, y - h / 2],
          [x + d, y + h / 2],
          [x, y + n / 2],
          [x - back, y + n / 2],
        ]
      : [
          [x + n / 2, y - back],
          [x + n / 2, y],
          [x + h / 2, y + d],
          [x - h / 2, y + d],
          [x - n / 2, y],
          [x - n / 2, y - back],
        ];
  return new engine.CrossSection([points], 'NonZero');
}

const near = (a: number, b: number) => Math.abs(a - b) < EPS_MM;
const within = (at: number, from: number, length: number) => at > from && at < from + length;

// A piece's outline before the fit, in the wall's frame: its cell, with the tabs on its right and
// upper edges, less those of the pieces to its left and below.
function nominal(engine: Engine, cell: GridPiece, tabs: readonly DovetailTab[]): CrossSection {
  const onEdge = (t: DovetailTab, x: number, y: number) =>
    t.axis === 'vertical'
      ? near(t.xMm, x) && within(t.yMm, cell.yMm, cell.heightMm)
      : near(t.yMm, y) && within(t.xMm, cell.xMm, cell.widthMm);
  const own = tabs.filter((t) => onEdge(t, cell.xMm + cell.widthMm, cell.yMm + cell.heightMm));
  const theirs = tabs.filter((t) => onEdge(t, cell.xMm, cell.yMm));
  const square = engine.CrossSection.square([cell.widthMm, cell.heightMm]);
  const rect = square.translate([cell.xMm, cell.yMm]);
  const added = engine.CrossSection.union([rect, ...own.map((t) => tabSection(engine, t))]);
  const sockets = engine.CrossSection.union(theirs.map((t) => tabSection(engine, t)));
  const outline = added.subtract(sockets);
  for (const s of [square, rect, added, sockets]) s.delete();
  return outline;
}

// The piece's outline as it is made, in its own frame: its outline before the fit, less each
// neighbour's grown by the fit, so either side of every joint keeps the fit's clearance and the
// wall's outer edges stay where they are. The caller frees it.
export function dovetailOutline(
  engine: Engine,
  plan: GridLayout,
  cell: GridPiece,
  dovetails: PieceDovetails,
): CrossSection {
  let outline = nominal(engine, cell, dovetails.tabs);
  for (const [columns, rows] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const next = beside(plan, cell, columns, rows);
    if (next === undefined) continue;
    const theirs = nominal(engine, next, dovetails.tabs);
    const grown = theirs.offset(dovetails.joint.fitMm, 'Miter');
    const less = outline.subtract(grown);
    for (const s of [theirs, grown, outline]) s.delete();
    outline = less;
  }
  const local = outline.translate([-cell.xMm, -cell.yMm]);
  outline.delete();
  return local;
}

export function describeDovetails(plan: GridLayout, joint: JointParams): string {
  const joints = jointCount(plan);
  if (joints === 0) return 'No joints: the wall is one piece.';
  const tabs = planDovetails(plan, joint).length;
  return (
    `Joints: puzzle dovetails, ${plural(tabs, 'tab', 'tabs')} along the ${plural(joints, 'edge', 'edges')} where ` +
    `pieces meet, each ${mm(DOVETAIL.depthMm)} mm deep with ${hundredth(joint.fitMm)} mm of fit a face: press each ` +
    'tab down into its neighbour’s socket. They hold the pieces together in the wall’s plane; across it only their ' +
    'fit holds them, so glue them for a lasting wall.'
  );
}
