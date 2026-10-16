# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (owner's decision Q29).

The first version, `0.1.0`, is the MVP in [`docs/backlog.md`](docs/backlog.md); `0.2.0` adds the
API: the library, the command and the MCP server; `0.3.0` adds every P1 item: the hose port, the
printer list, the tape and TPU seals, the patterns and per-piece fills, the measured cutout, the
window AC, the offline file and the measuring guide; `0.4.0` adds the exhaust fan, the SVG tile,
the clamps and the sliding insert, and the thirteen changes from the design review against
published work (Q153); `0.5.0` adds the guided test print and three more joint styles: puzzle
dovetails, sliding dovetail rails and bolted flanges (C215); `0.6.0` adds the drawn tile, three
organiser boards (and Multiboard, built but not offered yet) and meshes of your own: a model of the
appliance, 3D tiles and a whole piece (Q160); `0.7.0` adds two window types from the survey of
window types: a wall in a roller shutter's guide rails, and a wedge for a sash tilted or turned part
way (C299). Changes since the latest version are listed under Unreleased.

## [Unreleased]

### Added

- A wall in a louvre window: choose **Window type: A louvre window** (`--window louvre`, or
  `edges.window: "louvre"`). The wall takes the place of the lowest blades, taken out of their
  clips: it stands on the sill, its sides pressed against the clips by their TPU gaskets, and the
  lowest blade left closes onto its top gasket, as onto the window's own weatherstrip. The plan says
  which blades come out and to keep the louvres closed while the wall is in. How:
  `docs/louvre.md`. Not yet test printed.
- A pivot window: choose **Window type: A pivot window** (`--window pivot`, or
  `edges.window: "pivot"`), its sash turned on an axis across its middle, the top half in. Give the
  pivot's height (`--pivot-at`, `pivot.atMm`) and the gap at the top (`--pivot-gap`,
  `pivot.gapMm`): below the pivot a wall goes in as in a frame with no track, its top edge pressed
  by the sash, and takes every fitting; above it the tilted sash's wedge, its point at the pivot.
  One plan, one preview and one download hold both, the wedge's files named `wedge-…`. In a
  centre-pivot roof window, give its pitch (`--pivot-pitch`, `pivot.pitchDeg`, 90 for upright),
  and the plan says what pulls the wall out of the frame, as for a roof window. On an upright axis,
  choose the half that swings in (`--pivot-in left` or `right`, `pivot.swingsIn`): the wall goes on
  the other side and a turned sash's wedge on that one, its strip up the free side. How:
  `docs/pivot.md`. Not yet test printed.
- Notches along an edge for a window's hardware: in an edge pressed into a frame, give each as its
  width x depth @ its edge, from mm (`--notch 40x25@bottom,300`, or `notches` in the library),
  where a casement's crank arm, a friction stay's arms or a keep cross the frame. The edge strip and
  its gasket stop either side of it, and the piece behind is cut where the notch reaches past the
  strip; the plan says where each is and to fill the gap round the hardware with putty or foam.
  How: `docs/frame.md`. Not yet test printed.
- A wall in a roof window: choose **Window type: A roof window opened out** (`--window roof`, or
  `edges.window: "roof"`) and give the roof's pitch, 15 to 90° (`--roof-pitch`, `roof.pitchDeg`).
  A top-hung roof window opened out leaves its frame clear from inside, so the wall is a frame's,
  every edge held by its TPU gasket; on a slope part of its weight pulls it out of the frame into
  the room, and the plan says what share, how to test that the wall holds against it before you
  leave it, and that rain gathers at its bottom edge. How: `docs/roof.md`. Not yet test printed.

## [0.7.0] - 2026-10-16

### Added

- A wall behind a roller shutter: choose **Window type: Behind a roller shutter** (`--window shutter`, or
  `edges.window: "shutter"`). Its sides stand in the shutter's guide rails and the lowered shutter rests
  on its top, as a hung window's sash does; it sets the track to a typical guide rail's sizes, 9 mm wide
  and 20 mm deep, to measure and change. The plan says how the strips sit in the rails, to lower the
  shutter only until it rests on the wall, and to take the wall out before a storm. How:
  `docs/shutter.md`. Not yet test printed.
