// Q49 spike, shared by every page: the test meshes and where each piece goes. Each page
// draws n copies of one mesh as a wall, 3 x 5 for 15 pieces and 5 x 5 for 25, 10 mm apart.
export const params = new URLSearchParams(location.search);
export const kind = params.get('scene') === 'pattern' ? 'pattern' : 'plain';

export async function loadMesh() {
  const bytes = await (await fetch(new URL(`./meshes/${kind}.bin`, document.baseURI))).arrayBuffer();
  const view = new DataView(bytes);
  const verts = view.getUint32(0, true);
  const tris = view.getUint32(4, true);
  return {
    positions: new Float32Array(bytes, 8, verts * 3),
    indices: new Uint32Array(bytes, 8 + verts * 12, tris * 3),
  };
}

export function layout(n) {
  const columns = n === 15 ? 3 : Math.ceil(Math.sqrt(n));
  return Array.from({ length: n }, (_, i) => [(i % columns) * 210, Math.floor(i / columns) * 210]);
}

// A frame counts as shown once the browser has painted twice after the change.
export const shown = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

export function publish(firstFrameMs, update) {
  window.bench = { firstFrameMs, update };
}
