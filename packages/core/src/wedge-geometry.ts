// A tilted sash's wedge as printed parts (sash-wedge, #159; docs/research/sash-wedge.md), assembled
// in its own frame: x along the side triangles' axis from the hinge, y across it, the frame's face
// at y = x·tan β and the sash's at y = -x·tan β (β half the sash's tilt), z along the top strip from
// the left triangle's outer face. The left triangle's panel lies from z = 0 to its thickness, the
// right one's mirrored at the opening's width.
//
// An edge strip runs along each leg of a triangle, from the hinge up, its outer face short of the
// leg by what its squeezed gasket or tape stands out, its slot's mouth the profile's height in;
// where the two meet near the hinge, each is cut off at the axis, and together they close it.
// From there up, panels lie between the strips' slots, their slanted edges in the slots as far as
// any panel's edge goes into a strip, and joint strips join them end to end, their ends cut along
// the strips' inner faces.
//
// The top strip lies square to the axis, half an edge strip below the triangles' top, so its edge
// strip on the sash lies wholly on the sash. Its edge strips run along it, their outer faces
// bevelled onto the frame's face and the sash's, and its panels and joint strips lie between them.
// At each end a corner piece holds the triangle's top in a slot facing down its axis and the top
// strip's end in a slot facing along it; the leg strips stop under it and the top strip's edge
// strips start beside it, and the gasket's groove runs round it from the one to the other. A
// flattened hose port (wedge-port.ts), if there is one, is printed as one with the top strip's piece
// it is in.
import type { Manifold } from 'manifold-3d';
import type { EdgeProfile } from './edge.js';
import type { Engine } from './engine.js';
import { edgeStripSolid } from './edge-geometry.js';
import { PIN_SLOT_MM, evenSegments, pinSlotRangeMm, stripWidthMm } from './joint.js';
import type { JointParams } from './joint.js';
import { stripSolid } from './joint-geometry.js';
import type { FlatPort } from './wedge-port.js';
import type { SashWedge } from './wedge.js';

export interface WedgeSideSolids {
  legs: Manifold[]; // each leg's edge strip, in segments the printer makes
  panels: Manifold[]; // the chain's pieces, from the hinge up
  joints: Manifold[]; // the joint strips between them
}

export interface SashWedgeSolids {
  sides: WedgeSideSolids[]; // the left triangle's, then the right's
  corners: Manifold[]; // the left one, then the right
  top: { edges: Manifold[]; panels: Manifold[]; joints: Manifold[] };
}

// The corner piece's size, from the edge strip's and the joint's.
export interface WedgeCorner {
  belowTopMm: number; // from the triangles' top down their axis to its lower face
  deepMm: number; // from the triangle's outer face along the top strip to its face there
  roomMm: number; // from the top of the triangle's chain to the triangles' top
  reachMm: number; // from the triangle's outer face to where the top strip's pieces start
}

const DEEP_MM = 50; // how far a cutting solid reaches past the parts

export function wedgeCorner(profile: { widthMm: number }, joint: JointParams, panelMm: number): WedgeCorner {
  const inSlot = joint.slotMm - joint.slideMm / 2;
  // Down to the flange below the top strip's slot; along to the mouth of that slot, which lies past
  // the triangle's slot, its flange or a web, whichever is thicker.
  const belowTopMm = profile.widthMm / 2 + panelMm / 2 + joint.fitMm + joint.flangeMm;
  const deepMm = panelMm + joint.fitMm + Math.max(joint.flangeMm, joint.webMm) + joint.slotMm;
  return { belowTopMm, deepMm, roomMm: belowTopMm - inSlot, reachMm: deepMm - inSlot };
}

interface Frame {
  engine: Engine;
  wedge: SashWedge;
  half: number;
  tan: number;
  sin: number;
  cos: number;
  keep: <T extends { delete(): void }>(made: T) => T;
}

