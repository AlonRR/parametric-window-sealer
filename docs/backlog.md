# Backlog

Every piece of work the decisions in [`status.md`](status.md) call for, ordered by priority and
then by how easy it is expected to be. Written 5 Oct 2026 at the owner's request (Q27).

**Priorities and ease are estimates (inferred), not measurements.** The MVP was confirmed
by the owner as proposed (Q28). Each row names the decision it comes from, so a change of
decision shows which rows move.

## The proposed MVP

> A user opens the page, enters the size of the open area, and downloads a set of printable
> pieces that join with connector strips into a plain sealed wall held in the window track by
> the closed sash. It runs in the browser, previews in 3D, and needs no install.

What the MVP leaves out on purpose: patterns and organisers, appliance fittings, seals, the
printer-presets list, per-piece overrides, the offline file and mesh import. Each is a later
row below, and none needs the MVP rebuilt to add it. **Confirmed by the owner as proposed
(Q28, 5 Oct 2026)**; the round hose port (`hose-port`) stays first in line after it.

## How to read the table

- **Issue**: the GitHub issue that holds the work and the discussion (Q29). This file stays the
  ranked overview; when a priority or estimate changes, change both.
- **Priority**: P0 is the MVP, P1 comes next, P2 is planned, P3 is "maybe later". Rows are
  sorted by priority, then by ease, with one exception: the three API rows that need no server
  (`api-library`, `api-cli`, `api-mcp-local`, forms the owner chose for issue #1) come first in
  P1, right after the MVP (Q31, Q48), ahead of `hose-port` (Q33, which moved them ahead of the
  hose port that Q28 had put first in line). The fourth, `api-hosted`, is parked at P3: there
  is no funding to run a server (Q32).
- **Ease**, a relative estimate:
  - **S**: one self-contained piece of code or data with its tests; no test print needed.
  - **M**: several parts, a new area of the page, or a shape that needs a test print to tune.
  - **L**: a subsystem of its own (a geometry pipeline or an editor), or several rounds of
    test prints, or external specifications to verify first.
  - **XL**: open-ended; how hard depends on inputs nobody controls.
- **Test print**: the fit can only be confirmed by printing it. That is the owner's step, on
  his own printer; until then, fit is checked only in geometry tests.
- **Spec to verify**: depends on a third party's dimensions (a bed size, an organiser grid, a
  hose or fan standard), to be taken from the maker's own specification, never from memory.

## Items

