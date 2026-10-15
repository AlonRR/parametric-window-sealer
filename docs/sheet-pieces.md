# Pieces cut from sheet

Printing every piece of a wall takes tens of hours. Instead, the pieces can be cut by hand from a
sheet: polycarbonate, acrylic, foam board or corrugated plastic. Only the strips, cross pieces, edge
strips and fittings are printed. Twin-wall polycarbonate also keeps the heat in better than a
single printed wall.

## What changes

Choose **Cut the pieces from sheet** under **The panel** (the command: `--pieces sheet`; the
library and the MCP server: `sheet.source: 'sheet'`).

- **The pieces can be as large as the sheet.** The sheet's size is a setting, 1000 × 2000 mm to
  start with (`--sheet-width`, `--sheet-height`); it can be turned, as a printer's bed can. A
  600 × 1000 mm opening becomes one piece, with no joints at all.
- **A strip longer than the printer makes is printed in segments**, the fewest equal ones that
  fit, butted end to end, as the edge strips already are.
- **The download leaves out the pieces to cut.** The plan lists them instead, by size:
  "Cut from 4 mm sheet: 2 pieces of 749 × 1013 mm."
- **A piece with a fitting** (a hose port, a cutout, a fan, clamps or a sliding insert) **or a
  pattern of its own is still printed**, and the plan says which. While any piece is printed,
  every piece keeps to the printer's size, because the pieces share one grid.
- **A pattern for the whole wall** would be printed into every piece, leaving nothing to cut, so it
  is refused: choose a sealed fill, or give single pieces a pattern of their own.

## The sheet's thickness

The strips' slots are made for the panel thickness, so give the sheet's thickness as the panel
thickness. **Measure it with calipers**: sheets are sold a little off their nominal size, acrylic by
up to 10 % (relayed from a supplier's tolerances), more than the strips' grip of 0.15 mm a face
takes up. Commonly sold thicknesses (relayed from suppliers' listings, not checked against a
standard):

| Sheet | Thicknesses | Sheet sizes |
| --- | --- | --- |
| Twin-wall polycarbonate | 4, 6, 10 and 16 mm | up to 2100 mm wide; 4 × 8 ft in the US |
| Corrugated plastic | 2 to 5 mm | 1220 × 2440 mm (4 × 8 ft), 1000 × 2000 mm |
| Acrylic | about 3 mm (1/8 in), 4.5 mm (3/16 in), 5.5 mm (1/4 in) | 4 × 8 ft, 4 × 6 ft, 2 × 4 ft |

## Cutting and fitting

1. Cut each piece to the size the plan lists. Acrylic and polycarbonate score and snap or cut with
   a fine saw; foam board and corrugated plastic cut with a knife.
2. Twin-wall and corrugated sheet have open flutes along one direction: tape over the cut ends
   where they meet the edge strips, so the flutes do not let air through.
3. Slide the pieces into the strips as printed pieces go.
4. **The pins:** a cut piece has no slot for them. With the pieces in place, drill each pin's hole
   through the cut piece, through the strip's hole (1.8 mm), and push the pin through. The piece
   then no longer slides in its strip.

## Not yet confirmed

- The sheet sizes and thicknesses above: suppliers vary.
- That the strips' ribs grip a sheet as they grip a printed piece: a test with the coupon
  ([`joints.md`](joints.md)) and a piece of the sheet, the owner's step.
