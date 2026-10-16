// The preview's scene (backlog item preview-3d, #9), with three.js (Q49). It draws the same
// pieces the user downloads, built by the same code, each at its place in the wall, with a
// thin outline so the joints between pieces show. The strips and cross pieces
// (connector-strip, #10) and the edge strips (track-edge, #11) are drawn in place around
// the panels, in a darker grey. With a tape seal (seal-tape, #15) the tape is drawn too, in
// its own colour, though it is bought, not printed, and so not in the download (Q132). A
// patterned fill (pattern-grid, #16) is drawn as it is printed. The printed TPU seal (seal-tpu,
// #22) is drawn where the tape would be, squeezed as the tape is, in a dark grey of its own
// (C36), and joint strips and cross pieces printed in TPU in the same grey. A measured cutout
// (#23) is drawn in its piece, lined with the seal. The pins through the strips (joint-lock, #110)
// are drawn in their holes, in the pale colour of natural filament. Pieces cut from sheet (#112) are
// drawn in a pale blue, so the wall shows which to cut and which to print.
//
// Measured in spikes/viewer-benchmark/: what slows a preview is the number of triangles,
// not the library. Plain pieces have 12 each; when patterns arrive, drawing them in full
// only for the piece in focus is the lever, should it be needed.

import {
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { Manifold } from 'manifold-3d';
import type { Engine } from 'parametric-window-sealer';
import { meshOf } from 'parametric-window-sealer';
import { edgeStripSolid, edgeTapeSolid } from 'parametric-window-sealer';
import { stripWidthMm } from 'parametric-window-sealer';
import { crossSolid, pinSolid, planPins, stripSolid } from 'parametric-window-sealer';
import { buildPiecesWith, fittingSource, placedFittings } from 'parametric-window-sealer';
import { tpuJoint } from 'parametric-window-sealer';
import { fillChoice, fillFor } from 'parametric-window-sealer';
import { isCut, planParts, slotPins } from 'parametric-window-sealer';
import { requireWedgeSetup, sashForm, sashWedgeSolids } from 'parametric-window-sealer';
import type { Params } from 'parametric-window-sealer';

export type PartKind = 'piece' | 'strip' | 'cross' | 'pin' | 'edge' | 'tape' | 'tpu';

// Shared by every wall; never disposed, since every wall uses them.
const PANEL = new MeshPhongMaterial({ color: 0x9aa7b5, shininess: 20 });
const JOINT = new MeshPhongMaterial({ color: 0x5f6b77, shininess: 20 });
const OUTLINE = new LineBasicMaterial({ color: 0x3c4650 });
const TAPE = new MeshPhongMaterial({ color: 0xd9822b, shininess: 5 });
export const TPU_COLOUR = 0x2b2b2b;
const TPU = new MeshPhongMaterial({ color: TPU_COLOUR, shininess: 10 });
const PIN = new MeshPhongMaterial({ color: 0xe8e2d0, shininess: 30 });
export const SHEET_COLOUR = 0xc8dce8;
const SHEET = new MeshPhongMaterial({ color: SHEET_COLOUR, shininess: 40 });

// A solid and its outline, at x, y in the wall; the solid is freed once copied.
function add(wall: Group, solid: Manifold, kind: PartKind, x: number, y: number, look: Material) {
  try {
    const { positions, triangles } = meshOf(solid);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setIndex(new BufferAttribute(triangles, 1));
    geometry.computeVertexNormals();
    const body = new Mesh(geometry, look);
    const outline = new LineSegments(new EdgesGeometry(geometry), OUTLINE);
    for (const object of [body, outline]) {
      object.position.set(x, y, 0);
      object.userData.kind = kind;
      wall.add(object);
    }
  } finally {
    solid.delete();
  }
}

// A tilted or turned sash's wedge (sash-wedge, #159), as it sits in the window. The library builds
// it in its own frame, x along the triangles' axis from the hinge, y across from the frame to the
// sash, z along the strip; the group turns it, a turn and not a mirror, so the window's width runs
// along x and its height up y as a wall's do: a tilted sash's axis up the height, a turned one's
// along the width from its hinge at the left, its strip running down from the head. Its gaskets are
// in the download, not here.
function buildWedgeScene(engine: Engine, params: Params): Group {
  const s = requireWedgeSetup(params);
  const parts = sashWedgeSolids(engine, s.wedge, s.profile, s.joint, s.panelMm, s.maxPieceMm, s.port);
  const wedge = new Group();
  wedge.matrixAutoUpdate = false;
  if (s.wedge.form === 'tilt') {
    wedge.matrix.makeBasis(new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0));
  } else {
    wedge.matrix
      .makeBasis(new Vector3(1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, -1, 0))
      .setPosition(0, params.openingHeightMm, 0);
  }
  const placed: [Manifold, PartKind, Material][] = [
    ...parts.sides.flatMap((side) => [
      ...side.legs.map((m) => [m, 'edge', JOINT] as [Manifold, PartKind, Material]),
      ...side.panels.map((m) => [m, 'piece', PANEL] as [Manifold, PartKind, Material]),
      ...side.joints.map((m) => [m, 'strip', JOINT] as [Manifold, PartKind, Material]),
    ]),
    ...parts.corners.map((m) => [m, 'cross', JOINT] as [Manifold, PartKind, Material]),
    ...parts.top.edges.map((m) => [m, 'edge', JOINT] as [Manifold, PartKind, Material]),
    ...parts.top.panels.map((m) => [m, 'piece', PANEL] as [Manifold, PartKind, Material]),
    ...parts.top.joints.map((m) => [m, 'strip', JOINT] as [Manifold, PartKind, Material]),
  ];
  // add takes each solid's ownership; once one fails, the rest are deleted here.
  let i = 0;
  try {
    for (; i < placed.length; i++) {
      const [solid, kind, look] = placed[i] ?? [];
      if (solid && kind && look) add(wedge, solid, kind, 0, 0, look);
    }
  } catch (error) {
    for (const [solid] of placed.slice(i + 1)) solid.delete();
    disposeWall(wedge);
    throw error;
  }
  return wedge;
}

