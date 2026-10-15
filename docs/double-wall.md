# A double wall for winter

A single printed wall loses heat about as fast as single glazing, and in winter its room side gets
cold enough for water to condense on it at quite a dry room. Two skins with still air between them
do much better. This matters when a hose or a vent stays in the window over winter.

## The setting

Under **The panel**, **Wall** is **Single** to start with (the command: `--wall`; the library and
the MCP server: `wall`). With **Double, hollow pieces for winter**:

- **Each plain printed piece is hollow:** two 1.2 mm skins, three lines from a 0.4 mm nozzle, round
  a closed air gap. The rest of the panel's thickness is the gap.
- **Inside a solid border** as wide as a pattern's, the slot's depth and 2 mm more, where the strips
  hold the piece.
- **Ribs** run up the piece, evenly, at most 20 mm apart, so the room side's skin bridges no more
  than that as it prints.
- **A piece with a fitting**, or with a pattern of its own, is printed solid.
- **The preview** draws the pieces solid, as the air inside cannot be seen; the files are hollow.

The wall keeps the thickness you set, and it must still fit your track. A 15 mm track takes a
panel of up to 10.4 mm with the starting joint, so a 10 mm double wall has a 7.6 mm gap. A double
wall needs panels at least 6.4 mm thick, for a 4 mm gap, and a sealed fill across the wall: its
skins are too thin for a pattern.

With **pieces cut from sheet**, cut them from twin-wall polycarbonate as thick as the wall, or as
near as is sold ([`sheet-pieces.md`](sheet-pieces.md)): it is the cheaper way to the same thing.

## What it gains

The plan works it out for your thickness (inferred: from ISO 6946's surface resistances and its
table for still air layers, with printed PETG at 0.2 W/mK and the ribs left out):

| Wall | Loses (W/m²K) | Room side dry up to, at 20 °C in and 0 °C out |
| --- | --- | --- |
| Single, 3 mm | 5.4 | 40 % room humidity |
| Single, 10 mm | 4.5 | 47 % |
| Double, 10 mm (7.6 mm gap) | 3.2 | 59 % |

The design review's figures, 5.4 W/m²K for a single 3 mm wall and 2.7 to 3.0 for a 10 to 25 mm
gap, come out of the same calculation (`research/design-review.md`).

## Not yet confirmed

A test print, the owner's step: that the room side's skin bridges the gaps between the ribs
cleanly, and that the hollow pieces are stiff enough in the strips.
