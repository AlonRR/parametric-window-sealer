// The test coupon (joint-lock, #110): five short strips in a row, each with ribs of its own grip,
// and a tab as thick as the pieces, printed flat as they are, to push into them. The section that
// takes the tab with a firm push and holds it has the grip to print the strips with. The sections
// are marked by notches in the top of their flanges, one in the first to five in the last.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import { stripThicknessMm, stripWidthMm } from './joint.js';
import { stripSolid } from './joint-geometry.js';

export const COUPON_SECTIONS = 5;
export const COUPON_STEP_MM = 0.05; // between one section's grip and the next
export const COUPON_SECTION_MM = 24; // long enough for two ribs and a tab between them
export const COUPON_TAB_MM = { widthMm: 16, lengthMm: 30 };
const TAB_GAP_MM = 5; // between the strips and the tab on the bed
const NOTCH_MM = 1; // each notch's width and depth, with as much again between notches

export interface CouponShape {
  kind: 'coupon';
  grips: number[]; // each section's, in mm
  count: number;
}

// The grip set and two steps either side of it, none below nothing: the lowest moves up instead.
export function couponGrips(gripMm: number): number[] {
  const lowest = Math.max(0, gripMm - 2 * COUPON_STEP_MM);
  return Array.from({ length: COUPON_SECTIONS }, (_, i) => Math.round((lowest + i * COUPON_STEP_MM) * 100) / 100);
}

export const couponShape = (joint: JointParams): CouponShape => ({
  kind: 'coupon',
  grips: couponGrips(joint.gripMm),
  count: 1,
});

// Lying as it prints: the strips standing on their flanges along x, the tab flat beside them.
export function couponSolid(engine: Engine, shape: CouponShape, joint: JointParams, panelMm: number): Manifold {
  const thick = stripThicknessMm(joint, panelMm);
  const width = stripWidthMm(joint);
  const sections = shape.grips.map((gripMm, i) =>
    stripSolid(engine, COUPON_SECTION_MM, { ...joint, gripMm, pins: false }, panelMm, 'print').translate([
      i * COUPON_SECTION_MM,
      0,
      0,
    ]),
  );
  const tab = engine.Manifold.cube([COUPON_TAB_MM.lengthMm, COUPON_TAB_MM.widthMm, panelMm]).translate([
    0,
    thick + TAB_GAP_MM,
    0,
  ]);
  const whole = engine.Manifold.union([...sections, tab]);
  for (const m of [...sections, tab]) m.delete();
  const notches = shape.grips.flatMap((_grip, i) => {
    const middle = (i + 0.5) * COUPON_SECTION_MM;
    return Array.from({ length: i + 1 }, (_, k) => {
      const centre = middle + (k - i / 2) * 2 * NOTCH_MM;
      return engine.Manifold.cube([NOTCH_MM, thick + 2, NOTCH_MM + 1]).translate([
        centre - NOTCH_MM / 2,
        -1,
        width - NOTCH_MM,
      ]);
    });
  });
  const cut = engine.Manifold.union(notches);
  const notched = whole.subtract(cut);
  for (const m of [...notches, cut, whole]) m.delete();
  return notched;
}
