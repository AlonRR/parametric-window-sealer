// Notches along an edge for a window's hardware (edge-notches, #161; docs/frame.md). Where a
// casement's crank arm, a friction stay's arms or a lock's keep cross the frame, the wall leaves a
// measured notch in its edge: the edge strip and its gasket stop either side of it, and where the
// notch reaches past the strip, the piece behind is cut. A notch is in one piece, with enough edge
// strip either side within that piece to hold it, and leaves the piece deep enough for its joints.
// Its piece is printed whole and sealed, without a fitting, a pattern or a hollow. The gap round the
// hardware is filled by hand, with putty or foam.
import type { Manifold } from 'manifold-3d';
import { EDGES, edgeProfile } from './edge.js';
import type { EdgeName, EdgeParams } from './edge.js';
import type { Engine } from './engine.js';
import type { InPiece } from './fittings/define.js';
import { minPieceMm } from './joint.js';
import type { JointParams } from './joint.js';
import type { GridLayout, GridPiece } from './layout.js';
import type { TapeFit } from './tape.js';
import { mm } from './words.js';

export interface NotchSetting {
  widthMm: number; // along the edge
  depthMm: number; // from the frame's face into the opening
  edge: EdgeName;
  atMm: number; // its middle, from the opening's left corner along the top and bottom, the bottom one up the sides
}

export type PlacedNotch = NotchSetting & InPiece;

export const NOTCH_CLEARANCE_MM = 1; // round the hardware, along the edge and past its depth
export const NOTCH_HOLD_MM = 10; // of edge strip either side, within the notch's piece

const FORM = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)@(top|bottom|left|right),(\d+(?:\.\d+)?)$/;

export function parseNotches(text: string): { ok: true; notches: NotchSetting[] } | { ok: false; message: string } {
  const notches: NotchSetting[] = [];
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    const m = FORM.exec(word);
    const [widthMm, depthMm, atMm] = [Number(m?.[1]), Number(m?.[2]), Number(m?.[4])];
    const edge = EDGES.find((e) => e === m?.[3]);
    if (m === null || edge === undefined || !(widthMm > 0) || !(depthMm > 0) || !(atMm >= 0)) {
      return {
        ok: false,
        message:
          `Notch ${i + 1}: write each as its width x depth in mm, then @ its edge (top, bottom, left or right) and ` +
          'how far its middle is from the left or the bottom corner, as 40x25@bottom,300.',
      };
    }
    notches.push({ widthMm, depthMm, edge, atMm });
  }
  return { ok: true, notches };
}

export const formatNotches = (notches: readonly NotchSetting[]): string =>
  notches.map((n) => `${n.widthMm}x${n.depthMm}@${n.edge},${n.atMm}`).join(' ');

export const notchTag = (n: NotchSetting): string => `-notch-${mm(n.widthMm)}x${mm(n.depthMm)}`;

const across = (edge: EdgeName) => edge === 'top' || edge === 'bottom';

// The edges' and joint's settings a notch is placed with.
export interface NotchContext {
  edges: EdgeParams;
  joint: JointParams;
  tape: TapeFit | undefined;
}

// Where a notch is, in the pieces' frame: its span along its edge, clearance and all, and how far
// it cuts into its piece; 0 or less leaves the piece whole.
export function notchSpan(n: NotchSetting, c: NotchContext): { fromMm: number; toMm: number; cutMm: number } {
  const reach = (e: EdgeName) => edgeProfile(e, c.edges, c.joint, c.tape).reachMm;
  const at = n.atMm + reach(across(n.edge) ? 'left' : 'bottom');
  const half = n.widthMm / 2 + NOTCH_CLEARANCE_MM;
  return { fromMm: at - half, toMm: at + half, cutMm: n.depthMm + NOTCH_CLEARANCE_MM + reach(n.edge) };
}

// The pieces along an edge, from its start.
function edgePieces(plan: GridLayout, edge: EdgeName): GridPiece[] {
  const last = (axis: 'column' | 'row') => Math.max(...plan.pieces.map((p) => p[axis]));
  const on: Record<EdgeName, (p: GridPiece) => boolean> = {
    bottom: (p) => p.row === 0,
    top: (p) => p.row === last('row'),
    left: (p) => p.column === 0,
    right: (p) => p.column === last('column'),
  };
  return plan.pieces.filter(on[edge]);
}

const spanOf = (p: GridPiece, edge: EdgeName): [number, number] =>
  across(edge) ? [p.xMm, p.xMm + p.widthMm] : [p.yMm, p.yMm + p.heightMm];
const depthOf = (p: GridPiece, edge: EdgeName): number => (across(edge) ? p.heightMm : p.widthMm);

