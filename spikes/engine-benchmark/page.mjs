// Q22 spike, browser half: one engine per page load (?engine=manifold|openscad&runs=N).
// readyAtMs is measured from navigation start, so it holds everything a visitor waits for
// before the first render: the page, the scripts, and the engine's download and compile.
import { PANEL, buildWithManifold, holeCentres, scadDefines } from './panel.mjs';
import { meshToStl, stlTriangleCount } from './stl.mjs';

const q = new URLSearchParams(location.search);
const engine = q.get('engine');
const RUNS = Number(q.get('runs') ?? 7);

async function benchManifold() {
  const { default: Module } = await import('manifold-3d');
  const wasm = await Module();
  wasm.setup();
  const readyAtMs = performance.now();
  const renderMs = [];
  let triangles = 0;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const panel = buildWithManifold(wasm, PANEL);
    const stl = meshToStl(panel.getMesh());
    renderMs.push(performance.now() - t0);
    triangles = stlTriangleCount(stl);
    panel.delete();
  }
  return { readyAtMs, renderMs, triangles, holes: holeCentres(PANEL).length };
}

// As in bench-node.mjs: an OpenSCAD instance renders once, so the binary is compiled once
// and every render instantiates the compiled module.
async function benchOpenSCAD() {
  const { default: createOpenSCAD } = await import('@lofcz/openscad-wasm');
  const compiled = await WebAssembly.compileStreaming(fetch('./node_modules/@lofcz/openscad-wasm/openscad.wasm'));
  const source = await (await fetch('./panel.scad')).text();
  const log = [];
  const newInstance = async () => {
    const inst = await createOpenSCAD({
      noInitialRun: true,
      print: (s) => log.push(s),
      printErr: (s) => log.push(s),
      instantiateWasm(imports, done) {
        WebAssembly.instantiate(compiled, imports).then((instance) => done(instance));
        return {};
      },
    });
    inst.FS.writeFile('/panel.scad', source);
    return inst;
  };
  await newInstance();
  const readyAtMs = performance.now();
  const renderMs = [];
  let triangles = 0;
  let holes = 0;
  for (let i = 0; i < RUNS; i++) {
    log.length = 0;
    const t0 = performance.now();
    const inst = await newInstance();
    const rc = inst.callMain([
      ...scadDefines(PANEL),
      '/panel.scad',
      '--backend', 'Manifold',
      '--export-format', 'binstl',
      '-o', '/out.stl',
    ]);
    if (rc !== 0) throw new Error(`openscad exited ${rc}: ${log.join('\n')}`);
    const stl = inst.FS.readFile('/out.stl');
    renderMs.push(performance.now() - t0);
    triangles = stlTriangleCount(stl);
    holes = Number((log.join('\n').match(/HOLES=(\d+)/) || [])[1]);
  }
  return { readyAtMs, renderMs, triangles, holes };
}

const run = engine === 'manifold' ? benchManifold : engine === 'openscad' ? benchOpenSCAD : null;
(run ? run() : Promise.reject(new Error(`unknown engine '${engine}'`))).then(
  (r) => { window.__bench = { engine, ...r }; },
  (e) => { window.__bench = { engine, error: String((e && e.stack) || e) }; },
);
