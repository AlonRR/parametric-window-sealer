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

| Key | Item | Priority | Ease | Depends on | From | What makes the estimate uncertain |
|---|---|---|---|---|---|---|
| `page-skeleton` | TypeScript project for the page: build, unit tests, a CI job, Manifold loaded | P0 | S | | Q22 | Tooling choice (to propose when it starts) |
| `layout` | Divide the opening into a grid: per-axis mode (all equal, or full pieces plus one filler), filler position (start, end, middle, or split for symmetry), warning when a leftover is too small | P0 | S | `page-skeleton` | Q11, Q12 | None significant: pure arithmetic, test-first |
| `printer-default` | Maximum piece size: one safe default plus "custom" | P0 | S | `layout` | Q5 | The default number needs verified bed sizes behind it (spec to verify) |
| `params-basic` | The basic parameter panel: opening size, maximum piece size, per-axis modes, thickness | P0 | S | `layout` | Q10, Q11 | |
| `plain-panel` | A plain sealed piece of any size and thickness | P0 | S | `page-skeleton` | Q8 | |
| `download-zip` | Download every piece in one zip, named by grid position | P0 | S | `plain-panel` | Q24 | STL or 3MF: Manifold's own README advises 3MF over STL (relayed) |
| `pages-deploy` | Workflow that builds the page for GitHub Pages; it goes live only when the owner publishes | P0 | S | `page-skeleton` | Q3 | The repo is private: the site can be built, not served, until the owner acts |
| `preview-3d` | 3D preview of the assembled wall, updating as parameters change | P0 | M | `plain-panel` | Q24 | Library choice for the viewer |
| `connector-strip` | Default joint: a tongue on each edge, an H-profile strip between pieces, a cross piece where four meet, a clearance parameter, a few mm of slide | P0 | M | `plain-panel`, `layout` | Q13 | Test print: the clearance that slides yet holds depends on printer and material |
| `track-edge` | The edges that sit in the window track and take the sash's clamp; track width and depth as parameters | P0 | M | `plain-panel` | Q14 | Test print; example track sizes only (Q18) |
| `hose-port` | A round port for a portable AC's exhaust hose, in one piece, from a list of sizes | P1 | S | `plain-panel` | Q15, Q16 | Spec to verify: hose end sizes |
| `printer-presets` | Printer list that sets the maximum piece size | P1 | S | `printer-default` | Q5 | Spec to verify for every printer listed |
| `user-guide` | How to measure the window, the gap and the appliance | P1 | S | | Q18 | |
| `seal-tape` | Optional tape seal: a groove or land sized to the tape | P1 | S | `track-edge`, `connector-strip` | Q6, Q17 | Groove or flat land is still open (Q17 left it) |
| `pattern-grid` | Grid pattern | P1 | S | `patterns-core` | Q20 | |
| `pattern-hexagon` | Decorative hexagon pattern | P1 | S | `patterns-core` | Q20 | The benchmark panel already builds this shape |
| `pattern-brick` | Brick pattern | P1 | S | `patterns-core` | Q20 | |
| `pattern-diamond` | Diamond pattern | P1 | S | `patterns-core` | Q20 | |
| `patterns-core` | Pattern framework: a tile repeated across a piece, cut through or in relief, inside a solid border | P1 | M | `plain-panel` | Q7, Q8 | Keeping the joint edges solid under any tile |
| `params-advanced` | Advanced tab with per-piece overrides of the fill | P1 | M | `params-basic`, `patterns-core` | Q10 | Page design for picking a piece in a grid |
| `seal-tpu` | Optional TPU seal parts: edge strips and seam strips | P1 | M | `connector-strip`, `track-edge` | Q6, Q17 | Test print in TPU |
| `measured-cutout` | Appliance cutout sized to measured dimensions, with a gasket (TPU or foam) taking up the last few mm | P1 | M | `plain-panel` | Q16 | Test print |
| `window-ac` | Fitting for a window AC: the wall meets the unit's side or top | P1 | M | `measured-cutout` | Q15 | Units differ; example sizes only |
| `offline-file` | The page as one self-contained file that works offline | P1 | M | `page-skeleton` | Q24 | Inlining the engine adds about a third to its size (inferred) |
| `pattern-plugins` | Pattern files contributed to the repo appear in the list | P2 | M | `patterns-core` | Q21 | Plugin format |
| `svg-tile` | Upload an SVG tile as a pattern | P2 | M | `patterns-core` | Q21 | Arbitrary SVG: curves, holes, units |
| `fan-mount` | Fan mounts with screw patterns from a list | P2 | M | `measured-cutout` | Q15, Q16 | Spec to verify per fan size |
| `joint-dovetail` | Advanced joint: puzzle dovetails | P2 | M | `layout` | Q13 | Test print |
| `joint-rails` | Advanced joint: sliding dovetail rails | P2 | M | `layout` | Q13 | Test print; assembly order |
| `joint-bolts` | Advanced joint: bolted flanges | P2 | M | `layout` | Q13 | Spec to verify: bolt and nut sizes |
| `clamps` | Adjustable clamps with slotted holes gripping the appliance | P2 | M | `measured-cutout` | Q16 | Test print |
| `organiser-skadis` | Skådis organiser fill | P2 | M | `patterns-core` | Q9 | Spec to verify; accessory fit needs a test print |
| `organiser-opengrid` | openGrid organiser fill | P2 | M | `patterns-core` | Q9 | Spec to verify; test print |
| `mesh-appliance` | Cut the wall around an imported model of the appliance | P2 | M | `mesh-import` | Q25 | Inherits `mesh-import`'s risk |
| `organiser-multiboard` | Multiboard organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; its connection geometry is more involved (inferred) |
| `organiser-hsw` | Honeycomb Storage Wall organiser fill | P2 | L | `patterns-core` | Q9 | Spec to verify; test print |
| `sliding-insert` | Sliding insert that closes in around the appliance and locks | P2 | L | `measured-cutout` | Q16 | Mechanism design; several test prints |
| `draw-tile` | Draw a pattern tile in the page | P2 | L | `patterns-core` | Q21 | An editor is a project of its own |
| `mesh-tiles` | Imported organiser tiles and 3D pattern tiles placed on a panel | P2 | L | `mesh-import`, `patterns-core` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-custom-piece` | A whole imported piece, trimmed to size, with connector edges added | P2 | L | `mesh-import`, `connector-strip` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-import` | Import STL and similar meshes: repair, and refuse clearly when a mesh cannot be used | P2 | XL | `page-skeleton` | Q25 | Arbitrary user meshes; often not watertight |
| `other-windows` | Window types beyond sliders and hung windows | P3 | L | `track-edge` | (none) | Not specified yet |
