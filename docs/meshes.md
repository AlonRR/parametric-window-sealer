# Meshes

A mesh is a 3D shape made in another program and saved as a file: a model of a window air
conditioner, an accessory tile, a whole piece of your own (Q25). The library reads one, repairs what
it can repair without guessing the shape, and refuses the rest with what to do about it.

The parts that use a mesh:

- cutting the wall round a model of the appliance (`mesh-appliance`, #35; below);
- tiles placed on a panel (`mesh-tiles`, #40), still to come;
- a whole piece of your own (`mesh-custom-piece`, #41), still to come.

## The files it reads

| Format | Read |
|---|---|
| STL, binary | Its faces, in mm |
| STL, text | Its faces, in mm |
| OBJ | Its corners (`v`) and faces (`f`, of three or more corners, with or without texture and normal indices, counted from 1 or back from the last), in mm; normals, textures, materials and groups are left aside |
| 3MF | The objects its build places, with their transforms and components, also those kept in other parts of the file; in its own unit (micron, mm, cm, inch, foot or metre), turned to mm |

The format is read from the file itself, not its name. STL and OBJ files carry no unit, so they are
taken to be in mm. A mesh whose largest side is under 1 mm, or over 10 m, is noted as perhaps drawn
in another unit: scale it to mm before importing.

## What it repairs

Each repair is listed with the mesh, in words:

- **Corners at the same place** (within a hundredth of a micron) are made one corner, as an STL file
  repeats each corner for every face that meets there.
- **Faces with no area**, their corners in a line or the same corner twice, are dropped.
- **Faces turned the wrong way** are turned to face the same way as their neighbours.
- **A part turned inside out** is turned to face outward. A mesh may have several separate parts.

## What it refuses

A mesh the engine cannot cut and join cleanly is refused, with a message saying what to do. The
repairs needed would mean guessing the shape:

| The message | What to do |
|---|---|
| The mesh is not closed | Close its holes in your modelling program, or with your slicer's repair, then save it again |
| An edge shared by more than two faces | Separate the parts that touch along an edge, or repair it |
| It cannot be made to face one way | Repair it: it has no clear inside |
| More faces than the tool takes (500,000) | Simplify it with your modelling program's decimate tool |
| The STL file is cut short | Save or download it again |
| A corner that is not a number | Save it again from the program that made it |
| A 3MF file with no model, or whose build places nothing | Save it again with the object placed on the plate |

## Cutting the wall round a model of the appliance

Where the appliance is not a box you can measure, give the wall a 3D model of it: on the page,
**Something else: cut round its 3D model** under "What is in the window?"; for the command,
`--model-file ac.stl`; for the library and the MCP server, `model.file`, the file's bytes in base64.
The file is read as above, and stays on your computer.

- **Which side faces the room.** Name it as your modelling program names its views: the front (the
  front view, seen from −Y with Z up, to start with), the back, the left or right side (the right
  view is seen from +X with Z up), the top (the top view, seen from +Z with Y up) or the underside.
  A model drawn standing up with its front towards −Y, as most programs draw one, needs no change.
- **The opening** follows the model's outline seen from the room: its shadow, so the whole
  appliance passes through. An opening inside the shadow, such as a frame's middle, is filled, as
  the wall cannot hold an island. Separate parts of the shadow get separate openings.
- **The rim** is the measured cutout's: the opening is 1 mm clear of the outline all round, its
  corners rounded to keep that distance, and a rim 15 mm deep with a 2.4 mm wall stands round it on
  the room side. The cutout's rim settings change both. The rim is not lined with the seal.
- **Its piece.** The model is centred in one piece, on its outline's box: the bottom row's middle
  piece, or the column and row you give (`--model-column`, `--model-row`; 0 and 0 for the starting
  piece). The piece needs the room a cutout of the outline's box needs, and no other fitting may
  share it.
- **The plan** names the file's format, the outline's size, the side facing the room, the piece,
  the opening and the rim, what was repaired, and a note if the model may be in another unit. The
  piece's file name ends in `-model-` and the outline's size: `piece-c2-r1-197.7x198.6-model-120x80.stl`.

One model goes in a wall. A large file is read once, about a second for 80,000 faces (measured once,
in Node), and kept while its settings change.

## For contributors

`readMesh(bytes)` returns the mesh, indexed, in mm, with its size, its repairs and its notes, or the
reason it was refused; `meshSolid(engine, mesh)` makes it a solid. The code is
`packages/core/src/mesh/`: `formats.ts` reads each format, `repair.ts` repairs or refuses.

The appliance's model is `packages/core/src/appliance-model.ts`: `encodeModelFile(bytes)` gives the
setting, `readApplianceModel(file, view)` reads and turns it, `modelOutline` projects its shadow,
`modelPanel` cuts the piece and `modelProblem` checks its room. `fittings/appliance-model.ts` makes
it a fitting, placed after the others.
