// Q22 spike, Node half: build the same panel with Manifold and with OpenSCAD, PROVE the
// two results are the same solid, then time them.
//
//   node bench-node.mjs [runs]        (default 7 runs per engine)
//
// Order matters: no timing is reported unless the equality check passed, and the
// equality check is only trusted because a deliberately different panel fails it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import ManifoldModule from 'manifold-3d';
import createOpenSCAD from '@lofcz/openscad-wasm';
import { PANEL, buildWithManifold, holeCentres, scadDefines } from './panel.mjs';
import { meshToStl } from './stl.mjs';

const RUNS = Number(process.argv[2] ?? 7);
const require = createRequire(import.meta.url);
const here = new URL('.', import.meta.url);
const ms = (t0) => performance.now() - t0;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// --- binary STL back into a solid ---------------------------------------------------

function stlToManifold(wasm, bytes) {
  const b = Buffer.from(bytes);
  const n = b.readUInt32LE(80);
  if (b.length !== 84 + 50 * n) throw new Error(`not a binary STL: ${b.length} bytes for ${n} triangles`);
  const vertProperties = new Float32Array(9 * n);
  for (let t = 0; t < n; t++) {
    for (let i = 0; i < 9; i++) vertProperties[9 * t + i] = b.readFloatLE(84 + 50 * t + 12 + 4 * i);
  }
  const triVerts = Uint32Array.from({ length: 3 * n }, (_, i) => i);
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties, triVerts });
  mesh.merge(); // STL keeps no shared vertices; reconnect them so the solid is closed
  const m = new wasm.Manifold(mesh);
  if (m.status() !== 'NoError') throw new Error(`STL did not rebuild as a solid: ${m.status()}`);
  return m;
}

// --- engines ------------------------------------------------------------------------

async function initManifold() {
  const t0 = performance.now();
  const wasm = await ManifoldModule();
  wasm.setup();
  return { wasm, initMs: ms(t0) };
}

// One OpenSCAD instance renders ONCE: after callMain returns, the program has exited and a
// second call aborts ("program has already aborted!", measured 5 Oct 2026). So every render
// needs a fresh instance. To be fair to OpenSCAD the binary is compiled once and each render
// only instantiates the compiled module, the cheapest per-render path available.
async function initOpenSCAD(log) {
  const t0 = performance.now();
  // The package README resolves '@lofcz/openscad-wasm/openscad.wasm', but its "exports"
  // map does not list that path (ERR_PACKAGE_PATH_NOT_EXPORTED, 5 Oct 2026). package.json
  // IS exported, and the binary sits beside it.
  const pkg = require.resolve('@lofcz/openscad-wasm/package.json');
  const compiled = await WebAssembly.compile(readFileSync(new URL('openscad.wasm', `file://${pkg}`)));
  const source = readFileSync(new URL('panel.scad', here), 'utf8');
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
  await newInstance(); // the first instance is part of start-up cost, as on a page
  return { newInstance, initMs: ms(t0) };
}

function renderManifold(wasm, p) {
  const t0 = performance.now();
  const panel = buildWithManifold(wasm, p);
  const stl = meshToStl(panel.getMesh()); // getMesh() forces the deferred booleans to run
  const t = ms(t0);
  panel.delete();
  return { ms: t, stl };
}

async function renderOpenSCAD(O, p, log) {
  log.length = 0;
  const t0 = performance.now();
  const inst = await O.newInstance();
  const instMs = ms(t0);
  const t1 = performance.now();
  const rc = inst.callMain([
    ...scadDefines(p),
    '/panel.scad',
    '--backend', 'Manifold',
    '--export-format', 'binstl',
    '-o', '/out.stl',
  ]);
  const runMs = ms(t1);
  if (rc !== 0) throw new Error(`openscad exited ${rc}:\n${log.join('\n')}`);
  const holes = Number((log.join('\n').match(/HOLES=(\d+)/) || [])[1]);
  return { ms: ms(t0), instMs, runMs, stl: inst.FS.readFile('/out.stl'), holes };
}

// --- geometry comparison --------------------------------------------------------------

function compare(wasm, aStl, bStl) {
  const a = stlToManifold(wasm, aStl);
  const b = stlToManifold(wasm, bStl);
  const aNotB = a.subtract(b);
  const bNotA = b.subtract(a);
  const res = {
    volumeA: a.volume(),
    volumeB: b.volume(),
    trianglesA: a.numTri(),
    trianglesB: b.numTri(),
    genusA: a.genus(),
    genusB: b.genus(),
    differenceVolume: aNotB.volume() + bNotA.volume(), // mm^3 in one and not the other
  };
  for (const m of [a, b, aNotB, bNotA]) m.delete();
  return res;
}

// --- main -------------------------------------------------------------------------------

const log = [];
const M = await initManifold();
const O = await initOpenSCAD(log);
const expectedHoles = holeCentres(PANEL).length;

// 1. Same solid? Built once by each engine, compared by the volume of their difference.
const m1 = renderManifold(M.wasm, PANEL);
const o1 = await renderOpenSCAD(O, PANEL, log);
const same = compare(M.wasm, m1.stl, o1.stl);
const TOL = 1e-3; // mm^3: float32 STL rounding, far below one hole's volume
const sameOk = o1.holes === expectedHoles && same.differenceVolume < TOL;

// 2. Negative control: a panel with thicker walls must FAIL the same check, or the check
//    cannot tell two panels apart and step 1 proved nothing.
const other = { ...PANEL, wall: 2.5 };
const ctl = compare(M.wasm, renderManifold(M.wasm, other).stl, o1.stl);
const ctlOk = ctl.differenceVolume > 1;

console.log(`holes: manifold ${expectedHoles}, openscad ${o1.holes}`);
console.log('same panel:', JSON.stringify(same));
console.log('control (wall 2.5 vs 2):', JSON.stringify(ctl));
if (!sameOk || !ctlOk) {
  console.error(`EQUALITY CHECK FAILED (same=${sameOk}, control discriminates=${ctlOk}); no timings reported`);
  process.exit(1);
}

// 3. Timing. Run 1 is reported apart from the median of the rest (warm).
const times = { manifold: [], openscad: [], openscadInstantiate: [], openscadRun: [] };
for (let i = 0; i < RUNS; i++) {
  times.manifold.push(renderManifold(M.wasm, PANEL).ms);
  const o = await renderOpenSCAD(O, PANEL, log);
  times.openscad.push(o.ms);
  times.openscadInstantiate.push(o.instMs);
  times.openscadRun.push(o.runMs);
}
const summary = (xs) => ({ first: xs[0], medianWarm: median(xs.slice(1)), min: Math.min(...xs), max: Math.max(...xs) });
const result = {
  when: new Date().toISOString(),
  runtime: `node ${process.version}`,
  panel: PANEL,
  holes: expectedHoles,
  engines: {
    manifold: { package: 'manifold-3d@3.5.4', initMs: M.initMs, renderMs: summary(times.manifold) },
    openscad: {
      package: '@lofcz/openscad-wasm@0.0.2 (--backend Manifold)',
      initMs: O.initMs,
      renderMs: summary(times.openscad),
      renderParts: { instantiateMs: summary(times.openscadInstantiate), runMs: summary(times.openscadRun) },
    },
  },
  equality: { ...same, toleranceMm3: TOL, controlDifferenceVolume: ctl.differenceVolume },
  runs: RUNS,
};
const outDir = new URL('results/', here);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('node.json', outDir), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.engines, null, 2));
