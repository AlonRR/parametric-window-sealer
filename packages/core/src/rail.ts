// The filler between the sashes (meeting-rail, #116). Where a hung window's two sashes overlap, or
// a slider's, a gap runs between them from outside to the room, and every hung-window kit ships
// foam for it. This is a printed bar for that gap: as long as the wall's edge the sash presses on,
// as thick as the gap less the seal standing out on each face, with the wall's seal in a groove on
// both faces. A bar longer than the printer makes is printed in equal lengths whose ends lap, half
// the thickness each, so no crack runs through it; the two end lengths are one shape, one turned
// round, and so are all the middle ones.
import type { Manifold } from 'manifold-3d';
import type { EdgeName, EdgeParams } from './edge.js';
import { EDGES } from './edge.js';
import type { Engine } from './engine.js';
import { evenSegments } from './joint.js';
import { maxPieceSize } from './printer.js';
import type { PrinterChoice } from './printer.js';
import { tapeFit } from './tape.js';
import type { SealParams } from './tape.js';
import { mm } from './words.js';

export interface RailParams {
  gapMm: number; // across the gap, front to back; 0 for no filler
}

export const DEFAULT_RAIL: RailParams = { gapMm: 0 };

export const RAIL_HEIGHT_MM = 20; // up the gap, at least
export const RAIL_MARGIN_MM = 2; // above and below the groove, at least
export const RAIL_LAP_MM = 10; // where two lengths overlap
export const RAIL_FIT_MM = 0.5; // with no seal, less than the gap, to slide in
export const RAIL_END_MM = 1; // shorter than the edge, to go in
const LEAST_DEPTH_MM = 4;
const CORE_MM = 1; // behind each groove, in each half of a lap

export interface RailSource {
  openingWidthMm: number;
  openingHeightMm: number;
  edges: EdgeParams;
  seal: SealParams;
  rail: RailParams;
  printer: PrinterChoice;
  bedMarginMm: number;
}

export interface RailPlan {
  edge: EdgeName;
  gapMm: number;
  lengthMm: number;
  depthMm: number; // across the gap
  heightMm: number; // up it
  groove?: { widthMm: number; depthMm: number }; // on both faces, with a seal
  pieces: number;
  pieceMm: number;
  lapMm: number;
}

export type RailPart = 'whole' | 'end' | 'middle';

