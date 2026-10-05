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