- A wedge for a sash tilted in at the top, as a tilt-and-turn window in tilt, the kip window or a
  hopper leaves open: choose **Window type: A sash tilted in at the top** (`--window tilt`, or
  `edges.window: "tilt"`) and give the gap at the top (`--tilt-gap`, `tilt.gapMm`). Two side
  triangles and a top strip, joined by two corner pieces, every edge pressed against the frame or
  the sash with a printed TPU gasket; the hose goes through a flattened port in the top strip, printed
  as one with its piece, collar up. Each part is one file, lying as it prints, named for where it
  goes and how many to print; the plan says how far the sash leans, the faces, the pieces, the
  port's share of the hose's area and the gaskets' runs. A wall's fittings and patterns have no place
  in it and are refused. How: `docs/wedge.md`. Not yet test printed.
- The same wedge for a sash turned part way on its side hinges, as a tilt-and-turn window in turn or
  an inward casement leaves open: choose **Window type: A sash turned part way** (`--window turn`, or
  `edges.window: "turn"`) and give the gap at the latch side (`--turn-gap`, `turn.gapMm`). Its strip
  runs up the latch side and its triangles lie at the head and the sill; its files are named for
  them. A turned sash swings freely: the guide says to hold it at the gap with a window restrictor.
  How: `docs/wedge.md`. Not yet test printed.

## [0.6.0] - 2026-10-16

### Added

- A Multiboard board, the fourth organiser board, built but not offered yet (Q159): the command takes
  `--fill multiboard` and a piece's own `2,1=multiboard`, and the library `fill.kind: "multiboard"`;
  the page, the command's help and the MCP server leave it out while a question about Multiboard's
  licence is open. It matches Multiboard's tiles: 6.2 mm thick, octagonal holes 23.4 mm across with a
  thread of 2.5 mm a turn at the cells' centres, 25 mm apart, and round holes 6 mm across with a
  thread of 3.125 mm a turn at their corners. Its threads make the files about 20 times larger than
  the openGrid board's. How: `docs/organisers.md`. Not yet test printed.
- For a new organiser board, openings of a second kind on its lattice (`others`), and a board built
  but not offered yet (`hidden`, with `OFFERED_ORGANISERS` and `OFFERED_FILL_KINDS`): `docs/extending.md`.

- A whole piece of your own: under **Advanced: a whole piece of your own**, an STL, OBJ or 3MF file of one
  piece (`--custom-piece`, or `customPiece.file` in base64), its piece by column and row
  (`--custom-piece-column`, `--custom-piece-row`). It is centred on its piece and trimmed to fit inside
  the border the joints take, which stays a frame as thick as the pieces, so it joins the wall by any
  joint; one smaller than that area is refused. Its top faces the room to start with
  (`--custom-piece-view`). How: `docs/meshes.md`.

- 3D tiles of your own as the panel fill: choose **3D tile of your own** and an STL, OBJ or 3MF file of
  one tile (`--mesh-tile`, or `fill.mesh.file` in base64), an organiser's own tile or a tile of a 3D
  pattern. Its box seen from the room is one cell: the tiles are set side by side in whole cells inside
  each piece's border, in the panel's place, standing proud on the room side where they are deeper. Its
  top faces the room to start with (`--mesh-tile-view`). A tile with no flat face on a side of its box is
  refused, as it would not join its neighbour. How: `docs/meshes.md`.

