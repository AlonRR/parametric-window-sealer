# Rain on the outside

Rain running down the outside of the wall gets into the strips' slots, between a strip's flange and
the piece it holds. It collects most in the joints between rows and along the bottom edge, where
the slots open upward. A window frame deals with this by draining rather than sealing: water that
gets in has a way out. The wall does the same.

## What is printed

Under **The panel**, **The outside of the wall gets rain** is on to start with (the command:
`--rain`; the library and the MCP server: `rain`). With it:

- **Weep holes.** Every strip has holes through one of its flanges, beside the web, both sides: 5 mm
  long and 1.5 mm tall, the room under a piece in the middle of its slide, about every 50 mm and
  midway between the ribs. Every edge strip has the same at its slot's floor. Water in a slot runs
  out through them, on the outside.
- **A drip groove.** Under each edge strip with no seal along its outer face, a groove 1.5 mm wide
  and 1 mm deep, 1.5 mm in from the outside, breaks the path of water creeping under the strip to
  the room, as drip kerfs do under a sill (verified in the design review, from Building Science
  Corporation's BSI-131, `research/design-review.md`). Foam tape or a TPU gasket there seals
  instead.

**Fit every strip and edge strip with its holes outside.** The holes are on both sides of the web,
so a strip goes either way up; only which face is outside matters. The file names are the same as
without rain.

## A window AC

A window AC is tilted outward, about 3°, so its condensate drains outside, and its manual says not
to block that (verified in the design review, from the makers' manuals). The wall stands on the
unit's top and does not level it. The plan says so whenever an edge is against a window AC.

## What is not done

- **No lap.** The review suggested the upper pieces lap over the lower ones. In a grid of strips
  that stop at the crossings, a lap would mean a lip on each horizontal strip standing off the
  piece below. It would change how the strips print, and a drained joint does the same work.
- **No outward slope** on the bottom edge strip: the top of its flange is too narrow for one to
  matter.
- **No weep holes in the cross pieces.** Water from a joint above runs on down to the next hole.

## Not yet confirmed

A test print and a hose, the owner's step: that the holes print clean, that water run down the
outside comes out of them, and that none reaches the room side.
