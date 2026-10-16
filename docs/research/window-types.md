# Other window types

Working notes, 16 Oct 2026, at the owner's request (Q161): "look into other window types". The
question: which windows do people fit a window AC, a portable AC's hose or a fan into, which of them
the tool already seals, and what it lacks for the rest. It adds to [`frame.md`](../frame.md) and
the design review ([`design-review.md`](design-review.md), §2) and repeats neither.

**How far to trust it.** As in the design review:

- **(verified):** the page was read during the research;
- **(relayed):** from a search summary, or a page that refused the research tools (MakerWorld and
  some shops did);
- **(inferred):** reasoning from the sources, not a measurement.

## The main finding

Most of what the tool cannot seal yet is one shape: **the wedge a hinged sash leaves when it is
opened part way.** A slot along the sash's free edge, and a triangle at each end of it. In Europe
it is closed with a fabric bag over "the three open sides": Trotec sizes its AirLock 1000 by "the
sum of the three open sides"
([dantherm](https://dantherm.ch/en/products/trotec-airlock-1000-fensterabdichtung-fuer-klimageraete-600-cm))
(verified), and one kit is fitted with the sash opened about 20°, "nicht gekippt", not tilted
([homeandsmart](https://www.homeandsmart.de/klimaanlage-fensterabdichtung)) (verified). No rigid
product for that gap was found, only 3D-printed hobby adapters for tilted windows.

## By window type

| Window | How it opens | Today | What is missing |
|---|---|---|---|
| Sliders: Israeli aluminium, Japanese 引違い, patio doors | Sideways in tracks | Sealed: the slider | A 2.2 m tall, narrow wall's stiffness, unchecked |
| Hung windows | Up and down in tracks | Sealed: the hung window | Nothing new |
| Casement, opening out (US crank, UK friction stay, Japanese すべり出し) | Hinged at the side, swings out | Sealed: a frame with no track, in the opening | Notches where the crank or the stay's arms cross the frame (inferred) |
| Awning | Hinged at the top, opens out | Sealed: a frame with no track, from inside, at any angle (inferred) | Nothing new |
| Tilt-and-turn, turned fully open | Hinged at the side, swings in | Sealed: a frame with no track; the sash stands in the room | Nothing new |
| Tilt-and-turn turned part way; inward casements; French and balcony doors part open | Hinged at the side, swings in | Not sealed | The wedge: a slot on the latch side, 2·W·sin(θ/2) wide (278 mm for an 800 mm sash at 20°, inferred), and a triangle at the head and at the sill |
| Tilt-and-turn tilted, Israeli "kip", hopper | Hinged at the bottom, the top falls in | Not sealed, except by a frame with no track set deeper in the reveal than the tilted sash reaches, where the reveal is flat and deep enough (inferred) | The wedge, its slot along the top, about 100 to 160 mm (inferred from restrictor stays at 100 mm and cat guards 160 mm at the wide end); a hose port flattened to fit it |
| Pivot windows (Schwingfenster, Wendefenster) | Turn on a centre axis, half out, half in | Sealed since `pivot-window` (#162) on a horizontal axis and `pivot-vertical` (#179) on an upright one: a wall on the side that swings out, its edge at the pivot against the sash, and a tilted or a turned sash's wedge on the side that swings in ([`pivot.md`](../pivot.md)) | Nothing new |
| Roof windows: top-hung (Velux GPL) | Hinged at the top, opens out to 45° | Partly: a frame with no track from inside, with nothing checking that the gasket holds the wall's weight on a slope (inferred) | A roof-pitch setting, that check, and rain on a sloped face |
| Roof windows: centre-pivot (Velux GGL) | A pivot window in a roof | Sealed since `pivot-window` (#162): the pivot window with its pitch, the plan saying what pulls the wall out of the frame, as for a top-hung one | Nothing new |
| Jalousie, louvre | Glass blades in clips, turned by a crank | Sealed since `louvre-frame` (#163): the wall in place of the lowest blades, its sides against their clips and the lowest blade left closing onto its top ([`louvre.md`](../louvre.md)) | Nothing new |
| Bay and bow | Fixed panes with casements or hung windows | Each opening one of the above | Nothing new |
| Any window behind a roller shutter (Germany, France, Italy, Israel's "trisol") | The shutter runs in guide rails outside the glass | Sealed since `shutter-rails` (#158): the wall in the shutter's guide rails, its top edge under the lowered shutter ([`shutter.md`](../shutter.md)) | Nothing new |

Sources for the table, beyond those above:

- Casements: US sizes 356 to 902 mm wide and 749 to 1969 mm tall
  ([Feldco](https://www.4feldco.com/articles/standard-window-sizes)) (verified); UK restrictors
  often stop the opening at 100 mm, BS 6375-2
  ([IronmongeryDirect](https://ironmongerydirect.co.uk/product/upvctimber-concealed-window-restrictor-11.5mm-pin-height-197684))
  (relayed); one maker of portable ACs suggests a custom acrylic panel or a fabric kit
  ([Whynter](https://whynter.com/how-to-install-a-portable-air-conditioner-in-a-casement-window/))
  (verified); a slider/casement window AC stands on a platform screwed to the jamb, with a plastic
  panel above it ([Frigidaire manual, pp. 8–9](https://c.searspartsdirect.com/doc/L0806994))
  (verified).
- Tilt-and-turn and kip: "entirely ordinary" in Germany
  ([99% Invisible](https://99percentinvisible.org/article/tilt-turn-ingenious-three-one-window-security-breezes-egress/))
  (verified); kip and dry-kip windows sold in Israel
  ([Neshel](https://neshel.co.il/en/product/windows-en/)) (verified); restrictor stays at 100 mm
  ([G-U](https://www.g-u.com/Medien/Dokumente%20werblich/Englisch/Flyer_11_L%C3%BCftungsfangschere_ENG.pdf))
  (relayed); cat guards for the side triangles 620 to 760 mm tall and 160 mm at the wide end
  ([zooplus](https://www.zooplus.de/shop/katzen/balkon_garten/kippfensterschutz/623813)) (relayed);
  fabric kits from Trotec, Voltomat
  ([Bauhaus](https://www.bauhaus.at/klimaanlagen-zubehoer/voltomat-fensterabdichtung-hot-air-stop-fuer-kippfenster/p/28317492))
  and Midea ([PortaSplit](https://www.midea.com/nordics/cooling-heating/portasplit/installation))
  (relayed); a printed adapter for tilted windows, modular left and right
  ([MakerWorld 2781804](https://makerworld.com/models/2781804)) (relayed).
- Hopper windows: 305 to 610 mm tall and 760 to 915 mm wide
  ([Thompson Creek](https://www.thompsoncreek.com/blog/standard-hopper-window-sizes/)) (relayed);
  people wedge foam board or acrylic between sash and sill
  ([Hunker](https://www.hunker.com/12004021/the-best-way-to-vent-a-portable-ac-through-a-basement-window))
  (verified).
- Roof windows: centre-pivot for pitches of 15 to 90°
  ([Skylight Co.](https://theskylightcompany.co.uk/acatalog/VELUX-Centre-Pivot-Roof-Windows.html))
  (verified); top-hung opening to 45° for pitches of 15 to 55°
  ([Roofing Superstore](https://www.roofingsuperstore.co.uk/product/velux-gpl-mk06-top-hung-manual-roof-window))
  (relayed); sizes such as 550 × 778, 780 × 978 and 780 × 1178 mm
  ([BIMobject](https://www.bimobject.com/en-us/velux/product/GGL)) (relayed); a fabric kit in two
  pieces, 2 m × 390 mm, the lower one with a zip
  ([Wood's](https://woods.se/en/products/air-conditioning/woods-skylight-sealing-kit/)) (verified).
- Jalousies: common in Florida, Hawaii and sunrooms
  ([This Old House](https://thisoldhouse.com/windows/jalousie-windows)) (verified); blades 102 or
  152 mm
  ([Breezway](https://www.breezway.com.au/downloads/australia/pricelist/Breezway_Australia_Altair_Louvre_Window_System_January_2023.pdf))
  (relayed).
- Japan: sliding and projected windows are 80 % of fire-rated residential windows shipped
  ([MLIT](https://www.mlit.go.jp/common/001234638.pdf)) (relayed); window ACs for sliding windows
  770 to 1400 mm tall, with frames to 2200 mm
  ([kakaku](https://search.kakaku.com/CW-1826R/)) (relayed).
- Roller shutters: a product for portable ACs is a rail "braced into the guide rails on the left
  and right", 470 to 1360 mm wide, for 150 mm hoses only
  ([dantherm](https://dantherm.ch/en/products/trotec-pac-rollladen-fensterblende-fuer-klimageraete-mit-abluftschlauch))
  (verified); said to be "standard on nearly every German window"
  ([clean-invoice](https://www.clean-invoice.com/en/guides/german-windows-vs-american-windows))
  (relayed).

Nothing found contradicts [`frame.md`](../frame.md).

## What to add, in order

Each is a backlog item ([`backlog.md`](../backlog.md)) with an issue of its own; `other-windows`
(#43) is closed by this survey (C298):

1. **`shutter-rails` (#158), a wall in a roller shutter's guide rails (S); built
   ([`shutter.md`](../shutter.md)).** A window type whose side
   edges sit in the shutter's guide rails and whose top edge is pressed by the lowered shutter's
   bottom slat, with the wall outside the glass and the sash open inward. It is the hung window's
   shape with the shutter as the sash; one product shows it holds. It unlocks every window behind
   a roller shutter, whatever the window.
2. **`sash-wedge` (#159), the wedge for a sash opened part way (L).** Three faces for any hinge side,
   opening in or out: a strip along the sash's free edge, the edge's length by the gap measured,
   and two triangles. It needs pieces that are not rectangles, joints at about 90° between the
   faces, edges against the sash and against the frame (both exist), and a hose port in the strip.
   It unlocks tilt-and-turn windows tilted or turned part way, kip and dry-kip, hoppers, inward
   casements and French and balcony doors. Start with the side-hinged form: at 15 to 20° its strip
   is 210 to 280 mm wide, enough for a round 150 mm port (inferred).
3. **`sloped-frame` (#160), roof windows and awnings (S).** A roof-pitch setting from 15 to 90°, a check
   that the gasket's squeeze holds the wall's weight along the slope, and rain on a sloped face.
4. **`edge-notches` (#161), notches along an edge (S).** Measured notches for a crank, a friction stay's
   arms or a handle, for a cleaner fit in casements and awnings.
5. **`pivot-window` (#162), pivot windows and centre-pivot roof windows (L, after `sash-wedge`).** A flat
   wall in the half that swings out, its edge against the sash, and a wedge in the half that swings
   in.
6. **`louvre-frame` (#163), jalousie windows (M).** Edges clear of the blades' clip channels, and a top
   edge tucked under the lowest blade. A niche: Florida, Hawaii, Australia.

The order puts the quickest win first and the most-needed second, and the two make `v0.7.0`
(C299); the survey itself ranked the wedge first, as the most common window with nothing rigid made
for it.
