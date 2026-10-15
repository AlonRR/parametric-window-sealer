# window-sealer

The `window-sealer` command plans the 3D-printable panels that close off the part of a window
left open around a window air conditioner, fan or hose, and writes the STL or 3MF files to
print. It takes the settings the project's web page has, as flags or from a JSON file, for
scripts, batch use and LLM agents. The geometry comes from the `parametric-window-sealer`
library, which it installs with it.

**Version 0.3.0, not yet test printed.** The joint and track sizes are starting values that a
test print still has to confirm.

## Getting it

The package, `parametric-window-sealer-cli`, is not on the npm registry yet. Until it is, build
it and the library from the repository (Node.js 22.12 or later), then install both into your
project, or with `-g` for every project:

```bash
npm ci
npm run build -w parametric-window-sealer -w parametric-window-sealer-cli
npm pack -w parametric-window-sealer -w parametric-window-sealer-cli
npm install ./parametric-window-sealer-0.3.0.tgz ./parametric-window-sealer-cli-0.3.0.tgz
```

## Use

Give it the opening you can see, in mm:

```bash
window-sealer --width 600 --height 1000
```

```text
15 pieces: 3 across, 5 up, 3 mm thick
Widths: 197.7, 197.7, 197.7 mm
Heights: 198.6, 198.6, 198.6, 198.6, 198.6 mm
Pieces and joints: 603 × 1013 mm, for a 600 × 1000 mm opening.
Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide. Pins: 44, each 6.6 mm of 1.75 mm filament, two through the middle of each strip.
Edges: 18 edge strips in 3 shapes.

Wrote 21 files to window-sealer-600x1000/:
  piece-c1-r1-197.7x198.6.stl
  ...
  strip-182.6x18-print-10.stl
  strip-181.7x18-print-12.stl
  cross-18x18-print-8.stl
  edge-200x14x10-print-5.stl
  edge-200x15x10-print-5.stl
  edge-152.5x14x10-print-8.stl
```

Each panel has its own file; a strip, cross or edge file is one shape, and its name says how
many to print. Everything else starts where the page starts, and every setting on the page has
a flag; `window-sealer --help` lists them with their starting values. Some more:

```bash
window-sealer --width 600 --height 1000 --window hung --thickness 4
window-sealer --width 600 --height 1000 --format 3mf --packaging single
window-sealer --width 600 --height 1000 --dry-run
window-sealer --width 600 --height 1000 --port 150
window-sealer --width 600 --height 1000 --printer-model prusa-mk4s
```

- `--format stl` or `3mf`, and `--packaging separate` (one file per panel or shape), `zip` (those
  in one ZIP) or `single` (one 3MF holding every copy). The default is separate STL files.
- The files go into one folder named after the wall, or `--out <folder>`. If the folder exists
  it stops, unless `--force`, which replaces the files it writes and leaves any others there.
- `--dry-run` prints the plan and the files it would write, and writes nothing.
- `--window slider` or `hung` sets the four edges as the page does; an edge flag such as
  `--top-edge track` then changes one. A `--printer-width` or `--printer-height` makes the
  printer custom.
- `--rail-gap 20` adds a filler for the 20 mm gap between the sashes where they overlap, as
  long as the edge the sash presses on, with the seal on both faces, printed in lengths that lap;
  why and how to measure is in the repository's `docs/sash-filler.md`.
- `--printer-model prusa-mk4s` picks your printer from the list (`--help` names them all): its
  bed less `--bed-margin` (10 mm to start with) is the largest piece, turned whichever way needs
  fewer pieces.
- When full pieces leave too little room for a joint, it says so, the way the page does, and
  lists what `--width-leftover` or `--height-leftover` can do instead.
- `--bottom-edge unit` puts the wall on a window air conditioner: that edge meets the unit with
  a flat face, and the summary says so. Beside the unit, as in a hung window, it is
  `--left-edge unit` or `--right-edge unit`, one wall for each side; measure the opening left
  open around the unit.