// A notch's piece, by column and row from 1, or what is wrong with where it falls.
export function placeNotch(
  plan: GridLayout,
  n: NotchSetting,
  c: NotchContext,
  label: string,
): { ok: true; placed: PlacedNotch } | { ok: false; problem: string } {
  if (c.edges.roles[n.edge] !== 'frame') {
    return {
      ok: false,
      problem:
        `${label} is in the ${n.edge} edge, which is ${ROLE_WORDS[c.edges.roles[n.edge]]}: a notch is for hardware ` +
        'crossing a frame edge.',
    };
  }
  const { fromMm, toMm, cutMm } = notchSpan(n, c);
  const inSlot = c.joint.slotMm - c.joint.slideMm / 2;
  const hold = inSlot + NOTCH_HOLD_MM;
  const piece = edgePieces(plan, n.edge).find((p) => {
    const [start, end] = spanOf(p, n.edge);
    return fromMm >= start + hold - 1e-9 && toMm <= end - hold + 1e-9;
  });
  if (piece === undefined) {
    return {
      ok: false,
      problem:
        `${label} crosses a joint between pieces or the wall’s corner, or comes within ${mm(NOTCH_HOLD_MM)} mm of ` +
        'one, where the edge strip must hold its piece: dividing the ' +
        `${across(n.edge) ? 'width' : 'height'} as full pieces plus a filler moves the joints.`,
    };
  }
  const left = depthOf(piece, n.edge) - Math.max(0, cutMm);
  if (left < minPieceMm(c.joint) - 1e-9) {
    return {
      ok: false,
      problem:
        `${label} cuts ${mm(cutMm)} mm into a ${mm(depthOf(piece, n.edge))} mm piece; it must leave at least ` +
        `${mm(minPieceMm(c.joint))} mm of it.`,
    };
  }
  return { ok: true, placed: { ...n, column: piece.column + 1, row: piece.row + 1 } };
}

const ROLE_WORDS: Record<EdgeParams['roles'][EdgeName], string> = {
  track: 'in a track',
  sash: 'pressed by the sash',
  sill: 'on a sill',
  unit: 'against a window AC',
  frame: 'pressed into a frame',
};

// Where each edge's strip stops for its notches, along it in the pieces' frame.
export function notchGaps(notches: readonly NotchSetting[], c: NotchContext): Record<EdgeName, [number, number][]> {
  const gaps: Record<EdgeName, [number, number][]> = { top: [], bottom: [], left: [], right: [] };
  for (const n of notches) {
    const { fromMm, toMm } = notchSpan(n, c);
    gaps[n.edge].push([fromMm, toMm]);
  }
  for (const e of EDGES) gaps[e].sort((a, b) => a[0] - b[0]);
  return gaps;
}

// What a notch takes out of its piece, in the piece's frame, through its thickness; nothing if it
// does not reach the piece.
export function notchCut(
  engine: Engine,
  n: NotchSetting,
  c: NotchContext,
  cell: GridPiece,
  thicknessMm: number,
): Manifold | undefined {
  const { fromMm, toMm, cutMm } = notchSpan(n, c);
  if (cutMm <= 0) return undefined;
  const length = toMm - fromMm;
  const z = thicknessMm + 2;
  // WebAssembly memory: the cube is freed once moved.
  const box = (x: number, y: number, w: number, h: number) => {
    const cube = engine.Manifold.cube([w, h, z]);
    const moved = cube.translate([x, y, -1]);
    cube.delete();
    return moved;
  };
  const boxes: Record<EdgeName, () => Manifold> = {
    bottom: () => box(fromMm - cell.xMm, -1, length, cutMm + 1),
    top: () => box(fromMm - cell.xMm, cell.heightMm - cutMm, length, cutMm + 1),
    left: () => box(-1, fromMm - cell.yMm, cutMm + 1, length),
    right: () => box(cell.widthMm - cutMm, fromMm - cell.yMm, cutMm + 1, length),
  };
  return boxes[n.edge]();
}

const FROM_WORDS: Record<EdgeName, string> = {
  top: 'the left corner',
  bottom: 'the left corner',
  left: 'the bottom corner',
  right: 'the bottom corner',
};

// The plan's line for each notch.
export function describeNotches(notches: readonly PlacedNotch[], c: NotchContext): string[] {
  return notches.map((n, i) => {
    const { cutMm } = notchSpan(n, c);
    const piece =
      cutMm > 0
        ? `the piece is cut ${mm(cutMm)} mm into and left sealed`
        : 'the piece behind it is left whole and sealed';
    return (
      `Notch ${i + 1}: ${mm(n.widthMm)} × ${mm(n.depthMm)} mm in the ${n.edge} edge, its middle ${mm(n.atMm)} mm ` +
      `from ${FROM_WORDS[n.edge]}, in column ${n.column}, row ${n.row}: the edge strip and its gasket stop either ` +
      `side of it, and ${piece}. Fit the hardware through it, then fill the gap round it with removable sealing ` +
      'putty or a strip of closed-cell foam.'
    );
  });
}
