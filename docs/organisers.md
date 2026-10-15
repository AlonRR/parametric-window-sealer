# Organiser boards

An organiser board turns a piece of the wall into a board that a wall-organiser system's own
accessories hang on: the hooks, shelves, bins and holders made for that system. The wall's pieces
still join, seal at their edges and fit the window as before; inside each piece's border, the
board's openings are cut through, every one of them whole.

The owner chose four systems to offer (Q9): Skådis, openGrid, Multiboard and the Honeycomb Storage
Wall. Skådis is built; the others follow.

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

## Not yet confirmed

- No test print yet: whether IKEA's hooks slide on and hold, and whether the slots print clean
  standing upright.
- The slot sizes against a real IKEA board, with calipers.
