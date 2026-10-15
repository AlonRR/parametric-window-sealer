# parametric-window-sealer

Parametric, 3D-printable panels that close off the part of a window left open around a window
air conditioner, fan or hose: the geometry as a library for Node.js and browsers. It is the
same code the project's web page runs.

**Version 0.5.0, not yet test printed.** You give it the opening and a few choices; it plans a
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
| `joint`                                | The strips' `slotMm`, `slideMm`, `webMm`, `flangeMm` and `fitMm`; `gripMm`, how far their ribs reach past each panel face, and `pins`, a filament pin through each strip (`DEFAULT_JOINT`; `docs/joints.md`)                                                                                                                                      |
| `edges`                                | The `window` (`'slider'`, `'hung'` or `'frame'`), each edge's role (`'track'`, `'sash'`, `'sill'`, `'unit'`, against a window AC, or `'frame'`, pressed into a frame with no track and held by the TPU seal; `WINDOW_PRESETS`, `unitRoles`) and the `track`'s width, clearance and depth at each edge                                                   |
| `rail`                                 | The filler between the sashes: `gapMm`, the gap where they overlap, front to back, 0 for none (`DEFAULT_RAIL`): a bar as long as the edge the sash presses on, the seal in a groove on both faces, printed in lengths that lap (`docs/sash-filler.md`) |
| `stop`                                 | A sash stop: `lengthMm`, the gap along the sash's track from its edge to the frame, 0 for none (`DEFAULT_STOP`): a strut that lies in the track and lifts out by hand, printed in lengths that lap and pin (`docs/sash-stop.md`) |
| `wall`                                 | `'single'` (to start with) or `'double'`: each plain printed piece hollow inside the panel's thickness, two 1.2 mm skins round an air gap, at least 6.4 mm thick in all (`docs/double-wall.md`) |
| `stiffen`                              | `true` (to start with): a wall more than 500 mm across its short span gets lengths of 20 × 20 × 2 mm aluminium angle on printed clips, the plan saying where (`planStiffeners`; `docs/stiffeners.md`) |
| `ports`                                | Hose ports, none for a plain wall: each `{ hoseMm, column, row }`, the hose end's outside diameter (`COMMON_HOSE_MM`: 150 and 130) and its piece, from 1 at the bottom left seen from the room                     |
| `collar`                               | The port's collar: `depthMm`, `wallMm`, `clearanceMm`, `lipMm` (`DEFAULT_COLLAR`)                                                                                                                                       |
| `socket`                               | How each port holds the hose, `lock` `'push'` or `'twist'` (a printed ring that clamps on the hose end and twists in), and whether it has a `cap` and a `screen` (`DEFAULT_SOCKET`; `docs/hose-port.md`) |
| `cutouts`                              | Measured cutouts, none to start with: each `{ widthMm, heightMm, column, row }`, the appliance's outside seen from the room and its piece, from 1 at the bottom left                                                    |
| `rim`                                  | The rim round each cutout: `depthMm`, `wallMm`, `clearanceMm` (`DEFAULT_RIM`); lined with the seal when there is one                                                                                                   |
| `fans`                                 | Fans from the list (`FANS`: 80, 92, 120 and 140 mm), none to start with: each `{ sizeMm, column, row }`, its piece from 1 at the bottom left                                                                           |
| `clamps`                               | Appliances held by clamps (#32), none to start with: each `{ widthMm, heightMm, column, row }`, the appliance measured roughly, its piece from 1 at the bottom left |
| `clamp`                                | The clamps' jaws: `travelMm`, how far each slides (the give or take), and `depthMm`, how far its lip stands out (`DEFAULT_CLAMP`) |
| `inserts`                              | Appliances in a sliding insert (#38), none to start with: each `{ widthMm, heightMm, column, row }` |
| `insert`                               | The shutters: `travelMm` and `clearanceMm` (`DEFAULT_INSERT`) |
| `seal`                                 | `{ kind: 'none' }`, `'tape'` or `'tpu'` (gaskets printed in TPU to the tape's size, in a groove deep enough for their fins to fold into), with the `tape`'s `widthMm`, `thicknessMm` (`TAPE_SIZES`), `grooveMm`, `squeezePct`, whether it also goes on the strips' `sides` and in each `port`, and with TPU whether the `joints` are TPU too (`NO_SEAL`, `DEFAULT_TAPE`)   |
| `fill`                                 | `{ kind: 'sealed' }`, or a pattern: `'grid'`, `'hexagon'`, `'brick'`, `'diamond'` or `'svg'` (`FILL_KINDS`), its `style` (`'relief'`, cut into the room side to `reliefPct` of the thickness, or `'through'`), each pattern's sizes in `grid`, `hexagon`, `brick`, `diamond` and `svg` (`SEALED` holds the starting ones; bars at least `MIN_BAR_MM`), and the SVG tile's `drawing`, the text of an SVG file (`SAMPLE_SVG_TILE` to start with) |
| `pieceFills`                           | Pieces with a fill of their own, none to start with: each `{ column, row, kind, style? }`, from 1 at the bottom left seen from the room; the sizes stay the wall's (`fillFor` gives a piece's fill) |
| `coupon`                               | `true` adds the joint's test coupon to the files: five short strips that try the grip |
| `sheet`                                | `source` `'printed'` or `'sheet'`, and the sheet's `widthMm` and `heightMm` (`DEFAULT_SHEET`): with `'sheet'`, the pieces without a fitting or pattern of their own are cut from it and left out of the files (`docs/sheet-pieces.md`) |
| `rain`                                 | `true` (to start with) gives every strip and edge strip weep holes in one flange, to fit outside, and each edge strip with no seal on its outer face a drip groove under it (`docs/rain.md`) |
| `material`                             | `kind` `'petg'`, `'asa'` or `'pla'`, `colour` `'light'` or `'dark'`, and `sun`, whether the outside gets direct sun (`DEFAULT_MATERIAL`): the plan names it and warns where it gets too hot (`docs/materials.md`) |

Wrong parameters throw a `ParamsError` whose `errors` names every wrong field with the page's
message. `validateParams(params)` gives the same messages without building anything.

### The files

`choice.format` is `'stl'` or `'3mf'`; `choice.packaging` is:

- `'separate'`: one file per panel, named by its column, row and size
  (`piece-c1-r1-197.7x198.6.stl`), and one per strip, cross or edge shape, named by its size
  and how many to print (`strip-182.6x18-print-10.stl`); an edge strip with tape on its
  sides also names its track's depth (`edge-152.5x13x11-track-10-print-8.stl`), and a part
  printed in TPU says so (`gasket-152.5x9.5x4-tpu-print-8.stl`, `sleeve-150-tpu-print-1.stl`),
  a piece with a cutout names it (`piece-c2-r1-197.7x198.6-cutout-120x80.stl`), and the filler
  between the sashes names its end and middle lengths (`rail-end-157.2x18x20-print-2.stl`);
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
shapes (`plainPanel`, `portPanel`, `stripSolid`, `crossSolid`, `edgeStripSolid`), the joint's ribs
and pins (`ribPlacesMm`, `planPins`, `pinSlotsIn`, `pinSlotCuts`, `pinSolid`) and its test coupon
(`couponShape`, `couponSolid`), the pieces cut from sheet (`isCut`, `printedFor`, `slotPins`,
`describeSheet`, with `pieceLimit`, `printLimit` and `longestStripMm`), the material advice
(`hottestC`, `describeMaterial`, `materialWarnings`, `GIVES_AT_C`), the hose port's twist-lock,
cap and screen (`socketEndMm`, `socketSlots`, `ringShapes`, `ringSolid`, `capShapes`, `capSolid`,
`screenBars`), the hose
port's rules (`checkPort`, `parsePorts`, `formatPorts`), the measured cutout's (`checkCutout`,
`parseCutouts`, `formatCutouts`, `linedRim`, `cutoutPanel`, `frameShapes`, `frameSolid`), the fan mount's
(`FANS`, `checkFan`, `parseFans`, `formatFans`, `fanPanel`), the clamps' (`checkClamp`, `parseClamps`,
`formatClamps`, `clampPanel`, `jawShapes`, `jawSolid`), the sliding insert's (`checkInsert`, `parseInserts`,
`formatInserts`, `insertPanel`, `shutterShapes`, `shutterSolid`), the per-piece fills'
(`fillFor`, `parsePieceFills`, `formatPieceFills`), the tape's (`tapeFit`, `tapedCollar`,
and `edgeTapeSolid` and `portTapeSolid`, the tape itself for a preview), the TPU seal's
(`gasketShapes`, `gasketSolid`, `sleeveShapes`, `sleeveSolid`, `tpuJoint`), every part's shape
(`wallPartShapes`), the pattern framework
(`pieceOpenings`, `patternedPanel`, `patternBorderMm`, and a tile of openings passed to
`buildPieces`, as `gridTile`, `hexagonTile`, `brickTile`, `diamondTile`, `svgDrawingTile` and
`fillPattern` make, with `readSvgDrawing` reading an SVG tile's drawing), the measuring guide's sum (`fitFromMeasured` and `measuredPlayMm`, the fit from a
printed strip and piece measured with calipers), a mesh of your own (`readMesh`, reading an STL, OBJ
or 3MF file and repairing or refusing it, and `meshSolid`), the appliance's model (`encodeModelFile`,
`readApplianceModel`, `modelOutline`, `modelPanel`), the 3D tile (`readMeshTile`, `tileCells`,
`tiledPanel`), a whole piece of your own (`customPanel`) and the file writers
(`toStl`, `to3mf`, `packageDownload`), with `planFiles`, which names the files without
building them. The types are in the package.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The library's code is under the Mozilla Public License 2.0 (MPL-2.0).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
