# Design review against published work

Working notes, 15 Oct 2026, at the owner's request: "we need to change the design to be better. do
research into already published work and see what we can learn from them." Four lines of research
ran in parallel:

1. published printable and DIY designs that do the same job;
2. commercial products;
3. engineering for large, flat printed assemblies;
4. building physics and safety.

This file gathers what they found and turns it into recommendations (R1 to R13) for the owner to
accept or turn down.

**How far to trust it.** Each claim is marked as one of three kinds:

- **(verified):** the page was read during the research. Two claims were read again for this
  file: the consumer-agency test (§2) and the oven test (§3).
- **(relayed):** the claim comes from a search snippet or second-hand. Printables, MakerWorld,
  Thingiverse, Reddit and Amazon refused the research tools, so most claims about published
  models are relayed.
- **(inferred):** a hand calculation or reasoning, not a measurement. Every deflection, U-value,
  leak flow and condensation limit below is of this kind, worked from standard formulas and
  datasheet values. A test print and a loaded test piece should confirm them.

## 1. Where the design stands

The wall today is a grid of flat printed pieces, 3 mm thick and up to the printer's bed in
size, joined by printed H-strips that hold by friction and cross pieces where four meet. It sits
in the window's track, held by the closed sash, and edge strips fill the track. Seals are
optional: foam tape in grooves, or printed TPU. The fittings are:

- a hose port;
- a measured cutout;
- a fan mount;
- clamps;
- a sliding insert.

The fills are sealed, a pattern, or (planned) an organiser board. The material is left to the
user (Q6).

## 2. What the published work does

**Printed and DIY designs.** About twenty were found; the closest are below, with the full list in
the research reports.