// The part of the wedge at least offMm in from both faces, square to them, from fromMm to toMm
// along z. Wound counter-clockwise: a clockwise outline is empty.
function inside(f: Frame, offMm: number, fromMm = -DEEP_MM, toMm = DEEP_MM): Manifold {
  const far = f.wedge.side.axisMm + 1;
  const reach = far * f.tan - offMm / f.cos;
  const outline = f.keep(
    new f.engine.CrossSection([
      [
        [offMm / f.sin, 0],
        [far, -reach],
        [far, reach],
      ],
    ]),
  );
  return f.keep(f.keep(outline.extrude(toMm - fromMm)).translate([0, 0, fromMm]));
}

// A box from the given corner, of the given size.
const box = (f: Frame, at: [number, number, number], size: [number, number, number]): Manifold =>
  f.keep(f.keep(f.engine.Manifold.cube(size)).translate(at));

// The gasket's groove on the frame's face (sign 1) or the sash's (-1), from s[0] to s[1] along the
// face from the hinge and z[0] to z[1] along z, as deep as the groove under the gasket's stand-out.
function grooveCut(f: Frame, profile: EdgeProfile, sign: 1 | -1, s: [number, number], z: [number, number]): Manifold {
  const out = profile.tape?.standOutMm ?? 0;
  const depth = profile.tape?.groove.depthMm ?? 0;
  const cut = box(f, [s[0], sign > 0 ? -(out + depth) : out - 1, z[0]], [s[1] - s[0], depth + 1, z[1] - z[0]]);
  return f.keep(cut.rotate([0, 0, (sign * f.half * 180) / Math.PI]));
}

// Pin slots through a panel, each the hull of a pin at either end of it, through the panel along z
// or x.
function pinCuts(f: Frame, panelMm: number, slots: [number, number, number][][], along: 'x' | 'z'): Manifold {
  const r = PIN_SLOT_MM / 2;
  const holes = slots.map((ends) => {
    const discs = ends.map(([x, y, z]) => {
      const pin = f.keep(f.engine.Manifold.cylinder(panelMm + 2, r, r, 24));
      return f.keep((along === 'z' ? pin : f.keep(pin.rotate([0, 90, 0]))).translate([x, y, z]));
    });
    return f.keep(f.engine.Manifold.hull(discs));
  });
  return f.keep(f.engine.Manifold.union(holes));
}

// A panel, with pin slots if the joint has pins and the panel has slots.
function withPins(f: Frame, panel: Manifold, joint: JointParams, cuts: () => Manifold | undefined): Manifold {
  const slots = joint.pins ? cuts() : undefined;
  if (slots === undefined) return panel;
  const cut = panel.subtract(slots);
  panel.delete();
  return cut;
}