export interface RailShape {
  kind: 'rail';
  part: RailPart;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  groove?: { widthMm: number; depthMm: number };
  lapMm: number;
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// The sashes overlap along the edge one of them presses on.
export const railEdge = (edges: EdgeParams): EdgeName | undefined => EDGES.find((e) => edges.roles[e] === 'sash');

// The narrowest gap a filler goes in: a core behind each groove in each half of a lap, and the
// seal standing out on each face, or the room to slide in.
export function railLeastGapMm(seal: SealParams): number {
  const fit = tapeFit(seal);
  const depth = Math.max(LEAST_DEPTH_MM, fit === undefined ? 0 : 2 * (fit.grooveDepthMm + CORE_MM));
  return tenth(depth + (fit === undefined ? RAIL_FIT_MM : 2 * fit.standOutMm));
}

// The longest length the printer makes: a length can be turned on the bed.
export function longestMm(p: { printer: PrinterChoice; bedMarginMm: number }): number {
  const max = maxPieceSize(p.printer, p.bedMarginMm);
  return Math.max(max.widthMm, max.heightMm);
}

// A bar longer than the printer makes, as the fewest equal lengths that lap: each rounded down to
// 0.1 mm so none is longer than the printer makes.
export function lappedLengths(lengthMm: number, longest: number, lapMm: number): { pieces: number; pieceMm: number } {
  if (lengthMm <= longest) return { pieces: 1, pieceMm: lengthMm };
  if (!(longest > 2 * lapMm)) throw new RangeError(`A ${longest} mm length leaves no room for two laps`);
  const pieces = Math.ceil((lengthMm - lapMm) / (longest - lapMm) - 1e-9);
  return { pieces, pieceMm: Math.floor(((lengthMm + (pieces - 1) * lapMm) / pieces) * 10) / 10 };
}

export function planRail(p: RailSource): RailPlan | undefined {
  const edge = railEdge(p.edges);
  if (p.rail.gapMm <= 0 || edge === undefined) return undefined;
  const fit = tapeFit(p.seal);
  const along = edge === 'top' || edge === 'bottom' ? p.openingWidthMm : p.openingHeightMm;
  const lengthMm = tenth(along - RAIL_END_MM);
  const { pieces, pieceMm } = lappedLengths(lengthMm, longestMm(p), RAIL_LAP_MM);
  const groove = fit === undefined ? undefined : { widthMm: tenth(fit.grooveWidthMm), depthMm: fit.grooveDepthMm };
  return {
    edge,
    gapMm: p.rail.gapMm,
    lengthMm,
    depthMm: tenth(p.rail.gapMm - (fit === undefined ? RAIL_FIT_MM : 2 * fit.standOutMm)),
    heightMm: tenth(Math.max(RAIL_HEIGHT_MM, (groove?.widthMm ?? 0) + 2 * RAIL_MARGIN_MM)),
    ...(groove === undefined ? {} : { groove }),
    pieces,
    pieceMm,
    lapMm: RAIL_LAP_MM,
  };
}

export function railShapes(rail: RailPlan): RailShape[] {
  const { pieceMm: lengthMm, depthMm, heightMm, groove, lapMm } = rail;
  const shape = (part: RailPart, count: number): RailShape => ({
    kind: 'rail',
    part,
    lengthMm,
    depthMm,
    heightMm,
    ...(groove === undefined ? {} : { groove }),
    lapMm,
    count,
  });
  if (rail.pieces === 1) return [shape('whole', 1)];
  return rail.pieces === 2 ? [shape('end', 2)] : [shape('end', 2), shape('middle', rail.pieces - 2)];
}

// With printed TPU, a gasket along each face in lengths the printer makes.
export function railGasketLengths(rail: RailPlan | undefined, maxMm: number): number[] {
  if (rail?.groove === undefined) return [];
  const each = evenSegments(0, rail.lengthMm, maxMm).map(([, lengthMm]) => lengthMm);
  return [...each, ...each];
}

export function describeRail(p: RailSource): string[] {
  const rail = planRail(p);
  if (rail === undefined) return [];
  const lengths =
    rail.pieces === 1
      ? 'in one piece'
      : `in ${rail.pieces} lengths of ${mm(rail.pieceMm)} mm that lap ${mm(rail.lapMm)} mm`;
  const seal =
    rail.groove === undefined
      ? `, ${mm(RAIL_FIT_MM)} mm less than the gap to slide in; foam tape on both faces would seal it.`
      : ', with the seal in a groove on both faces.';
  return [
    `Between the sashes: a filler for the ${mm(rail.gapMm)} mm gap where they overlap, ${mm(rail.lengthMm)} mm long ` +
      `${lengths}, ${mm(rail.depthMm)} mm thick and ${mm(rail.heightMm)} mm tall${seal}`,
  ];
}

// A length standing as it prints: along X from 0, across the gap along Y from 0, up along Z from 0.
// An end length laps at its far end, the half nearer y = 0 cut away; a middle one laps at both ends,
// the other half cut away at its start, so a length turned round meets the next.
export function railSolid(engine: Engine, shape: RailShape): Manifold {
  const { Manifold } = engine;
  const { lengthMm: l, depthMm: d, heightMm: h, groove, lapMm } = shape;
  const least = shape.part === 'whole' ? 0 : 2 * lapMm;
  if (!(l > least && d > 0 && h > 0)) throw new RangeError(`A ${l} × ${d} × ${h} mm filler has no room for its laps`);
  const cuts: Manifold[] = [];
  const box = (size: [number, number, number], at: [number, number, number]) => {
    const b = Manifold.cube(size);
    cuts.push(b.translate(at));
    b.delete();
  };
  if (groove !== undefined) {
    const z = (h - groove.widthMm) / 2;
    box([l + 2, groove.depthMm + 1, groove.widthMm], [-1, -1, z]);
    box([l + 2, groove.depthMm + 1, groove.widthMm], [-1, d - groove.depthMm, z]);
  }
  if (shape.part !== 'whole') box([lapMm + 1, d / 2 + 1, h + 2], [l - lapMm, -1, -1]);
  if (shape.part === 'middle') box([lapMm + 1, d / 2 + 1, h + 2], [-1, d / 2, -1]);
  const bar = Manifold.cube([l, d, h]);
  if (cuts.length === 0) return bar;
  const all = Manifold.union(cuts);
  const solid = bar.subtract(all);
  for (const m of [bar, all, ...cuts]) m.delete();
  return solid;
}
