# The filler between the sashes

Open a hung window to fit a wall under it, and the lower sash slides up over the upper one, on the
room side of it. Where the two overlap, a gap runs between them from outside to the room. A slider
has the same gap, up the edge where its two sashes overlap (inferred). Every hung-window kit for a
portable AC ships foam for this gap (verified in the design review, from the kits' manuals,
`research/design-review.md`).

## The setting

Under **The window**, **Gap between the sashes (mm)** (the command: `--rail-gap`; the library and
the MCP server: `rail.gapMm`) is 0 to start with, for no filler. Measure the gap front to back,
where the filler will go: from the face of one sash to the face of the other. The filler is printed
to close it:

- **Its length:** as long as the edge of the wall the sash presses on, less 1 mm to go in. Across a
  hung window that is the opening's width; up a slider, its height.
- **Across the gap:** the gap less the seal standing out on each face, so the seal is squeezed as
  it is at the wall's edges. With no seal it is 0.5 mm less than the gap, to slide in; foam tape on
  both faces seals it better.
- **Up the gap:** 20 mm, or more where a wide tape needs 2 mm above and below its groove.
- **The seal:** the wall's own, foam tape or printed TPU, in a groove along both faces
  ([`seals.md`](seals.md)). The plan counts it in the seal's length.

A gap too narrow for a filler with the seal on both faces (6 mm with the 9 × 4 mm tape, 4.5 mm with
no seal) is refused: stick foam tape on one sash instead. The filler needs an edge pressed by the
sash, which says where the sashes overlap.

## Printing it

A filler longer than the printer makes is printed in equal lengths that lap 10 mm, half its
thickness each, so no crack runs through it. The two end lengths are one file, printed twice: turn
one round to fit it at the far end. The middle lengths are another file. Each length prints
standing on its edge, its grooves on its sides. The plan says how many lengths and how long.

To fit it, push the lengths in from the room side between the sashes, the laps overlapping, until
the seal on both faces bears.

## Not yet confirmed

A test print, the owner's step: that the lengths lap and stay in, and that the seal closes the
gap. The gap varies from window to window, and along one window if the sashes are not straight.