function sideSolids(f: Frame, profile: EdgeProfile, joint: JointParams, panelMm: number, maxPieceMm: number) {
  const { engine, wedge, half, tan, cos, keep } = f;
  const { axisMm, tipMm, chain } = wedge.side;
  const h = profile.heightMm;
  const out = profile.tape?.standOutMm ?? 0;
  const printed = { ...profile, heightMm: h - out };
  const inSlot = joint.slotMm - joint.slideMm / 2;
  const xCorner = axisMm - wedgeCorner(profile, joint, panelMm).belowTopMm;
  const across = axisMm * tan + DEEP_MM;

  // Each leg: straight segments along it as far as the corner, turned onto it, cut off at the axis
  // and square to it under the corner.
  const legs: Manifold[] = [];
  for (const sign of [1, -1] as const) {
    const side = box(f, [0, sign > 0 ? 0 : -across, -DEEP_MM], [xCorner, across, 2 * DEEP_MM]);
    for (const [from, length] of evenSegments(0, (xCorner + 1) / cos, maxPieceMm)) {
      const straight = keep(edgeStripSolid(engine, length, printed, joint, panelMm, sign > 0 ? 'top' : 'bottom'));
      const onLeg = keep(
        keep(straight.translate([from, sign > 0 ? -h : out, 0])).rotate([0, 0, (sign * half * 180) / Math.PI]),
      );
      legs.push(onLeg.intersect(side));
    }
  }

  // The panels, between the strips' slots, and the joint strips between them.
  const { fromMm, toMm } = pinSlotRangeMm(joint);
  const panelRegion = inside(f, h - inSlot);
  const width = 2 * DEEP_MM + axisMm * tan;
  const panels: Manifold[] = [];
  const joints: Manifold[] = [];
  let at = tipMm;
  chain.pieces.forEach((length, i) => {
    const panel = box(f, [at, -width / 2, 0], [length, width, panelMm]).intersect(panelRegion);
    // A pin through each joint strip's middle, on the axis, into the pieces either side.
    const slots: [number, number, number][][] = [];
    if (i > 0) slots.push([at + fromMm, at + toMm].map((x) => [x, 0, -1]));
    if (i < chain.pieces.length - 1) slots.push([at + length - fromMm, at + length - toMm].map((x) => [x, 0, -1]));
    panels.push(withPins(f, panel, joint, () => (slots.length > 0 ? pinCuts(f, panelMm, slots, 'z') : undefined)));
    const gap = chain.jointsMm[i];
    if (gap !== undefined) {
      // As long as the room between the leg strips at its wider end, so its ribs are spaced for
      // the strip it is; its narrower end is cut along them.
      const centre = at + length + gap / 2;
      const strip = stripWidthMm(joint);
      const span = 2 * ((centre + strip / 2) * tan - h / cos);
      const made = keep(stripSolid(engine, span, joint, panelMm, 'wall-vertical'));
      joints.push(keep(made.translate([centre - strip / 2, -span / 2, 0])).intersect(inside(f, h)));
    }
    at += length + (gap ?? 0);
  });
  return { legs, panels, joints };
}

// The left corner piece: the wedge from its lower face to the top, from as far out as the leg
// strips to where the top strip's edge strips start, short of the faces by the gasket's stand-out,
// less its two slots and the gasket's groove.
function cornerSolid(f: Frame, profile: EdgeProfile, joint: JointParams, panelMm: number): Manifold {
  const { wedge, cos } = f;
  const { axisMm } = wedge.side;
  const c = wedgeCorner(profile, joint, panelMm);
  const out = profile.tape?.standOutMm ?? 0;
  const xCorner = axisMm - c.belowTopMm;
  const xTop = axisMm - profile.widthMm / 2;
  const zLow = panelMm / 2 - profile.widthMm / 2;
  const across = axisMm * f.tan + DEEP_MM;
  const floor = profile.heightMm - joint.slotMm; // a slot's floor, in from the face, as in the leg strips
  const body = f.keep(
    box(f, [xCorner, -across, zLow], [c.belowTopMm, 2 * across, c.deepMm - zLow]).intersect(inside(f, out)),
  );
  const slot = (at: [number, number, number], size: [number, number, number]) =>
    f.keep(box(f, at, size).intersect(inside(f, floor)));
  // The triangle's top, from below; the top strip's end, from along it.
  const fromBelow = slot(
    [xCorner - 1, -across, -joint.fitMm],
    [joint.slotMm + 1, 2 * across, panelMm + 2 * joint.fitMm],
  );
  const fromAlong = slot(
    [xTop - panelMm / 2 - joint.fitMm, -across, c.deepMm - joint.slotMm],
    [panelMm + 2 * joint.fitMm, 2 * across, joint.slotMm + 1],
  );
  // The groove, from the leg strips' up to the top strip's mid-plane, turning there along the top.
  const gw = (profile.tape?.groove.widthMm ?? 0) / 2;
  const sTop = xTop / cos;
  const grooves = (profile.tape === undefined ? [] : ([1, -1] as const)).flatMap((sign) => [
    grooveCut(f, profile, sign, [xCorner / cos - 1, sTop + gw], [panelMm / 2 - gw, panelMm / 2 + gw]),
    grooveCut(f, profile, sign, [sTop - gw, sTop + gw], [panelMm / 2 - gw, c.deepMm + 1]),
  ]);
  return body.subtract(f.keep(f.engine.Manifold.union([fromBelow, fromAlong, ...grooves])));
}

