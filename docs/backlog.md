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

**Released as `v0.1.0` on 5 Oct 2026**: every P0 row below is done. **`v0.2.0`, the same day,
adds the three API rows that need no server** (`api-library`, `api-cli`, `api-mcp-local`; Q101),
and **`v0.3.0`, the same day again, every P1 row** (C48). **`v0.4.0`, on 15 Oct 2026, adds the
P2 rows built so far and the design review's thirteen changes** (Q155). **`v0.5.0`, the same day,
the joint tuned and in its other forms**: `fit-test-print` (Q157), `joint-dovetail`, `joint-rails`
and `joint-bolts` (C215). **`v0.6.0`, on 16 Oct 2026, everything built since** (Q160): the
drawn tile, the organiser boards (Multiboard built but not offered yet, Q159) and the meshes. Nothing in any of them
has been test printed yet. After `v0.3.0`, four rows were added at P1, ahead of P2, to make the code easy to
extend (Q145): `code-tooling`, `code-params-page`, `fill-registry` and `fitting-registry`. On
14 Oct, `ci-triggers` was added at P1 so that CI checks each commit once (Q147). P2 began the
same day (Q148): `pattern-plugins` is covered by `fill-registry`, and `fan-mount` came first,
then `svg-tile` and `clamps` (Q149), and `sliding-insert` (Q150).
On 15 Oct a design review against published work
([`research/design-review.md`](research/design-review.md)) gave thirteen changes, R1 to R13,
which the owner took in full (Q153). They are added at P1, ahead of the rest of P2, **in the
review's order rather than by ease**, starting with `joint-lock`.

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
| `api-library` | #45 | The geometry code as the npm package `parametric-window-sealer` (Q78) in its own workspace folder, which the page imports (Q79): one call, `makeWall`, plus the steps underneath (Q80), in Node.js and browsers (Q81); the other three API forms call it (part of #1) | P1 | M | `layout`, `plain-panel`, `connector-strip`, `track-edge` | Q31, Q78 to Q82 | Publishing to the npm registry is public, so it is the owner's step (as Q3, Q78) |
| `api-cli` | #46 | The `window-sealer` command, its own package (Q83, Q84): every setting on the page as a flag or from a JSON file (Q85, Q90), separate STL files in one folder by default (Q86), the page's summary or `--json` (Q87), `--force` (Q88) and `--dry-run` (Q89) (part of #1) | P1 | S | `api-library` | Q31, Q83 to Q90 | None significant: the engine benchmark already runs Manifold under Node.js |
| `api-mcp-local` | #47 | The `window-sealer-mcp` server, its own package (Q91), over stdio (Q98) on the official SDK (Q97): tools to list and check the settings, plan a wall and make its files (Q92), the settings in the library's shape (Q99), the files written under one folder or returned in the reply as the agent chooses (Q93 to Q96, Q100) (part of #1) | P1 | M | `api-library` | Q31, Q91 to Q100 | Spec to verify: the MCP specification and SDK version; which tools to offer |
| `hose-port` | #12 | A round port for a portable AC's exhaust hose: a push-fit collar on the room side of one piece (Q102, Q104, Q106), the hose end's outside diameter from a list or the user's own (Q103), in a piece the user picks (Q105, Q110), more under Advanced (Q111, Q113) | P1 | S | `plain-panel` | Q15, Q16, Q102 to Q114 | Test print: the collar's starting sizes (Q107) |
| `printer-presets` | #13 | Printer list that sets the maximum piece size: the 29 printers in `printer-beds.md` (Q115), each bed less a margin set under Advanced (Q117), turned whichever way needs fewer pieces (Q116) | P1 | S | `printer-default` | Q5, Q115 to Q117 | Spec to verify for every printer listed |
| `seal-tape` | #15 | Optional tape seal, starting at none (Q122): foam tape from four sourced sizes or the user's own (Q121), in a groove on the edge strips' outer face (Q119, Q120, Q124), the wall leaving it room to be squeezed to half its thickness (Q125); under Advanced on the strips' sides and in the hose port's collar (Q127, Q129) | P1 | S | `track-edge`, `connector-strip` | Q6, Q17, Q119 to Q132 | Not yet test printed: the groove and squeeze are starting values |
| `pattern-grid` | #16 | Grid pattern, and the Panel fill choice: sealed, or the grid in relief or cut through (Q141, Q142); 15 mm square openings and 3 mm bars to start (Q139), both changeable, bars at least 0.8 mm (Q140, Q143) | P1 | S | `patterns-core` | Q20, Q139 to Q143 | |
| `pattern-hexagon` | #17 | Decorative hexagon pattern: a pointy-top honeycomb, 15 mm across the flats with 3 mm bars to start, both changeable (C13 to C17) | P1 | S | `patterns-core` | Q20, Q144 | The benchmark panel already builds this shape |
| `pattern-brick` | #18 | Brick pattern: openings in a running bond, 30 × 12 mm with 3 mm bars to start, all three changeable (C18 to C21) | P1 | S | `patterns-core` | Q20, Q144 | |
| `pattern-diamond` | #19 | Diamond pattern: point-up diamonds in a lattice, 20 × 30 mm with 3 mm bars to start, all three changeable (C22 to C25) | P1 | S | `patterns-core` | Q20, Q144 | |
| `patterns-core` | #20 | Pattern framework, in the library first (Q133): a tile repeated across the whole wall (Q135), cut through or into the room side (Q136, Q138), inside a solid border of the slot depth plus 2 mm (Q134) and clear of a hose port (Q137) | P1 | M | `plain-panel` | Q7, Q8, Q133 to Q138 | The joint edges stay solid under any tile, as the border is tied to the slot |
| `params-advanced` | #21 | Advanced: a fill for any piece, its fill and style, picked on a map of the pieces (C26 to C30) | P1 | M | `params-basic`, `patterns-core` | Q10, Q144 | |
| `seal-tpu` | #22 | Printed TPU seal: gaskets in the tape's grooves, a sleeve in each hose port, and under Advanced the joint strips and cross pieces in TPU, where tape does not fit (Q128; C31 to C39) | P1 | M | `connector-strip`, `track-edge` | Q6, Q17, Q128, Q144 | Test print in TPU |
| `measured-cutout` | #23 | Appliance cutout sized to measured dimensions, inside one piece with a rim, lined with the seal (TPU or foam) taking up the last few mm (C40 to C47) | P1 | M | `plain-panel` | Q16, Q144 | Test print |
| `window-ac` | #24 | Fitting for a window AC: the wall meets the unit's side or top, as an edge's fourth role, set from where the unit is (C49 to C53) | P1 | M | `measured-cutout` | Q15, Q144 | Units differ; example sizes only |
| `offline-file` | #25 | The page as one self-contained file that works offline, `window-sealer.html`, built with the site and saved from a link on the page (C54 to C57) | P1 | M | `page-skeleton` | Q24, Q144 | Inlining the engine adds about a third to its size (inferred) |
| `user-guide` | #14 | A measuring guide with pictures, simple steps and input fields that fill the form: the window opening and track, the appliance, and printed test parts measured with calipers, which give the fit (C58 to C62) | P1 | M | `params-basic` | Q18, Q51, Q54, Q144 | Pictures drawn for this project; example sizes only (Q18) |
| `code-tooling` | #94 | A linter and a formatter for the TypeScript, run in CI: oxlint with type-checked rules, and Prettier (C66 to C70) | P1 | S | | Q145 | How many findings the type-checked rules raise in code written without them |
| `code-params-page` | #95 | A new setting slots in: the settings reader split into one reader per section, the page's fields from the library, what shows said in the page's HTML, and a contributor's guide, `docs/extending.md` | P1 | M | `code-tooling` | Q145 | The page's checks run on every keystroke, so the split must keep their order |
| `fill-registry` | #96 | Each pattern declared once, in one file: its sizes, starting values, limits, help, flags and tile; the settings, flags, MCP schema, page controls and plan words come from it. The in-code half of `pattern-plugins` | P1 | M | `code-params-page` | Q145 | Keeping the types exact for fields declared at run time |
| `fitting-registry` | #97 | The hose port and the measured cutout behind one fitting interface, so the fan mount, clamps, sliding insert and imported appliance each add a fitting (C83 to C89) | P1 | M | `code-params-page` | Q145 | The two fittings differ in shape, so the interface must not assume either |
| `ci-triggers` | #101 | The checks run once per commit, through its pull request: on pull requests and pushes to `main` only, a superseded run cancelled, each job with a time limit (C82) | P1 | S | | Q147 | Whether the owner's Gitea version honours `concurrency` |
| `joint-lock` | #110 | A tighter joint that locks: crush ribs on the strips' flanges, a filament pin through each strip into a slot in the piece, the grip a setting with a test coupon (R1; [`joints.md`](joints.md); C125 to C134) | P1 | M | | Q153, Q13 | Test print: the clearance and the bumps' squeeze vary by printer |
| `stiffener-strips` | #111 | Strips that stiffen: bought 20 × 20 × 2 mm aluminium angle across a span over 500 mm, on printed clips pinned through the strips (R2; Q154 B, [`stiffeners.md`](stiffeners.md); C209 to C214) | P1 | L | `joint-lock` | Q153, Q154 | Test print of a loaded wall; the bend is calculated, not measured |
| `sheet-pieces` | #112 | Pieces cut from sheet: print only the strips, cross pieces, edge strips and fittings; the slot follows the sheet's thickness (R3; [`sheet-pieces.md`](sheet-pieces.md); C135 to C144) | P1 | M | `joint-lock` | Q153 | Spec to verify: the thicknesses sheets are sold in |
| `material-advice` | #113 | Material advice by place: PETG in a light colour by default, ASA in sun or near a hose, PLA for test fits; the page warns (R4; [`materials.md`](materials.md); C145 to C150) | P1 | S | | Q153, Q6 | Where the sun falls is the user's to say |
| `hose-socket` | #114 | Seal the hose first: bayonet or threaded sockets for 130 and 150 mm hoses, a sealed ring, a cap for when the AC is off, an optional screen (R5; a twist-lock of the project's own, [`hose-port.md`](hose-port.md); C151 to C159) | P1 | M | | Q153 | Spec to verify: makers' hose-end threads and bayonets; test print |
| `tpu-fin-seals` | #115 | Seals that bend: printed TPU 85A fins or bulbs with a hard stop, in place of foam that must stay squeezed; tape stays, closed-cell only (R6; fins that fold into a groove deep enough for them, [`seals.md`](seals.md); C160 to C166) | P1 | M | `joint-lock` | Q153, Q6, Q17 | Test print: no published data on printed bulb seals |
| `meeting-rail` | #116 | A filler for the gap between a hung window's two sashes (R7; a printed bar with the seal on both faces, for sliders too, [`sash-filler.md`](sash-filler.md); C167 to C174) | P1 | S | | Q153 | Test print; the gap varies by window |
| `rain-face` | #117 | Rain on the outside face: upper pieces lap over lower ones, a drip edge and outward slope on the bottom edge strip, weep holes, nothing blocking an AC's tilt or drain (R8; drained joints with weep holes in place of laps, [`rain.md`](rain.md); C175 to C182) | P1 | M | `joint-lock` | Q153 | How a lap works with the grid of H-strips |
| `sash-stop` | #118 | A sash stop that blocks opening from outside and comes off by hand from inside (R9; a printed strut in the sash's track, [`sash-stop.md`](sash-stop.md); C183 to C188) | P1 | S | | Q153 | Window hardware varies; test print |
| `double-wall` | #119 | A double wall for winter: two skins with an air gap (R10); hollow printed pieces within the panel's thickness, [`double-wall.md`](double-wall.md); C189 to C194 | P1 | M | `joint-lock` | Q153 | It doubles the printing; twin-wall sheet (`sheet-pieces`) is the cheaper way |
| `compression-edge` | #120 | Windows without a track: a slightly oversize TPU compression edge for casement screen openings, tilt-and-turn frames and sliding doors (R11); edges pressed into a frame, held by the printed TPU gasket's squeeze, [`frame.md`](frame.md); C195 to C199 | P1 | L | `tpu-fin-seals` | Q153, Q14 | Several test prints; frames vary |
| `safety-guidance` | #121 | Guidance and warnings: falls, escape windows, ground-floor locks, winter condensation, PLA in sun, fire, how to assemble; nothing claimed the evidence does not support (R12); [`safety.md`](safety.md), C200 to C202 | P1 | S | | Q153 | Wording only |
| `print-defaults` | #122 | Printing defaults against warping: rounded piece corners, a 1 mm bottom chamfer, brim advice by material (R13); [`printing.md`](printing.md), C203 to C208 | P1 | S | | Q153 | Test print |
| `pattern-plugins` | #26 | Pattern files contributed to the repo appear in the list. **Covered by `fill-registry` (#96)**: a contributed pattern is one file and one line in `PATTERNS` (C97) | P2 | M | `patterns-core` | Q21, Q148 | Plugin format |
| `svg-tile` | #27 | Upload an SVG tile as a pattern: its `viewBox` one cell, its filled shapes the openings, at a width the user sets ([`svg-tiles.md`](svg-tiles.md); C98 to C109) | P2 | M | `patterns-core` | Q21, Q149 | Drawings it refuses, or reads otherwise than a browser (rings that cross) |
| `fan-mount` | #28 | Fan mounts with screw patterns from a list: square-framed fans of 80, 92, 120 and 140 mm, from the makers' own drawings ([`fan-sizes.md`](fan-sizes.md); C90 to C96) | P2 | M | `measured-cutout` | Q15, Q16, Q148 | Test print: the screw holes and the 140 mm slots |
| `joint-dovetail` | #29 | Advanced joint: puzzle dovetails, a joint style beside the H-strips: tabs and sockets on the pieces' edges, the fit carved from both, no strips ([`joints.md`](joints.md); C223 to C229) | P2 | M | `layout` | Q13 | Test print; what they hold across the wall's plane |
| `joint-rails` | #30 | Advanced joint: sliding dovetail rails, a joint style: half rails on the pieces' room side, a printed slider over each pair ([`joints.md`](joints.md); C230 to C235) | P2 | M | `layout` | Q13 | Test print; assembly order |
| `joint-bolts` | #31 | Advanced joint: bolted flanges, a joint style: a flange on each piece's room side along the edges it shares, bolted back to back with M4 bolts ([`joints.md`](joints.md); C236 to C241) | P2 | M | `layout` | Q13 | Bolt and nut sizes checked against makers' tables; test print |
| `clamps` | #32 | Adjustable clamps with slotted holes gripping the appliance: an opening and four printed jaws on M4 bolts, gripping the measured size give or take their travel ([`clamps.md`](clamps.md); C110 to C118) | P2 | M | `measured-cutout` | Q16, Q149 | Test print: the grip, and the slots against the bolt holes |
| `organiser-skadis` | #33 | Skådis organiser fill: a board 4.8 mm thick, raised inside each piece's border, with IKEA's slots on one lattice across the wall ([`organisers.md`](organisers.md); C249 to C255) | P2 | M | `patterns-core` | Q9 | Slot sizes from a third-party reference model; accessory fit needs a test print |
| `organiser-opengrid` | #34 | openGrid organiser fill: openGrid's Full board, 6.8 mm thick, its cells 28 mm apart with the groove the snaps click into ([`organisers.md`](organisers.md); C256 to C258) | P2 | M | `patterns-core`, `organiser-skadis` | Q9 | Sizes measured from the author's tiles; test print |
| `mesh-appliance` | #35 | Cut the wall around an imported model of the appliance. The model turned so the side named faces the room, its outline seen from the room cut through one piece with the cutout's rim ([`meshes.md`](meshes.md); C268 to C275) | P2 | M | `mesh-import` | Q25 | Inherits `mesh-import`'s risk |
| `fit-test-print` | #63 | Optional guided test print: print the joint's test coupon, say which section held or how none did, and the page moves the grip or the fit for the next print; caliper readings in the guide's fourth step ([`joints.md`](joints.md); C217 to C222) | P2 | M | `connector-strip`, `user-guide` | Q51, Q54, Q55, Q157 | How big a step each answer should make; the owner's test prints will tell |
| `organiser-multiboard` | #36 | Multiboard organiser fill: Multiboard's tiles, 6.2 mm thick, threaded octagonal holes at the cells' centres and threaded small holes at their corners, 25 mm apart; built and not offered yet, the page, help and MCP schema leaving it out (Q159; [`organisers.md`](organisers.md); C289 to C297) | P2 | L | `patterns-core` | Q9, Q159, Q162 | Kept hidden while its licence against Q36 is unsettled (Q162); sizes from community models, the thickness and the small thread least certain; files about 20 times the openGrid board's |
| `organiser-hsw` | #37 | Honeycomb Storage Wall organiser fill: the author's 8 mm wall, its hexagonal cells 20 mm across their flats, 23.6 mm apart, with the ledge the inserts clip behind ([`organisers.md`](organisers.md); C259 to C261) | P2 | L | `patterns-core`, `organiser-opengrid` | Q9 | Sizes measured from the author's wall; the ledge's overhang; test print |
| `sliding-insert` | #38 | Sliding insert that closes in around the appliance and locks: two shutters in dovetail rails on the piece, each locked by an M4 bolt ([`sliding-insert.md`](sliding-insert.md); C119 to C124) | P2 | L | `measured-cutout` | Q16, Q150 | Mechanism design; several test prints |
| `draw-tile` | #39 | Draw a pattern tile in the page: the openings of one cell on a grid of squares, by clicking or typing each point, used as the SVG tile's drawing and saved as a file ([`svg-tiles.md`](svg-tiles.md); C242 to C248) | P2 | L | `patterns-core`, `svg-tile` | Q21 | Each finished shape rebuilds a patterned preview, 1 to 5 s |
| `mesh-tiles` | #40 | Imported organiser tiles and 3D pattern tiles placed on a panel. A fill of its own: the tile's box is its cell, set side by side in whole cells in the panel's place ([`meshes.md`](meshes.md); C276 to C282) | P2 | L | `mesh-import`, `patterns-core` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-custom-piece` | #41 | A whole imported piece, trimmed to size, with connector edges added. Centred on its piece and trimmed inside a frame as thick as the pieces, which takes the joints ([`meshes.md`](meshes.md); C283 to C288) | P2 | L | `mesh-import`, `connector-strip` | Q25 | Inherits `mesh-import`'s risk |
| `mesh-import` | #42 | Import STL and similar meshes: repair, and refuse clearly when a mesh cannot be used. STL, OBJ and 3MF read in the library, corners welded, faces turned and parts turned outward, the rest refused with what to do ([`meshes.md`](meshes.md); C262 to C267) | P2 | XL | `page-skeleton` | Q25 | Arbitrary user meshes; often not watertight |
| `other-windows` | #43 | Window types beyond sliders and hung windows: surveyed (Q161, [`research/window-types.md`](research/window-types.md)); what it found missing is the six rows below (C298) | P3 | L | `track-edge` | Q161 | Done: the survey |
| `shutter-rails` | #158 | A wall in a roller shutter's guide rails: its sides in the rails, its top pressed by the lowered shutter, outside the glass; the window type sets a typical rail's 9 × 20 mm to start with ([`shutter.md`](shutter.md); C300 to C304) | P2 | S | `track-edge` | Q161 | The rails' sizes vary and are unmeasured; whether the slat holds the wall |
| `sash-wedge` | #159 | The wedge a sash opened part way leaves: a strip along its free edge and a triangle at each end, for tilt-and-turn, kip and hopper windows, inward casements and French doors; the tilted form first, then the turned ([`research/sash-wedge.md`](research/sash-wedge.md); C305) | P2 | L | `compression-edge`, `hose-port` | Q161 | Pieces that are not rectangles and joints at an angle are new; sashes and hinges vary |
| `sloped-frame` | #160 | Roof windows and awnings: a roof pitch, the gasket's grip on a slope, rain on a sloped face | P3 | S | `compression-edge`, `rain-face` | Q161 | The gasket's grip is not measured yet |
| `edge-notches` | #161 | Notches along an edge for a crank, a friction stay's arms or a handle | P3 | S | `compression-edge` | Q161 | Sealing round a notch; hardware varies |
| `pivot-window` | #162 | Pivot windows and centre-pivot roof windows: a flat wall on the half that swings out, a wedge on the half that swings in | P3 | L | `sash-wedge` | Q161 | Two walls either side of the sash |
| `louvre-frame` | #163 | Jalousie windows: edges clear of the blades' clips, the top tucked under the lowest blade | P3 | M | `compression-edge` | Q161 | The clips' sizes; sealing against the blades |
| `api-hosted` | #48 | A hosted web API, an HTTP service anyone can call (part of #1). **Parked**: no funding to run a server (Q32) | P3 | L | `api-library` | Q31, Q32 | Where it would run and who pays for it; against Q24's nothing sent to a server |

Issue #1, the owner's request for "an API and MCP for use by users and LLM agents", is the
parent of the four `api-*` rows (#45 to #48); it closes when they do.
