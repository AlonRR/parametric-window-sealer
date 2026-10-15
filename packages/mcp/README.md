# window-sealer-mcp

A local MCP server that lets an LLM agent plan the 3D-printable panels that close off the part
of a window left open around a window air conditioner, fan or hose, and make the STL or 3MF
files to print. It runs on your own machine, started by your agent's app over stdio; nothing is
sent anywhere. The geometry comes from the `parametric-window-sealer` library, which it
installs with it.

**Version 0.5.0, not yet test printed.** The joint and track sizes are starting values that a
test print still has to confirm.

## Getting it

The package, `parametric-window-sealer-mcp`, is not on the npm registry yet. Until it is, build
it and the library from the repository (Node.js 22.12 or later) and install both for every
project, which puts `window-sealer-mcp` on your path:

```bash
npm ci
npm run build -w parametric-window-sealer -w parametric-window-sealer-mcp
npm pack -w parametric-window-sealer -w parametric-window-sealer-mcp
npm install -g ./parametric-window-sealer-0.5.0.tgz ./parametric-window-sealer-mcp-0.5.0.tgz
```

Then add it to your agent's app. Most take a list of MCP servers like this one:

```json
{
  "mcpServers": {
    "window-sealer": {
      "command": "window-sealer-mcp",
      "args": ["--out-root", "~/window-sealer"]
    }
  }
}
```

`--out-root` is the only folder the server writes under; each wall gets its own folder inside
it. Without `--out-root` the server still runs, and the files come only in the agent's reply.

## The tools

| Tool                           | What it does                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window_sealer_list_settings`  | Every setting: where it goes, what it means, the value it starts at and its choices. A good first call, to know what to ask you.                   |
| `window_sealer_check_settings` | Checks settings by the page's rules: the complete settings, or the page's message for each one that is wrong.                                      |
| `window_sealer_plan_wall`      | The page's summary (pieces, sizes, joints, edges, warnings and the choices when full pieces leave too little room), the plan and the file names. |
| `window_sealer_make_files`     | Makes the files and delivers them.                                                                                                                 |

The settings go in `settings`, in the library's own shape. Only the opening is required, in mm;
anything left out starts where the project's page starts:

```json
{
  "settings": {
    "openingWidthMm": 812.5,
    "openingHeightMm": 455,
    "edges": { "window": "hung" }
  }
}
```

Every tool that takes settings returns them complete, and they can be passed to the next tool
as they are. Setting the window type sets the four edges as the page does; a printer width or
height makes the printer custom, and a printer `id` from the list, such as `"printer": { "id":
"prusa-mk4s" }`, a listed one (`window_sealer_list_settings` names them all). A port for a portable air conditioner's hose goes in `ports`, as
`[{ "hoseMm": 150 }]`: the hose end's outside diameter (150 and 130 mm are common; measure the
end that goes in), and optionally its piece as `column` and `row`, from 1 at the bottom left seen
from the room; without them it goes in the bottom row's middle piece. An appliance measured only
roughly goes in `clamps`, as `[{ "widthMm": 120, "heightMm": 80 }]`, gripped by four printed jaws
on M4 bolts, give or take their travel (`clamp.travelMm`, 10 mm); one in `inserts` gets two
shutters that slide in rails and close round it (`insert.travelMm`, 20 mm). A 3D model of the
appliance goes in `model`, as `{ "file": "<the file's bytes in base64>", "view": "front" }`: the
wall is cut round its outline seen from the room, with the cutout's `rim`. Foam tape goes in `seal`,
as `{ "kind": "tape" }`, or with its size and places, such as `{ "tape": { "widthMm": 9.5,
"thicknessMm": 4.8, "sides": true } }`; tape settings without a `kind` mean tape. A grid pattern goes in `fill`, as `{ "kind": "grid" }`
or with its sizes, such as `{ "grid": { "openingMm": 12, "barMm": 2 }, "style": "through" }`;
grid settings without a `kind` mean the grid. A honeycomb is `"kind": "hexagon"`, its sizes in
`fill.hexagon` (`openingMm` across the flats, `barMm`); bricks are `"kind": "brick"`, sized in
`fill.brick` (`widthMm`, `heightMm`, `barMm`), and diamonds `"kind": "diamond"`, in `fill.diamond`
(`widthMm` and `heightMm` corner to corner, `barMm`). An SVG tile is `"kind": "svg"`, its
drawing in `fill.drawing` as the SVG file's text (its `viewBox` one cell, its filled shapes the
openings) and its width in `fill.svg.widthMm`; a drawing without a `kind` means the tile. A 3D
tile of your own is `"kind": "mesh"`, its file in `fill.mesh.file` as its bytes in base64 and the
side facing the room in `fill.mesh.view` (`top` to start with); a tile's file without a `kind` means
the tile. A piece with a fill of its own goes in
`pieceFills`, as `[{ "column": 2, "row": 1, "kind": "sealed" }]`, with an optional `style`.

`window_sealer_make_files` also takes:

- `format`: `stl` (the default) or `3mf`, and `packaging`: `separate` (the default; one file
  per panel and per strip, cross or edge shape, each named with how many to print), `zip`, or
  `single` (one 3MF holding every copy);
- `delivery`: `folder` (the default when there is an `--out-root`; the paths come back),
  `reply` (the files come back in the reply, base64, and nothing is written; the default
  without `--out-root`) or `both`;
- `folder`: a plain name for the wall's folder, such as `kitchen`; it starts at the wall's
  name, as `window-sealer-600x1000`. A path is refused;
- `overwrite`: if the folder exists it stops, unless this is `true`; then it replaces the files
  it makes and leaves any others there.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The server's code is under the Mozilla Public License 2.0 (MPL-2.0).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
