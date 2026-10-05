// The preview's scene (backlog item preview-3d, #9), with three.js (Q49). It draws the same
// pieces the user downloads, built by the same code, each at its place in the wall, with a
// thin outline so the joints between pieces show.
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
import type { Engine } from './engine';
import { meshOf } from './export';
import { buildPieces } from './panel-geometry';
import { planWall } from './params';
import type { Params } from './params';

// Shared by every piece; never disposed, since every wall uses them.
const PANEL = new MeshPhongMaterial({ color: 0x9aa7b5, shininess: 20 });
const OUTLINE = new LineBasicMaterial({ color: 0x3c4650 });

export function buildWallScene(engine: Engine, params: Params): Group {
  const plan = planWall(params);
  const built = buildPieces(engine, plan, params.thicknessMm);
  const wall = new Group();
  try {
    built.forEach((piece, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      const { positions, triangles } = meshOf(piece.solid);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(triangles, 1));
      geometry.computeVertexNormals();
      const solid = new Mesh(geometry, PANEL);
      const outline = new LineSegments(new EdgesGeometry(geometry), OUTLINE);
      for (const object of [solid, outline]) {
        object.position.set(cell.xMm, cell.yMm, 0);
        wall.add(object);
      }
    });
  } finally {
    for (const piece of built) piece.solid.delete();
  }
  return wall;
}

// Graphics memory is not freed by the garbage collector: each redraw frees the last wall.
export function disposeWall(wall: Group): void {
  for (const child of [...wall.children]) {
    if (child instanceof Mesh || child instanceof LineSegments) child.geometry.dispose();
    wall.remove(child);
  }
}
