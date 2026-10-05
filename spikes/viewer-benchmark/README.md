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
- Turns it for 2 s, as when the user drags it (added for the complexity question).
- Four walls: **plain**, the 200 × 200 × 3 mm panel (12 triangles a piece); **pattern**, the
  engine benchmark's honeycomb panel (6 928 a piece); and the finer **dense** (28 100) and
  **heavy** (63 572) honeycombs. All are built by Manifold in `prepare.mjs` and loaded as the
  same binary file by every page. These are example sizes (Q18).
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
| A | three.js | 1 | **132.5** |
| B | Babylon.js | 16 | 280.7 |
| C | model-viewer | 1 | 282.4 |

For scale, the page today downloads about 15 KiB of its own script and 208 KiB for the
geometry engine (gzip). three.js adds about 60 % to that; the other two about 125 %.

### Speed as the wall grows more complex (median)

The owner then asked how the libraries cope as the model grows more complex (Q49). The same
wall was drawn with four pieces of rising detail: the plain panel, the honeycomb above, and two
finer honeycombs, **dense** (5 mm holes, 1 mm walls, 28 100 triangles a piece) and **heavy**
(3 mm holes, 1 mm walls, 63 572 a piece). Besides the first frame and the redraw, each page
now also **turns the wall for 2 s**, drawing every frame, as when the user drags it; the
result is frames drawn per second (the display caps it at about 60).

To compare like with like, three.js draws with Phong shading here, as Babylon.js's
StandardMaterial does. The first version of the three.js page used its heavier, physically
based material, which on a software renderer alone could decide the frame rate; model-viewer
has no choice, glTF's materials are physically based.

| Wall | Triangles (15 pieces) | Library | First frame, ms | Redraw 15 → 25, ms | Turning, frames/s |
|---|---|---|---|---|---|
| plain | 180 | three.js | 120 | 31 | 59.6 |
| plain | 180 | Babylon.js | 304 | 32 | 59.6 |
| plain | 180 | model-viewer | 3 045 | 65 | 30.8 |
| pattern | 103 920 | three.js | 169 | 91 | 12.6 |
| pattern | 103 920 | Babylon.js | 354 | 98 | 11.4 |
| pattern | 103 920 | model-viewer | 2 910 | 337 | 6.6 |
| dense | 421 500 | three.js | 234 | 298 | 3.9 |
| dense | 421 500 | Babylon.js | 407 | 300 | 3.5 |
| dense | 421 500 | model-viewer | 3 393 | 916 | 3 |
| heavy | 953 580 | three.js | 312 | 629 | 1.8 |
| heavy | 953 580 | Babylon.js | 465 | 663 | 1.7 |
| heavy | 953 580 | model-viewer | 3 386 | 1 830 | 0.8 |

### Reading

- **More detail does not change the order.** Every library slows down roughly in step with the
  number of triangles, and three.js and Babylon.js stay **within about 10 % of each other** at
  every level, three.js marginally ahead on turning and redraws, well ahead on the first
  frame. model-viewer turns the wall at 44 to 77 % of three.js's rate and redraws 2 to 4×
  slower.
- **three.js is the smallest download** (132.5 KiB, about half of either other) **and shows the
  wall first** at every level: 1.5 to 2.5× sooner than Babylon.js, about 10 to 25× sooner than
  model-viewer.
- **What makes the preview slow is the number of triangles, not the library.** At about a
  million triangles every library turns the wall at under 2 frames a second on this software
  renderer; a graphics card is far faster (inferred), but a fine pattern on a large wall will
  still be the heavy case. That is a design choice for the preview item (#9), for example
  drawing patterns in full only for the piece in focus; it is not something any of the three
  libraries removes.
- model-viewer's first frame takes about 3 s here. It builds a lighting environment at start-up,
  which a software renderer makes slow (inferred, not measured separately).

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