- A wall cut round a 3D model of the appliance: choose **Something else: cut round its 3D model** and
  its STL, OBJ or 3MF file (`--model-file`, or `model.file` in base64). The model is turned so the side
  you name faces the room (`--model-view`, as a modelling program's views; the front to start with),
  and its outline seen from the room is cut through one piece, 1 mm clear of it, with the measured
  cutout's rim round it (`--model-column` and `--model-row` place it). The plan says what was repaired
  in the file. How: `docs/meshes.md`.

- Mesh import, in the library: `readMesh` reads an STL (binary or text), OBJ or 3MF file into one mesh
  in mm, repairs what it can without guessing the shape (corners welded, faces of no area dropped,
  faces and parts turned to face outward) and says what it repaired, and refuses a mesh with holes,
  an edge shared by more than two faces or more than 500,000 faces, saying what to do; `meshSolid`
  makes it a solid. The page and the command use it with the parts that need a mesh. How:
  `docs/meshes.md`.

- A Honeycomb Storage Wall board, the third organiser board: choose **Honeycomb Storage Wall** as the
  fill (`--fill hsw`) for its inserts. It matches the author's own wall: 8 mm thick, hexagonal cells
  20 mm across their flats and 23.6 mm apart, each widening from 20 to 22 mm behind a ledge 5.1 mm in,
  where the inserts' clips catch. How: `docs/organisers.md`. Not yet test printed.
- An openGrid board, the second organiser board: choose **openGrid board** as the fill
  (`--fill opengrid`) for openGrid's snaps and accessories. It matches openGrid's Full board: 6.8 mm
  thick, its cells 28 mm apart each way, each an opening 25 mm across with a groove 26.4 mm across
  behind each face, where the snaps click in. How: `docs/organisers.md`. Not yet test printed.
- Organiser boards, and the first of them, a Skådis pegboard: choose **Skådis pegboard** as the
  fill, for the wall or a single piece (`--fill skadis`), and IKEA's SKÅDIS hooks and shelves hang
  on it. Upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every other row shifted
  20 mm, are cut through a board 4.8 mm thick, raised on the room side inside each piece's border
  where the pieces are thinner; every slot is whole, on one grid across the wall. Pieces thicker than
  the board are refused. How: `docs/organisers.md`. Not yet test printed.

- A tile editor: under the SVG tile's file, Draw a tile draws the openings of one cell on a grid
  of squares, by clicking corners and circles or typing each point, beside the cell repeated as
  the wall repeats it. Each finished shape is used at once, as a chosen file is; Undo, Remove and
  Clear take shapes back, and Save as an SVG file keeps the drawing to use again, on the page or
  with the command's `--svg-tile`.

## [0.5.0] - 2026-10-15

### Added

- Bolted flanges, a fourth joint style: Joint style: Bolted flanges (`--joint-style bolts`). The pieces
  meet edge to edge, each with a flange 10 mm high and 3 mm thick along every edge it shares on its
  room side, and the two flanges back to back are bolted together with M4 bolts, 12 mm long, a nut and
  two washers each, one about every 80 mm: the plan says how many to buy. Nothing else is printed for
  them. How: `docs/joints.md`. Not yet test printed.
- Sliding dovetail rails, a third joint style: Joint style: Sliding dovetail rails (`--joint-style
  rails`). The pieces meet edge to edge, each with half a dovetail rail, 4 mm high, along every edge it
  shares on its room side, and a printed slider slides along each pair, holding the pieces in and
  across the wall's plane; it slides off to take the wall apart. The plan counts the sliders, and the
  download has them (`slider-…`). How: `docs/joints.md`. Not yet test printed.
- Puzzle dovetails, a joint style beside the H-strips: under Advanced: the joint between pieces, Joint
  style: Puzzle dovetails (`--joint-style dovetails`). The pieces meet edge to edge, and along each
  joint the one on the left, or below, has dovetail tabs, 6 mm deep, that press down into sockets in
  its neighbour, with the fit carved from both. No strips or cross pieces are printed; the pieces are
  planned 6 mm smaller than the printer makes, for the tabs. They hold in the wall's plane only, which
  the plan says. Not with pieces cut from sheet, joint strips in TPU or the coupon. How:
  `docs/joints.md`. Not yet test printed.
- A guided test print: in the measuring guide's fifth step, The grip, a button puts the test coupon
  in the download, and after printing it you press the section that held the tab, or say that it
  slipped out of every one or went into none. The guide sets that grip, or moves the grip so the
  next coupon tries five new ones, or, when even the section with no ribs was too tight, raises the
  fit by 0.1 mm a face, and says what to print next. The library has it as `nextTestPrint`. How:
  `docs/joints.md`. Not yet test printed.

## [0.4.0] - 2026-10-15

### Added

- Stiffeners, as the owner chose (Q154): a wall more than 500 mm across its short span is stiffened
  by bought 20 × 20 × 2 mm aluminium angle on its room side (`--stiffen`, on to start with). The
  plan says how many lengths, how long and through which rows; a printed clip on each strip a
  length crosses holds it, pinned by the strip's own pins cut 2.4 mm longer. How: `docs/stiffeners.md`.
  Not yet test printed.

- Warnings before fitting: the page has a "Before you fit it" section, between the plan and the
  download, and `docs/safety.md` the same seven lines with their evidence: not a fall barrier; an
  escape window; a metal lock on a ground floor; condensation in winter; PLA in sun; plastics burn;
  put the wall together whole, then set it in. The page and the README say what is not claimed: no
  energy saving, and not airtight, weatherproof, secure, child-safe or flame retardant, with no wind,
  rain or UV rating; a test fails if either makes one of those claims.

- Windows with no track: Window type: A frame with no track (`--window frame`) puts all four edges
  in a frame, and any edge can be set to Pressed into a frame. Such an edge is shaped as one against
  a sash, and its printed TPU gasket, squeezed as the wall goes in, holds the wall, as Indow's
  inserts hold by a compression tube; it needs the printed TPU seal. For casement screen openings and
  tilt-and-turn frames. The page now shows the seal's errors. How: `docs/frame.md`. Not yet test
  printed.

- A double wall for winter: under The panel, Wall: Double (`--wall double`) makes each plain printed
  piece hollow inside the panel's thickness, two 1.2 mm skins round a closed air gap with ribs at
  most 20 mm apart, inside its solid border; pieces with a fitting or a pattern of their own stay
  solid. It needs panels at least 6.4 mm thick and a sealed fill. The plan says what it gains, by
  calculation: in 10 mm panels about 3.2 W/m²K against 4.5, and a dry room side up to 59 % room
  humidity against 47 %. Why: `docs/double-wall.md`. Not yet test printed.

- A sash stop: under The window, the gap along the sash's track from its edge to the frame
  (`--sash-stop`, 0 for none to start with) prints a strut that lies in that track, standing 10 mm
  out, so the sash cannot be opened further from outside; it lifts out by hand from inside, so an
  escape window still opens. Longer than the printer makes, it comes in lengths that lap and pin.
  The page says the wall itself is not a lock. Why: `docs/sash-stop.md`. Not yet test printed.

- Rain on the outside: under The panel, "The outside of the wall gets rain" (`--rain`, on to start
  with) gives every strip and edge strip weep holes in one flange, beside the web or at the slot's
  floor, so water that gets into the slots runs out again, and a drip groove under each edge strip
  with no seal. The plan says to fit them with the holes outside, and with a window AC, to keep its
  outward tilt and its drain. File names are unchanged. Why: `docs/rain.md`. Not yet test printed.

- A filler for the gap between the sashes where they overlap: under The window, the gap measured
  front to back (`--rail-gap`, 0 for none to start with) prints a bar as long as the edge the sash
  presses on, the seal in a groove on both faces, in lengths that lap 10 mm. The plan says how many
  lengths, and counts the seal along it. Why and how to measure: `docs/sash-filler.md`. Not yet
  test printed.

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

- Printing defaults against warping: every printed piece has its corners rounded 3 mm and a 1 mm
  chamfer along its bed-side edge, both inside the strips' slots; a collar or rim on the room side
  is untouched, and pieces cut from sheet stay square. The plan gives brim advice for the material.
  How: `docs/printing.md`. Not yet test printed.

- Printed TPU gaskets bend rather than squash: their two fins lean in over a 0.8 mm base and fold
  flat into a groove made deep enough for them (1.6 mm for a 4 mm gasket), so the strip's face
  stops them being crushed. A tape width too narrow for the fins is refused. The deeper groove
  makes a hose port's TPU sleeve 0.6 mm thicker and brings a cutout's rim 0.6 mm nearer the
  appliance. The plan names TPU 85A, which springs back better, and closed-cell foam for the
  tape. Why: `docs/seals.md`. Not yet test printed.

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
