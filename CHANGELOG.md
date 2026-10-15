# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (owner's decision Q29).

The first version, `0.1.0`, is the MVP in [`docs/backlog.md`](docs/backlog.md); `0.2.0` adds the
API: the library, the command and the MCP server; `0.3.0` adds every P1 item: the hose port, the
printer list, the tape and TPU seals, the patterns and per-piece fills, the measured cutout, the
window AC, the offline file and the measuring guide. Changes since the latest version are listed
under Unreleased.

## [Unreleased]

### Added

- A hose port that locks and closes: under Advanced: the hose port, the hose can be held by a
  printed ring clamped on its end with an M4 bolt, whose three pins twist into slots near the
  collar's mouth (`--port-lock twist`); a cap for each port closes it while the AC is off
  (`--port-cap`, on to start with); a screen of bars can fill its hole (`--port-screen`). How to fit
  them: `docs/hose-port.md`. Not yet test printed.

- Material advice: under The panel, the material (PETG to start with, ASA, or PLA for test fits),
  its colour and whether the wall gets sun (`--material`, `--colour`, `--sun`). The plan names it,
  says how hot the wall gets in sun, and warns where that, or a hose's exhaust, comes within 10 °C
  of where the material gave in a loaded oven test: PLA in sun or beside a hose, dark PETG in sun.
  Why: `docs/materials.md`.

- Pieces cut from sheet: "Cut the pieces from sheet" under The panel (`--pieces sheet`) prints only
  the strips, cross pieces, edge strips and any piece with a fitting or a pattern of its own; the
  plan lists the pieces to cut by size, and the download leaves them out. Cut pieces can be as large
  as the sheet (1000 × 2000 mm to start with, `--sheet-width`, `--sheet-height`) while no piece is
  printed, and a strip longer than the printer makes is printed in segments. How to cut and fit
  them: `docs/sheet-pieces.md`. Not yet test printed.

- A joint that locks: the strips hold the pieces by small crush ribs inside their flanges, which
  reach 0.15 mm past each face (the grip, under Advanced: the joint between pieces, `--grip`), and
  a pin cut from 1.75 mm filament through each strip's middle and a slot in the piece stops a piece
  pulling out while it can still slide (`--pins`, on to start with). The plan says how many pins to
  cut and how long. A test coupon (`--coupon yes`) tries five grips side by side, and the measuring
  guide gains a fifth step that takes the grip from it. How it works: `docs/joints.md`. Not yet
  test printed.

- A sliding insert: "Something else, in a sliding insert" under "What is in the window?" gives
  the appliance's piece an opening, two rails on its room face and two printed shutters that slide
  in from each side and close round it, its width give or take their travel (20 mm to start with),
  each locked by an M4 bolt. Only a 1 mm clearance above and below stays open. The command takes
  `--insert 120x80`, with `--insert-travel` and `--insert-clearance`; the library and the MCP server
  `inserts` and `insert`. How to fit it: `docs/sliding-insert.md`. Not yet test printed.
- Clamps: "Something else, held by clamps" under "What is in the window?" takes an appliance
  measured roughly. Its piece gets an opening and eight bolt holes, and four printed jaws slide in
  on M4 bolts to grip it, the measured size give or take the jaws' travel (10 mm to start with,
  under Advanced). The plan names the bolts; `docs/clamps.md` says how to fit them, and that a
  small gap can stay open at each corner. The command takes `--clamp 120x80` or
  `--clamp 120x80@2,1`, with `--clamp-travel` and `--clamp-depth`; the library and the MCP server
  `clamps` and `clamp`. Not yet test printed.
- SVG tiles: a pattern of your own for the panel fill. Choose "SVG tile" as the fill, then an SVG
  file: its `viewBox` is one cell, repeated across the wall at the width you set (20 mm to start
  with, its height in proportion), and its filled shapes are the openings, with curves, arcs,
  holes, transforms and clones. A drawing it would read wrongly (clipped, masked, styled in ways
  it cannot follow) is refused with what to change. How to draw one: `docs/svg-tiles.md`. The
  command takes `--svg-tile tile.svg --svg-width 30`, the library and the MCP server the file's
  text as `fill.drawing`. The library has a new dependency, `svg-pathdata` (MIT).
