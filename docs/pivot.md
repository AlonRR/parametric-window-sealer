# A pivot window

A pivot window's sash turns on an axis across its middle, held by a pivot hinge at each jamb: its
top half swings into the room and its bottom half out (a Schwingfenster; in a roof, a centre-pivot
roof window) (relayed, in the survey of window types,
[`research/window-types.md`](research/window-types.md)). Opened part way, it leaves two gaps.
Below the pivot the frame is clear from inside, as a casement opened outward leaves it: a wall goes
in as in a frame with no track ([`frame.md`](frame.md)), its top edge pressed by the sash where the
sash crosses the frame. Above the pivot, the sash leans in as a tilted one does and leaves the same
wedge, its point at the pivot rather than at a hinge at the bottom ([`wedge.md`](wedge.md)). The tool
makes both from one set of settings, in one plan and one download (C335).

A pivot on a vertical axis (a Wendefenster), one side in and the other out, is not covered yet: it
is its own backlog item, `pivot-vertical` (#179) (C336).

## The setting

Under **The window**, choose **Window type: A pivot window** (the command: `--window pivot`; the
library and the MCP server: `edges.window: "pivot"`), and give:

- the **pivot height** (`--pivot-at`, `pivot.atMm`): from the opening's bottom to where the open
  sash's room face crosses the frame, which is about the pivot's own height; 500 mm to start with,
  the middle of the example opening (C337);
- the **gap at the top, above the pivot** (`--pivot-gap`, `pivot.gapMm`): from the frame to the
  sash's outer face, at the top of the sash, square to the frame, as for a tilted sash; 130 mm to
  start with;
- the **pitch**, from level (`--pivot-pitch`, `pivot.pitchDeg`): 90° for an upright window, the
  roof's pitch, 15 to 90°, for a centre-pivot roof window (C342).

The wall's edges start as the bottom and the sides pressed into the frame and the top pressed by
the sash; with them goes the printed TPU seal. Measure the opening inside the frame, square to it,
with the sash held open as you will leave it.

## The two halves

- **The wall below the pivot** is a wall in a frame with no track, as tall as the pivot height, and
  takes what any wall takes: the division into pieces, the joint, the panel fill, pieces cut from
  sheet, a double wall, the hose ports and every other fitting, and notches in its bottom and side
  edges for the window's hardware (C338).
- **The wedge above the pivot** is a tilted sash's, as tall as the rest of the opening: a strip
  across the top, the gap deep, and a thin triangle at each side, its point at the pivot. It is as
  every wedge is, whatever the wall below is: joined with strips, sealed, printed and a single skin,
  with no fitting (C338). The hose goes through the wall below.

A problem with either half is said on the setting it comes from (C339): the wall's height on the
pivot height ("The wall below the pivot is 10 mm tall. Too small for the edge strips."), the
wedge's gap on the gap at the top, and the wedge's other problems with "The wedge above the pivot:"
before them. The wedge is checked once the wall below is sound.

## The plan and the files

The plan is the wall's, its headline adding the wedge's parts, its size line saying the opening
below the pivot; then the wedge's own lines, as for a tilted sash, and a line for the pivot: where
each half goes and the hinges between them (C341). The download holds the wall's files and the
wedge's, each of the wedge's named `wedge-…`, its gaskets `wedge-gasket-…`, apart from the wall's;
packed in one ZIP or one 3MF if you choose, named for the whole opening (C340). The preview shows
the wall below and the wedge above it, raised to the pivot (C343).

## Putting it in

1. Hold the sash at the gap: a pivot sash swings freely between its stops, so fit a window
   restrictor that keeps it from opening further, as for a turned sash (inferred). The wall and the
   wedge keep it from closing.
2. Put the wall together and push it into the frame below the pivot from the room side, its top
   edge up against the sash's room face where the sash crosses the frame.
3. Put the wedge together as [`wedge.md`](wedge.md) says, and set it in above the pivot, each
   triangle's point down at the pivot, its legs against the frame and the sash.
4. Put the hose's end into its port in the wall.

## The hinges

The pivot hinges sit at the jambs at the pivot's height, where the wall's top corners and the
wedge's points meet (inferred). The plan asks you to check that they clear them; where one does
not, a notch in the wall's side edge, at the hinge's height, makes room for it
([`frame.md`](frame.md)).

## In a roof

In a centre-pivot roof window, give the roof's pitch. The wall below the pivot then lies on the
slope as a top-hung roof window's wall does, and the plan gives the same lines
([`roof.md`](roof.md)): what share of its weight pulls it out of the frame into the room, how to
test that it holds before you leave it, to hang the hose from a hook above the window, and where
rain gathers. Weigh and test the wedge with the wall: it is pressed between the frame and the sash,
and the slope pulls on it too (inferred).

## Safety

As for the wedge ([`wedge.md`](wedge.md)): the wall and the wedge are held only by their gaskets'
squeeze. Do not close the window on them, do not let the sash swing shut against them, take them
out before a storm, and remember that a window with them in is not a locked window.

## Open until printed

Nothing here has been printed yet. Open:

- whether the wall's top edge seals against the sash, which crosses it at the sash's lean;
- whether the wedge's points and the wall's top corners meet without a gap at the jambs;
- how far a pivot hinge stands out from the jamb, which the plan cannot know;
- everything open for the wall in a frame and for the wedge.
