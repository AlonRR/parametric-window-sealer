# parametric-window-sealer

Parametric, 3D-printable panels that close off the part of a window left open around a window
air conditioner, fan or hose: the geometry as a library for Node.js and browsers. It is the
same code the project's web page runs.

**Version 0.3.0, not yet test printed.** You give it the opening and a few choices; it plans a
wall of flat panels joined by H-shaped strips, with cross pieces where four panels meet and
an edge strip along each side of the opening, and writes the STL or 3MF files to print. The
joint and track sizes are starting values that a test print still has to confirm.

## Getting it

The package is not on the npm registry yet. Until it is, build it from the repository
(Node.js 22.12 or later):

```bash
npm ci
npm run build -w parametric-window-sealer   # into packages/core/dist
npm pack -w parametric-window-sealer        # a .tgz your project can install
```

## Use

```js
import { writeFile } from 'node:fs/promises';
import { EXAMPLE_PARAMS, ParamsError, makeWall } from 'parametric-window-sealer';

const params = { ...EXAMPLE_PARAMS, openingWidthMm: 420, openingHeightMm: 760 };

try {
  const wall = await makeWall(params, { format: '3mf', packaging: 'single' });
  console.log(wall.summary.headline);
  for (const file of wall.files) await writeFile(file.name, file.bytes);
} catch (error) {
  if (!(error instanceof ParamsError)) throw error;
  for (const [field, message] of Object.entries(error.errors)) console.error(`${field}: ${message}`);
  process.exitCode = 1;
}
```

`makeWall(params, choice, options?)` returns:

- `plan`: every piece's size and position, the joints between them and what was left over;
- `summary`: the same plan as the lines the page shows, for example
  `15 pieces: 3 across, 5 up, 3 mm thick`, and any warnings;
- `files`: each with a `name`, a media `type` and its `bytes`.

### The parameters

Start from `EXAMPLE_PARAMS` and change what differs. Every length is in mm.

