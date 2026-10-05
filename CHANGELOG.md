# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (owner's decision Q29).

The first version, `0.1.0`, is the MVP in [`docs/backlog.md`](docs/backlog.md). Changes since
the latest version are listed under Unreleased.

## [Unreleased]

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