- Exhaust fans: "Exhaust fan" under "What is in the window?" mounts a square-framed fan of 80,
  92, 120 or 140 mm in one piece: a round opening and four screw holes where the fan's own are,
  as the makers draw them (`docs/fan-sizes.md`). The 140 mm holes are short slots, so fans from
  makers who space them 124.5 or 125 mm apart both fit. The command takes `--fan 120` or
  `--fan 120@2,1`, the library and the MCP server `fans: [{ sizeMm: 120 }]`. Not yet test
  printed.

### Changed

- The joint's starting values have ribs and pins (see Added), so the same settings now make pieces
  with a slot for each pin along the edges they share, and strips with ribs and pin holes. In the
  library, `JointParams` has two more fields, `gripMm` and `pins`, and `Params` has `coupon`;
  `{ ...DEFAULT_JOINT, gripMm: 0, pins: false }` gives the joint as it was.

### Fixed

- The message for printed TPU joints chosen with foam tape no longer shows an internal reference,
  "(Q128)": it reads "Tape does not fit a joint: choose printed TPU for the joints." A test now
  checks that no message or plan line names one.

## [0.3.0] - 2026-10-05

### Added

- A measuring guide: "Measuring guide: what to measure, with pictures", at the top of the form,
  in four steps (the opening, the track, what passes through the wall, and a printed strip and
  piece), each with a drawing and fields that fill the form as you type. From a printed strip and
  piece measured with calipers it works out the joint's fit and, with "Use this fit", sets it.
  The library has the sum as `fitFromMeasured`.

- The page as one file that works offline: "Save the page as one file that works offline", under
  the download button, saves `window-sealer.html` (about 1.4 MB), the page with everything it
  needs inside. Open it in a browser any time, with or without a connection: it plans, draws and
  downloads as the hosted page does.

- A window air conditioner: under "What is in the window?", choose "Window air conditioner" and
  say where the unit is, seen from the room: below the wall, which stands on it, or to its left
  or right. The edge facing it gets a flat face, with the seal if there is one, and the plan
  says so. Measure the opening left open around the unit; in a hung window, make one wall for
  each side. Each edge's role can also be set against the unit by hand; the command takes
  `--bottom-edge unit`, the MCP server `edges.roles.bottom: "unit"`.

- A measured cutout: under "What is in the window?", choose "Something else: a measured cutout"
  and give the appliance's outside width and height. It is cut through one piece you pick, with
  a rim round it on the room side (15 mm deep, a 2.4 mm wall and 1 mm clearance a side to start
  with, under Advanced). With a seal, the rim is lined with it: foam tape in a groove round its
  inside, or a printed TPU frame. The command takes `--cutout 120x80`, repeatable, and
  `--rim-*`, the MCP server `cutouts` and `rim`; the piece's file says `-cutout-120x80`. Not
  yet test printed: the rim's sizes are starting values.

- A printed TPU seal: choose "Printed TPU" under "Seal" for gaskets printed in TPU in place of
  foam tape, in the same grooves and to the same sizes: a base in the groove with two thin fins
  that fold as the wall goes in. Where the tape's places under Advanced say, they also go on the
  edge strips' sides, and a TPU sleeve goes inside each hose port's collar. Under Advanced the
  joint strips and cross pieces can be printed in TPU too, gripping the panels. The TPU parts'
  files say `-tpu`. The command takes `--seal tpu` and `--tpu-joints`, the MCP server
  `seal.kind` `"tpu"` and `seal.tape.joints`. Not yet test printed: the fins and grip are
  starting values.

- A fill for any piece: under "Advanced: piece by piece", click a piece on the map of the wall
  and give it its own fill, sealed or a pattern, relief or cut through; the rest keep the wall's.
  The plan lists each one. The command repeats `--piece-fill 2,1=grid:through`, the MCP server
  takes `pieceFills`.

- A diamond pattern: choose "Diamond" under "Panel fill" for point-up diamonds in a lattice, as
  a leaded window, 20 mm wide and 30 mm tall with 3 mm bars to start with, all three under
  Advanced. The command takes `--fill diamond`, `--diamond-width`, `--diamond-height` and
  `--diamond-bar`, the MCP server `fill.diamond`.