- `--port 150` adds a round port for a portable air conditioner's hose, sized to the hose end's
  outside diameter (150 and 130 mm are common; measure the end that goes in), in the bottom
  row's middle piece; `--port 150@2,1` puts it in column 2, row 1, counted from the bottom left
  seen from the room. Give `--port` again for each port. `--cutout 120x80` cuts an opening for
  an appliance you measured, 120 mm wide and 80 mm high seen from the room, with a rim round it
  lined with the seal if there is one; `--cutout 120x80@2,1` places it, and `--rim-depth`,
  `--rim-wall` and `--rim-clearance` change the rim. `--fan 120` mounts an exhaust fan: a round
  opening and four screw holes for a fan of 80, 92, 120 or 140 mm, as its maker draws them;
  `--fan 120@2,1` places it, and `--fan` again adds one. `--insert 120x80` closes two printed shutters round an
  appliance from each side, give or take their travel (`--insert-travel`, 20 mm;
  `--insert-clearance`, 1 mm above and below). `--clamp 120x80` grips an appliance
  measured roughly with four printed jaws on M4 bolts, give or take their travel (`--clamp-travel`,
  10 mm; `--clamp-depth` for the jaws' lips); `--clamp 120x80@2,1` places it, and the jaws are
  among the files. `--collar-depth`, `--collar-wall`,
  `--collar-clearance` and `--collar-lip` change the collar the hose end slides into.
- `--seal tape` adds closed-cell foam tape in a groove along each edge strip's face that the track, sash or
  sill presses; `--tape-width` and `--tape-thickness` set its size (9 × 4 mm to start with;
  any `--tape-*` flag alone means tape). `--tape-sides yes` puts it on the strips' sides in a
  track too, and `--tape-port yes` inside each hose port's collar; `--tape-groove` and
  `--tape-squeeze` change how deep its groove is and how far it is squeezed. `--seal tpu` prints
  gaskets in TPU in the tape's place, to the same sizes, their fins leaning in to fold flat into a
  groove made deep enough for them, with a TPU sleeve in each collar where
  `--tape-port yes` says; `--tpu-joints yes` prints the joint strips and cross pieces in TPU
  too (alone, it means `--seal tpu`).
- `--fill grid` gives the pieces a grid of square openings, cut into the room side
  (`--relief-depth`, 50 % of the thickness to start with) or, with `--fill-style through`,
  right through. `--grid-opening` (15 mm) and `--grid-bar` (3 mm, at least 0.8) set its sizes;
  either alone means the grid. `--fill hexagon` gives a honeycomb instead, sized with
  `--hex-opening` (15 mm across the flats) and `--hex-bar` (3 mm), and `--fill brick` bricks in
  a running bond, sized with `--brick-width` (30 mm), `--brick-height` (12 mm) and `--brick-bar`
  (3 mm). `--fill diamond` gives point-up diamonds, sized with `--diamond-width` (20 mm),
  `--diamond-height` (30 mm) and `--diamond-bar` (3 mm). `--svg-tile tile.svg` repeats a drawing
  of your own: its `viewBox` one cell and its filled shapes the openings, `--svg-width` wide
  (20 mm), its height in proportion; how to draw one is in the repository's `docs/svg-tiles.md`.
- `--piece-fill 2,1=sealed` gives one piece a fill of its own, by column and row from 1 at the
  bottom left seen from the room: `sealed`, or a pattern with an optional style, as
  `3,1=grid:through`. Give `--piece-fill` again for each piece.

### Settings in a file

`--params <file.json>` reads settings in the library's own shape; any it leaves out start where
the page starts, and flags override it:

```json
{
  "openingWidthMm": 812.5,
  "openingHeightMm": 455,
  "thicknessMm": 4,
  "edges": { "window": "hung" }
}
```

A setting the library does not have, or a value of the wrong kind, is refused with where it is
in the file. The `params` that `--json` prints is a complete file of this kind.

### For scripts and LLM agents

`--json` prints one JSON object instead of text. When it works: `ok: true`, `dryRun`, the
`params` used, the page's `summary`, the `plan`, the `out` folder and the `files`, each with its
`name`, media `type` and size in `bytes` (no size in a dry run). When it does not: `ok: false`
and `errors`, each with its `message` and, where one applies, the `flag` and the `setting`.

The exit status is 0 when it is done, 1 when it could not write (an existing folder without
`--force`, say), and 2 for wrong options or settings; nothing is written then.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The command's code is under the Mozilla Public License 2.0 (MPL-2.0).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
