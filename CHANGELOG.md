# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (owner's decision Q29).

The first version, `0.1.0`, is the MVP in [`docs/backlog.md`](docs/backlog.md); `0.2.0` adds the
API: the library, the command and the MCP server. Changes since the latest version are listed
under Unreleased.

## [Unreleased]

### Added

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