- A brick pattern: choose "Brick" under "Panel fill" for brick-shaped openings in a running
  bond, 30 × 12 mm with 3 mm bars to start with, all three under Advanced. The command takes
  `--fill brick`, `--brick-width`, `--brick-height` and `--brick-bar`, the MCP server
  `fill.brick`.

- A hexagon pattern: choose "Hexagon" under "Panel fill" for a honeycomb of hexagonal openings,
  15 mm across the flats with 3 mm bars to start with, both under Advanced. The command takes
  `--fill hexagon`, `--hex-opening` and `--hex-bar`, the MCP server `fill.hexagon`.

- A grid pattern: choose "Grid" under "Panel fill" (sealed to start with). Its square openings
  are 15 mm with 3 mm bars to start with, both under Advanced, the bars no thinner than 0.8 mm.
  It is cut into the room side, half the panel deep, or cut through, letting air through. The
  pattern runs across the whole wall, inside a solid border on each piece. The command takes
  `--fill`, `--fill-style`, `--relief-depth`, `--grid-opening` and `--grid-bar`, the MCP server
  `fill`.

- A pattern framework in the library, for the patterns to come (the grid first): a tile of
  openings repeated across the whole wall so it lines up across the joints, inside a solid
  border on each piece (the slot depth plus 2 mm) and clear of a hose port's collar, cut
  through or into the room side. `pieceOpenings`, `patternedPanel` and a pattern argument to
  `buildPieces`; the page offers it once the grid is built.

- A tape seal: choose "Foam tape" under "Seal" (none to start with) and a size from the four
  sold by most makers (9 × 4, 9.5 × 4.8, 9 × 6 and 9.5 × 6.4 mm) or your own. Each edge strip
  gets a 1 mm groove for it on the face the track, the sash or the sill presses, and the wall
  leaves the tape room to be squeezed to half its thickness. Under Advanced the tape can also go
  on the strips' sides in a track and inside each hose port's collar. The plan says how much
  tape the wall takes; the preview shows it in orange. The command takes `--seal` and
  `--tape-*`, the MCP server `seal`. Not yet test printed: the groove and squeeze are starting
  values.
- A printer list: 29 printers, each bed read from its maker's site, grouped by maker under "Your
  printer". A listed printer's bed, less a margin under Advanced (10 mm to start with), is the
  largest piece, turned whichever way needs fewer pieces. "Not listed: 200 × 200 mm" stays the
  default, and "Custom size" stays. The command takes `--printer-model` and `--bed-margin`; the
  MCP server takes the printer's `id`.
- A round port for a portable air conditioner's hose: a push-fit collar on the room side of one
  piece, sized to the hose end's outside diameter (150 mm, 130 mm, or your own measurement),
  in the piece you pick, with more ports under Advanced. A piece too small for its port is
  said so, with what fixes it. The page, the command (`--port`) and the MCP server (`ports`)
  all offer it; the port's piece is named with its hose, as `piece-c2-r1-…-port-150.stl`.
  Not yet test printed: the collar's sizes are starting values.

### Changed

- On the page, "Tape size" is now "Seal size" and "Advanced: the tape" "Advanced: the seal", as
  printed TPU takes the same sizes.
- `--help` shows a percentage, such as `--tape-squeeze`, as `<%>` instead of `<mm>`.

## [0.2.0] - 2026-10-05

### Added

- The geometry as a library, the npm package `parametric-window-sealer` in `packages/core`
  (not yet on the registry). One call, `makeWall`, takes the same parameters as the page and
  returns the plan, its summary and the files; every step underneath is exported too. It runs
  in Node.js and in browsers, and its README's example is run by CI against the built package.
- The `window-sealer` command, the npm package `parametric-window-sealer-cli` in `packages/cli`
  (not yet on the registry). It takes every setting on the page as a flag or from a JSON file,
  writes the files into one folder named after the wall, and prints the page's summary or,
  with `--json`, the plan and files for scripts and LLM agents; `--dry-run` writes nothing.
- `planFiles` in the library: the names of the files a wall needs, without building them.
- The `window-sealer-mcp` server, the npm package `parametric-window-sealer-mcp` in `packages/mcp`
  (not yet on the registry): a local MCP server over stdio with four tools for LLM agents, to
  list and check the settings, plan a wall and make its files. The files are written under the
  one folder set with `--out-root`, or returned in the reply, as the agent chooses.
