# Engine benchmark (Q22)

The owner asked which engine is friendlier for a basic user, and chose to prototype both and
decide from the numbers (Q22, 5 Oct 2026). This spike builds one test panel with each
candidate, proves the two results are the same solid, then times what a visitor waits for.

## The test panel

A 200 × 200 × 3 mm plate with a 10 mm solid border and a honeycomb of hexagonal
through-holes, 10 mm across the flats with 2 mm walls: 247 holes. **These are example sizes**
(Q18), chosen as one typical printed piece with a demanding pattern. The numbers live in
`panel.mjs`; `panel.scad` receives them as `-D` arguments, so both engines get the same
inputs, while each runs its own layout loop.

| | Engine | Version |
|---|---|---|
| A | Manifold, called from JavaScript | `manifold-3d` 3.5.4 |
| B | OpenSCAD compiled to WebAssembly, with its Manifold backend | `@lofcz/openscad-wasm` 0.0.2 (OpenSCAD 2026.09.03) |

## The same solid, or the timings mean nothing

Checked before any timing is reported, in `bench-node.mjs`:

- **Hole count**: 247 from each engine.
- **Shape**: OpenSCAD's STL is rebuilt as a solid, and the volume inside one panel but not the
  other is measured both ways: **0 mm³**. Volumes 55 827.5 mm³ each, 6 928 triangles each,
  genus 247 each.
- **The check can fail**: the same comparison against a panel with 2.5 mm walls reports a
  43 686 mm³ difference. A check that cannot tell two panels apart would have proved nothing.

The browser runs re-check 247 holes and 6 928 triangles on every page load.

## Results

Measured 5 Oct 2026 on a cloud container (4 vCPU Intel Xeon at 2.80 GHz, 15 GB RAM), Node
22.22.0 and headless Chromium 141.0.7390.37. Absolute times depend on the machine; the
**ratios** are the result. Raw output: [`results/`](results/).

### In the browser (what a visitor waits for)

Files served gzip-compressed, as a static host serves them; each load in a fresh browser
profile with an empty cache; one discarded warm-up load first; engine order alternating;
median of 3 cold loads, 7 renders per load.

| Network | Engine | Ready to render | First render | Later renders | Downloaded |
|---|---|---|---|---|---|
| local, unthrottled | Manifold | **95 ms** | 214 ms | **136 ms** | **0.23 MB** |
| local, unthrottled | OpenSCAD | 640 ms (346–1 282) | 476 ms | 281 ms | 3.35 MB |
| example: 20 Mbit/s, 40 ms | Manifold | **366 ms** | 221 ms | **127 ms** | **0.23 MB** |
| example: 20 Mbit/s, 40 ms | OpenSCAD | 2 021 ms | 537 ms | 285 ms | 3.35 MB |

"Ready to render" counts from navigation start: the page, the scripts, and the engine's
download and compile. The 20 Mbit/s condition is an **example** connection chosen for
illustration, not a measurement of a real network.

### In Node (engine alone)

Two runs, 7 and 15 renders; `results/node.json` holds the 15-render run.

| Engine | Start-up | Render, warm median |
|---|---|---|
| Manifold | 27 ms, 27 ms | 140 ms, 103 ms |
| OpenSCAD | 167 ms, 197 ms | 365 ms, 305 ms (of which about 30 ms is a new instance) |

### The engine files

| File | Raw | gzip -9 |
|---|---|---|
| `manifold.wasm` + `manifold.js` | 541 kB + 82 kB | 204 kB + 19 kB |
| `openscad.wasm` + `openscad.wasm.js` | 11 101 kB + 102 kB | 3 308 kB + 24 kB |

## What it shows

For this panel, Manifold is ready about **5–7× sooner**, renders about **2× faster**, and
downloads about **15× less**. The basic user sees no other difference: the buttons, uploads,
preview and downloads are the same page either way.

## What it does not show

- **One panel, one pattern.** Organiser grids, connector edges, appliance cut-outs and
  imported meshes are not measured. A cut-through honeycomb was chosen as a demanding case.
- **One OpenSCAD build.** The OpenSCAD Playground ships its own build (OpenSCAD 2025.03.25
  in `openscad-playground` 2.4.0); it was not timed separately.
- **An OpenSCAD instance renders once.** After a render the program has exited, and a second
  call aborts. A page must create a new instance per render; here the binary is compiled once
  and only instantiated per render, the cheapest legitimate path. That cost is included.
- **Offline single file (Q24).** Inlining the engine in one HTML file adds about a third to
  its size (base64) (inferred, not built): roughly 0.7 MB for Manifold against 15 MB for
  OpenSCAD.
- **One machine.** Phones and older laptops are slower in absolute terms; the ratios are
  expected to hold (inferred).

## Running it

```bash
npm ci
node bench-node.mjs 15          # equality check, then Node timings -> results/node.json
node bench-browser.mjs 7 3      # Chromium timings -> results/browser.json
```

`bench-browser.mjs` uses `playwright-core` and expects an installed Chromium (in a Claude
Code cloud session, `PLAYWRIGHT_BROWSERS_PATH` points at one).