export function buildWallScene(engine: Engine, params: Params): Group {
  if (sashForm(params.edges.window) !== undefined) return buildWedgeScene(engine, params);
  const { plan, joints, edges } = planParts(params);
  const { joint, thicknessMm } = params;
  const wall = new Group();
  // The TPU seal's parts take the tape's place; its joints, if in TPU, grip the panels (C34).
  const [sealKind, seal] = params.seal.kind === 'tpu' ? (['tpu', TPU] as const) : (['tape', TAPE] as const);
  const inTpu = params.seal.kind === 'tpu' && params.seal.tape.joints;
  const [own, ownLook] = inTpu ? [tpuJoint(joint), TPU] : [joint, JOINT];
  // Each piece's own fill, or the wall's (params-advanced, #21).
  const pattern = (cell: { column: number; row: number }) =>
    fillChoice(fillFor(params, cell.column + 1, cell.row + 1), joint);
  const fittings = placedFittings(fittingSource(params));
  const pins = planPins(joints, joint);
  // A piece cut from sheet (#112) has no slots for the pins: its holes are drilled.
  const slotted = slotPins(params, plan, pins);
  // The pieces drawn square and solid: their 3 mm rounded corners, 1 mm chamfer and a double wall's
  // air are too small or hidden to see at the preview's scale, and leaving them out keeps it quick.
  // The download has them (#119, #122).
  const built = buildPiecesWith(
    engine,
    plan,
    thicknessMm,
    fittings,
    pattern,
    { joint, pins: slotted },
    undefined,
    () => false,
  );
  try {
    built.forEach((piece, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      add(wall, piece.solid, 'piece', cell.xMm, cell.yMm, isCut(params, cell) ? SHEET : PANEL);
    });
  } catch (error) {
    disposeWall(wall);
    throw error;
  }
  try {
    for (const s of joints.strips) {
      const pose = s.axis === 'vertical' ? 'wall-vertical' : 'wall-horizontal';
      add(wall, stripSolid(engine, s.lengthMm, own, thicknessMm, pose, params.rain), 'strip', s.xMm, s.yMm, ownLook);
    }
    const half = stripWidthMm(joint) / 2;
    for (const c of joints.crosses) {
      add(wall, crossSolid(engine, own, thicknessMm, 'wall'), 'cross', c.xMm - half, c.yMm - half, ownLook);
    }
    for (const p of pins) add(wall, pinSolid(engine, joint, thicknessMm), 'pin', p.xMm, p.yMm, PIN);
    for (const e of edges) {
      const solid = edgeStripSolid(engine, e.lengthMm, e, joint, thicknessMm, e.edge, params.rain);
      add(wall, solid, 'edge', e.xMm, e.yMm, JOINT);
      if (e.tape) {
        const strip = { widthMm: e.widthMm, heightMm: e.heightMm, tape: e.tape };
        add(wall, edgeTapeSolid(engine, e.lengthMm, strip, thicknessMm, e.edge), sealKind, e.xMm, e.yMm, seal);
      }
    }
    // Each fitting's seal, if it has one: tape or a TPU sleeve in a hose port's collar when the
    // seal goes there (Q129), round a cutout's rim whenever there is a seal (C43).
    for (const fitting of fittings) {
      const cell = plan.pieces.find((c) => c.column === fitting.column - 1 && c.row === fitting.row - 1);
      if (!cell) continue;
      const lining = fitting.lining(engine, { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm });
      if (lining) add(wall, lining, sealKind, cell.xMm, cell.yMm, seal);
    }
  } catch (error) {
    disposeWall(wall);
    throw error;
  }
  return wall;
}

export function countOf(wall: Group, kind: PartKind): number {
  return wall.children.filter((c) => c instanceof Mesh && c.userData.kind === kind).length;
}

// Graphics memory is not freed by the garbage collector: each redraw frees the last wall.
const hasGeometry = (o: Object3D): o is Mesh | LineSegments => o instanceof Mesh || o instanceof LineSegments;

export function disposeWall(wall: Group): void {
  for (const child of wall.children) if (hasGeometry(child)) child.geometry.dispose();
  wall.clear();
}