| Field                                  | What it is                                                                                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openingWidthMm`, `openingHeightMm`    | The visible opening to close                                                                                                                                                                                            |
| `printer`                              | `{ kind: 'default' }` for 200 × 200 mm pieces, `{ kind: 'custom', widthMm, heightMm }`, or `{ kind: 'model', id }` for a printer in `PRINTERS`, its bed turned whichever way needs fewer pieces |
| `bedMarginMm`                          | How much smaller than a listed printer's bed the largest piece is, each way (`DEFAULT_BED_MARGIN_MM`, 10)                                                                                                                 |
| `width`, `height`                      | How each direction is divided: `mode` `'equal'` or `'full-plus-filler'`; `filler` `'start'`, `'end'`, `'middle'` or `'split'`; `leftover` `'spread'`, `'equal'` or `'shorten'` for when full pieces leave less than a joint |
| `thicknessMm`                          | The panels' thickness                                                                                                                                                                                                   |
| `joint`                                | The strips' `slotMm`, `slideMm`, `webMm`, `flangeMm` and `fitMm` (`DEFAULT_JOINT`)                                                                                                                                      |
| `edges`                                | The `window` (`'slider'` or `'hung'`), each edge's role (`'track'`, `'sash'`, `'sill'` or `'unit'`, against a window AC; `WINDOW_PRESETS`, `unitRoles`) and the `track`'s width, clearance and depth at each edge                                                   |
| `ports`                                | Hose ports, none for a plain wall: each `{ hoseMm, column, row }`, the hose end's outside diameter (`COMMON_HOSE_MM`: 150 and 130) and its piece, from 1 at the bottom left seen from the room                     |
| `collar`                               | The port's collar: `depthMm`, `wallMm`, `clearanceMm`, `lipMm` (`DEFAULT_COLLAR`)                                                                                                                                       |
| `cutouts`                              | Measured cutouts, none to start with: each `{ widthMm, heightMm, column, row }`, the appliance's outside seen from the room and its piece, from 1 at the bottom left                                                    |
| `rim`                                  | The rim round each cutout: `depthMm`, `wallMm`, `clearanceMm` (`DEFAULT_RIM`); lined with the seal when there is one                                                                                                   |
| `seal`                                 | `{ kind: 'none' }`, `'tape'` or `'tpu'` (gaskets printed in TPU to the tape's size), with the `tape`'s `widthMm`, `thicknessMm` (`TAPE_SIZES`), `grooveMm`, `squeezePct`, whether it also goes on the strips' `sides` and in each `port`, and with TPU whether the `joints` are TPU too (`NO_SEAL`, `DEFAULT_TAPE`)   |
| `fill`                                 | `{ kind: 'sealed' }`, or a pattern: `'grid'`, `'hexagon'`, `'brick'` or `'diamond'` (`FILL_KINDS`), its `style` (`'relief'`, cut into the room side to `reliefPct` of the thickness, or `'through'`), and each pattern's sizes in `grid`, `hexagon`, `brick` and `diamond` (`SEALED` holds the starting ones; bars at least `MIN_BAR_MM`) |
| `pieceFills`                           | Pieces with a fill of their own, none to start with: each `{ column, row, kind, style? }`, from 1 at the bottom left seen from the room; the sizes stay the wall's (`fillFor` gives a piece's fill) |

Wrong parameters throw a `ParamsError` whose `errors` names every wrong field with the page's
message. `validateParams(params)` gives the same messages without building anything.

### The files

`choice.format` is `'stl'` or `'3mf'`; `choice.packaging` is:

- `'separate'`: one file per panel, named by its column, row and size
  (`piece-c1-r1-197.7x198.6.stl`), and one per strip, cross or edge shape, named by its size
  and how many to print (`strip-182.6x18-print-10.stl`); an edge strip with tape on its
  sides also names its track's depth (`edge-152.5x13x11-track-10-print-8.stl`), and a part
  printed in TPU says so (`gasket-152.5x9.5x4-tpu-print-8.stl`, `sleeve-150-tpu-print-1.stl`),
  and a piece with a cutout names it (`piece-c2-r1-197.7x198.6-cutout-120x80.stl`);
- `'zip'`: those files in one ZIP;
- `'single'`: one 3MF holding every copy (3MF only, since an STL holds one object).

### In a browser

The geometry engine is [Manifold](https://github.com/elalish/manifold), as WebAssembly. Node
finds its `manifold.wasm` by itself. A bundler moves and renames the file, so pass its URL:
with Vite, `import wasmUrl from 'manifold-3d/manifold.wasm?url'` and then
`makeWall(params, choice, { wasmUrl })`. The engine starts once and is shared; you can also
start it with `loadEngine(wasmUrl)` and pass it as `{ engine }`.

### The steps underneath

Everything `makeWall` uses is exported too: `planWall` and `planParts` (the layout, joints
and edges), `describePlan`, `readParams` and `toFormValues` (the page's form values), `readSettings`
and `SETTINGS` (settings in the library's shape, possibly partial, and what each one is),
`pieceLimit` (the largest piece a wall's printer allows), the
shapes (`plainPanel`, `portPanel`, `stripSolid`, `crossSolid`, `edgeStripSolid`), the hose
port's rules (`checkPort`, `parsePorts`, `formatPorts`), the measured cutout's (`checkCutout`,
`parseCutouts`, `formatCutouts`, `linedRim`, `cutoutPanel`, `frameShapes`, `frameSolid`), the per-piece fills'
(`fillFor`, `parsePieceFills`, `formatPieceFills`), the tape's (`tapeFit`, `tapedCollar`,
and `edgeTapeSolid` and `portTapeSolid`, the tape itself for a preview), the TPU seal's
(`gasketShapes`, `gasketSolid`, `sleeveShapes`, `sleeveSolid`, `tpuJoint`), every part's shape
(`wallPartShapes`), the pattern framework
(`pieceOpenings`, `patternedPanel`, `patternBorderMm`, and a tile of openings passed to
`buildPieces`, as `gridTile`, `hexagonTile`, `brickTile`, `diamondTile` and `fillPattern`
make), the measuring guide's sum (`fitFromMeasured` and `measuredPlayMm`, the fit from a
printed strip and piece measured with calipers) and the file writers
(`toStl`, `to3mf`, `packageDownload`), with `planFiles`, which names the files without
building them. The types are in the package.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The library's code is under the Mozilla Public License 2.0 (MPL-2.0).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
