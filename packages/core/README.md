# parametric-window-sealer

Parametric, 3D-printable panels that close off the part of a window left open around a window
air conditioner, fan or hose: the geometry as a library for Node.js and browsers. It is the
same code the project's web page runs.

**Version 0.1.0, not yet test printed.** You give it the opening and a few choices; it plans a
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
| `printer`                              | `{ kind: 'default' }` for 200 × 200 mm pieces, or `{ kind: 'custom', widthMm, heightMm }`                                                                                                                               |
| `width`, `height`                      | How each direction is divided: `mode` `'equal'` or `'full-plus-filler'`; `filler` `'start'`, `'end'`, `'middle'` or `'split'`; `leftover` `'spread'`, `'equal'` or `'shorten'` for when full pieces leave less than a joint |
| `thicknessMm`                          | The panels' thickness                                                                                                                                                                                                   |
| `joint`                                | The strips' `slotMm`, `slideMm`, `webMm`, `flangeMm` and `fitMm` (`DEFAULT_JOINT`)                                                                                                                                      |
| `edges`                                | The `window` (`'slider'` or `'hung'`), each edge's role (`'track'`, `'sash'` or `'sill'`; `WINDOW_PRESETS`) and the `track`'s width, clearance and depth at each edge                                                   |

Wrong parameters throw a `ParamsError` whose `errors` names every wrong field with the page's
message. `validateParams(params)` gives the same messages without building anything.

### The files

`choice.format` is `'stl'` or `'3mf'`; `choice.packaging` is:

- `'separate'`: one file per panel, named by its column, row and size
  (`piece-c1-r1-197.7x198.6.stl`), and one per strip, cross or edge shape, named by its size
  and how many to print (`strip-182.6x18-print-10.stl`);
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
and edges), `describePlan`, `readParams` and `toFormValues` (the page's form values), the
shapes (`plainPanel`, `stripSolid`, `crossSolid`, `edgeStripSolid`) and the file writers
(`toStl`, `to3mf`, `packageDownload`). The types are in the package.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The library's code is under the Mozilla Public License 2.0 (MPL-2.0).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
