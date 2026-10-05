# Viewer benchmark (Q49)

The 3D preview (`preview-3d`, #9) needs a library to draw the wall. Asked to choose, the owner
asked back: **what works the fastest, and how big a download is it?** (Q49, 5 Oct 2026). This
spike draws the same wall with each candidate and measures both.

| | Library | Version | Licence |
|---|---|---|---|
| A | three.js | `three` 0.186.1 | MIT |
| B | Babylon.js | `@babylonjs/core` 9.29.0 | Apache-2.0 |
| C | model-viewer | `@google/model-viewer` 4.3.1, with `three` 0.183.2 | Apache-2.0 |

model-viewer is built on three.js: version 4.3.1 declares `three` `^0.183.0` as a peer
dependency, so it lives in its own folder, `model-viewer/`, with the three.js it supports.

## What each page does

The same thing, from the same files:

- Draws a wall of **15 pieces** (3 × 5, 10 mm apart) with orbit controls, as the preview will.
- Redraws it as **25 pieces** (5 × 5) and back, as when the user changes a size.
- Two scenes: **plain**, the 200 × 200 × 3 mm panel (12 triangles a piece), and **pattern**, the
  engine benchmark's honeycomb panel (6 928 triangles a piece, 103 920 for 15). Both are built
  by Manifold in `prepare.mjs` and loaded as the same binary file by every page.
- three.js and Babylon.js take the triangles directly. model-viewer only shows glTF, so its
  page writes the wall as a GLB first, on every change, as the real page would have to; that
  conversion is part of its time.

A screenshot of each page was checked before any timing counted: **the first Babylon.js page
drew nothing.** Babylon compiles shaders in the background and `scene.render()` skips any mesh
not ready yet, so it was timed drawing an empty canvas. Its page now waits for the scene to be
ready, as a real viewer must; after the fix it draws all 15 pieces.

## Method

`bench.mjs` serves each built page gzip-compressed, as a static host would, and opens it in
Chromium, each load in a fresh browser context (empty cache). As in the engine benchmark,
one warm-up load per page is discarded, the page order rotates between loads, and every
figure is the median of **5 cold loads**, each with **5 rounds** of 15 → 25 → 15 pieces.

- **Download**: bytes actually transferred, compressed. Babylon.js splits into many files
  loaded on demand, so the build's total would overstate it; the transferred bytes do not.
- **First frame**: from navigation start to the wall drawn and shown (two animation frames
  after drawing), including download, start-up and loading the mesh.
- **Redraw**: from the change to the new wall shown.

## Results

Measured 5 Oct 2026 on a cloud container (4 vCPU Intel Xeon at 2.80 GHz, 15 GB RAM), headless
Chromium 141.0.7390.37, drawing with SwiftShader, a **software renderer**. A graphics card
draws much faster, so the **ratios** are the result, not the absolute times (inferred).
Raw output: [`results/browser.json`](results/browser.json).

### Download (JavaScript, gzip-compressed)

| | Library | Files | KiB |
|---|---|---|---|
| A | three.js | 1 | **132.4** |
| B | Babylon.js | 16 | 280.6 |
| C | model-viewer | 1 | 282.2 |

For scale, the page today downloads about 15 KiB of its own script and 208 KiB for the
geometry engine (gzip). three.js adds about 60 % to that; the other two about 125 %.

### Speed (milliseconds, median)

| Scene | Library | First frame | Redraw 15 → 25 | Redraw 25 → 15 |
|---|---|---|---|---|
| plain | three.js | **114** | **32** | 32 |
| plain | Babylon.js | 294 | **32** | **31** |
| plain | model-viewer | 2 593 | 65 | 65 |
| pattern | three.js | **161** | 99 | **141** |
| pattern | Babylon.js | 343 | **97** | 146 |
| pattern | model-viewer | 2 855 | 319 | 234 |

### Reading

- **three.js is the smallest download** (about half of either other) **and shows the wall
  first**: 2.1 to 2.6× sooner than Babylon.js and 18 to 23× sooner than model-viewer.
- **Redraws are a tie** between three.js and Babylon.js (within a few ms); model-viewer is 2 to
  3× slower, from rewriting the wall as glTF on every change.
- model-viewer's first frame takes about 2.6 s here. It builds a lighting environment at
  start-up, which a software renderer makes slow (inferred, not measured separately).

## Caveats

- One machine, one browser, a software renderer: real devices will be faster across the board.
- The pages are minimal: lighting and materials differ a little between them, and none is
  tuned. A tuned page could change the redraw figures; it would not change the downloads.

## Running it

```bash
npm ci && (cd model-viewer && npm ci)
npm run prepare-meshes        # writes public/meshes/*.bin with Manifold
npm run build                 # one build per page, into out/<page>/
PW_CHROMIUM_PATH=<path to chromium> npm run bench   # or set it to Playwright's own Chromium
```
