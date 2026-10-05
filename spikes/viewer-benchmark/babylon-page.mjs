// Q49 spike: the wall drawn by Babylon.js, imported module by module so the build keeps
// only what is used, with orbit controls as the real preview needs.
//
// Babylon compiles shaders in the background and scene.render() silently skips any mesh
// that is not ready yet, so a single render right after building draws an empty canvas.
// The first version of this page did exactly that, and was timed drawing nothing (seen in
// a screenshot, 5 Oct 2026). Each build therefore waits for the scene to be ready.
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Scene } from '@babylonjs/core/scene.js';
import { layout, loadMesh, orbitWith, publish, shown } from './scene.mjs';

const canvas = document.getElementById('c');
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.957, 0.957, 0.957, 1);
new HemisphericLight('sky', new Vector3(0, 0, 1), scene).intensity = 0.6;
new DirectionalLight('sun', new Vector3(-0.3, 0.4, -0.8), scene).intensity = 1.2;
const camera = new ArcRotateCamera('cam', -Math.PI / 2, 1, 1700, Vector3.Zero(), scene);
camera.upVector = new Vector3(0, 0, 1);
camera.attachControl(canvas, true);
const material = new StandardMaterial('panel', scene);
material.diffuseColor = new Color3(0.6, 0.65, 0.71);
const mesh = await loadMesh();
let shownMeshes = [];

async function build(n) {
  for (const m of shownMeshes) m.dispose();
  shownMeshes = layout(n).map(([x, y], i) => {
    const data = new VertexData();
    data.positions = mesh.positions;
    data.indices = mesh.indices;
    const normals = [];
    VertexData.ComputeNormals(mesh.positions, mesh.indices, normals);
    data.normals = normals;
    const m = new Mesh(`piece-${i}`, scene);
    data.applyToMesh(m);
    m.position.set(x, y, 0);
    m.material = material;
    return m;
  });
  const columns = n === 15 ? 3 : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / columns);
  camera.target = new Vector3((columns * 210) / 2, (rows * 210) / 2, 0);
  await scene.whenReadyAsync();
  scene.render();
}

await build(15);
await shown();
publish(
  performance.now(),
  async (n) => {
    const start = performance.now();
    await build(n);
    await shown();
    return performance.now() - start;
  },
  orbitWith(() => {
    camera.alpha += 0.02;
    scene.render();
  }),
);
