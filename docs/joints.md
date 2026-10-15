# The joint between pieces

The pieces join with H-shaped strips: a piece's edge slides into the slot on each side of a strip,
and a cross piece sits where four pieces meet. The strips hold the pieces in two ways.

- **Ribs.** Small pointed ridges stand on the inside of each strip's flanges, running across the
  slot. They reach a little past the piece's faces (the **grip**, 0.15 mm to start with), so the
  piece squeezes them as it goes in and is held firm. A rib starts from a point at the slot's mouth,
  so the piece finds its way in. Between the ribs the strip keeps its clearance (the **fit**,
  0.2 mm a face), so the piece still goes in by hand.
- **Pins.** A pin cut from 1.75 mm filament goes through each strip's middle, one in each slot,
  and through a slot in the piece. The piece's slot is as long as the joint's slide (3 mm), so the
  piece can still slide in its strip, and the wall can still be spread to fit (see the plan's
  warnings), but it cannot pull out.

Strips printed in TPU (with the TPU seal) have no ribs: their slot is narrower than the piece, so the
whole slot grips. They keep the pins. The cross pieces and the edge strips have neither.

## Cutting the pins

The plan says how many pins to cut and how long: two for each strip, each as long as the strip is
thick (6.6 mm with 3 mm pieces). Cut them from a spool of 1.75 mm filament with flush cutters; a
little short is fine.

1. Push a piece's edge into its strip until the slot in the piece shows through the strip's hole.
2. Push a pin through the hole, the piece's slot and the far flange.
3. To take the wall apart, push the pins out with a thin nail or a 1.5 mm drill bit.

## Finding the grip: the guided test print

Printers print a little off, so the grip that holds well differs from one printer to the next. The
measuring guide's fifth step, **The grip**, takes you through it.

1. Press **Add the test coupon to the download** (or, under **Advanced: the joint between
   pieces**, tick **Add a test coupon to the download**). The download then holds a file named like
   `coupon-grip-0.05-to-0.25-print-1`: five short strips in a row, and a tab as thick as the pieces.
2. Print it with the material and settings the strips will have. The strips stand on their flanges
   as the joint strips do; the tab lies flat as the pieces do.
3. The strips are marked by notches in the top of their flanges: one notch on the first, five on
   the last. Each section's button in the guide says its grip: two steps of 0.05 mm either side of
   the grip set.
4. Push the tab into each strip from the side without notches. Too loose, and the tab slips out;
   too tight, and it will not go in, or the flanges crack.
5. Press the button for the section that took the tab with a firm push and held it. The guide sets
   that grip and takes the coupon out of the download: the strips can be printed.

If none held, say how:

- **It slipped out of every one**: the grip goes up, so the next coupon starts one step above the
  last one's tightest. With the grip at 0.15 mm, the next coupon tries 0.3 to 0.5 mm.
- **It went into none**: the grip goes down, so the next coupon ends one step below the last one's
  loosest, never below no ribs at all. If even the section with no ribs was too tight, the ribs are
  not the trouble: the slot prints narrower than the piece, so the **fit** goes up by 0.1 mm a face
  instead.

Then print the coupon again. Measuring a printed strip's slot with calipers, in the guide's fourth
step, gives the fit in one go and can save a print.

## Puzzle dovetails instead of strips

Under **Advanced: the joint between pieces**, **Joint style: Puzzle dovetails** joins the pieces
without strips. The pieces meet edge to edge. Along each joint, the piece on the left, or below,
has dovetail tabs that press down into sockets in its neighbour.

- Each tab is 6 mm deep, 8 mm wide where it leaves its piece and 12 mm at its head. There is one
  about every 60 mm of joint, centred in equal lengths, and none within 14 mm of a joint's end.
- The fit is carved from both pieces all along each joint, tabs and edges alike: 0.2 mm a face to
  start with. The wall's outer edges stay where they are, in their edge strips.
- The tabs reach 6 mm past a piece, so the plan makes each piece 6 mm smaller than the printer could
  print, leaving room on the bed for them.
- The corners stay square, as four meet where joints cross with nothing over them. The 1 mm chamfer
  along the bed side follows the tabs and the sockets, in four steps of 0.25 mm.

To put the wall together, lay the pieces face down and press each tab down into its neighbour's
socket. **They hold the pieces together in the wall's plane; across it only their fit holds them**,
so a wall pushed by the wind can step at a joint. Glue them for a lasting wall, or choose the
H-strips, which hold both ways and come apart.

With puzzle dovetails there are no strips, so the plan refuses three settings and leaves the pins
unused:

- **Pieces cut from sheet:** the tabs and sockets need printing.
- **Joint strips in TPU:** there are no joint strips to print.
- **The test coupon:** it tries the strips' grip.
- **The pins:** they have nothing to pin.

