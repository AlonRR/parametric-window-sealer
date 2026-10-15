# Stiffeners

A printed wall more than about 500 mm across bends a long way in wind: a 3 mm panel is not a beam.
The design review suggested a fin on the strips, but the strips stop at every crossing, so the fins
would be short separate pieces, and a fin would overhang as a strip prints. The owner chose bought
aluminium angle instead (Q154, B).

## What the plan asks for

When the wall is more than 500 mm across its short span, the plan says:

- **What to buy:** lengths of 20 × 20 × 2 mm aluminium angle, each 10 mm shorter than that span.
- **Where they go:** across the wall on its room side, through the middles of rows (or up it through
  the middles of columns, when the wall is wider than high). Each length goes where the joint
  strips across its way have their pins, in as few rows as leave no gap over 500 mm between lengths
  or to the wall's edges. A 603 × 1013 mm wall takes two, through rows 2 and 4.
- **The clips:** one printed clip on each strip a length crosses, in the download as
  `stiffener-clip-print-N`. Each clip is pinned by its strip's own two pins, cut 2.4 mm longer to go
  through the clip's base too: 9 mm with the starting joint, the plan says how long.

Under **The panel**, **Stiffen a wall over 500 mm across with aluminium angle** is on to start with
(the command: `--stiffen`; the library and the MCP server: `stiffen`). With the pins turned off
there is nothing to clip to, and the plan says to turn them on.

## Fitting them

1. Put the wall together whole, the clips on the room side over the strips' pin holes, the longer
   pins through strip and clip.
2. Slide each length of angle into its clips, its flat leg against the wall and its other leg
   standing out into the room.

The clip holds the angle's flat leg between its base and a lip, open on the side of the angle's
corner. It prints standing on its end, so nothing overhangs.

## How much it helps

By the beam formulas, a 20 × 20 × 2 mm aluminium angle bends about 0.17 mm over 600 mm at 135 Pa of
wind, where a 30 mm fin printed in PLA, even in one piece, would bend about 2.7 mm (inferred, from
Q154). Neither has been measured on a wall.

## Not yet confirmed

A test print and a loaded wall, the owner's step: that the clips hold the angle, and how far the
wall still bends.
