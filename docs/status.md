# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 5 Oct 2026. Phase: **requirements**. No model has been written yet, and the CAD
engine is deliberately undecided until the design questions below are settled.

## The brief (the owner's request, 5 Oct 2026)

- Close off the open area of a window that cannot be shut because something is in the way:
  a window air conditioner, an exhaust fan, or similar.
- The fill is selectable: **sealed** or **open**; organiser types such as **honeycomb** or
  **Skådis**-style pegboard, or other organiser systems; decorative types such as **brick**,
  **diamond**, **grid**, or others.
- Parameters include the **dimensions of the open area** and the **maximum size of each piece**.
- Two ways to divide the area: **all pieces the same size**, or **as many maximum-size pieces as
  fit plus one filler piece**.
- To be workshopped together: **how pieces attach to each other**, **how the panel attaches to
  the fan or window AC**, and **how that attachment can be adjustable**.

## Decisions

| ID | Decision | Date |
|---|---|---|
| (none) | Fabrication: **FDM 3D printing** | 5 Oct 2026 |
| (none) | Windows: **horizontal sliders** and **single/double-hung** first; other types maybe later, so the design must not rule them out | 5 Oct 2026 |
| (none) | Users run it from a **web page on GitHub Pages** | 5 Oct 2026 |
| (none) | CAD engine: **decided later**, once the design is workshopped (now asked as Q22) | 5 Oct 2026 |
| Q1 | Licence: **CERN-OHL-S-2.0** for the design and docs, **MPL-2.0** for code | 5 Oct 2026 |
| Q2 | Branch: commit to **`main`** | 5 Oct 2026 |
| Q3 | Build the Pages site now; **the owner publishes it later** (the repo is private, and making it public is his action) | 5 Oct 2026 |
| Q4 | `.repo-status`: **`publish: not-yet`** | 5 Oct 2026 |
| Q5 | Printed on **users' own printers**: the maximum piece size is a parameter, not tied to one printer. It is set from a **printer-presets list**, with a **safe default** (one size most mainstream beds fit) selected until the user picks a printer; "custom" stays available. Every preset's bed size is to be verified from the maker's own specification | 5 Oct 2026 |
| Q6 | **Material-agnostic**: the parts must print well in PLA, PETG and ASA/ABS ("it shouldn't really matter if it's well designed for printing"). Sealing is an option: **printed TPU**, **tape** (its size a parameter), or **none**, because some users do not need a perfect seal | 5 Oct 2026 |
| Q7 | Patterns are **cut through or relief, chosen per piece** | 5 Oct 2026 |
| Q8 | **"Open" means a cut-through pattern**, not a separate fill type. So the fills are: sealed (solid), a pattern (through or relief), or an organiser | 5 Oct 2026 |
| Q9 | Organiser systems: **Honeycomb Storage Wall**, **Skådis**, **Multiboard**, **openGrid**, built so **more can be added later**. "Honeycomb" in the brief is the organiser system | 5 Oct 2026 |
| Q10 | The fill is set **once for the whole wall by default**, with an **advanced tab for per-piece overrides** | 5 Oct 2026 |
| Q11 | The opening is divided as a **grid** (rows and columns as needed), and the division mode ("all equal" or "full-size pieces plus one filler") is **chosen separately for width and height** | 5 Oct 2026 |
| Q12 | The filler's **position is the user's choice** (start, end or middle), **or it is split in two for symmetry**. When the leftover is too small to print or hold, the page **warns and the user decides** | 5 Oct 2026 |
| Q13 | Pieces join with **separate connector strips** by default (a tongue on each edge, an H-profile strip between pieces, a cross piece where four meet; removable, sealable in TPU, a few mm of slide per joint). **Puzzle dovetails, sliding dovetail rails and bolted flanges** are advanced options | 5 Oct 2026 |
| Q14 | The wall is held **in the window track, clamped by the closed sash** (no screws). Track dimensions become parameters | 5 Oct 2026 |
| Q15 | Appliances: **window AC**, **portable AC exhaust hose**, **exhaust fan**, and **no appliance** (a plain wall); more can be added later | 5 Oct 2026 |
| Q16 | Fitting to the appliance, all as options: a **sliding insert** that closes in around it, a **measured cutout with a gasket**, **adjustable clamps** with slotted holes, and **standard ports** (round hose ports, fan mounts) chosen from a list | 5 Oct 2026 |
| Q17 | Optional seals (TPU, tape or none, per Q6) can go **wall to window**, **piece to piece** (in the connector seams) and **around the appliance** | 5 Oct 2026 |
| Q19 | Tools and commit identity persist through a **SessionStart hook committed in the repo**, which runs only in cloud sessions | 5 Oct 2026 |
| Q20 | Decorative patterns: **brick**, **diamond**, **grid**, **decorative hexagon**; the list is extensible, and **users can add their own** (how: Q21) | 5 Oct 2026 |
| Q21 | Users add their own patterns by **uploading an SVG tile**, **drawing one in the page**, or contributing a **pattern file to the repo** | 5 Oct 2026 |
| Q23 | The startup hook is **verified in a real cloud session**: a fresh session opened on this repo alone ran it on its own, ending with the owner's identity, all three git hooks wired and the tools installed. Its first reply came about 72 s after start, mostly building the hook environments. In a session holding several repositories it does not fire; run it by hand there (CLAUDE.md) | 5 Oct 2026 |
| Q24 | The page **runs in the browser with nothing sent to a server**, both **hosted on GitHub Pages** and as a **download that works offline** | 5 Oct 2026 |
| Q25 | Users can add their own **STL (or similar) meshes**: organiser or accessory tiles placed on a panel, 3D pattern tiles, a model of their appliance to cut around, a whole custom piece the tool trims and fits connectors to, and **any other shape** | 5 Oct 2026 |
| Q26 | The startup hook **stays synchronous** and keeps pre-building the check environments: a slow first start (about 72 s), with everything ready before work begins | 5 Oct 2026 |
| Q18 | No personal measurements: design and test against **example sizes**, labelled as examples wherever they appear | 5 Oct 2026 |