The stiffeners clip to the strips, so the plan says to choose the H-strips to stiffen a wide wall.
The edge strips still have their weep holes. The preview draws the pieces square, without their
tabs.

## Sliding dovetail rails

**Joint style: Sliding dovetail rails** also joins the pieces without strips, and holds them both in
and across the wall's plane. The pieces meet edge to edge. Each piece has half a dovetail rail
along every edge it shares, standing on its room side and flush with the joint, so the two halves
make one dovetail. A printed slider with a dovetail groove slides along each pair from the joint's
end.

- Each half rail is 4 mm high, 3 mm wide at the piece's face and 4 mm at its top, so its side leans
  about 14° and prints without support.
- The slider's groove takes the two halves with the fit (0.2 mm a face to start with) as clearance.
  Its walls and floor are 2 mm, so with the starting fit it is 12.4 mm wide and 6.2 mm high. It
  prints groove up.
- There is one slider along each joint between two crossings. It stops 1 mm short of the slider
  across it, and as far from the wall's edge as the H-strips stop from an edge strip. The rails run
  as far as their slider.
- The corners stay square, as with the dovetails, and the bed-side chamfer runs round each piece.

To put the wall together, lay the pieces room side up, edge to edge, and slide a slider along each
pair of rails from its end. To take it apart, slide them off. The same settings are refused as with
the puzzle dovetails, and the same lines in the plan apply. The preview draws neither the rails nor
the sliders.

## Bolted flanges

**Joint style: Bolted flanges** joins the pieces with bought bolts and nothing else printed. The
pieces meet edge to edge. Each has a flange standing on its room side along every edge it shares,
10 mm high and 3 mm thick, flush with the joint. The two flanges stand back to back and are bolted
together.

- The bolts are M4, 12 mm long, each with a nut and a washer on each side. That is two 3 mm flanges,
  two 0.8 mm washers and a 3.2 mm nut, 10.8 mm, with a little thread to spare. The plan says how
  many to buy.
- There is one bolt about every 80 mm of flange, centred in equal lengths, and none within 15 mm of
  a flange's end. Each goes through a 4.5 mm hole halfway up both flanges.
- The flanges run to the crossings, and stop as far from the wall's edge as the H-strips stop from
  an edge strip.
- The corners stay square, and the bed-side chamfer runs round each piece, as with the rails.

To put the wall together, lay the pieces room side up, edge to edge, and bolt each pair of
flanges together. The flanges stand into the room. They hold the pieces in and across the wall's
plane, and come apart with a screwdriver. The same settings are refused as with the puzzle
dovetails, and the preview does not draw the flanges.

Sizes of the bought parts: an M4 nut (ISO 4032) is 3.2 mm high and 7 mm across its flats
([a maker's listing](https://eshop.wurth.ae/Hexagon-nut-ISO-4032-A2-70-stainless-steel-plain-NUT-HEX-ISO4032-A2-70-WS7-M4/032294.sku/en/US/AED)).
An M4 washer (ISO 7089) is 0.8 mm thick, 9 mm across and 4.3 mm inside
([the ISO 7089 table](https://fasten.it/norms/norm/din_en_iso_7089)). The 4.5 mm hole is ISO
273's medium clearance for M4, as the clamps' holes are.

## The settings

| On the page | Command | Library and MCP server | Starts at |
| --- | --- | --- | --- |
| Joint style | `--joint-style strips`, `dovetails`, `rails` or `bolts` | `joint.style` | strips |
| Grip (mm per face) | `--grip` | `joint.gripMm` | 0.15; 0 leaves the strips without ribs |
| Pin each strip | `--pins yes` or `no` | `joint.pins` | yes |
| Add a test coupon to the download | `--coupon yes` or `no` | `coupon` | no |

A pin needs the slot at least 4 mm deeper than the slide: 1 mm of flange between the pin and the
slot's mouth, and 1 mm of piece between its slot and the piece's edge. A deeper slide is refused
while the pins are on.

## Not yet confirmed

- The starting grip of 0.15 mm, and that ribs this small print as ridges: a test print, the
  owner's step. The coupon is there to find the grip.
- That a 1.75 mm filament pin stays in a 1.8 mm printed hole: printed holes usually come out a
  little small, which is what holds it.
- That the dovetails' 0.2 mm a face lets them press together and hold, and how far a dovetailed
  wall steps at a joint in wind: a test print.
- That a slider slides along its rails with 0.2 mm a face, and that the rails' 14° lean prints
  clean: a test print.
- That 10 × 3 mm flanges stand stiff enough to bolt, and that the 4.5 mm holes print round enough
  for an M4 bolt: a test print.
