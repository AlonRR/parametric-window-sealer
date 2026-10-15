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

## Finding the grip: the test coupon

Printers print a little off, so the grip that holds well differs from one printer to the next.

1. Under **Advanced: the joint between pieces**, tick **Add a test coupon to the download**. The
   download then holds a file named like `coupon-grip-0.05-to-0.25-print-1`: five short strips in a
   row, and a tab as thick as the pieces.
2. Print it with the material and settings the strips will have. The strips stand on their flanges
   as the joint strips do; the tab lies flat as the pieces do.
3. The strips are marked by notches in the top of their flanges: one notch on the first, five on
   the last. The plan lists each one's grip: two steps of 0.05 mm either side of the grip set.
4. Push the tab into each strip from the side without notches. The one that takes it with a firm
   push and holds it has the grip to use. Too loose, and the tab slips out; too tight, and it will
   not go in, or the flanges crack.
5. Enter that grip under **Grip (mm per face)**, or in step 5 of the measuring guide.

If even the loosest or the tightest strip is not right, set the grip to it and print the coupon
again: the coupon centres on the grip set.

## The settings

| On the page | Command | Library and MCP server | Starts at |
| --- | --- | --- | --- |
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