The first four rows were answered before questions carried IDs.

## Open questions

### Engine

- **Q22.** Which engine builds the geometry? The owner's answer (5 Oct 2026): "my thinking was
  that the page would run locally and users would add stl or other similar files", now settled
  as Q24 and Q25. What that asks of the engine:
  - run in the browser, hosted and offline. A page opened from a file usually cannot fetch its
    WebAssembly module, so the offline build has to be one self-contained file or an installable
    page (inferred);
  - import user meshes (STL and similar) and cut, trim and join them with the generated parts.
    User meshes are often not watertight, and solid booleans on those fail in any engine, so the
    page needs a repair step and a clear refusal when a file cannot be used (inferred).

  The candidates:
  - a custom web page with the model in OpenSCAD files, rendered in the browser by OpenSCAD's
    WebAssembly build (GPL, so the deployed page would be GPL-licensed as a whole (inferred));
  - a custom web page with the model in TypeScript on the Manifold geometry library
    (`manifold-3d`, Apache-2.0, verified on npm 5 Oct 2026), with no OpenSCAD files;
  - the OpenSCAD Customizer page alone (one piece at a time).

  The owner then asked which is friendlier for a basic user, licence aside. The user never sees
  the engine; buttons, uploads, preview, the all-pieces download and the offline file are the
  same page either way. What differs is load time and preview speed. The `manifold-3d` package
  unpacks to 2.8 MB and `openscad-wasm` to 13.9 MB (verified: npm registry, 5 Oct 2026;
  download sizes after compression differ). The OpenSCAD Playground itself uses Manifold for
  speed (relayed: its README), so calling Manifold directly should be at least as fast
  (inferred, not measured). The recommendation is TypeScript + Manifold, confirmed by a small
  speed prototype before building on it.

  The owner chose to prototype both and decide from the numbers. Measured 5 Oct 2026 in
  [`spikes/engine-benchmark/`](../spikes/engine-benchmark/README.md), on one example panel
  (200 x 200 x 3 mm, 247 hexagonal holes) proven to be the same solid from both engines
  (0 mm³ difference; a deliberately different panel fails the same check):

  | Chromium, cold cache, gzip, median of 3 loads | Manifold | OpenSCAD |
  |---|---|---|
  | Ready to render, local | 95 ms | 640 ms |
  | Ready to render, example 20 Mbit/s link | 366 ms | 2 021 ms |
  | Later renders | 127–136 ms | 281–285 ms |
  | Downloaded | 0.23 MB | 3.35 MB |

  Waiting for the owner's choice.

## Repository follow-ups

- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
