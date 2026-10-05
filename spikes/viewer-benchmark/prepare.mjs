// Q49 spike: write the test meshes the pages draw, built by Manifold as the real page
// builds pieces. "plain" is a 200 x 200 x 3 mm panel (12 triangles); "pattern" is the
// engine benchmark's honeycomb panel (10 mm holes, 2 mm walls: 6 928 triangles). The owner
// asked how the libraries cope as the model grows more complex, so "dense" (5 mm holes,
// 1 mm walls: 28 100 triangles) and "heavy" (3 mm holes, 1 mm walls: 63 572 triangles)
// are the same panel with finer honeycombs. These are example sizes (Q18).
// File layout: uint32 vertex count, uint32 triangle count, float32 x y z per vertex,
// uint32 three indices per triangle; little-endian.
import { writeFileSync } from 'node:fs';
import ManifoldModule from 'manifold-3d';
import { PANEL, buildWithManifold } from '../engine-benchmark/panel.mjs';

const wasm = await ManifoldModule();
wasm.setup();

function write(name, solid) {
  const mesh = solid.getMesh();
  const verts = mesh.vertProperties.length / mesh.numProp;
  const tris = mesh.triVerts.length / 3;
  const positions = new Float32Array(verts * 3);
  for (let v = 0; v < verts; v++) {
    for (let k = 0; k < 3; k++) positions[v * 3 + k] = mesh.vertProperties[v * mesh.numProp + k];
  }
  const out = new Uint8Array(8 + positions.byteLength + mesh.triVerts.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, verts, true);
  view.setUint32(4, tris, true);
  out.set(new Uint8Array(positions.buffer), 8);
  out.set(new Uint8Array(Uint32Array.from(mesh.triVerts).buffer), 8 + positions.byteLength);
  writeFileSync(new URL(`./public/meshes/${name}.bin`, import.meta.url), out);
  console.log(`${name}: ${verts} vertices, ${tris} triangles, ${out.byteLength} bytes`);
  solid.delete();
}

write('plain', wasm.Manifold.cube([200, 200, 3]));
write('pattern', buildWithManifold(wasm, PANEL));
write('dense', buildWithManifold(wasm, { ...PANEL, hexAF: 5, wall: 1 }));
write('heavy', buildWithManifold(wasm, { ...PANEL, hexAF: 3, wall: 1 }));
