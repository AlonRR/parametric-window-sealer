// A tilted sash's wedge as files to print (sash-wedge, #159; docs/research/sash-wedge.md), and the
// plan's lines for it.
//
// Each part is printed once in its file, lying as it prints on the bed from the origin, named for
// what it is and where, its name saying how many to print. The right triangle and corner are the
// left ones turned over, every part being the same each side of its middle through it; and the
// strips along a leg are the same on the frame and on the sash, so a leg's strip is printed four
// times, a triangle's panels, joint strips and corner twice, and the top strip's edge strips twice.
//
// The panels lie flat, the port's piece on its panel with the collar up; the edge strips stand on
// their outer faces with their slots up, as a wall's do, the top strip's turned by half the tilt
// so they stand flat on their bevel; the joint strips stand on their flanges, and the corner on its
// upper face, which is whole, the triangle's slot open upward. With a TPU seal, the gaskets for the grooves are straight runs: on each face, one up
// each leg to past the corner's turn and one along the top from turn to turn, butting in the turn.
import type { Manifold } from 'manifold-3d';
import type { EdgeProfile } from './edge.js';
import type { Engine } from './engine.js';
import { partName } from './export.js';
import { evenSegments } from './joint.js';
import type { JointParams } from './joint.js';
import type { TapeFit } from './tape.js';
import { gasketSolid } from './tpu.js';
import { sashWedgeSolids, wedgeCorner } from './wedge-geometry.js';
import type { FlatPort } from './wedge-port.js';
import type { SashWedge } from './wedge.js';
import { mm } from './words.js';

export interface WedgePrintPart {
  name: string; // without the extension; it ends with how many to print
  solid: Manifold; // the caller's to delete
  count: number;
}

// A printed TPU gasket in the grooves, as tall as the tape it stands for is thick.
export interface WedgeGasket {
  fit: TapeFit;
  heightMm: number;
}

// On each of the frame's face and the sash's, the gasket's runs: up each leg from the hinge to
// half the groove past the top strip's mid-plane, where the groove turns along the top, and along
// the top from the inner edge of one leg's groove to the other's.
export function wedgeGasketRuns(
  wedge: SashWedge,
  profile: EdgeProfile,
  panelMm: number,
): { legMm: number; topMm: number } {
  const half = ((wedge.tiltDeg / 2) * Math.PI) / 180;
  const groove = profile.tape?.groove.widthMm ?? 0;
  const xTop = wedge.side.axisMm - profile.widthMm / 2;
  return { legMm: xTop / Math.cos(half) + groove / 2, topMm: wedge.top.lengthMm - panelMm - groove };
}

