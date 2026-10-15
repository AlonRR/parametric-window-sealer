// Model files for the tests (mesh-appliance, #35): a solid the engine made, written as a binary STL
// file and given as the setting takes it, the file's bytes in base64.
import type { Manifold } from 'manifold-3d';
import { encodeModelFile } from '../src/index.js';

// A binary STL file of the corners and faces given.
export function stlOf(positions: ArrayLike<number>, triangles: ArrayLike<number>, stride = 3): Uint8Array {
  const count = triangles.length / 3;
  const bytes = new Uint8Array(84 + 50 * count);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, count, true);
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++) {
      const corner = triangles[3 * t + k] ?? 0;
      for (let a = 0; a < 3; a++) {
        view.setFloat32(84 + 50 * t + 12 + 12 * k + 4 * a, positions[stride * corner + a] ?? 0, true);
      }
    }
  }
  return bytes;
}

// The solid as a model file's setting; the solid is freed.
export function modelFileOf(solid: Manifold): string {
  try {
    const mesh = solid.getMesh();
    return encodeModelFile(stlOf(mesh.vertProperties, mesh.triVerts, mesh.numProp));
  } finally {
    solid.delete();
  }
}

// A box from the origin, its faces counter-clockwise seen from outside, without the engine.
export function boxFile(x: number, y: number, z: number): string {
  const corners = [
    [0, 0, 0],
    [x, 0, 0],
    [x, y, 0],
    [0, y, 0],
    [0, 0, z],
    [x, 0, z],
    [x, y, z],
    [0, y, z],
  ].flat();
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ];
  return encodeModelFile(stlOf(corners, faces));
}
