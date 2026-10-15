# The hose port

A portable air conditioner's exhaust hose goes out through a port in one piece: a round hole with a
collar standing on the room side. The hose end goes into the collar and stops against the panel.

## Holding the hose

Hoses pushed into a window kit fall out under their own weight, and a gap beside the hose draws its
hot exhaust back into the room (from the design review, `research/design-review.md`). Under
**Advanced: the hose port**, **Holding the hose** has two choices (the command: `--port-lock`):

- **Pushed into the collar** (`push`, the starting choice): the hose end goes into the collar with
  0.5 mm to spare each side. Nothing else is needed.
- **A ring on the hose end that twists in** (`twist`): a printed ring slides over the hose end and
  clamps on it with an M4 bolt through two lugs; the plan gives the bolt's least length (22 mm).
  Three pins on the ring go down three slots near the collar's mouth and turn 20° clockwise, seen
  from the room, under the collar's rim. The collar is made wider to take the ring. Nothing here
  depends on the AC's maker: the ring grips any round hose end.

To fit the ring:

1. Slide the ring over the hose end, its lugs towards the hose, and tighten the bolt until it grips.
2. Line the pins up with the slots, push the hose end into the collar, and turn it clockwise until
   it stops.

With the seal inside the collar (foam tape, or a printed TPU sleeve), the groove for it moves to the
foot of the collar, below the slots, and the sleeve grips the ring. A collar too shallow for both is
refused, saying how deep it must be.

## The cap

A cap for each port is printed to start with (**A cap to close the port**, `--port-cap`): a disc
wider than the collar, to grip, and a skirt that pushes into it. Put it in when the AC is off, so
cold air and condensation do not come back down the hose.

## The screen

**A screen of bars across the port's hole** (`--port-screen`) fills the hole with bars 1.6 mm wide
round 8 mm openings, against birds and large insects. It is off to start with, as it slows the
exhaust a little.

## Not yet confirmed

A test print, the owner's step: that the ring grips a hose end, that the pins pass the slots and
hold, and that the cap stays in.
