# The seals

The wall can be sealed where it meets the window, with foam tape or with gaskets printed in TPU,
or left unsealed, the starting choice. Under **Seal** on the page (the command: `--seal tape` or
`--seal tpu`), the seal goes along each edge strip's outer face, where the track, the sash or the
sill presses on it. Under **Advanced: the seal** it can go on the strips' sides in a track and
inside a hose port's collar too.

## Foam tape

Use closed-cell foam tape. In the tests the design review read, felt and open-cell foam let air
through (relayed, `research/design-review.md`). The sizes the makers sell are in
[`tape-sizes.md`](tape-sizes.md).

The tape sits in a groove 1 mm deep and 0.5 mm wider than the tape. Squeezed to half its
thickness, a 4 mm tape stands 1 mm out of the groove; the panels leave it that room.

## Printed TPU gaskets

Foam must stay squeezed to seal, and a printed gasket squashed flat loses its spring. So the
gasket bends instead:

- **The shape:** a base 0.8 mm thick across the floor of its groove, and two fins 0.8 mm thick,
  one from each side, leaning in 20°. As the wall goes in, the fins fold towards each other and lie
  flat on the base.
- **The hard stop:** the groove is made deep enough for the base and the folded fins: 1.6 mm for
  a 4 mm gasket, and 2.4 mm where the fins are long enough to fold over each other (in a 9.5 mm
  groove, from a gasket over 4.75 mm tall). Pressed harder, the strip's face meets the frame
  before the fins are crushed. A deeper groove set under Advanced is kept.
- **The squeeze:** at half its height, as the panels are sized, a 4 mm gasket stands 0.4 mm out
  of its groove.
- **The width:** the fins, leaning in, must not meet at the top. A 4 mm gasket needs a tape width
  of at least 3.5 mm; a narrower one is refused, giving the least width.

Print the gaskets in TPU 85A if your printer can: it springs back better than 95A. The share of a
squeeze that stays once it is released (the compression set) is 26 % for 85A at 23 °C and 52 % at
70 °C, and 38 % and 90 % for 95A (verified in the design review, from Forward AM's datasheets). 95A is the easier of the two
to print (inferred).

A narrow fin seals with less force than a flat gasket (verified in the design review). The review
also suggested hollow bulbs. They are not built: no published data on printed bulb seals was
found, and a bulb's roof would bridge as it prints.

The sleeve in a hose port's collar and the frame inside a cutout's rim stay plain rings of TPU.
They sit in the same deeper groove: the sleeve is 0.6 mm thicker than before, and a cutout's rim
0.6 mm nearer the appliance, the frame the same.

## Not yet confirmed

A test print, the owner's step: that the fins fold in rather than buckle, that the gasket seals
at a 0.4 mm gap, and how well it springs back after a summer in the window. No published data
on printed fin seals over time was found.
