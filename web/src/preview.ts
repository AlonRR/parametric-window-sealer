// The 3D preview on the page (backlog item preview-3d, #9), drawn with three.js (Q49).
//
// It redraws only when something changes (the parameters, a drag, a resize), never in a
// loop, so an idle page costs nothing. A browser without WebGL gets a message instead; the
// rest of the page does not depend on the preview.

import { AmbientLight, Box3, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { Group } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Engine } from 'parametric-window-sealer';
import type { Params } from 'parametric-window-sealer';
import { buildWallScene, countOf, disposeWall } from './preview-scene';

const BACKGROUND = 0xf4f4f4;

export interface Preview {
  show(params: Params | null): void;
}

function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function mountPreview(container: HTMLElement, getEngine: () => Promise<Engine>): Preview {
  const message = container.querySelector<HTMLElement>('[data-testid="preview-message"]');
  const say = (text: string) => {
    if (message) message.textContent = text;
  };

  if (!webglAvailable()) {
    container.dataset.state = 'unavailable';
    say('The 3D preview needs WebGL, which this browser has switched off. Everything else works.');
    return { show: () => {} };
  }

  // preserveDrawingBuffer keeps the last drawn image readable (for screenshots and the
  // browser test); drawing only on change makes its cost negligible (inferred).
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BACKGROUND);
  container.prepend(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(-0.4, 0.6, 1);
  scene.add(sun);
  const camera = new PerspectiveCamera(35, 1, 1, 100_000);
  const controls = new OrbitControls(camera, renderer.domElement);
  let wall: Group | null = null;

  // After each frame, how many geometries the graphics card holds: it must stay at two per
  // piece, strip, cross piece and edge strip however often the wall is redrawn, or editing would leak
  // memory (browser-tested).
  const draw = () => {
    renderer.render(scene, camera);
    container.dataset.geometries = String(renderer.info.memory.geometries);
  };
  controls.addEventListener('change', draw);

  const resize = () => {
    const width = container.clientWidth || 640;
    const height = Math.round(width * 0.6);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // Look at the wall from the front, a little from the left and below, far enough back to
  // see all of it.
  const frame = (group: Group) => {
    const box = new Box3().setFromObject(group);
    const centre = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const fit = Math.max(size.x / camera.aspect, size.y) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(centre.x - 0.25 * fit, centre.y - 0.35 * fit, centre.z + 1.15 * fit);
    controls.target.copy(centre);
    controls.update();
  };

  let pending: Params | null | undefined;
  let busy = false;
  let framedFor = '';

  const apply = async (params: Params | null) => {
    if (wall) {
      disposeWall(wall);
      scene.remove(wall);
      wall = null;
    }
    if (!params) {
      container.dataset.pieces = '0';
      container.dataset.strips = '0';
      container.dataset.crosses = '0';
      container.dataset.edges = '0';
      container.dataset.tapes = '0';
      container.dataset.tpu = '0';
      container.dataset.state = 'waiting';
      say('Fix the marked fields to see the preview.');
      draw();
      return;
    }
    wall = buildWallScene(await getEngine(), params);
    scene.add(wall);
    // Keep the user's view while they edit; frame again only when the opening or the window type
    // changes, a tilted sash's wedge standing out from where a wall lies.
    const key = `${params.edges.window} ${params.openingWidthMm}x${params.openingHeightMm}`;
    if (key !== framedFor) {
      frame(wall);
      framedFor = key;
    }
    container.dataset.pieces = String(countOf(wall, 'piece'));
    container.dataset.strips = String(countOf(wall, 'strip'));
    container.dataset.crosses = String(countOf(wall, 'cross'));
    container.dataset.edges = String(countOf(wall, 'edge'));
    container.dataset.tapes = String(countOf(wall, 'tape'));
    container.dataset.tpu = String(countOf(wall, 'tpu'));
    container.dataset.state = 'ready';
    say('Drag to turn the wall; scroll or pinch to zoom.');
    draw();
  };

  // Typing fires many changes; build only the latest, one at a time.
  const pump = async () => {
    if (busy) return;
    busy = true;
    try {
      while (pending !== undefined) {
        const next = pending;
        pending = undefined;
        await apply(next); // oxlint-disable-line eslint/no-await-in-loop -- only the latest, one at a time
      }
    } catch (error) {
      container.dataset.state = 'error';
      say(`The preview could not be drawn: ${String(error)}`);
    } finally {
      busy = false;
    }
  };

  container.dataset.state = 'loading';
  say('Preparing the preview...');
  return {
    show(params) {
      pending = params;
      void pump();
    },
  };
}
