# A wedge for a tilted or turned sash

A tilt-and-turn window in tilt, the "kip" window common in Israel and Germany, or a hopper, opens by
tilting its sash in at the top, held by its own stays. The opening it leaves is a wedge: a strip
across the top, between the frame's head and the sash's top, and a thin triangle at each side,
from nothing at the hinge to the gap at the top. A flat wall cannot close it. The tool makes the
wedge instead: two side triangles and a top strip, joined at the top by two corner pieces, every
edge pressed against the frame or the sash with a printed TPU gasket, the hose through a flattened
port in the top strip. Its design: [`research/sash-wedge.md`](research/sash-wedge.md).

A sash turned part way on its side hinges, a tilt-and-turn window in turn or an inward casement,
leaves the same wedge turned on its side; the tool makes that too ([below](#a-sash-turned-part-way)).
A sash that opens out, a casement, an awning, leaves the frame clear from inside: a wall in a frame
with no track closes it ([`frame.md`](frame.md)), and needs no wedge (C322).

## The setting

Under **The window**, choose **Window type: A sash tilted in at the top** (the command:
`--window tilt`; the library and the MCP server: `edges.window: "tilt"`), and give the **gap at
the top** (`--tilt-gap`, `tilt.gapMm`). Every edge becomes a frame edge: a flat face with the
printed TPU gasket on it, so choose **Printed TPU** as the seal. The page hides what a wall has and
the wedge has no use for: the grid's division, the fills and patterns, the pieces' own fills, the
fittings but the hose port, a double wall, pieces cut from sheet, the meeting rail's filler, the
sash stop, rain's weep holes and the stiffeners. The command and the MCP server refuse each of these
where it is set, with the reason, but for those that have no part in a wedge and are left out: the
grid's division, rain, the stiffeners, the joint's test coupon and a round port's lock ring, cap and
screen (C314).

## Measure your window

With the sash tilted, held by its stays as you will leave it:

- **The opening**: the width and the height seen inside the frame, as for a frame with no track.
  The triangles are as tall as the opening; the top strip as long as it is wide.
- **The gap at the top**: from the frame to the sash's outer face, at the top of the sash, square
  to the frame. Tilt stays leave about 100 to 160 mm (inferred, in the survey of window types: a
  restrictor stay at 100 mm, cat guards to 160 mm); the page starts at 130 mm (C316).

From these the plan works out how far the sash leans in, and the faces: the top strip, the gap
deep, and each triangle, its two long sides the opening's height and its top the gap.

## The parts

Each part is one file, named for what it is and where, and how many to print
(`wedge-leg-3-of-6-print-4`):

- **The side triangles**: an edge strip up each leg, in pieces the printer makes, the two meeting
  near the hinge and closing the triangle there; above that a chain of panels end to end, held in
  the strips' slots and joined by joint strips (C306, C307). Both triangles are the same, turned
  over, so each of their files is printed twice, and each leg strip four times.
- **The top strip**: a chain of panels end to end, between an edge strip along the frame's head
  and one along the sash's top, bevelled to lie flat on them (C308).
- **The corner pieces**: one at each end of the top strip, holding the triangle's top and the top
  strip's end, the gasket's groove turning round it (C309). Printed twice.
- **The hose port**: printed as one with the top strip's middle piece, collar up (C310). Its slot
  has the hose's own area where the piece is long enough; otherwise as long as the piece allows,
  and the plan says what share of the hose's area it has: the air then meets more resistance (C311).
- **The gaskets**, in TPU: on the frame's face and on the sash's, a run up each leg and round its
  corner, and one along the top, butting in the corner, in pieces the printer makes (C313).

Every part lies in its file as it prints: panels flat, the port's piece collar up, the edge strips
on their outer faces, the joint strips on their flanges, the corner on its upper face (C312). The
plan counts them all.

## Putting it in

1. Lay each triangle out: its leg strips, the panels into their slots from the hinge up, a joint
   strip between each two, and the pins through the joints. Press the gaskets into the grooves.
2. Put the corner pieces on the triangles' tops, and slide the top strip's panels into their edge
   strips, the port's piece in the middle, joint strips between them; its ends go into the corner
   pieces.
3. With the sash tilted on its stays, set each triangle in at its side, its legs against the frame
   and the sash; then the top strip across the top between them. Each face is pressed between the
   frame and the sash, and its gaskets' squeeze holds it (inferred).
4. Put the hose's end into the collar on the room side.

## Safety

- The wedge is held only by the squeeze between the frame and the sash. Do not close the window on
  it, and take it out before a storm.
- The sash's stays carry it, or for a turned sash the restrictor. Do not lean on the sash, and do
  not let it swing shut against the wedge.
- A window with the wedge in is not a locked window.

## Open until printed

Nothing here has been printed yet. Open:

- whether the gaskets' squeeze holds the wedge against the wind, and how far it must be oversize;
- whether a sash's stays take the squeeze without opening further;
- whether the gasket follows the corner's groove round its turn;
- the flattened port's back pressure against a round one's;
- whether the room above the top strip, under a reveal's soffit where the window is set deep in one,
  takes the collar: it stands about 55 mm above the top strip at a 150 mm gap and 70 mm at 130 mm
  (inferred, from the port's measures for an 800 × 1200 mm window).

## A sash turned part way

A sash turned part way on its side hinges, a tilt-and-turn window in turn, an inward casement or a
French door, leaves the tilted sash's wedge turned on its side: a strip up the latch side, the
window's height long and the gap deep, and a thin triangle at the head and at the sill, the sash's
width long. The tool makes it from the same parts (C317).

- **The setting**: **Window type: A sash turned part way** (`--window turn`, or
  `edges.window: "turn"`), and the **gap at the latch side** (`--turn-gap`, `turn.gapMm`). Every
  edge is a frame edge, with the printed TPU seal; what a wall has and a wedge has not is hidden and
  refused as for a tilted sash.
- **Holding the sash**: a turned sash swings freely, where a tilted one rests on its stays. Fit a
  window restrictor that holds it at the gap, so it opens no further, before the wedge goes in: the
  restrictor keeps it from opening, the wedge from closing (C319). The tool does not print one.
- **The gap**: as far as you open it, but no more than the corner pieces, which span it, can be
  printed: up to the printer's shorter side (C318). The page starts at 150 mm, which gives a 150 mm
  hose its own area through the port.
- **The hinge side**: not asked. Hinged at the left or the right, the wedge's parts are the same,
  the whole turned upside down; the preview shows the hinge at the left (C320).
- **The parts**, named for the turned wedge (C321): `wedge-triangle-…`, a triangle's panels and
  joint strips, printed twice, one for the head and one for the sill; `wedge-latch-…`, the strip's
  panels, edge strips and joint strips, the hose port in one of its middle pieces; and as for a
  tilted sash `wedge-leg-…` and `wedge-corner-…`. An 800 × 1200 mm window, turned 150 mm, takes 55
  parts and 28 TPU gaskets.
- **Putting it in**: as for a tilted sash, the sill's triangle first, then the head's, then the
  strip up the latch side between their corner pieces, once the restrictor holds the sash.

Open until printed, beyond the tilted sash's: whether the head's triangle, lying flat 800 mm or so
from the hinge, stays up by its squeeze alone; whether the sill's fits the few mm under the sash's
bottom rail (inferred, in the design note); and whether a restrictor takes the squeeze.
