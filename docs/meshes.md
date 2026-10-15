# Meshes

A mesh is a 3D shape made in another program and saved as a file: a model of a window air
conditioner, an accessory tile, a whole piece of your own (Q25). The library reads one, repairs what
it can repair without guessing the shape, and refuses the rest with what to do about it.

The parts that use a mesh come next:

- cutting the wall round a model of the appliance (`mesh-appliance`, #35);
- tiles placed on a panel (`mesh-tiles`, #40);
- a whole piece of your own (`mesh-custom-piece`, #41).

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

## For contributors

`readMesh(bytes)` returns the mesh, indexed, in mm, with its size, its repairs and its notes, or the
reason it was refused; `meshSolid(engine, mesh)` makes it a solid. The code is
`packages/core/src/mesh/`: `formats.ts` reads each format, `repair.ts` repairs or refuses.
