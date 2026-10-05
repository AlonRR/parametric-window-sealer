// Q49 spike: the wall drawn by model-viewer. model-viewer shows glTF, so every change is
// first written as a GLB (binary glTF) holding one mesh per piece, as the real page would
// have to; that conversion is part of what is timed.
import '@google/model-viewer';
import { layout, loadMesh, publish, shown } from '../scene.mjs';

const viewer = document.querySelector('model-viewer');
const mesh = await loadMesh();

function glb(n) {
  const places = layout(n);
  const pos = mesh.positions;
  const idx = mesh.indices;
  const min = [0, 1, 2].map((k) => Math.min(...pos.filter((_, i) => i % 3 === k)));
  const max = [0, 1, 2].map((k) => Math.max(...pos.filter((_, i) => i % 3 === k)));
  const each = pos.byteLength + idx.byteLength;
  const bin = new Uint8Array(each * n);
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: places.map((_, i) => i) }],
    nodes: places.map(([x, y], i) => ({ mesh: i, translation: [x, y, 0] })),
    meshes: places.map((_, i) => ({
      primitives: [{ attributes: { POSITION: 2 * i }, indices: 2 * i + 1, material: 0 }],
    })),
    materials: [
      { pbrMetallicRoughness: { baseColorFactor: [0.6, 0.65, 0.71, 1], metallicFactor: 0, roughnessFactor: 0.7 } },
    ],
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [],
    accessors: [],
  };
  places.forEach((_, i) => {
    const at = i * each;
    bin.set(new Uint8Array(pos.buffer, pos.byteOffset, pos.byteLength), at);
    bin.set(new Uint8Array(idx.buffer, idx.byteOffset, idx.byteLength), at + pos.byteLength);
    json.bufferViews.push(
      { buffer: 0, byteOffset: at, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: at + pos.byteLength, byteLength: idx.byteLength, target: 34963 },
    );
    json.accessors.push(
      { bufferView: 2 * i, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max },
      { bufferView: 2 * i + 1, componentType: 5125, count: idx.length, type: 'SCALAR' },
    );
  });
  let text = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (text.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + text.length + jsonPad + 8 + bin.length + binPad;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, text.length + jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + text.length + jsonPad);
  const binAt = 20 + text.length + jsonPad;
  view.setUint32(binAt, bin.length + binPad, true);
  view.setUint32(binAt + 4, 0x004e4942, true); // "BIN"
  out.set(bin, binAt + 8);
  return out;
}

let url;
async function show(n) {
  const old = url;
  url = URL.createObjectURL(new Blob([glb(n)], { type: 'model/gltf-binary' }));
  const loaded = new Promise((resolve) => viewer.addEventListener('load', resolve, { once: true }));
  viewer.src = url;
  await loaded;
  await shown();
  if (old) URL.revokeObjectURL(old);
}

await show(15);
publish(performance.now(), async (n) => {
  const start = performance.now();
  await show(n);
  return performance.now() - start;
});
