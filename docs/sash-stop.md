# The sash stop

The wall is not a lock. It is held in the window by the closed sash, and someone outside can open
the sash further and take the wall out. Window-AC kits screw a stop to the window for this;
portable-AC kits have none (verified in the design review, `research/design-review.md`). A
screwed stop needs a tool to take off, and a bedroom's escape window must open from inside without
a key, a tool or special knowledge (verified in the design review, from the building code).

## The setting

Under **The window**, **Sash stop length (mm)** (the command: `--sash-stop`; the library and the
MCP server: `stop.lengthMm`) is 0 to start with, for none. With the wall in, measure along the
track the sash runs in, from the sash's edge to the frame, where the sash would go if it were
opened further. A printed strut is made to lie in that gap:

- **Where:** in the track beside the edge the sash presses on. That is a slider's bottom track, or
  its top one if the bottom is a sill, and a hung window's side track, left or right.
- **Its size:** as wide as the track less its clearance, as the edge strips are; as tall as the
  track is deep and 10 mm more, so it stands out to lift it by; 1 mm shorter than the gap, to go in.
- **Its lengths:** longer than the printer makes, it is printed in lengths that lap 20 mm, half its
  width each, with a hole across each lap for a pin of 1.75 mm filament, so it lifts out in one
  piece. The two end lengths are one file, printed twice; turn one round to fit it at the far end.

The sash pushing on it pushes it against the frame, so it holds without screws or glue. To open the
window, lift it out by hand from inside.

A stop needs an edge pressed by the sash and a track beside it; without them it is refused.

## Not yet confirmed

A test print, the owner's step: that the strut lies flat in the track, holds when the sash is
pushed, and lifts out easily.
