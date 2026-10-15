// A sash stop (sash-stop, #118). Window-AC kits fit a stop so the sash cannot be opened further from
// outside; portable-AC kits have none, and an escape window must still open from inside without a
// key or a tool. This one is a printed strut that lies in the track the sash runs in, from the sash's
// edge to the frame, standing out of the track so it lifts out by hand. A slider's sash runs in its
// bottom track, a hung window's in its side ones. Longer than the printer makes, it is printed in
// lengths that lap half its width, each lap pinned across with filament so it lifts out whole. The
// wall itself is not a lock.
import type { Manifold } from 'manifold-3d';
import type { EdgeName, EdgeParams } from './edge.js';
import type { Engine } from './engine.js';
import { PIN_HOLE_MM, PIN_MM } from './joint.js';
import type { PrinterChoice } from './printer.js';
import { lappedLengths, longestMm, railEdge, railSolid } from './rail.js';
import type { RailPart } from './rail.js';
import { hundredth, mm } from './words.js';

export interface StopParams {
  lengthMm: number; // in the track, from the sash's edge to the frame; 0 for none
}

export const DEFAULT_STOP: StopParams = { lengthMm: 0 };

export const STOP_PROUD_MM = 10; // out of the track, to lift it by
export const STOP_LAP_MM = 20;
export const STOP_END_MM = 1; // shorter than the gap, to go in
export const STOP_LEAST_MM = 10;
const PIN_SEGMENTS = 32;

export interface StopSource {
  edges: EdgeParams;
  stop: StopParams;
  printer: PrinterChoice;
  bedMarginMm: number;
}

export interface StopPlan {
  track: EdgeName;
  lengthMm: number;
  widthMm: number; // across the track
  heightMm: number; // up out of it
  pieces: number;
  pieceMm: number;
  lapMm: number;
}

export interface StopShape {
  kind: 'stop';
  part: RailPart;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  lapMm: number;
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// The track the sash runs in: beside the edge it presses on.
export function stopTrack(edges: EdgeParams): EdgeName | undefined {
  const sash = railEdge(edges);
  if (sash === undefined) return undefined;
  const beside: EdgeName[] = sash === 'top' || sash === 'bottom' ? ['left', 'right'] : ['bottom', 'top'];
  return beside.find((e) => edges.roles[e] === 'track');
}

export function planStop(p: StopSource): StopPlan | undefined {
  const track = stopTrack(p.edges);
  if (p.stop.lengthMm <= 0 || track === undefined) return undefined;
  const lengthMm = tenth(p.stop.lengthMm - STOP_END_MM);
  const { pieces, pieceMm } = lappedLengths(lengthMm, longestMm(p), STOP_LAP_MM);
  return {
    track,
    lengthMm,
    widthMm: tenth(p.edges.track.widthMm - 2 * p.edges.track.clearanceMm),
    heightMm: tenth(p.edges.track.depthMm[track] + STOP_PROUD_MM),
    pieces,
    pieceMm,
    lapMm: STOP_LAP_MM,
  };
}

export function stopShapes(plan: StopPlan): StopShape[] {
  const { pieceMm: lengthMm, widthMm, heightMm, lapMm } = plan;
  const shape = (part: RailPart, count: number): StopShape => ({
    kind: 'stop',
    part,
    lengthMm,
    widthMm,
    heightMm,
    lapMm,
    count,
  });
  if (plan.pieces === 1) return [shape('whole', 1)];
  return plan.pieces === 2 ? [shape('end', 2)] : [shape('end', 2), shape('middle', plan.pieces - 2)];
}

export function describeStop(p: StopSource): string[] {
  const plan = planStop(p);
  if (plan === undefined) return [];
  const lengths =
    plan.pieces === 1
      ? 'in one piece'
      : `in ${plan.pieces} lengths of ${mm(plan.pieceMm)} mm that lap ${mm(plan.lapMm)} mm, each lap pinned ` +
        `with ${mm(plan.widthMm)} mm of ${hundredth(PIN_MM)} mm filament`;
  return [
    `Sash stop: a strut ${mm(plan.widthMm)} mm wide and ${mm(plan.heightMm)} mm tall, ${mm(plan.lengthMm)} mm long ` +
      `${lengths}. Lay it in the ${plan.track} track from the sash’s edge to the frame, standing ` +
      `${mm(STOP_PROUD_MM)} mm out: it stops the sash opening further, and lifts out by hand from inside. The wall ` +
      'itself is not a lock.',
  ];
}

// A length standing as it prints, as the filler between the sashes does: along X from 0, across the
// track along Y, up along Z; with a pin hole across each lap, halfway up.
export function stopSolid(engine: Engine, shape: StopShape): Manifold {
  const { lengthMm: l, widthMm: w, heightMm: h, lapMm, part } = shape;
  const bar = railSolid(engine, { kind: 'rail', part, lengthMm: l, depthMm: w, heightMm: h, lapMm, count: 1 });
  const at = part === 'whole' ? [] : part === 'end' ? [l - lapMm / 2] : [lapMm / 2, l - lapMm / 2];
  if (at.length === 0) return bar;
  const r = PIN_HOLE_MM / 2;
  const holes = at.map((x) => {
    const pin = engine.Manifold.cylinder(w + 2, r, r, PIN_SEGMENTS);
    const across = pin.rotate([-90, 0, 0]).translate([x, -1, h / 2]);
    pin.delete();
    return across;
  });
  const all = engine.Manifold.union(holes);
  const solid = bar.subtract(all);
  for (const m of [bar, all, ...holes]) m.delete();
  return solid;
}
