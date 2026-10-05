// Q22 spike, browser half: open page.html in Chromium once per engine and per network
// condition, each in a FRESH browser context (empty cache), and record what a visitor
// waits for: time until the engine is ready, render times, and bytes transferred.
//
//   node bench-browser.mjs [runs] [loads]  (default 7 renders per load, 3 cold loads)
//
// The first run of this file always measured whichever engine went first slower, because
// it paid the browser's own warm-up (Manifold: 569 ms unthrottled, 359 ms throttled, 5 Oct
// 2026). So one discarded warm-up load comes first, the engine order alternates between
// loads, and each figure is the median of several cold loads.
//
// Files are served gzip-compressed, as a static host would serve them. The throttled
// condition is an EXAMPLE connection (20 Mbit/s down, 40 ms latency), chosen for
// illustration; it is not a measurement of any real network.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const RUNS = Number(process.argv[2] ?? 7);
const LOADS = Number(process.argv[3] ?? 3);
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.scad': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};
const CONDITIONS = [
  { name: 'local, unthrottled', throttle: null },
  { name: 'example: 20 Mbit/s, 40 ms', throttle: { latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 } },
];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// --- a static server that gzips, confined to this directory -------------------------------
const gz = new Map();
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  const path = join(ROOT, rel || 'page.html');
  if (!path.startsWith(ROOT)) return res.writeHead(403).end();
  let body;
  try {
    body = readFileSync(path);
  } catch {
    return res.writeHead(404).end();
  }
  const headers = { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' };
  if (/\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    if (!gz.has(path)) gz.set(path, gzipSync(body, { level: 9 }));
    body = gz.get(path);
    headers['content-encoding'] = 'gzip';
  }
  res.writeHead(200, headers).end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// --- cold page loads, engine order alternating ------------------------------------------
const browser = await chromium.launch();

async function coldLoad(engine, throttle) {
  const context = await browser.newContext();
  const page = await context.newPage();
  if (throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...throttle });
  }
  const transfers = [];
  page.on('requestfinished', async (req) => {
    const s = await req.sizes().catch(() => null);
    if (s) transfers.push({ url: req.url().replace(base, ''), bytes: s.responseBodySize });
  });
  await page.goto(`${base}/page.html?engine=${engine}&runs=${RUNS}`);
  await page.waitForFunction(() => window.__bench, null, { timeout: 180000 });
  const r = await page.evaluate(() => window.__bench);
  await page.waitForTimeout(200); // let the last requestfinished events land
  await context.close();
  if (r.error) throw new Error(`${engine}: ${r.error}`);
  return { ...r, transfers };
}

await coldLoad('manifold', null); // warm-up, discarded
const results = [];
for (const cond of CONDITIONS) {
  const loads = { manifold: [], openscad: [] };
  for (let i = 0; i < LOADS; i++) {
    const order = i % 2 ? ['openscad', 'manifold'] : ['manifold', 'openscad'];
    for (const engine of order) loads[engine].push(await coldLoad(engine, cond.throttle));
  }
  for (const engine of ['manifold', 'openscad']) {
    const ls = loads[engine];
    const t = ls[0].transfers;
    results.push({
      condition: cond.name,
      engine,
      readyAtMs: { median: median(ls.map((l) => l.readyAtMs)), all: ls.map((l) => l.readyAtMs) },
      renderMs: {
        firstMedian: median(ls.map((l) => l.renderMs[0])),
        warmMedian: median(ls.flatMap((l) => l.renderMs.slice(1))),
      },
      triangles: [...new Set(ls.map((l) => l.triangles))],
      holes: [...new Set(ls.map((l) => l.holes))],
      transferredBytes: t.reduce((a, x) => a + x.bytes, 0),
      requests: t.length,
      largest: [...t].sort((a, b) => b.bytes - a.bytes).slice(0, 3),
    });
  }
}
await browser.close();
server.close();

// The same solid in the browser too: both engines must report the counts the Node equality
// check established (247 holes, 6928 triangles), or the timings compare different work.
const bad = results.filter((r) => r.holes.join() !== '247' || r.triangles.join() !== '6928');
if (bad.length) {
  console.error('GEOMETRY MISMATCH in the browser; no timings reported:', JSON.stringify(bad, null, 2));
  process.exit(1);
}

const out = { when: new Date().toISOString(), browser: `chromium ${browser.version()}`, runsPerLoad: RUNS, loads: LOADS, results };
mkdirSync(new URL('results/', import.meta.url), { recursive: true });
writeFileSync(new URL('results/browser.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
for (const r of results) {
  console.log(
    `${r.condition.padEnd(28)} ${r.engine.padEnd(9)} ready ${r.readyAtMs.median.toFixed(0).padStart(6)} ms` +
      ` (${r.readyAtMs.all.map((x) => x.toFixed(0)).join(', ')})` +
      `  render first ${r.renderMs.firstMedian.toFixed(0).padStart(5)} ms, warm ${r.renderMs.warmMedian.toFixed(0).padStart(5)} ms` +
      `  transferred ${(r.transferredBytes / 1e6).toFixed(2)} MB`,
  );
}
