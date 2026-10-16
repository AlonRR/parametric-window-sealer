// A tilted sash's side triangle as printed parts (sash-wedge, #159; docs/research/sash-wedge.md),
// assembled in the triangle's own frame: x along its axis from the hinge, y across it, its legs at
// y = ±x·tan β (β half the sash's tilt), z through the panel, which lies from z = 0 to its
// thickness.
//
// An edge strip runs along each leg, from the hinge up, its outer face short of the leg by what its
// squeezed gasket or tape stands out, its slot's mouth the profile's height in; where the two
// meet near the hinge, each is cut off at the axis, and together they close the triangle there.
// From there up, panels lie between the strips' slots, their slanted edges in the slots as far as
// any panel's edge goes into a strip, and joint strips join them end to end, their ends cut along
// the strips' inner faces. A joint's room is left at the top for the corner with the top strip.
import type { Manifold } from 'manifold-3d';
import type { EdgeProfile } from './edge.js';
import type { Engine } from './engine.js';
import { edgeStripSolid } from './edge-geometry.js';
import { PIN_SLOT_MM, evenSegments, pinSlotRangeMm, stripWidthMm } from './joint.js';
import type { JointParams } from './joint.js';
import { stripSolid } from './joint-geometry.js';
import type { TiltWedge } from './wedge.js';

export interface WedgeSideSolids {
  legs: Manifold[]; // each leg's edge strip, in segments the printer makes
  panels: Manifold[]; // the chain's pieces, from the hinge up
  joints: Manifold[]; // the joint strips between them
}

const DEEP_MM = 50; // how far a cutting solid reaches past the parts, through the panel

export function wedgeSideSolids(
  engine: Engine,
  wedge: TiltWedge,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
): WedgeSideSolids {
  const { CrossSection, Manifold: M } = engine;
  const half = ((wedge.tiltDeg / 2) * Math.PI) / 180;
  const [tan, sin, cos] = [Math.tan(half), Math.sin(half), Math.cos(half)];
  const { axisMm, legMm, tipMm, chain } = wedge.side;
  const h = profile.heightMm;
  const out = profile.tape?.standOutMm ?? 0;
  const printed = { ...profile, heightMm: h - out };
  const inSlot = joint.slotMm - joint.slideMm / 2;
  const temporary: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(made: T): T => {
    temporary.push(made);
    return made;
  };
  // The part of the triangle at least offMm in from both legs, square to them, through the panel.
  // Wound counter-clockwise: a clockwise outline is empty.
  const within = (offMm: number): Manifold => {
    const far = axisMm + 1;
    const reach = far * tan - offMm / cos;
    const outline = keep(
      new CrossSection([
        [
          [offMm / sin, 0],
          [far, -reach],
          [far, reach],
        ],
      ]),
    );
    return keep(keep(outline.extrude(2 * DEEP_MM)).translate([0, 0, -DEEP_MM]));
  };
  // One side of the axis, below the top.
  const across = axisMm * tan + DEEP_MM;
  const side = (sign: 1 | -1): Manifold =>
    keep(M.cube([axisMm, across, 2 * DEEP_MM]).translate([0, sign > 0 ? 0 : -across, -DEEP_MM]));

  try {
    // Each leg: straight segments along it, turned onto it, cut off at the axis and the top.
    const legs: Manifold[] = [];
    for (const sign of [1, -1] as const) {
      for (const [from, length] of evenSegments(0, legMm, maxPieceMm)) {
        const straight = keep(edgeStripSolid(engine, length, printed, joint, panelMm, sign > 0 ? 'top' : 'bottom'));
        const onLeg = keep(
          keep(straight.translate([from, sign > 0 ? -h : out, 0])).rotate([0, 0, (sign * half * 180) / Math.PI]),
        );
        legs.push(onLeg.intersect(side(sign)));
      }
    }

    // The panels, between the strips' slots, and the joint strips between them.
    const pinCuts = (atMm: [number, number][]): Manifold | undefined => {
      if (!joint.pins || atMm.length === 0) return undefined;
      const r = PIN_SLOT_MM / 2;
      const holes = atMm.map(([from, to]) => {
        const discs = [from, to].map((x) => keep(M.cylinder(panelMm + 2, r, r, 24).translate([x, 0, -1])));
        return keep(M.hull(discs));
      });
      return keep(M.union(holes));
    };
    const { fromMm, toMm } = pinSlotRangeMm(joint);
    const panelRegion = within(h - inSlot);
    const panels: Manifold[] = [];
    const joints: Manifold[] = [];
    let at = tipMm;
    chain.pieces.forEach((length, i) => {
      const box = keep(
        M.cube([length, 2 * DEEP_MM + axisMm * tan, panelMm]).translate([at, -(DEEP_MM + (axisMm * tan) / 2), 0]),
      );
      const panel = box.intersect(panelRegion);
      // A pin through each joint strip's middle, on the axis, into the pieces either side.
      const slots: [number, number][] = [];
      if (i > 0) slots.push([at + fromMm, at + toMm]);
      if (i < chain.pieces.length - 1) slots.push([at + length - fromMm, at + length - toMm]);
      const cuts = pinCuts(slots);
      if (cuts === undefined) panels.push(panel);
      else {
        panels.push(panel.subtract(cuts));
        panel.delete();
      }
      const gap = chain.jointsMm[i];
      if (gap !== undefined) {
        // As long as the room between the leg strips at its wider end, so its ribs are spaced for
        // the strip it is; its narrower end is cut along them.
        const centre = at + length + gap / 2;
        const width = stripWidthMm(joint);
        const span = 2 * ((centre + width / 2) * tan - h / cos);
        const strip = keep(stripSolid(engine, span, joint, panelMm, 'wall-vertical'));
        const placed = keep(strip.translate([centre - width / 2, -span / 2, 0]));
        joints.push(placed.intersect(within(h)));
      }
      at += length + (gap ?? 0);
    });
    return { legs, panels, joints };
  } finally {
    for (const m of temporary) m.delete();
  }
}