// Moved so it starts at the origin, on the bed.
function onBed(m: Manifold): Manifold {
  const { min } = m.boundingBox();
  return m.translate([-(min[0] ?? 0), -(min[1] ?? 0), -(min[2] ?? 0)]);
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// The gaskets' runs in pieces the printer makes, each length to a tenth of a mm and once, with how
// many of it: up both legs of both sides and along the top, on both faces.
function gasketPieces(
  wedge: SashWedge,
  profile: EdgeProfile,
  panelMm: number,
  maxPieceMm: number,
  gasket: WedgeGasket,
): { name: string; lengthMm: number; count: number }[] {
  const runs = wedgeGasketRuns(wedge, profile, panelMm);
  const counts = new Map<number, number>();
  const cut = (lengthMm: number, count: number) => {
    for (const [, length] of evenSegments(0, lengthMm, maxPieceMm)) {
      counts.set(tenth(length), (counts.get(tenth(length)) ?? 0) + count);
    }
  };
  cut(runs.legMm, 4);
  cut(runs.topMm, 2);
  return [...counts].map(([lengthMm, count]) => {
    const shape = {
      kind: 'gasket' as const,
      lengthMm,
      widthMm: tenth(gasket.fit.grooveWidthMm),
      heightMm: gasket.heightMm,
      count,
    };
    return { name: partName(shape), lengthMm, count };
  });
}

// The names and counts wedgePrintParts gives, in its order, found without building anything: what
// a dry run lists.
export function wedgePartNames(
  wedge: SashWedge,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
  port?: FlatPort,
  gasket?: WedgeGasket,
): { name: string; count: number }[] {
  const corner = wedgeCorner(profile, joint, panelMm);
  const cos = Math.cos(((wedge.tiltDeg / 2) * Math.PI) / 180);
  const xCorner = wedge.side.axisMm - corner.belowTopMm;
  const list: { name: string; count: number }[] = [];
  const add = (name: string, count: number) => list.push({ name: `${name}-print-${count}`, count });
  const each = (n: number, name: (i: number) => string, count: number) => {
    for (let i = 0; i < n; i++) add(name(i), count);
  };
  const legs = evenSegments(0, (xCorner + 1) / cos, maxPieceMm).length;
  each(legs, (i) => `wedge-leg-${i + 1}-of-${legs}`, 4);
  const { side, top } = wedge;
  each(side.chain.pieces.length, (i) => `wedge-side-${i + 1}-of-${side.chain.pieces.length}`, 2);
  each(side.chain.jointsMm.length, (i) => `wedge-side-joint-${i + 1}-of-${side.chain.jointsMm.length}`, 2);
  add('wedge-corner', 2);
  const edges = evenSegments(corner.deepMm, top.lengthMm - 2 * corner.deepMm, maxPieceMm).length;
  each(edges, (i) => `wedge-top-edge-${i + 1}-of-${edges}`, 2);
  const pieces = top.chain.pieces.length;
  each(pieces, (i) => `wedge-top-${i + 1}-of-${pieces}${port?.piece === i ? `-port-${mm(port.hoseMm)}` : ''}`, 1);
  each(top.chain.jointsMm.length, (i) => `wedge-top-joint-${i + 1}-of-${top.chain.jointsMm.length}`, 1);
  if (gasket !== undefined) {
    for (const { name, count } of gasketPieces(wedge, profile, panelMm, maxPieceMm, gasket)) list.push({ name, count });
  }
  return list;
}

export function wedgePrintParts(
  engine: Engine,
  wedge: SashWedge,
  profile: EdgeProfile,
  joint: JointParams,
  panelMm: number,
  maxPieceMm: number,
  port?: FlatPort,
  gasket?: WedgeGasket,
): WedgePrintPart[] {
  const whole = sashWedgeSolids(engine, wedge, profile, joint, panelMm, maxPieceMm, port);
  const temporary: Manifold[] = [];
  const parts: WedgePrintPart[] = [];
  const add = (name: string, solid: Manifold, count: number) =>
    parts.push({ name: `${name}-print-${count}`, solid, count });
  // Turned about the axes in turn, then onto the bed.
  const turned = (m: Manifold, ...turns: [number, number, number][]) => {
    let solid = m;
    for (const t of turns) {
      solid = solid.rotate(t);
      temporary.push(solid);
    }
    return onBed(solid);
  };
  const beta = wedge.tiltDeg / 2;
  try {
    const [left] = whole.sides;
    if (left === undefined) throw new Error('No side triangle');
    // The frame's leg's strips come first, then the sash's, as many; the frame's, turned off the
    // leg and onto their outer faces, stand for both.
    const legs = left.legs.length / 2;
    left.legs.slice(0, legs).forEach((leg, i) => {
      add(`wedge-leg-${i + 1}-of-${legs}`, turned(leg, [0, 0, -beta], [-90, 0, 0]), 4);
    });
    const panels = left.panels.length;
    left.panels.forEach((p, i) => add(`wedge-side-${i + 1}-of-${panels}`, onBed(p), 2));
    const joints = left.joints.length;
    left.joints.forEach((j, i) => {
      add(`wedge-side-joint-${i + 1}-of-${joints}`, turned(j, [0, -90, 0]), 2);
    });
    const [corner] = whole.corners;
    if (corner === undefined) throw new Error('No corner');
    add('wedge-corner', turned(corner, [0, 90, 0]), 2);

    // The top strip's edge strips on the frame's face come first; each stands for its twin on the
    // sash's, turned flat on its bevel.
    const edges = whole.top.edges.length / 2;
    whole.top.edges.slice(0, edges).forEach((e, i) => {
      add(`wedge-top-edge-${i + 1}-of-${edges}`, turned(e, [0, 0, -beta], [-90, 0, 0]), 2);
    });
    const pieces = whole.top.panels.length;
    whole.top.panels.forEach((p, i) => {
      const what = port?.piece === i ? `-port-${mm(port.hoseMm)}` : '';
      add(`wedge-top-${i + 1}-of-${pieces}${what}`, turned(p, [0, -90, 0]), 1);
    });
    const topJoints = whole.top.joints.length;
    whole.top.joints.forEach((j, i) => {
      add(`wedge-top-joint-${i + 1}-of-${topJoints}`, onBed(j), 1);
    });

    if (gasket !== undefined) {
      for (const { name, lengthMm, count } of gasketPieces(wedge, profile, panelMm, maxPieceMm, gasket)) {
        parts.push({ name, solid: gasketSolid(engine, lengthMm, gasket.fit, gasket.heightMm), count });
      }
    }
    return parts;
  } finally {
    const all = [
      ...whole.sides.flatMap((s) => [...s.legs, ...s.panels, ...s.joints]),
      ...whole.corners,
      ...whole.top.edges,
      ...whole.top.panels,
      ...whole.top.joints,
    ];
    for (const m of [...all, ...temporary]) m.delete();
  }
}

// The plan's lines for the wedge: the sash's tilt and the faces it leaves, the triangles' and the
// top strip's pieces, the hose port and its share of the hose's area, and the gasket's runs.
export function describeWedge(
  wedge: SashWedge,
  port: FlatPort | undefined,
  runs: { legMm: number; topMm: number },
  seal: 'tape' | 'tpu',
): string[] {
  const { side, top } = wedge;
  const lines = [
    `The sash leans ${mm(wedge.tiltDeg)}° in. The wedge it leaves: a top strip ${mm(top.lengthMm)} mm long and ` +
      `${mm(top.depthMm)} mm deep, and a triangle each side, ${mm(side.legMm)} mm on its two long sides and ` +
      `${mm(side.baseMm)} mm across its top.`,
    `Each triangle: ${side.chain.pieces.length} pieces end to end with ${side.chain.jointsMm.length} joint strips, ` +
      `from ${mm(side.tipMm)} mm above the hinge; below that its edge strips close it. A corner piece joins its top ` +
      'to the top strip.',
    `The top strip: ${top.chain.pieces.length} pieces with ${top.chain.jointsMm.length} joint strips, between the ` +
      'two corner pieces.',
  ];
  if (port !== undefined) {
    const slot = `a ${mm(port.slot.widthMm)} × ${mm(port.slot.lengthMm)} mm slot`;
    const area =
      port.areaShare >= 1 - 1e-9
        ? `the ${mm(port.hoseMm)} mm hose’s own area, leading to a collar the hose slides into.`
        : `${Math.round(port.areaShare * 100)}% of the ${mm(port.hoseMm)} mm hose’s area, as long as the piece ` +
          'allows: the air meets more resistance than in the hose.';
    lines.push(`The hose port is in the top strip’s piece ${port.piece + 1}: ${slot}, ${area}`);
  }
  const what = seal === 'tpu' ? 'Gaskets in TPU' : 'Tape';
  lines.push(
    `${what}, on the frame’s face and on the sash’s: ${mm(runs.legMm)} mm up each leg and round its corner, and ` +
      `${mm(runs.topMm)} mm along the top; ${mm(4 * runs.legMm + 2 * runs.topMm)} mm in all.`,
  );
  return lines;
}