// The flattened port on the top strip's piece, its panel's room face at x0: what it adds, its walls
// and collar, and what it takes away, the way through from under the panel to the collar's mouth.
function portSolids(f: Frame, port: FlatPort, x0: number, panelMm: number): { walls: Manifold; way: Manifold } {
  const M = f.engine.Manifold;
  const { collar, slot, centreMm: zc, straightToMm: x1, collarFromMm: x2, collarAxisMm: yc } = port;
  const e = 0.01;
  const bore = port.hoseMm / 2 + collar.clearanceMm;
  const outside = bore + collar.wallMm;
  const lip = bore - collar.lipMm;
  // A rectangle a either side of the axis and b either side of the slot's middle, from x for dx.
  const slab = (x: number, dx: number, a: number, b: number) => box(f, [x, -a, zc - b], [dx, 2 * a, 2 * b]);
  // A disc of radius r round the collar's axis, from x for dx.
  const disc = (x: number, dx: number, r: number) =>
    f.keep(f.keep(f.keep(M.cylinder(dx, r, r, 96)).rotate([0, 90, 0])).translate([x, yc, zc]));
  const [a, b] = [slot.widthMm / 2, slot.lengthMm / 2];
  const [aw, bw] = [a + collar.wallMm, b + collar.wallMm];
  const walls = M.union([
    slab(x0 - e, x1 - x0 + e, aw, bw),
    f.keep(M.hull([slab(x1 - e, e, aw, bw), disc(x2 - e, e, outside)])),
    disc(x2 - e, collar.depthMm + e, outside),
  ]);
  const way = M.union([
    slab(x0 - panelMm - 1, x1 - x0 + panelMm + 1, a, b),
    f.keep(M.hull([slab(x1 - e, e, a, b), disc(x2 - e, 2 * e, lip)])),
    disc(x2, collar.depthMm + 1, bore),
  ]);
  return { walls: f.keep(walls), way: f.keep(way) };
}

