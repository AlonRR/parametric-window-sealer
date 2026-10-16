# A wall behind a roller shutter

Many windows in Germany, France, Italy and Israel have a roller shutter outside the glass, its
slats running in a guide rail on each side. With the window opened inward, the wall can stand in
those guide rails, outside the glass, and the shutter, lowered onto it, closes the top. It fits any
window behind a shutter, whatever the window, as a rigid product for portable ACs already does by
bracing a rail into the guide rails
([Trotec](https://de.trotec.com/shop/pac-rollladen-fensterblende.html)).

## The setting

Under **The window**, choose **Window type: Behind a roller shutter** (the command:
`--window shutter`; the library and the MCP server: `edges.window: "shutter"`). It sets the
edges as a hung window's:

- the **left and right edges in tracks**: the shutter's guide rails;
- the **top edge pressed by the sash**: here the shutter's end bar, its bottom slat;
- the **bottom edge on the sill**.

It also sets the track to a typical guide rail's sizes, to start with: **9 mm wide** and **20 mm
deep**. Choosing another window type puts the example track back (15 mm wide, 10 mm deep).

## Measure your rails

The sizes it starts with fit common rails, but rails vary. Measure:

- **The opening**, as for any window: between the two rails' mouths, and from the sill up to
  where the end bar will rest.
- **The gap at a rail's mouth**: the clear space between its brushes or rubber seals. The edge
  strips are the track width less 0.5 mm a side; make the track width about the gap. A rail made
  for thick slats (13 to 14 mm) leaves the strips loose: set its width, or add felt or foam.
- **How deep each rail is**, from the mouth to the bottom of the channel. Set each side's depth a
  few mm less, so the wall has play to go in, as a shutter's slats do: they sit about 20 mm into a
  rail 25 mm deep.

Lower the shutter until its end bar sits at the height you measured, and push the wall's edge
strips into the rails, one side at a time.

## Where the starting sizes come from

| | mm | From |
|---|---|---|
| Gap between the brushes at a rail's mouth | about 9.2 | Aluprof's guide channel PP53/S, scaled from its drawing ([catalogue](https://katalog.aluprof.com/en/products/guide-channels/aluminium/PP53_S_x_10_1)) (inferred) |
| Gap between rubber seals | about 10.2; 15.6 for 14 mm slats | Aluprof PP53/G and PU43/G, scaled (inferred) |
| Rail mouth without inserts | 14.6 (rails for 8 to 9 mm slats) | Aluprof's drawings (verified) |
| Rail depth, mouth to bottom | 18 to 41; 26 in the common 53 × 22 rail | Aluprof PP45/S, PP68/S, PP53/S (verified) |
| How far the slats sit in a rail | 20, in a rail 25 deep: 5 of play | Ammon's catalogue, "Einstandsmaß" and "Nullmaß" ([PDF](https://www.ammon.de/ammon/wp-content/uploads/Kat_Katalog_Rollladen_08_2025_Digital.pdf)) (verified) |
| Slats | 8 to 9 thick (37 to 45 mm profiles), 13 to 14 (52 to 55 mm) | Aluprof's and Ammon's profiles (verified) |

The strips are **8 mm thick**, the track's 9 mm less 0.5 mm a side, so they pass both brushes and
seals in rails for 8 to 9 mm slats; and they fill **20 mm** of the rail, as the slats do. No sizes
were found for Israeli rails; an Israeli foam-slat shutter is taken to be like the European ones
until one is measured (inferred).

## Using it safely

- **The wall does not carry the shutter.** Lower the shutter only until its end bar rests on the
  wall's top edge, and hold it there by its strap or crank. A curtain weighs about 3 to 5 kg per
  m² (foam-filled aluminium and PVC) and up to 9 kg in extruded aluminium (Aluprof, Klil): 1.5 m
  of a heavy curtain left to hang on the wall would load its top edge with about 13 kg for each
  metre of width (inferred). A motorised shutter's obstacle detection stops it only with rigid links between the
  shutter and its shaft (Somfy, Ammon), and no maker gives the force it stops at: lower it in short
  steps and stop it yourself.
- **Wind.** The wall's edges in the rails carry the wind, not the shutter: at 100 Pa, a strong
  breeze, a wall 1 m wide and 0.6 m tall takes about 60 N (inferred). A half-closed shutter "could be
  torn out of its guides" in a storm, so before one, take the wall out and close the shutter (VFF,
  via [verbandsbuero.de](https://www.verbandsbuero.de/sonnenschutz-als-wetterschutz-fensterschutz-bei-sturm/)).
- The plan says both of these in its line for the wall behind a shutter.

## Not yet confirmed

- No test print yet: whether the strips pass a real rail's brushes or seals and hold the wall, and
  whether the end bar's rubber seal closes the top.
- Israeli rails' sizes; the brushes' and seals' gaps were scaled from drawings, not measured.