| Key | Issue | Item | Priority | Ease | Depends on | From | What makes the estimate uncertain |
|---|---|---|---|---|---|---|---|
| `page-skeleton` | #2 | TypeScript project for the page: build, unit tests, a CI job, Manifold loaded | P0 | S | | Q22, Q34, Q35 | Tooling chosen: Vite, Vitest, and a Chromium test in CI |
| `layout` | #3 | Divide the opening into a grid: per-axis mode (all equal, or full pieces plus one filler), filler position (start, end, middle, or split for symmetry), warning when a leftover is too small | P0 | S | `page-skeleton` | Q11, Q12 | None significant: pure arithmetic, test-first |
| `printer-default` | #4 | Maximum piece size: one safe default plus "custom" | P0 | S | `layout` | Q5, Q38 | Verified: 29 build volumes from the makers' sites, in [`printer-beds.md`](printer-beds.md) |
| `params-basic` | #5 | The basic parameter panel: opening size, maximum piece size, per-axis modes, thickness | P0 | S | `layout` | Q10, Q11 | |
| `plain-panel` | #6 | A plain sealed piece of any size and thickness | P0 | S | `page-skeleton` | Q8 | |
| `download-zip` | #7 | A download dialog: the user chooses STL or 3MF, as separate files or one zip, or every piece in one 3MF; nothing pre-selected the first time, then the last choice is remembered; files named by grid position | P0 | M | `plain-panel` | Q24, Q44, Q45, Q46, Q47 | Writing 3MF correctly (units, several objects); browsers ask once to allow several downloads (inferred) |
| `pages-deploy` | #8 | Workflow that builds the page for GitHub Pages; it goes live only when the owner publishes | P0 | S | `page-skeleton` | Q3, Q43 | The repo is private: the site can be built, not served, until the owner acts |
| `min-piece-from-joint` | #53 | Replace the 30 mm placeholder minimum piece width (Q40) with the width the joint needs, from the joint's own dimensions (Q37): two slot depths plus a strip's width (Q76); drop the "placeholder" wording | P0 | S | `connector-strip`, `params-basic` | Q37, Q40, Q76 | None significant once the joint's dimensions exist. P0 so `v0.1.0` cannot ship the placeholder |
| `preview-3d` | #9 | 3D preview of the assembled wall, updating as parameters change | P0 | M | `plain-panel` | Q24, Q49 | Library chosen by measurement: three.js (Q49) |
| `connector-strip` | #10 | Default joint: an H-profile strip, proud of both faces, that the pieces' full edges slide into; a cross piece where four meet; slot, web, flange and fit adjustable under advanced; held by friction; downloaded standing on its flanges | P0 | M | `plain-panel`, `layout` | Q13, Q50 to Q53 | Test print: the clearance that slides yet holds depends on printer and material |
| `track-edge` | #11 | An edge strip on each outer edge, sitting inside the window track or taking the sash or the sill; each edge's role preset by window type; track width and depth as parameters | P0 | M | `plain-panel`, `connector-strip` | Q14, Q65 to Q75 | Test print; example track sizes only (Q18) |
| `api-library` | #45 | The geometry code as an importable npm package; the other three API forms call it (part of #1) | P1 | M | `layout`, `plain-panel`, `connector-strip`, `track-edge` | Q31 | How cleanly the geometry separates from the page. Publishing to the npm registry is public, so it is the owner's step (as Q3) |
| `api-cli` | #46 | A command-line tool that writes the pieces from parameters given as flags or a file (part of #1) | P1 | S | `api-library` | Q31 | None significant: the engine benchmark already runs Manifold under Node.js |
| `api-mcp-local` | #47 | A local MCP server on the user's own machine, with tools for LLM agents such as "plan the layout" and "generate the pieces" (part of #1) | P1 | M | `api-library` | Q31 | Spec to verify: the MCP specification and SDK version; which tools to offer |
| `hose-port` | #12 | A round port for a portable AC's exhaust hose, in one piece, from a list of sizes | P1 | S | `plain-panel` | Q15, Q16 | Spec to verify: hose end sizes |
| `printer-presets` | #13 | Printer list that sets the maximum piece size | P1 | S | `printer-default` | Q5 | Spec to verify for every printer listed |
| `seal-tape` | #15 | Optional tape seal: a groove or land sized to the tape | P1 | S | `track-edge`, `connector-strip` | Q6, Q17 | Groove or flat land is still open (Q17 left it) |
| `pattern-grid` | #16 | Grid pattern | P1 | S | `patterns-core` | Q20 | |
| `pattern-hexagon` | #17 | Decorative hexagon pattern | P1 | S | `patterns-core` | Q20 | The benchmark panel already builds this shape |
| `pattern-brick` | #18 | Brick pattern | P1 | S | `patterns-core` | Q20 | |
| `pattern-diamond` | #19 | Diamond pattern | P1 | S | `patterns-core` | Q20 | |
| `patterns-core` | #20 | Pattern framework: a tile repeated across a piece, cut through or in relief, inside a solid border | P1 | M | `plain-panel` | Q7, Q8 | Keeping the joint edges solid under any tile |
| `params-advanced` | #21 | Advanced tab with per-piece overrides of the fill | P1 | M | `params-basic`, `patterns-core` | Q10 | Page design for picking a piece in a grid |
| `seal-tpu` | #22 | Optional TPU seal parts: edge strips and seam strips | P1 | M | `connector-strip`, `track-edge` | Q6, Q17 | Test print in TPU |
| `measured-cutout` | #23 | Appliance cutout sized to measured dimensions, with a gasket (TPU or foam) taking up the last few mm | P1 | M | `plain-panel` | Q16 | Test print |
| `window-ac` | #24 | Fitting for a window AC: the wall meets the unit's side or top | P1 | M | `measured-cutout` | Q15 | Units differ; example sizes only |
| `offline-file` | #25 | The page as one self-contained file that works offline | P1 | M | `page-skeleton` | Q24 | Inlining the engine adds about a third to its size (inferred) |
| `user-guide` | #14 | A measuring guide with pictures, simple steps and input fields that fill the form: the window opening and track, the appliance, and printed test parts measured with calipers | P1 | M | `params-basic` | Q18, Q51, Q54 | Pictures drawn for this project; example sizes only (Q18) |
| `pattern-plugins` | #26 | Pattern files contributed to the repo appear in the list | P2 | M | `patterns-core` | Q21 | Plugin format |
| `svg-tile` | #27 | Upload an SVG tile as a pattern | P2 | M | `patterns-core` | Q21 | Arbitrary SVG: curves, holes, units |
| `fan-mount` | #28 | Fan mounts with screw patterns from a list | P2 | M | `measured-cutout` | Q15, Q16 | Spec to verify per fan size |
| `joint-dovetail` | #29 | Advanced joint: puzzle dovetails | P2 | M | `layout` | Q13 | Test print |
| `joint-rails` | #30 | Advanced joint: sliding dovetail rails | P2 | M | `layout` | Q13 | Test print; assembly order |
| `joint-bolts` | #31 | Advanced joint: bolted flanges | P2 | M | `layout` | Q13 | Spec to verify: bolt and nut sizes |
| `clamps` | #32 | Adjustable clamps with slotted holes gripping the appliance | P2 | M | `measured-cutout` | Q16 | Test print |
| `organiser-skadis` | #33 | Skådis organiser fill | P2 | M | `patterns-core` | Q9 | Spec to verify; accessory fit needs a test print |
| `organiser-opengrid` | #34 | openGrid organiser fill | P2 | M | `patterns-core` | Q9 | Spec to verify; test print |
| `mesh-appliance` | #35 | Cut the wall around an imported model of the appliance | P2 | M | `mesh-import` | Q25 | Inherits `mesh-import`'s risk |
| `fit-test-print` | #63 | Optional guided test print: print a small test joint, answer too tight, too loose or right after each print, and the page adjusts the fit; can use caliper readings of the printed parts | P2 | M | `connector-strip`, `user-guide` | Q51, Q54, Q55 | How big a fit change each answer should make; needs the owner's test prints to calibrate |
| `organiser-multiboard` | #36 | Multiboard organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; its connection geometry is more involved (inferred) |
| `organiser-hsw` | #37 | Honeycomb Storage Wall organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; test print |
| `sliding-insert` | #38 | Sliding insert that closes in around the appliance and locks | P2 | L | `measured-cutout` | Q16 | Mechanism design; several test prints |
| `draw-tile` | #39 | Draw a pattern tile in the page | P2 | L | `patterns-core` | Q21 | An editor is a project of its own |
| `mesh-tiles` | #40 | Imported organiser tiles and 3D pattern tiles placed on a panel | P2 | L | `mesh-import`, `patterns-core` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-custom-piece` | #41 | A whole imported piece, trimmed to size, with connector edges added | P2 | L | `mesh-import`, `connector-strip` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-import` | #42 | Import STL and similar meshes: repair, and refuse clearly when a mesh cannot be used | P2 | XL | `page-skeleton` | Q25 | Arbitrary user meshes; often not watertight |
| `other-windows` | #43 | Window types beyond sliders and hung windows | P3 | L | `track-edge` | (none) | Not specified yet |
| `api-hosted` | #48 | A hosted web API, an HTTP service anyone can call (part of #1). **Parked**: no funding to run a server (Q32) | P3 | L | `api-library` | Q31, Q32 | Where it would run and who pays for it; against Q24's nothing sent to a server |

Issue #1, the owner's request for "an API and MCP for use by users and LLM agents", is the
parent of the four `api-*` rows (#45 to #48); it closes when they do.
