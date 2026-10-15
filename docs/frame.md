# A window with no track

Some openings have no track for the wall's edges to sit in: a casement window's screen opening,
a tilt-and-turn frame with its sash open inward, or any frame with a flat reveal. For tilt-and-turn
windows only fabric kits are sold today. Indow's window inserts show another way: acrylic with a
compression tube round its edge, made slightly larger than the opening, held by nothing else
(verified in the design review, `research/design-review.md`).

## The setting

Under **The window**, **Window type: A frame with no track** sets all four edges to **Pressed into
a frame** (the command: `--window frame`, or `--top-edge frame` and the others one by one; the
library and the MCP server: `edges.roles`). Any edge can be set so on its own: a frame on three
sides and a sill below, say.

An edge in a frame is shaped as one against a sash: a flat face with the seal's groove along it.
It needs the **printed TPU** seal ([`seals.md`](seals.md)), and is refused with tape or none:

- **The squeeze:** the wall is made smaller than the opening by the edge strips and the squeezed
  gasket, as it is against a sash. A 9.5 × 4 mm gasket stands 2.4 mm out of its 1.6 mm groove, and
  is squeezed to 0.4 mm as the wall goes in. That squeeze is what holds the wall.
- **The hard stop:** the gasket's fins fold into the groove, so pushed harder the strip's face
  meets the frame before they are crushed.

Measure the opening inside the frame, as for any other window. To fit the wall, push it in square
from the room side, and check that it holds before letting go. A sliding door is a slider: it runs
in tracks.

With a window AC in a frame, the unit stands on the sill and the wall above it.

## Not yet confirmed

Several test prints, the owner's step: whether the squeeze holds the wall against wind, and how
much it needs on a painted, a wooden and a metal frame. Frames vary.
