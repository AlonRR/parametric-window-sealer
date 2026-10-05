// Q49 spike, shared by every page: the test meshes and where each piece goes. Each page
// draws n copies of one mesh as a wall, 3 x 5 for 15 pieces and 5 x 5 for 25, 10 mm apart.
export const params = new URLSearchParams(location.search);
const KINDS = ['plain', 'pattern', 'dense', 'heavy'];
export const kind = KINDS.includes(params.get('scene')) ? params.get('scene') : 'plain';

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

// Turning the wall, as when the user drags it: each animation frame moves the camera a
// step round the wall and draws it. Returns frames drawn per second over `ms`; a heavier
// scene that takes longer to draw gets fewer.
export function orbitWith(step) {
  return (ms) =>
    new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = (now) => {
        if (now - start >= ms) return resolve((frames * 1000) / (now - start));
        step(frames);
        frames += 1;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
}

export function publish(firstFrameMs, update, orbit) {
  window.bench = { firstFrameMs, update, orbit };
}
