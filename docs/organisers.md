# Organiser boards

An organiser board turns a piece of the wall into a board that a wall-organiser system's own
accessories hang on: the hooks, shelves, bins and holders made for that system. The wall's pieces
still join, seal at their edges and fit the window as before; inside each piece's border, the
board's openings are cut through, every one of them whole.

The owner chose four systems to offer (Q9): Skådis, openGrid, Multiboard and the Honeycomb Storage
Wall. Skådis and openGrid are built; the others follow.

## Using one

On the page, choose the board as the **Fill**, under **Organiser boards**, for the whole wall, or
under **Advanced: piece by piece** for single pieces. The command takes `--fill skadis`, and a
`--params` file, the library and the MCP server `fill.kind: "skadis"`; a piece's own board is
written `2,1=skadis`, with no style.

- **The board's thickness.** A system's accessories fit a board of one thickness. Where the pieces
  are thinner, the board is raised on the room side to that thickness, inside each piece's border
  and clear of a hose port, a cutout or a fan; the border stays as thick as the pieces, so the
  joint strips still fit. Pieces thicker than the board are refused, as the accessories would not
  reach through them.
- **Whole openings only.** An opening that would cross the border, or reach into the solid kept
  round a hose port, a cutout or a fan, is left out: no part openings.
- **Lined up across the wall.** The openings sit on one grid across the whole wall, centred on it,
  as the patterns do, so an accessory that spans two pieces finds its openings where it expects
  them, as long as the joint between the pieces falls clear of it.
- **Air passes through.** The openings go through the wall: give the board to the pieces you want
  to hang things on, and keep the others sealed. A board is always cut through; it has no relief.
- **Not with** pieces cut from sheet, nor a double wall, for the whole wall: single pieces can
  still have one, printed solid.

## Skådis

For IKEA's SKÅDIS pegboard accessories. IKEA publishes the board's outer size and material
([product page](https://www.ikea.com/gb/en/p/skadis-pegboard-white-00320803/)), not its slots;
the sizes below come from a public-domain reference model of the board
([Printables 1601739](https://www.printables.com/model/1601739)) and from makers of printed boards
([MakerWorld 208330](https://makerworld.com/models/208330),
[Printables 1622722](https://www.printables.com/model/1622722),
[Printables 1490580](https://www.printables.com/model/1490580)). They have not been checked
against a real board (relayed).

| | mm | From |
|---|---|---|
| Slot | 5 wide, 15 long, round at both ends, upright | The reference model |
| Slots along a row | 40 apart | The reference model |
| Rows | 20 apart, every other row shifted 20 | The reference model |
| Board | 5.0 ± 0.2 thick; a printed 4 mm board was too thin for the hooks | MakerWorld 208330 |
| Clearance on printed boards | 0.2 to 0.6 on the slots, a board of 4.8 | Printables 1622722 and 1490580 |

The wall's board is **4.8 mm thick**, with slots **5.2 by 15.2 mm**, so that the hooks slide on, as
printed boards are made. The default panel is 3 mm thick, so the board stands 1.8 mm proud of it.

"SKÅDIS" is IKEA's name for its product; it is named here only to say which accessories fit.

## openGrid

For the snaps and accessories of [openGrid](https://www.opengrid.world/guides/board/), an open
wall-organiser system by David D, matching its **Full** board. openGrid's guides give the 28 mm grid
and the boards' thickness; its author publishes the tiles and a drawing of them
([Printables 1214361](https://www.printables.com/model/1214361)), under CC BY 4.0. The sizes below
were measured from the author's own Full and Lite tiles (relayed); nothing of their files is used
here.

| | mm | From |
|---|---|---|
| Grid | 28 each way | openGrid's board guide |
| Full board | 6.8 thick, the same from both faces | The board guide; the tiles |
| Opening | 25.0 across, with a 0.4 mm chamfer at each face (25.8 there) | The drawing; the tiles |
| Groove | 26.4 across, from 2.4 to 4.4 in from either face, widening over 1.0 from the opening | The drawing; the tiles |
| Corners | Cut at 45°: the opening's straight sides run 8.19 either way of their middles, the groove's 6.92 | The tiles |

A snap pushes into a cell and its flexible sides click into the groove behind the opening's lip;
accessories either carry a snap or mount on one. The wall's board is the Full board at its own
sizes, as openGrid's printed tiles are, so it takes the snaps made for them. At the default 3 mm
panel it stands 3.8 mm proud. The face chamfer's corners follow from the chamfer (inferred).

openGrid's own tiles also have pockets along their edges for small connectors that join tile to
tile. The wall's pieces join with their own joints instead, so those pockets are left out.

## Not yet confirmed

- No test print yet: whether IKEA's hooks slide on and hold, and whether the slots print clean
  standing upright; whether openGrid's snaps click in and hold.
- The Skådis slot sizes against a real IKEA board, with calipers.
