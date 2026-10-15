// Importing a mesh (mesh-import, #42): a user's STL, OBJ or 3MF file read, made sound or
// refused with what to do (docs/meshes.md), and made a solid the engine can cut and join.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import { readMeshFile } from './formats.js';
import { repairMesh } from './repair.js';
import type { ImportedMesh, MeshRead } from './repair.js';

export { MESH_MAX_TRIANGLES } from './formats.js';
export type { ImportedMesh, MeshRead } from './repair.js';

// The mesh in a file, whatever its name says it is.
export function readMesh(bytes: Uint8Array): MeshRead {
  const raw = readMeshFile(bytes);
  return raw.ok ? repairMesh(raw.mesh) : raw;
}

// The mesh as a solid. The caller frees it.
export function meshSolid(engine: Engine, mesh: ImportedMesh): Manifold {
  const data = new engine.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.triangles });
  return new engine.Manifold(data);
}