- **The closest design** is a parametric strip that fills the gap beside a portable AC
  (<https://makerworld.com/en/models/2886546>). Its segments stack and join with magnets. Its left
  and right rails are set separately, because the frame and sash channels differ. It seals with
  foam, and it is said not to be a security barrier (relayed).
- **How they join.** Most designs are a one-way stack of modules, joined by bow-tie keys,
  dovetails, pegs, sliding boxes or glue. No published design uses separate H-strips or a 2D grid
  of pieces, as far as the research found.
- **How they fit the size.** Four ways recur:
  - fixed modules plus a filler;
  - a parametric generator;
  - telescoping slides;
  - **sheet cut to size, with only the fittings printed:** acrylic, twin-wall polycarbonate, XPS
    foam board, plywood or PVC film. The last is the most common cheap build.

  Examples: <https://makerworld.com/en/models/2972440> and <https://makerworld.com/models/2742113>
  (relayed); <https://blog.rfox.eu/en/3D_printing/3D_printing_exhibit_2_Window_shield_for_portable_air_conditioner.html>
  and the Glowforge forum builds (verified).
- **Print time is the recurring cost.** One fully printed insert takes 45.5 h on 10 plates
  (<https://makerworld.com/models/2667443>, relayed). Another weighs 1145 g and takes 15.5 h with
  supports (HELIX, verified). The rfox shield was printed only as a skeleton, because the whole
  panel "would take weeks" (verified).
- **What went wrong** (relayed unless marked):
  - "All of my PLA test prints melted and fell off the window after a few hours", beside an
    exhaust (<https://www.printables.com/model/530713>).
  - Exhaust back-pressure peeled hook-and-loop tape off a sheet insert (same page).
  - Magnets alone did not hold until clips were added (Glowforge, verified).
  - Segments joined from the side are hard to fit as the last piece in the frame
    (<https://www.printables.com/model/1440185>).
  - Condensation ran back down the hose into the unit overnight (HELIX comment, verified).
  - At least one piece usually needs changing to fit.
  - The common advice is to cut slightly long rather than short.
- **Material, in the designers' own words:**
  - "PETG will work, but I strongly suggest… ASA" (HELIX, verified).
  - Several designs rule PLA out near the exhaust (relayed).

**Commercial products.**

- **Portable AC window kits:**
  - They telescope, and lock their length with a pin, a screw or a wing nut, not by friction.
  - They are held by the closed sash.
  - Every hung-window kit ships foam for the gap between the two sashes.
  - The hose twists or snaps into a socket.
  - Sources (verified): the Honeywell HF/HL kit sheet, the DP08CS manual, De'Longhi's manual,
    and the AC Infinity window kit manual and product page.
  - Complaints: poor sealing at the kit's edge is "one of the most common problems" (verified,
    idealhome.co.uk), and the hose falls out under its own weight.
- **Sealing decides whether the AC cools.** The Korea Consumer Agency tested six portable ACs
  (8 July 2026; verified, re-read). Four could not bring a room down to 24 °C with the window kit
  supplied. With the window gaps sealed properly they reached it in 41 to 58 minutes
  (<https://en.nocutnews.co.kr/news/6544740>).
- **Fabric kits** stick hook-and-loop round the frame and have a zip for the hose.
  - They are the norm for European tilt-and-turn windows.
  - Their known problems are adhesive that lets go, flapping in wind, and windows that will not
    close (verified: Draper, Trotec, coolblue.de, homeandsmart.de, hausjournal.net).
  - No rigid product was found for tilt-and-turn windows.
- **Indow inserts** are 3.2 mm acrylic with a silicone compression tube round the edge. They are
  made slightly larger than the opening and need no track and no hardware (verified: Residential
  Systems, Bob Vila; relayed: Indow's FAQ).
- **Casement windows** get a panel in the screen opening, cut long so its edges compress, or
  clips. Foam inserts can blow out (verified: Bob Vila, Whynter, The Handyman's Daughter).
- **Window fans, vent kits and feed-throughs:**
  - Dryer and printer vent kits add a self-closing louvred rain hood with a screen (verified).
  - A radio feed-through is a cedar board, "one cut customizes", sealed by weatherstrip
    (MFJ-4602, verified).
- **Security.** Window-AC kits screw a sash lock or angle stop to the window (verified: a Home
  Depot manual, Brown University's safety office). No portable-AC kit found has one.

## 3. Engineering checks

- **One piece is stiff enough** (inferred).
  - Wind gives about 60 Pa at 10 m/s, 135 Pa at 15 m/s and 240 Pa at 20 m/s (q = ½ρv²,
    engineeringtoolbox, verified).
  - A 200 mm square of 3 mm PLA, supported at its edges, then deflects about 0.2 mm at 240 Pa.
    PETG deflects about 0.37 mm.
  - The stress is about 0.3 MPa, against a printed strength near 50 MPa.
  - The plate coefficients are from Roark, via engineersedge (verified), and the moduli from
    datasheets: PLA 3.1 GPa, PETG 1.7 GPa (verified).
  - The calculation was re-done for this file and agrees.
- **The whole wall is not stiff enough** (inferred).
  - If the joints held the pieces as one 3 mm sheet, a 500 × 1000 mm wall would deflect about
    11 mm (PLA) to 20 mm (PETG) at 135 Pa. A 1000 × 1500 mm wall would deflect over 100 mm.
  - The joints are weaker still: the 3.0 mm piece sits 6.5 mm deep in a 3.4 mm slot (Q56), so
    each can tilt about 3.5° before both flanges bear. A joint acts as a loose hinge, and can
    rattle in gusts.
- **How others fit printed parts** (verified):
  - No published system relies on one exact friction fit.
  - Multiboard ships its snaps at 0.15, 0.25, 0.5 and 0.65 mm clearance.
  - openGrid suggests printing at 99.5 % if parts are tight.
  - Gridfinity uses 0.25 mm a side.
  - Crush ribs, small bumps that deform when pressed, make press fits work across printers.
  - Desktop printers hold about ±0.5 % or ±0.5 mm (fastradius DFM guide), so the 3 mm slide per
    joint is well sized (inferred).
  - Sources: docs.multibuild.io, opengrid.world, the Gridfinity source, Prusa's help, a Bambu
    forum thread.
- **Heat:**
  - In CNC Kitchen's loaded oven test, PLA gave at 60 °C, PETG at 80 °C, and ASA softened at
    110 °C and failed at 120 °C (verified, re-read).
  - Sun heats black surfaces about 44 °C above the air and white ones about 20 °C (verified,
    glasstimes).
  - So at 30 °C outside, a dark panel reaches about 74 °C, past PETG's limit, and a white one
    about 52 °C, near PLA's (inferred).
  - Printed PLA creeps under a constant load well below its softening point (arXiv 2302.11240,
    verified). Friction fits and the sash's squeeze relax over time.
- **TPU seals:**
  - Compression set is 38 % for TPU 95A and 26 % for 85A at 23 °C, and 90 % and 52 % at 70 °C
    (Forward AM datasheets, verified). The softer grade recovers better, and a hot seal loses
    most of its rebound.
  - A narrow bead or fin seals with less force than a flat gasket (verified).

## 4. Building physics and safety

- **Insulation** (inferred, from ISO 6946 surface and air-gap resistances):

  | Build | U-value |
  |---|---|
  | 3 mm printed sheet | 5.4 W/m²K, like single glazing (6.0) |
  | Double wall, 10 to 25 mm gap | 2.7 to 3.0 W/m²K |
  | With 20 mm XPS | about 1.3 W/m²K |

  The calculation was re-done for this file and agrees. Reference values for single and twin-wall
  polycarbonate are from makers' sheets (verified).
- **Air leaks matter more than conduction in summer** (inferred). A 2 mm × 1 m gap passes about
  40 to 60 W at a 10 °C difference, more than the whole panel conducts. A gap beside the hose
  nozzle is worse still: it draws the 40 to 50 °C exhaust back in (LG's support page, verified).
- **Condensation in winter** (inferred). At 20 °C inside and 0 °C outside, the room side of the
  wall condenses above these room humidities:
  - single wall: 40 %;
  - double wall: 61 %;
  - with XPS: 81 %.

  A single-wall panel left in over winter will run wet.
- **Rain:**
  - Drip kerfs break the water's path along the underside (buildingscience.com BSI-131,
    verified).
  - Laps must shed water downward (verified).
  - Window ACs are tilted about 3° outward and must not be obstructed (manuals, verified).
- **UV.** PETG lost 36 % of its strength after 24 h of UV-B, PLA 5 % (Amza et al. 2021,
  verified). ASA held up in UV ageing (abstract, verified). No outdoor study of printed parts
  over months was found.
- **Escape windows.** A bedroom's escape opening must open from inside without a key, a tool or
  special knowledge (IRC R310 as adopted by Washoe County, verified).
- **Children.** About 5,200 US children a year are treated after window falls, and "screens will
  not prevent a child from falling" (Nationwide Children's, verified). New York City requires the
  gap beside a window AC to be "covered with rigid, secure panels" (nyc.gov, verified).
- **Fire.** Printed plastics are at best UL 94 HB, the slow-burning class, unless sold as flame
  retardant (UL, verified).

## 5. Recommendations

The owner took all thirteen (Q153, "153 yes to all"). Each is a backlog item at P1, issues #110
to #122, in this order.

Each recommendation names its evidence, its rough size, and the decision it would change, if any.
They are listed in the order recommended.

- **R1. A tighter joint that locks.** Shorter play, crush bumps on the strip's flanges, and a pin
  or detent that stops a piece pulling out, so the wall stops acting as a set of loose hinges.
  - Clearance becomes a setting.
  - The guided test print (`fit-test-print`, #63) gains a coupon that tries several clearances.
  - Evidence: §3 (hinge play; no system relies on one exact fit; crush ribs); §2 (kits lock by
    pin, screw or wing nut; magnets and adhesive gave way).
  - Size: M. It changes Q13's friction fit and the starting joint (Q56).
- **R2. Strips that stiffen.** Where the wall spans more than about 500 mm, the H-strips running
  across the long way get a fin standing out on the room side, so they work as mullions. Above
  about 1000 mm the page asks for a bought stiffener (an aluminium angle or a batten).
  - Evidence: §3 (the whole wall deflects 11 to 100 mm; one piece is fine).
  - Size: M.
- **R3. Cut-sheet pieces.** An option to print only the strips, cross pieces, edge strips and
  fittings, and cut the pieces from sheet to the sizes the plan gives. The sheet can be
  polycarbonate (twin-wall insulates as well as a double wall), acrylic, foam board or corrugated
  plastic. The slot width follows the sheet's thickness.
  - Evidence: §2 (the most common cheap build; print time of tens of hours otherwise). Twin-wall
    is 3.3 to 3.9 W/m²K (§4).
  - Size: M. It adds to the brief rather than changing it: patterns and organisers still need
    printed pieces.
- **R4. Material advice by place.** PETG in a light colour by default; ASA for pieces in sun and
  anything near the hose; PLA for test fits only. The page warns when a piece in sun, or near a
  hose, is to be PLA.
  - Evidence: §2 (PLA melted beside an exhaust; designers' advice); §3 (oven test; sun
    temperatures; creep).
  - Size: S. It changes Q6 ("material-agnostic") from silence to advice; the user still chooses.
- **R5. Seal the hose first.**
  - A bayonet or threaded socket for the common 130 and 150 mm hoses, alongside the push-fit
    collar.
  - A sealed ring at the port.
  - A cap that closes the port when the AC is off, against condensation running back and cold
    air.
  - Optionally, a screen.
  - Evidence: §2 (kits twist-lock the hose; hoses fall out; the consumer-agency result; backflow
    report); §4 (hot exhaust drawn back in through gaps by the nozzle).
  - Size: M.
- **R6. Seals that bend rather than squash.** Printed TPU 85A fins or bulbs, with a hard stop
  so they are not over-squeezed, replace foam that must stay compressed. The tape stays as a
  choice, closed-cell only.
  - Evidence: §3 (compression set; a bead seals with less force); §4 (felt and open-cell foam
    fail in the DOE tests).
  - Size: M. It refines Q6 and Q17.
- **R7. The meeting-rail filler.** For hung windows, a printed or foam plug for the gap between
  the two sashes.
  - Evidence: §2 (every hung-window kit ships one).
  - Size: S.
- **R8. Rain on the outside face.**
  - Upper pieces lap over lower ones on the outside.
  - The bottom edge strip gets a drip edge and slopes outward, with weep holes.
  - Nothing blocks a window AC's tilt or drain.
  - Evidence: §4.
  - Size: S to M.
- **R9. A sash stop that releases from inside.** It stops the window being opened from outside
  but comes off by hand from inside, so an escape window still works. The page says the wall
  itself is not a lock.
  - Evidence: §2 (window-AC kits fit locks; portable kits have none); §4 (escape rules).
  - Size: S.
- **R10. A double wall for winter.** An option for two skins with an air gap. It roughly halves
  the heat lost through the wall and raises the room humidity at which it condenses from about
  40 % to 61 %. It is advised when a hose or vent stays in over winter.
  - Evidence: §4.
  - Size: M. It doubles the printing for the plain area, so with R3, twin-wall sheet is the
    cheaper way.
- **R11. Windows without a track.** A compression edge (a TPU tube round the wall, made slightly
  oversize) for casement screen openings, tilt-and-turn frames and sliding doors.
  - Evidence: §2 (Indow; the only products for tilt-and-turn windows are fabric).
  - Size: L. It extends Q14 beyond the track.
- **R12. Guidance and warnings.** The page and the guide say:
  - it is not a fall barrier;
  - do not block a bedroom's only escape window unless the wall comes out in seconds;
  - on a ground floor, add a metal lock;
  - in winter, check for condensation;
  - PLA softens in sun;
  - printed plastics burn, so keep the wall from heaters and do not trap the power cord;
  - how to assemble: whole, outside the window, then set in.

  The README and the page claim nothing below: not energy saving, not airtight, weatherproof,
  secure, child-safe or flame retardant, and no wind, rain or UV rating.
  - Evidence: §4.
  - Size: S.
- **R13. Printing defaults.** Rounded piece corners, a 1 mm chamfer on the bottom edge, and
  brim advice by material.
  - Evidence: §3 (warping guides; fastradius).
  - Size: S.

**Kept as it is, on this evidence:**

- The sash-pressure hold in a track is the market norm (§2).
- 3 mm pieces are stiff enough on their own (§3).
- The 3 mm slide per joint suits printer accuracy (§3).
- The 2D grid, the mix of fittings on one wall, and one generator for every size were found
  nowhere else (§2).

## 6. Gaps

- The research could not read Printables, MakerWorld, Thingiverse, Reddit or Amazon, so it found
  no firsthand reports of rattling, of rain getting in, or of how printed walls hold up over a
  season.
- No outdoor ageing study of printed parts over months was found.
- No data was found on printed hollow-bulb seals, or on the fit and strength of bow-tie keys.
- Every number marked (inferred) above needs a test print or a loaded test piece before the page
  states it.
