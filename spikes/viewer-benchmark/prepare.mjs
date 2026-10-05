// Q49 spike: write the two test meshes the pages draw, built by Manifold as the real page
// builds pieces. "plain" is a 200 x 200 x 3 mm panel (12 triangles); "pattern" is the
// engine benchmark's honeycomb panel (6 928 triangles), the heaviest piece measured so far.
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