// The top strip: its edge strips along it on the frame's face and the sash's, its panels between
// them, and the joint strips between those, from the left corner to the right.
function topSolids(
  f: Frame,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
  port?: FlatPort,
) {
  const { engine, wedge, tan, cos, keep } = f;
  const { Manifold: M } = engine;
  const { axisMm } = wedge.side;
  const widthMm = wedge.top.lengthMm;
  const c = wedgeCorner(profile, joint, panelMm);
  const h = profile.heightMm;
  const w = profile.widthMm;
  const out = profile.tape?.standOutMm ?? 0;
  const inSlot = joint.slotMm - joint.slideMm / 2;
  const xTop = axisMm - w / 2;
  const mouth = xTop * tan - h / cos; // across the axis, each edge strip's slot's mouth
  // Tall enough to reach past the face at its upper edge; cut back onto it, bevelled.
  const tall = (h - out) / cos + (w / 2) * tan + 0.5;
  const plain = { widthMm: w, heightMm: tall };
  const faces = inside(f, out, -DEEP_MM, widthMm + DEEP_MM);
  const gw = (profile.tape?.groove.widthMm ?? 0) / 2;
  const sTop = xTop / cos;

  // Each built lying along x and through z, then turned to lie along z and through x.
  const edges: Manifold[] = [];
  for (const sign of [1, -1] as const) {
    for (const [from, length] of evenSegments(c.deepMm, widthMm - 2 * c.deepMm, maxPieceMm)) {
      const made = keep(edgeStripSolid(engine, length, plain, joint, panelMm, sign > 0 ? 'top' : 'bottom'));
      const y = sign > 0 ? mouth : -mouth - tall;
      const placed = keep(keep(made.rotate([0, 90, 0])).translate([xTop - panelMm / 2, y, from + length]));
      const bevelled = placed.intersect(faces);
      if (profile.tape === undefined) edges.push(bevelled);
      else {
        edges.push(
          bevelled.subtract(grooveCut(f, profile, sign, [sTop - gw, sTop + gw], [from - 1, from + length + 1])),
        );
        bevelled.delete();
      }
    }
  }

  const { fromMm, toMm } = pinSlotRangeMm(joint);
  const { pieces, jointsMm } = wedge.top.chain;
  const reach = mouth + inSlot;
  const panels: Manifold[] = [];
  const joints: Manifold[] = [];
  let at = c.reachMm;
  pieces.forEach((length, i) => {
    const panel = keep(M.cube([panelMm, 2 * reach, length])).translate([xTop - panelMm / 2, -reach, at]);
    const slots: [number, number, number][][] = [];
    const x = xTop - panelMm / 2 - 1;
    if (i > 0) slots.push([at + fromMm, at + toMm].map((z) => [x, 0, z]));
    if (i < pieces.length - 1) slots.push([at + length - fromMm, at + length - toMm].map((z) => [x, 0, z]));
    const pinned = withPins(f, panel, joint, () => (slots.length > 0 ? pinCuts(f, panelMm, slots, 'x') : undefined));
    if (port?.piece !== i) panels.push(pinned);
    else {
      const { walls, way } = portSolids(f, port, xTop + panelMm / 2, panelMm);
      panels.push(keep(keep(pinned).add(walls)).subtract(way));
    }
    const gap = jointsMm[i];
    if (gap !== undefined) {
      const centre = at + length + gap / 2;
      const strip = stripWidthMm(joint);
      const made = keep(stripSolid(engine, 2 * mouth, joint, panelMm, 'wall-vertical'));
      joints.push(keep(made.rotate([0, 90, 0])).translate([xTop - panelMm / 2, -mouth, centre + strip / 2]));
    }
    at += length + (gap ?? 0);
  });
  return { edges, panels, joints };
}

const frameOf = (engine: Engine, wedge: SashWedge, temporary: { delete(): void }[]): Frame => {
  const half = ((wedge.tiltDeg / 2) * Math.PI) / 180;
  return {
    engine,
    wedge,
    half,
    tan: Math.tan(half),
    sin: Math.sin(half),
    cos: Math.cos(half),
    keep: (made) => {
      temporary.push(made);
      return made;
    },
  };
};

// One side triangle's parts, as the left one.
export function wedgeSideSolids(
  engine: Engine,
  wedge: SashWedge,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
): WedgeSideSolids {
  const temporary: { delete(): void }[] = [];
  try {
    return sideSolids(frameOf(engine, wedge, temporary), profile, joint, panelMm, maxPieceMm);
  } finally {
    for (const m of temporary) m.delete();
  }
}

// The whole wedge's parts: the right triangle and corner are the left ones mirrored across the
// opening's middle. With a port, the top strip's piece it is in carries it.
export function sashWedgeSolids(
  engine: Engine,
  wedge: SashWedge,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
  port?: FlatPort,
): SashWedgeSolids {
  const temporary: { delete(): void }[] = [];
  try {
    const f = frameOf(engine, wedge, temporary);
    const widthMm = wedge.top.lengthMm;
    const mirrored = (m: Manifold) => f.keep(m.mirror([0, 0, 1])).translate([0, 0, widthMm]);
    const left = sideSolids(f, profile, joint, panelMm, maxPieceMm);
    const right = {
      legs: left.legs.map(mirrored),
      panels: left.panels.map(mirrored),
      joints: left.joints.map(mirrored),
    };
    const corner = cornerSolid(f, profile, joint, panelMm);
    return {
      sides: [left, right],
      corners: [corner, mirrored(corner)],
      top: topSolids(f, profile, joint, panelMm, maxPieceMm, port),
    };
  } finally {
    for (const m of temporary) m.delete();
  }
}
