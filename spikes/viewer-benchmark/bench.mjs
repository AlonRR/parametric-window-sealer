// Q49 spike: open each built page in Chromium, each load in a FRESH browser context (empty
// cache), and record what a visitor gets: bytes transferred (gzip, as a static host
// serves them), time from navigation to the first drawn frame, and time to redraw the
// wall after a change (15 pieces to 25 and back).
//
//   node bench.mjs [loads] [updates]   (default 5 cold loads, 5 update pairs per load)
//
// As in the engine benchmark: one discarded warm-up load per page first, the page order
// rotates between loads, and each figure is a median. Chromium here draws with SwiftShader,
// a software renderer: a real graphics card is faster, so the ratios are the result, not
// the absolute times.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const LOADS = Number(process.argv[2] ?? 5);
const UPDATES = Number(process.argv[3] ?? 5);
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const PAGES = { three: 'three/three.html', babylon: 'babylon/babylon.html', 'model-viewer': 'model-viewer/index.html' };
const SCENES = ['plain', 'pattern'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.bin': 'application/octet-stream' };
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const gz = new Map();
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  const path = join(OUT, rel);
  if (!path.startsWith(OUT)) return res.writeHead(403).end();
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

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function load(page, scene) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const tab = await context.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  const responses = [];
  tab.on('requestfinished', async (req) => {
    const sizes = await req.sizes();
    responses.push({ url: req.url(), bytes: sizes.responseBodySize });
  });
  await tab.goto(`${base}/${PAGES[page]}?scene=${scene}`);
  await tab.waitForFunction(() => window.bench?.firstFrameMs > 0, null, { timeout: 60_000 });
  const firstFrameMs = await tab.evaluate(() => window.bench.firstFrameMs);
  const up = [];
  const down = [];
  for (let i = 0; i < UPDATES; i++) {
    up.push(await tab.evaluate(() => window.bench.update(25)));
    down.push(await tab.evaluate(() => window.bench.update(15)));
  }
  await tab.waitForTimeout(200);
  const js = responses.filter((r) => r.url.endsWith('.js'));
  await context.close();
  if (errors.length) throw new Error(`${page}/${scene}: ${errors.join('; ')}`);
  return {
    firstFrameMs,
    update25Ms: median(up),
    update15Ms: median(down),
    jsFiles: js.length,
    jsBytes: js.reduce((s, r) => s + r.bytes, 0),
    totalBytes: responses.reduce((s, r) => s + r.bytes, 0),
  };
}

const names = Object.keys(PAGES);
const results = {};
for (const scene of SCENES) {
  for (const page of names) await load(page, scene); // warm-up, discarded
  const runs = Object.fromEntries(names.map((p) => [p, []]));
  for (let i = 0; i < LOADS; i++) {
    const order = names.map((_, k) => names[(k + i) % names.length]);
    for (const page of order) runs[page].push(await load(page, scene));
  }
  results[scene] = Object.fromEntries(
    names.map((p) => {
      const r = runs[p];
      const pick = (key) => median(r.map((x) => x[key]));
      return [p, {
        firstFrameMs: Math.round(pick('firstFrameMs')),
        update25Ms: Math.round(pick('update25Ms')),
        update15Ms: Math.round(pick('update15Ms')),
        jsFiles: pick('jsFiles'),
        jsKiB: Math.round(pick('jsBytes') / 102.4) / 10,
        totalKiB: Math.round(pick('totalBytes') / 102.4) / 10,
      }];
    }),
  );
}
await browser.close();
server.close();

const meta = {
  date: new Date().toISOString().slice(0, 10),
  chromium: browser.version(),
  loads: LOADS,
  updates: UPDATES,
  versions: { three: '0.186.1', babylon: '9.29.0', modelViewer: '4.3.1 (with three 0.183.2)' },
};
writeFileSync(new URL('./results/browser.json', import.meta.url), `${JSON.stringify({ meta, results }, null, 2)}\n`);
for (const scene of SCENES) {
  console.log(`\n${scene}:`);
  console.table(results[scene]);
}