- `readSettings` and `SETTINGS` in the library: settings in its own shape, possibly partial,
  checked by the page's rules, and what each setting is. The command uses them too.

### Changed

- The page uses the library like any other user would; the library, the command, the MCP server
  and the page are one npm workspace.

## [0.1.0] - 2026-10-05

### Added

- Repository conventions: commit-identity and commit-message hooks with their tests, CI checks
  (lint, secret scan of the full history, identity of every commit), REUSE licensing
  (CERN-OHL-S-2.0 for the design and documentation, MPL-2.0 for code), and a startup hook that
  sets up cloud sessions.
- The requirements and every decision so far, in [`docs/status.md`](docs/status.md).
- The ranked backlog and the MVP, in [`docs/backlog.md`](docs/backlog.md), mirrored as GitHub
  issues.
- An engine benchmark, Manifold against OpenSCAD, in
  [`spikes/engine-benchmark/`](spikes/engine-benchmark/README.md).
- The page's skeleton in `web/`: a TypeScript page that starts the Manifold geometry engine,
  with unit tests, a browser test in Chromium, and a CI job for both.
- Dividing the opening into a grid of pieces (`web/src/layout.ts`): all equal, or full-size
  pieces plus one filler at the start, the end, the middle, or split for symmetry, chosen per
  axis; pieces under the minimum are reported, not refused.
- A default maximum piece size of 200 × 200 mm, plus a custom size
  (`web/src/printer.ts`), backed by the build volumes of 29 printers read from their makers'
  sites ([`docs/printer-beds.md`](docs/printer-beds.md)).
- The parameter panel on the page: the opening's size, the largest piece (default or custom),
  how each axis is divided and where the filler goes, and the panel thickness. It shows how
  many pieces of which sizes you will get, warns about pieces under the minimum, and marks
  any value it cannot use.
- A statement, in the README and on the page, that the files the tool generates and anything
  printed from them are yours to use, change, share or sell, with no conditions.

- A workflow that builds the site for GitHub Pages on every push and keeps it as a
  downloadable artifact; it publishes only once the repository owner switches it on.
- The first piece shape: a plain sealed panel of any size and thickness, built for every cell
  of the plan (`web/src/panel-geometry.ts`), lying flat as it is printed.
- Downloading the pieces: a dialog where you choose STL or 3MF, as separate files, one zip, or
  every piece in one 3MF file. It remembers your last choice in your own browser. Files are
  named by their place in the wall and their size.
- A 3D preview of the wall, drawn with three.js: the same pieces you download, each outlined,
  redrawn as you edit; drag to turn it, scroll or pinch to zoom. A browser without WebGL is
  told so, and the rest of the page still works.
- The joint between pieces: an H-shaped strip that slides over the edges of two pieces and
  holds by friction, standing proud of both faces, and a square cross piece where four pieces
  meet. Its slot depth, slide, web, flanges and fit are starting values, not yet test printed,
  and can be changed under "Advanced". The preview shows the strips in place, and the download
  includes one file per strip shape and the cross piece, named with how many to print and
  lying as they print, standing on their flanges.
- When full-size pieces leave less room than a joint takes, the plan says so and offers three
  ways out, one already chosen: spread the pieces a little, use equal pieces, or shorten one
  full piece.
- The wall's outer edges: an edge strip on every edge that slides onto the panel and fills the
  window's track, or gives a flat face to the closed sash or a sill. Choose the window type
  (horizontal slider or single- or double-hung) and each edge is set for you; change any edge
  that differs. Track width and depth are settings, with example values; the strips sit
  inside the track, and long ones come in segments that fit your printer.

### Changed

- Each joint now takes room between the pieces (5 mm with the starting values), so the pieces
  are a little smaller than before for the same opening.
- The opening is measured as you see it; the pieces now reach into the window's tracks and
  stop short of the sash, so their sizes change again for the same opening.
- The smallest piece is now what the joints need, 34 mm with the starting values, instead of
  a 30 mm placeholder: the slot depth at both edges plus a strip's width between them. It
  follows the joint settings.
- The code that defines the pieces' shapes is licensed MPL-2.0 like the rest of the code; the
  documentation stays CERN-OHL-S-2.0.
