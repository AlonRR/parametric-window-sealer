# Choices made without asking

Working notes. Since 5 Oct 2026 the agent builds the option it would recommend instead of
asking the owner, and lists each such choice here with the options it did not take (Q144). The
owner reviews them when he likes; to change one, name its ID. Each has an ID of the form `C1`,
`C2` …, kept even when a choice is changed. A changed choice moves to the decisions in
[`status.md`](status.md) with a question ID.

The first entries are choices made before Q144 in work the owner had not been asked about.

| ID | Item | Choice made | Other options |
| --- | --- | --- | --- |
| C1 | `patterns-core` (#20) | The pattern's tiles are **centred on the wall's centre**, so the wall is symmetrical | Start the tiles at the wall's bottom-left corner; start them at each piece's border, so every piece begins with a whole opening |
| C2 | `patterns-core` (#20) | A sliver of opening thinner than a bar is removed by **shrinking every opening by half a bar and growing it back with mitred corners**, so square corners stay square | Grow back with round corners (every opening gets rounded corners); drop only openings smaller than an area |
| C3 | `seal-tape` (#15) | An edge strip with tape on its sides **names its track's depth in the file name** (`edge-152.5x13x11-track-10-print-8.stl`), as two depths can give one size with grooves in different places | A running letter (`-a`, `-b`); the side groove's offset in mm |
| C4 | `seal-tape` (#15) | The strips that run through a corner **reach the squeezed tape's face**, so the corner stays closed | Stop them at the other strip's own face, which leaves a gap the size of the squeezed tape at each corner |
| C5 | `seal-tape` (#15) | The plan's tape length is **every strip's outer face, both sides of the strips in a track, and round each collar's groove**, with nothing added for waste | Add a margin for waste (10 %); give the length for each place separately |
| C6 | `seal-tape` (#15) | The tape inside a hose port's collar is **centred on the collar's depth** | At the collar's mouth; at its foot, by the lip |
| C7 | `seal-tape` (#15) | The preview draws the tape in **orange**, to stand out from the grey parts | Dark grey or black, as most foam tape is; white |
| C8 | `seal-tape` (#15) | The MCP server takes the tape's places as **true or false**; the page and the command say yes or no | Yes or no everywhere |
| C9 | `pattern-grid` (#16) | The fill is a **"Fill" list** (Sealed, then a "Patterns" group with Grid), with **Relief and Cut through shown once a pattern is chosen** | A radio button for each pattern; pictures of the patterns to click |
| C10 | `pattern-grid` (#16) | The command's flags are **`--fill`, `--fill-style`, `--relief-depth` (in %), `--grid-opening` and `--grid-bar`**; the MCP server's shape is `fill: { kind, style, reliefPct, grid: { openingMm, barMm } }` | `--pattern grid` with `--through` or `--relief`; the relief depth in mm |
| C11 | `pattern-grid` (#16) | **Grid settings given alone mean the grid**, as tape settings mean tape and a printer size means a custom printer | Refuse them without `--fill grid` |
| C12 | Process (Q144) | This list, and the record of Q144 in `CLAUDE.md` and `status.md`, **ride in the grid's pull request** instead of one of their own | A pull request of their own, as Q123's had |
| C13 | `pattern-hexagon` (#17) | **Pointy-top hexagons along rows**, every other row shifted half a pitch: a honeycomb | Flat-top hexagons in columns |
| C14 | `pattern-hexagon` (#17) | **15 mm across the flats with 3 mm bars** to start with, as the grid (Q139) | The engine benchmark's 10 mm with 2 mm walls; 20 mm with 4 mm |
| C15 | `pattern-hexagon` (#17) | The hexagon has **sizes of its own**, kept when another pattern is chosen, and read only when it is the pattern chosen | One opening size and one bar width shared by every pattern |
| C16 | `pattern-hexagon` (#17) | The command's flags are **`--hex-opening` and `--hex-bar`**, either alone meaning the hexagon; the MCP server's `fill.hexagon` | `--hexagon-opening`; a shared `--opening` and `--bar` for whichever pattern |
| C17 | `pattern-hexagon` (#17) | Under "Advanced: the pattern", **only the chosen pattern's sizes show** | Every pattern's sizes at once |
| C18 | `pattern-brick` (#18) | **Brick-shaped openings in a running bond**, every other row shifted half a brick | A stack bond (rows not shifted); a herringbone |
| C19 | `pattern-brick` (#18) | **30 × 12 mm openings with 3 mm bars** to start with | Real brick proportions, about 3.3 : 1 (33 × 10 mm); 40 × 20 mm |
| C20 | `pattern-brick` (#18) | The bricks have **a width, a height and a bar of their own**, read only when they are chosen | A width and a bar, the height fixed at half the width |
| C21 | `pattern-brick` (#18) | The command's flags are **`--brick-width`, `--brick-height` and `--brick-bar`**, any alone meaning the bricks; the MCP server's `fill.brick` | A shared set of size flags for whichever pattern |
| C22 | `pattern-diamond` (#19) | **Point-up diamonds in a lattice**, each a bar from its four diagonal neighbours, as a leaded window | Square diamonds only (the grid turned 45°); diamonds in plain rows and columns |
| C23 | `pattern-diamond` (#19) | **20 mm wide and 30 mm tall** across the corners, **with 3 mm bars**, to start with | 20 × 20 mm (square diamonds); 15 × 25 mm |
| C24 | `pattern-diamond` (#19) | The diamonds have **a width, a height and a bar of their own**, read only when they are chosen | One size, always square |
| C25 | `pattern-diamond` (#19) | The command's flags are **`--diamond-width`, `--diamond-height` and `--diamond-bar`**, any alone meaning the diamonds; the MCP server's `fill.diamond` | A shared set of size flags for whichever pattern |
| C26 | `params-advanced` (#21) | A piece's own fill sets its **fill and style**; the pattern's **sizes stay the wall's** | Each piece with sizes of its own |
| C27 | `params-advanced` (#21) | A piece with its own pattern **stays on the wall's lattice**, so it lines up with its neighbours | Its pattern centred in the piece |
| C28 | `params-advanced` (#21) | Written as **`column,row=fill[:style]`**, several separated by spaces, as the ports are; the command **repeats `--piece-fill`**; the MCP server takes `pieceFills: [{ column, row, kind, style? }]` | One flag per piece and setting (`--piece-2-1-fill`); a fill for a whole row or column at once |
| C29 | `params-advanced` (#21) | The page shows **a map of the pieces as seen from the room, top row first**, and **one list for the chosen piece** with its fill and style together ("Grid, relief") | A drawing of the wall to click; a fill list and style buttons apart |
| C30 | `params-advanced` (#21) | A fill for a piece the wall does not have, as after making the wall smaller, is **refused with a message** | Dropped without a word; kept and ignored |
| C31 | `seal-tpu` (#22) | **"Printed TPU" is a third seal** beside none and foam tape: gaskets printed in TPU sit in the tape's grooves, and the panels leave them the room the tape would take | Print the edge strips themselves in TPU, as the backlog row first put it; TPU only for the joints, the edges keeping tape |
| C32 | `seal-tpu` (#22) | **Each gasket is a base filling its groove, with two 0.8 mm fins leaning out 20°** up to the tape's thickness, so that squeezed they fold away from each other; the base is at least 0.8 mm thick, and the gasket prints standing on it | A solid bar squeezed as a block; a hollow bulb, as on a car door; a single fin |
| C33 | `seal-tpu` (#22) | **A TPU sleeve in each hose port's collar groove**, as tall as the tape is wide and 0.5 mm a side smaller than the hose, so it grips the hose | Foam tape inside the collar even with the TPU seal; the whole collar's piece in TPU |
| C34 | `seal-tpu` (#22) | Under Advanced, **the joint strips and cross pieces in TPU**, off to start with, their slots 0.2 mm narrower than the panel so they grip it | Always in TPU with the TPU seal; slots as wide as the rigid strips'; the edge strips in TPU as well |
| C35 | `seal-tpu` (#22) | The gaskets **take the tape's size settings**; the page's "Tape size" becomes "Seal size" and "Advanced: the tape" "Advanced: the seal" | Sizes of their own for the gaskets |
| C36 | `seal-tpu` (#22) | The preview draws the TPU parts **in dark grey**, squeezed in place as the tape is drawn | The gasket's own shape, unsqueezed; the tape's orange |
| C37 | `seal-tpu` (#22) | **TPU parts say `-tpu` in their file names** (`gasket-152.5x9.5x4-tpu-print-8.stl`, `sleeve-150-tpu-print-1.stl`, `strip-182.6x18-tpu-print-10.stl`), to set them apart for the TPU spool | A folder of their own in the zip; no mark in the name |
| C38 | `seal-tpu` (#22) | **TPU joints are refused with foam tape**, with a message, as tape does not fit a joint (Q128) | TPU joints beside tape on the edges |
| C39 | `seal-tpu` (#22) | **TPU joints given alone mean the TPU seal** (`--tpu-joints yes`, or `seal.tape.joints: true` without a kind), as other tape settings alone mean tape | Refuse them without `--seal tpu` |
| C40 | `measured-cutout` (#23) | A cutout sits **inside one piece, centred, clear of the strips**, as the hose port does (Q105, Q108); a larger appliance is the window AC's fitting (#24) | A cutout across several pieces, cutting into them and the strips between; a cutout at the wall's edge |
| C41 | `measured-cutout` (#23) | **A rectangle of the appliance's measured outside**, seen from the room, which **passes right through** (no lip) | Rounded corners of a radius given; a lip to stop against, as the hose port has |
| C42 | `measured-cutout` (#23) | **A rim round it on the room side, 15 mm deep, with a 2.4 mm wall** (the collar's) **and 1 mm clearance a side**, starting values under Advanced | No rim, a bare hole; the collar's 20 mm depth; 0.5 mm clearance, as the collar's |
| C43 | `measured-cutout` (#23) | **The rim is lined with the wall's seal whenever there is one**: foam tape in a groove round its inside, taking the clearance's place, or a printed TPU frame in that groove, 0.5 mm a side smaller than the appliance | A switch under Advanced, as tape in the port's collar has (Q129); a seal of the cutout's own |
| C44 | `measured-cutout` (#23) | Written **`120x80` or `120x80@2,1`**, several separated by spaces, as the ports are; the command repeats **`--cutout`** and takes **`--rim-depth`, `--rim-wall` and `--rim-clearance`**; the MCP server takes `cutouts: [{ widthMm, heightMm, column, row }]` and `rim` | `--cutout-width` and `--cutout-height` flags, one cutout only |
| C45 | `measured-cutout` (#23) | On the page, **a third answer to "What is in the window?"**: "Something else: a measured cutout", with **one cutout**; the command and the MCP server take several | An "Add another cutout" button, as for ports; cutouts beside a hose port on the main form |
| C46 | `measured-cutout` (#23) | The cutout's piece is named **`piece-c2-r1-…-cutout-120x80.stl`**, the TPU frame **`frame-120x80-tpu-print-1.stl`** | No mark in the piece's name |
| C47 | `measured-cutout` (#23) | A cutout without a piece **starts in the hose port's starting piece**, the bottom row's middle one (Q105, Q110) | The middle of the wall; the bottom left piece |
| C48 | Process (Q30) | The next planned milestone is **`v0.3.0` when every P1 issue is closed**; three remain (window-ac #24, offline-file #25, user-guide #14). The tag still goes to the owner's machine (Q123) | Release `v0.3.0` now, with the patterns, the seals and the cutout; a release after each item |
| C49 | `window-ac` (#24) | A window AC is **a fourth edge role, against the unit**, shaped as at a sash or a sill: a flat face with the seal on it. The plan says which edge meets the unit | A fitting part of its own for the unit; one wall drawn round the unit, an L or U shape |
| C50 | `window-ac` (#24) | The page's "What is in the window?" gains **"Window air conditioner"**, asking **where the unit is, seen from the room**: below the wall, or to its left or right; that sets the edge facing it | The edge's role alone, set by hand |
| C51 | `window-ac` (#24) | The opening is **the area left open around the unit**, measured as before; in a hung window, **one wall for each side**, each made on its own | The window's full opening and the unit's size, with both side walls made at once |
| C52 | `window-ac` (#24) | The command and the MCP server take it **as an edge role**: `--bottom-edge unit`, `edges.roles.bottom: "unit"` | A flag of its own, `--ac below\|left\|right` |
| C53 | `window-ac` (#24) | The unit starts **below the wall in a slider** (the wall stands on it) and **to its right in a hung window**; changing the window type moves it to that type's start | Below the wall in both |
| C54 | `offline-file` (#25) | **One HTML file holding the page's script, styles and geometry engine**, the engine as a data URL, about 1.4 MB; the build refuses to write it if anything would have to sit beside it | A zip of the site's files to unpack; an installable web app (PWA) that keeps a copy in the browser |
| C55 | `offline-file` (#25) | It is **built with the site and offered from the page by a link** that saves it; opened from the disk, the page does not offer itself again | A file attached to each GitHub release; a separate download page |
| C56 | `offline-file` (#25) | The file is named **`window-sealer.html`** | `window-sealer-offline.html`; the version in the name |
| C57 | `offline-file` (#25) | It is **tested opened from the disk with the network cut off**: it plans, draws and downloads, and fetches nothing | Checking the file's contents only |
