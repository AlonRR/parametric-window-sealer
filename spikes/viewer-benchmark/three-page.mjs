// Q49 spike: the wall drawn by three.js, with orbit controls as the real preview needs.
import {
  AmbientLight, BufferAttribute, BufferGeometry, Color, DirectionalLight, Mesh,
  MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layout, loadMesh, publish, shown } from './scene.mjs';

const canvas = document.getElementById('c');
const renderer = new WebGLRenderer({ canvas, antialias: true });
const scene = new Scene();
scene.background = new Color(0xf4f4f4);
scene.add(new AmbientLight(0xffffff, 0.6));
const sun = new DirectionalLight(0xffffff, 1.2);
sun.position.set(300, -400, 800);
scene.add(sun);
const camera = new PerspectiveCamera(40, canvas.width / canvas.height, 1, 10000);
const controls = new OrbitControls(camera, canvas);
const material = new MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.7 });
const mesh = await loadMesh();
let shownMeshes = [];

function build(n) {
  for (const m of shownMeshes) { scene.remove(m); m.geometry.dispose(); }
  shownMeshes = layout(n).map(([x, y]) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(mesh.positions, 3));
    g.setIndex(new BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    const m = new Mesh(g, material);
    m.position.set(x, y, 0);
    scene.add(m);
    return m;
  });
  const columns = n === 15 ? 3 : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / columns);
  controls.target.set((columns * 210) / 2, (rows * 210) / 2, 0);
  camera.position.set((columns * 210) / 2, (rows * 210) / 2 - 900, 1400);
  controls.update();
  renderer.render(scene, camera);
}

build(15);
await shown();
publish(performance.now(), async (n) => {
  const start = performance.now();
  build(n);
  await shown();
  return performance.now() - start;
});
