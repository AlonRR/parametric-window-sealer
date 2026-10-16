# The wedge a sash opened part way leaves: design

Working notes, 16 Oct 2026, for `sash-wedge` (#159), the second item of `v0.7.0` (C299). The
survey ([`window-types.md`](window-types.md)) found that most windows the tool cannot seal yet
leave one shape open: the wedge between the frame and a hinged sash opened part way. This note
works out its shape, how it would hold, and the order to build it in. Claims are marked as in the
survey: (verified), (relayed), (inferred).

## Two forms of the wedge

A sash hinged at the side and turned part way (a tilt-and-turn window in turn mode, an inward
casement, a French door) and a sash hinged at the bottom and tilted (tilt-and-turn in tilt mode,
the Israeli "kip", a hopper) leave the same wedge, turned on its side.

| | Turned part way (side hinge) | Tilted (bottom hinge) |
|---|---|---|
| Faces to close | A vertical strip on the latch side, the gap by the opening's height; a horizontal triangle at the head and one at the sill, the sash's width on two sides | A horizontal strip along the top, the opening's width by the gap; a thin vertical triangle at each side, the opening's height on two sides and the gap at the top |
| The gap | Chosen: 210 to 280 mm at 15 to 20° for an 800 mm sash (inferred) | Set by the window's stays: about 100 to 160 mm at the top (relayed, in the survey) |
| What holds the sash | Nothing: a turned sash swings freely, so it needs a strap or a stay to press it onto the wedge (inferred) | Its own tilt stays, which hold it rigid (inferred) |
| How the wedge holds | Squeezed between the sash and the frame once the sash is strapped onto it | Squeezed between the sash and the frame, as the wall in a frame with no track is held by its gaskets' squeeze (`compression-edge`, #120) |
| The triangles | Wide, flat triangles, the sash's width long: laid out in two directions, with very thin corners at the hinge | Thin triangles, the opening's height long and the gap wide: a chain of pieces end to end, nearly rectangles |
| The bottom | A triangle on the sill, under the sash's bottom rail, where the sash clears the sill by a few mm (inferred) | None: the hinge closes it |
| A round 150 mm hose port | Fits in the strip | Does not fit a 100 to 160 mm gap: it needs a flattened port, round on the room side and a flat slot through the wedge |

## Recommended: the tilted form first

The tilted form is the one to build first (C305):

- **It holds by itself.** The window's tilt stays hold the sash rigid, so the wedge can be made a
  little oversize and squeezed in, as the wall in a frame with no track is. The turned form needs
  a strap or stay added to hold the sash, whose pull is unknown until printed.
- **It is the everyday position.** Tilt is how these windows are left open for air in Germany and
  in Israel, and the hopper is the same shape (relayed, in the survey).
- **It is simpler to make.** A rectangle and two chains of near-rectangular pieces, against wide
  triangles laid out in two directions and a triangle under the sash. The parts it needs, the
  corner between faces and the flat port, the turned form needs too.

What it costs: a flattened hose port, round on the room side and a flat slot of the same area
through the wedge (a 150 mm hose's area is a slot of about 60 × 295 mm), which no part of the tool
makes yet; flat adapters of this kind are sold for tilted windows (relayed, in the survey).

The turned form follows on the same parts. The issue's own staging, the side hinge first, is
changed for this reason.

## The tilted wedge

Measured by the user: the opening seen inside the frame, **W** wide and **H** tall, and **the gap
at the top**, **d**, from the frame to the tilted sash.

- **The top strip** is a rectangle W long and about d wide, between the frame head's room face and
  the sash's outer face. It is a wall of pieces as any other, one piece deep, joined end to end. It
  lies square to the triangles' axis, so it meets each triangle at 90°, half an edge strip below
  their top, so its edge strip on the sash lies wholly on the sash. The frame's face and the sash's
  are each half the tilt off square to it, so its edge strips' outer faces are bevelled onto them
  (C308).
- **Each side triangle** stands in the plane of a jamb: H tall, d wide at the top, narrowing to
  nothing at the hinge. It is a chain of pieces, each no taller than the printer allows, each a
  trapezoid a few degrees off a rectangle (the sash's side meets the jamb at about asin(d/H), 5° to
  8° (inferred)). Near the hinge, where it is narrower than its two edge strips, the strips close it
  themselves: each runs on to the hinge, cut off along the axis, and the two meet there (C306).
- **The edges** against the frame and against the sash are a flat face with the printed TPU
  gasket, as an edge pressed into a frame is; each face is sized so the gaskets are squeezed, which
  holds it.
- **The corners** where the top strip meets each triangle are printed corner pieces holding both
  faces' edges at 90°: the triangle's top in a slot facing down its axis, the top strip's end in a
  slot facing along it. A corner piece closes the corner against the frame and the sash with its
  own faces, and carries the gasket's groove round the corner from the leg strip's to the top
  strip's. The leg strips stop under it, and the top strip's edge strips start beside it (C309).
- **The hose** goes through a flattened port in the top strip: its flat slot through the strip, its
  round collar on the room side.

## Order of work

1. This note; the wedge's faces from W, H and d, and the side triangles' chain of pieces, in the
   library, with tests.
2. The pieces' shapes: the strip's and the triangles' panels, their joints, their edges against
   the frame and the sash.
3. The corners between the faces, and the flattened port.
4. The setting on the page, the command and the MCP server; the plan's lines; the guide.

Then the turned form, on the same parts.

## Open until printed

- Whether the gaskets' squeeze holds the wedge against wind, and how far it must be oversize.
- Whether a tilted sash's stays are stiff enough to take the squeeze without opening further.
- The flattened port's slot against the hose's back pressure: the same area as the round hose, but
  a longer wall to drag on (inferred).
