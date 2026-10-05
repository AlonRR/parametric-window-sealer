// Binary STL out of a Manifold mesh, and its triangle count back in. DataView only, so the
// same code runs in Node and in the browser.

export function meshToStl(mesh) {
  const n = mesh.triVerts.length / 3;
  const bytes = new Uint8Array(84 + 50 * n);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    o += 12; // normal left as zero; slicers recompute it
    for (let k = 0; k < 3; k++) {
      const v = mesh.triVerts[3 * t + k] * mesh.numProp;
      for (let c = 0; c < 3; c++, o += 4) view.setFloat32(o, mesh.vertProperties[v + c], true);
    }
    o += 2;
  }
  return bytes;
}

export function stlTriangleCount(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  if (bytes.byteLength !== 84 + 50 * n) throw new Error(`not a binary STL: ${bytes.byteLength} bytes for ${n} triangles`);
  return n;
}
