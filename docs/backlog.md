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
- **Priority**: P0 is the MVP, P1 comes next, P2 is planned, P3 is "maybe later".
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
| `page-skeleton` | #2 | TypeScript project for the page: build, unit tests, a CI job, Manifold loaded | P0 | S | | Q22 | Tooling choice (to propose when it starts) |
| `layout` | #3 | Divide the opening into a grid: per-axis mode (all equal, or full pieces plus one filler), filler position (start, end, middle, or split for symmetry), warning when a leftover is too small | P0 | S | `page-skeleton` | Q11, Q12 | None significant: pure arithmetic, test-first |
| `printer-default` | #4 | Maximum piece size: one safe default plus "custom" | P0 | S | `layout` | Q5 | The default number needs verified bed sizes behind it (spec to verify) |
| `params-basic` | #5 | The basic parameter panel: opening size, maximum piece size, per-axis modes, thickness | P0 | S | `layout` | Q10, Q11 | |
| `plain-panel` | #6 | A plain sealed piece of any size and thickness | P0 | S | `page-skeleton` | Q8 | |
| `download-zip` | #7 | Download every piece in one zip, named by grid position | P0 | S | `plain-panel` | Q24 | STL or 3MF: Manifold's own README advises 3MF over STL (relayed) |
| `pages-deploy` | #8 | Workflow that builds the page for GitHub Pages; it goes live only when the owner publishes | P0 | S | `page-skeleton` | Q3 | The repo is private: the site can be built, not served, until the owner acts |
| `preview-3d` | #9 | 3D preview of the assembled wall, updating as parameters change | P0 | M | `plain-panel` | Q24 | Library choice for the viewer |
| `connector-strip` | #10 | Default joint: a tongue on each edge, an H-profile strip between pieces, a cross piece where four meet, a clearance parameter, a few mm of slide | P0 | M | `plain-panel`, `layout` | Q13 | Test print: the clearance that slides yet holds depends on printer and material |
| `track-edge` | #11 | The edges that sit in the window track and take the sash's clamp; track width and depth as parameters | P0 | M | `plain-panel` | Q14 | Test print; example track sizes only (Q18) |
| `hose-port` | #12 | A round port for a portable AC's exhaust hose, in one piece, from a list of sizes | P1 | S | `plain-panel` | Q15, Q16 | Spec to verify: hose end sizes |
| `printer-presets` | #13 | Printer list that sets the maximum piece size | P1 | S | `printer-default` | Q5 | Spec to verify for every printer listed |
| `user-guide` | #14 | How to measure the window, the gap and the appliance | P1 | S | | Q18 | |
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
| `organiser-multiboard` | #36 | Multiboard organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; its connection geometry is more involved (inferred) |
| `organiser-hsw` | #37 | Honeycomb Storage Wall organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; test print |
| `sliding-insert` | #38 | Sliding insert that closes in around the appliance and locks | P2 | L | `measured-cutout` | Q16 | Mechanism design; several test prints |
| `draw-tile` | #39 | Draw a pattern tile in the page | P2 | L | `patterns-core` | Q21 | An editor is a project of its own |
| `mesh-tiles` | #40 | Imported organiser tiles and 3D pattern tiles placed on a panel | P2 | L | `mesh-import`, `patterns-core` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-custom-piece` | #41 | A whole imported piece, trimmed to size, with connector edges added | P2 | L | `mesh-import`, `connector-strip` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-import` | #42 | Import STL and similar meshes: repair, and refuse clearly when a mesh cannot be used | P2 | XL | `page-skeleton` | Q25 | Arbitrary user meshes; often not watertight |
| `other-windows` | #43 | Window types beyond sliders and hung windows | P3 | L | `track-edge` | (none) | Not specified yet |

## Not yet ranked

| Key | Issue | Item | Waiting on |
|---|---|---|---|
| `api-mcp` | #1 | An API and an MCP server, so users and LLM agents can generate walls without the page (the owner's issue) | Q31: what form they take, and their priority |
