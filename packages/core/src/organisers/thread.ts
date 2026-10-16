// A thread's groove, cut into a hole's side (Multiboard's holes): its profile, a trapezoid from
// the hole's side out to the groove's root, swept along a right-handed helix. Built as a bar of the
// profile, bent round the hole's axis a turn for every pitch along it, so each step of the sweep
// costs only the profile's corners.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';

export interface Thread {
  innerMm: number; // the hole's side, where the groove opens
  outerMm: number; // the groove's root, its furthest from the axis
  innerWidthMm: number; // the groove's width along the axis at the hole's side
  outerWidthMm: number; // and at its root
  pitchMm: number; // along the axis for each turn
}

const STEPS_PER_TURN = 36; // 10° steps: within 0.05 mm of the helix at 11 mm out
const INSIDE_MM = 0.2; // carried inside the hole's side, so the groove joins the hole

// The groove from z = fromMm to z = toMm, its middle passing x > 0, y = 0 at z = 0 and every pitch
// along. The caller frees it.
export function threadGroove(engine: Engine, t: Thread, fromMm: number, toMm: number): Manifold {
  const [r0, r1] = [t.innerMm - INSIDE_MM, t.outerMm];
  const [w0, w1] = [t.innerWidthMm / 2, t.outerWidthMm / 2];
  const profile = new engine.CrossSection([
    [
      [r0, -w0],
      [t.innerMm, -w0],
      [r1, -w1],
      [r1, w1],
      [t.innerMm, w0],
      [r0, w0],
    ],
  ]);
  // Whole turns from a pitch below fromMm to a pitch past toMm, so it reaches both ends.
  const first = Math.floor(fromMm / t.pitchMm) - 1;
  const turns = Math.ceil(toMm / t.pitchMm) + 1 - first;
  // nDivisions counts the slices between the ends, so a step lands on every 10°, the flats' too.
  const bar = profile.extrude(turns, turns * STEPS_PER_TURN - 1);
  profile.delete();
  // A point (r, w) of the profile, h turns along the bar, goes h turns round the axis and h
  // pitches up it; w counts down the axis, so the bar's outside stays outside.
  const swept = bar.warp((v) => {
    const [r, w, h] = [v[0], v[1], v[2]];
    const a = 2 * Math.PI * h;
    v[0] = r * Math.cos(a);
    v[1] = r * Math.sin(a);
    v[2] = (first + h) * t.pitchMm - w;
  });
  bar.delete();
  const span = engine.Manifold.cube([4 * r1, 4 * r1, toMm - fromMm], true).translate([0, 0, (fromMm + toMm) / 2]);
  const groove = swept.intersect(span);
  swept.delete();
  span.delete();
  return groove;
}
