// The preview's scene (backlog item preview-3d, #9), with three.js (Q49). It draws the same
// pieces the user downloads, built by the same code, each at its place in the wall, with a
// thin outline so the joints between pieces show. The strips and cross pieces
// (connector-strip, #10) are drawn in place around the panels, in a darker grey.
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
} from 'three';
import type { Material } from 'three';
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine';
import { meshOf } from './export';
import { planJoints, stripWidthMm } from './joint';
import { crossSolid, stripSolid } from './joint-geometry';
import { buildPieces } from './panel-geometry';
import { planWall } from './params';
import type { Params } from './params';

export type PartKind = 'piece' | 'strip' | 'cross';

// Shared by every wall; never disposed, since every wall uses them.
const PANEL = new MeshPhongMaterial({ color: 0x9aa7b5, shininess: 20 });
const JOINT = new MeshPhongMaterial({ color: 0x5f6b77, shininess: 20 });
const OUTLINE = new LineBasicMaterial({ color: 0x3c4650 });

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

export function buildWallScene(engine: Engine, params: Params): Group {
  const plan = planWall(params);
  const { joint, thicknessMm } = params;
  const wall = new Group();
  const built = buildPieces(engine, plan, thicknessMm);
  try {
    built.forEach((piece, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      add(wall, piece.solid, 'piece', cell.xMm, cell.yMm, PANEL);
    });
  } catch (error) {
    disposeWall(wall);
    throw error;
  }
  try {
    const joints = planJoints(plan, joint);
    for (const s of joints.strips) {
      const pose = s.axis === 'vertical' ? 'wall-vertical' : 'wall-horizontal';
      add(wall, stripSolid(engine, s.lengthMm, joint, thicknessMm, pose), 'strip', s.xMm, s.yMm, JOINT);
    }
    const half = stripWidthMm(joint) / 2;
    for (const c of joints.crosses) {
      add(wall, crossSolid(engine, joint, thicknessMm, 'wall'), 'cross', c.xMm - half, c.yMm - half, JOINT);
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
export function disposeWall(wall: Group): void {
  for (const child of [...wall.children]) {
    if (child instanceof Mesh || child instanceof LineSegments) child.geometry.dispose();
    wall.remove(child);
  }
}
