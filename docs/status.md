# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 5 Oct 2026. Phase: **building the MVP** ([`backlog.md`](backlog.md)). The page's
skeleton is in `web/` (`page-skeleton`, #2); no panel geometry has been written yet. The engine
is chosen (Q22) and measured in `spikes/engine-benchmark/`.

## The brief (the owner's request, 5 Oct 2026)

- Close off the open area of a window that cannot be shut because something is in the way:
  a window air conditioner, an exhaust fan, or similar.
- The fill is selectable: **sealed** or **open**; organiser types such as **honeycomb** or
  **Skådis**-style pegboard, or other organiser systems; decorative types such as **brick**,
  **diamond**, **grid**, or others.
- Parameters include the **dimensions of the open area** and the **maximum size of each piece**.
- Two ways to divide the area: **all pieces the same size**, or **as many maximum-size pieces as
  fit plus one filler piece**.
- To be workshopped together: **how pieces attach to each other**, **how the panel attaches to
  the fan or window AC**, and **how that attachment can be adjustable**.

## Decisions

| ID | Decision | Date |
|---|---|---|
| (none) | Fabrication: **FDM 3D printing** | 5 Oct 2026 |
| (none) | Windows: **horizontal sliders** and **single/double-hung** first; other types maybe later, so the design must not rule them out | 5 Oct 2026 |
| (none) | Users run it from a **web page on GitHub Pages** | 5 Oct 2026 |
| (none) | CAD engine: **decided later**, once the design is workshopped (decided as Q22) | 5 Oct 2026 |
| Q1 | Licence: **CERN-OHL-S-2.0** for the design and docs, **MPL-2.0** for code | 5 Oct 2026 |
| Q2 | Branch: commit to **`main`** (replaced by Q29: a branch and pull request per backlog item) | 5 Oct 2026 |
| Q3 | Build the Pages site now; **the owner publishes it later** (the repo is private, and making it public is his action) | 5 Oct 2026 |
| Q4 | `.repo-status`: **`publish: not-yet`** | 5 Oct 2026 |
| Q5 | Printed on **users' own printers**: the maximum piece size is a parameter, not tied to one printer. It is set from a **printer-presets list**, with a **safe default** (one size most mainstream beds fit) selected until the user picks a printer; "custom" stays available. Every preset's bed size is to be verified from the maker's own specification | 5 Oct 2026 |
| Q6 | **Material-agnostic**: the parts must print well in PLA, PETG and ASA/ABS ("it shouldn't really matter if it's well designed for printing"). Sealing is an option: **printed TPU**, **tape** (its size a parameter), or **none**, because some users do not need a perfect seal | 5 Oct 2026 |
| Q7 | Patterns are **cut through or relief, chosen per piece** | 5 Oct 2026 |
| Q8 | **"Open" means a cut-through pattern**, not a separate fill type. So the fills are: sealed (solid), a pattern (through or relief), or an organiser | 5 Oct 2026 |
| Q9 | Organiser systems: **Honeycomb Storage Wall**, **Skådis**, **Multiboard**, **openGrid**, built so **more can be added later**. "Honeycomb" in the brief is the organiser system | 5 Oct 2026 |
| Q10 | The fill is set **once for the whole wall by default**, with an **advanced tab for per-piece overrides** | 5 Oct 2026 |
| Q11 | The opening is divided as a **grid** (rows and columns as needed), and the division mode ("all equal" or "full-size pieces plus one filler") is **chosen separately for width and height** | 5 Oct 2026 |
| Q12 | The filler's **position is the user's choice** (start, end or middle), **or it is split in two for symmetry**. When the leftover is too small to print or hold, the page **warns and the user decides** | 5 Oct 2026 |
| Q13 | Pieces join with **separate connector strips** by default (a tongue on each edge (dropped by Q50: the full edge slides in), an H-profile strip between pieces, a cross piece where four meet; removable, sealable in TPU, a few mm of slide per joint). **Puzzle dovetails, sliding dovetail rails and bolted flanges** are advanced options | 5 Oct 2026 |
| Q14 | The wall is held **in the window track, clamped by the closed sash** (no screws). Track dimensions become parameters | 5 Oct 2026 |
| Q15 | Appliances: **window AC**, **portable AC exhaust hose**, **exhaust fan**, and **no appliance** (a plain wall); more can be added later | 5 Oct 2026 |
| Q16 | Fitting to the appliance, all as options: a **sliding insert** that closes in around it, a **measured cutout with a gasket**, **adjustable clamps** with slotted holes, and **standard ports** (round hose ports, fan mounts) chosen from a list | 5 Oct 2026 |
| Q17 | Optional seals (TPU, tape or none, per Q6) can go **wall to window**, **piece to piece** (in the connector seams) and **around the appliance** | 5 Oct 2026 |
| Q19 | Tools and commit identity persist through a **SessionStart hook committed in the repo**, which runs only in cloud sessions | 5 Oct 2026 |
| Q20 | Decorative patterns: **brick**, **diamond**, **grid**, **decorative hexagon**; the list is extensible, and **users can add their own** (how: Q21) | 5 Oct 2026 |
| Q21 | Users add their own patterns by **uploading an SVG tile**, **drawing one in the page**, or contributing a **pattern file to the repo** | 5 Oct 2026 |
| Q23 | The startup hook is **verified in a real cloud session**: a fresh session opened on this repo alone ran it on its own, ending with the owner's identity, all three git hooks wired and the tools installed. Its first reply came about 72 s after start, mostly building the hook environments. In a session holding several repositories it does not fire; run it by hand there (CLAUDE.md) | 5 Oct 2026 |
| Q24 | The page **runs in the browser with nothing sent to a server**, both **hosted on GitHub Pages** and as a **download that works offline** | 5 Oct 2026 |
| Q25 | Users can add their own **STL (or similar) meshes**: organiser or accessory tiles placed on a panel, 3D pattern tiles, a model of their appliance to cut around, a whole custom piece the tool trims and fits connectors to, and **any other shape** | 5 Oct 2026 |
| Q26 | The startup hook **stays synchronous** and keeps pre-building the check environments: a slow first start (about 72 s), with everything ready before work begins | 5 Oct 2026 |
| Q18 | No personal measurements: design and test against **example sizes**, labelled as examples wherever they appear | 5 Oct 2026 |
| Q22 | Engine: **TypeScript on the Manifold geometry library** (`manifold-3d`), in a custom web page. Chosen from measurements in [`spikes/engine-benchmark/`](../spikes/engine-benchmark/README.md): on the same panel, ready about 5x sooner, re-renders about 2x faster and a download about 15x smaller than OpenSCAD's WebAssembly build. No `.scad` model files | 5 Oct 2026 |
| Q27 | Before building: **work out the MVP** and keep **a file listing every item by priority and estimated ease** of implementation: [`backlog.md`](backlog.md) | 5 Oct 2026 |
| Q28 | The **MVP is confirmed as proposed** in [`backlog.md`](backlog.md): a plain sealed wall of joined pieces held in the window track, previewed and downloaded in the browser. The round hose port is first in line after it | 5 Oct 2026 |
| Q29 | Version control beyond plain commits: **semantic version tags with GitHub releases** and a `CHANGELOG.md` (first version `v0.1.0` when the MVP is complete); **a branch and pull request per backlog item**, merged with CI green; the **backlog mirrored as GitHub issues** (#2 to #43), labelled by priority and ease | 5 Oct 2026 |
| Q30 | **The agent merges each pull request once CI is green**; the owner reviews whenever he likes. Documentation-only changes go through a pull request too (all three answers offered assumed so). **The agent tags a release at each planned milestone**, starting with `v0.1.0` when every MVP issue is closed | 5 Oct 2026 |
| Q31 | Issue #1's API and MCP take **all four forms**: an **npm library** (the base the rest call), a **command-line tool**, a **local MCP server** and a **hosted web API**. Priority **P1, right after the MVP**, whose geometry is the library's core. Ranked as `api-library`, `api-cli`, `api-mcp-local`, `api-hosted` (#45 to #48, sub-issues of #1) | 5 Oct 2026 |
| Q34 | The page is built with **Vite** and unit-tested with **Vitest** (TypeScript, npm with a committed lockfile), in `web/` | 5 Oct 2026 |
| Q35 | CI also opens the **built page in Chromium** (Playwright) and checks that the WebAssembly engine starts and builds a part | 5 Oct 2026 |
| Q37 | A piece is **"too small" (Q12's warning) when it is narrower than the joint needs**: the connector's width on both edges plus a solid band between. It is computed from the joint's dimensions once `connector-strip` (#10) exists; until then the page uses a placeholder, labelled as one. The layout code takes the minimum as an input (the band: Q76) | 5 Oct 2026 |
| Q38 | The **default maximum piece size is 200 × 200 mm**: it fits all 27 full-size printers in [`printer-beds.md`](printer-beds.md) (build volumes read from the makers' own sites) with at least 10 mm to spare. The two small-bed printers (180 × 180 mm) use "custom", or later their entry in the printer list | 5 Oct 2026 |
| Q39 | The **panel thickness starts at 3 mm**; the user can change it. The edge that sits in the window track is sized separately (`track-edge`, #11) | 5 Oct 2026 |
| Q40 | The **placeholder minimum piece width is 30 mm**, shown as a placeholder, until the joint's own size replaces it (Q37). The replacement is its own MVP backlog item, `min-piece-from-joint` (#53), so it is not missed (replaced by Q76) | 5 Oct 2026 |
| Q41 | Both width and height **start as "all pieces the same size"**; the user can change each | 5 Oct 2026 |
| Q42 | The page **starts with a 600 × 1000 mm example opening**, labelled as an example (Q18) | 5 Oct 2026 |
| Q43 | The site is **built on every push**; it is **published only when the owner sets the repository variable `PAGES_PUBLISH` to `true`** (after setting the Pages source to GitHub Actions). Until then the deploy job is skipped. The steps are in the README | 5 Oct 2026 |
| Q50 | The joint strip **stands proud of both faces**: the panel's full edge slides into it. A flush strip would need the edge thinned to a tongue too thin at 3 mm | 5 Oct 2026 |
| Q51 | The joint's **starting dimensions**: slot 8 mm deep (at least 5 mm engaged plus 3 mm of slide), web 2 mm, flanges 1.6 mm, fit 0.2 mm per face, **all adjustable under advanced**. Plus a **measuring guide** with pictures, simple steps and inputs (`user-guide`, #14), and an **optional guided test print** that asks after each print and adjusts the fit (`fit-test-print`, #63) | 5 Oct 2026 |
| Q52 | A strip **holds by friction only**; a TPU strip grips harder and seals (Q17) | 5 Oct 2026 |
| Q53 | Strips and cross pieces are downloaded **standing on their flanges**, so they print without supports | 5 Oct 2026 |
| Q54 | The measuring guide covers **the window opening and track, the appliance, and printed test parts** (calipers) | 5 Oct 2026 |
| Q55 | The guided test print comes **after the MVP, "at some point"**: P2 | 5 Oct 2026 |
| Q56 | The plan puts each piece **in the middle of its slide**: 6.5 mm into the strip, so a joint takes the web plus the slide (5 mm) and can close up or spread out by the slide (3 mm). Drawn to scale in the corrected drawing A; the first drawing showed the pieces only 1.5 mm in, a drawing error | 5 Oct 2026 |
| Q57 | The **cross piece is a square as wide as the strip** (18 mm) with a + shaped web, and **strips stop half the slide (1.5 mm) short of it**, so a joint next to a crossing can close up fully | 5 Oct 2026 |
| Q58 | Strips and cross pieces download as **one file per shape, with the count in its name** (e.g. `strip-184x18-print-10.stl`); a single 3MF holds every copy. Pieces stay one file each (Q46) | 5 Oct 2026 |
| Q59 | At the wall's outer edge **a strip runs flush with the pieces**, until `track-edge` (#11) decides how the edge sits in the window track (settled by Q74) | 5 Oct 2026 |
| Q60 | When full pieces plus one filler leave **less room than a joint takes** (612 mm with 200 mm pieces leaves 2 mm), the page **warns, with a resolution already chosen that the user can click to change** | 5 Oct 2026 |
| Q61 | That warning's default is to **spread the pieces**: the full pieces stay and the joints spread within their slide to take up what is left | 5 Oct 2026 |
| Q62 | The warning offers **all three resolutions**: spread the pieces, equal pieces, or shorten one full piece so a minimum-width filler fits. One that cannot work for the size is greyed out | 5 Oct 2026 |
| Q63 | When spreading cannot work (no joint, or more than the joints' slide), the default is **equal pieces** | 5 Oct 2026 |
| Q64 | The page calls it **"Spread the pieces"**; "open the joints" needed explaining | 5 Oct 2026 |
| Q65 | An edge sits in a window track through a **separate edge strip**: it slides onto the panel's edge like half a joint strip and fills the track's width, prints without supports, and can be replaced or printed in TPU | 5 Oct 2026 |
| Q66 | **Each edge has a role**: in a track, pressed by the closed sash, or standing on a flat sill. The **window type presets** them (slider or hung) and the user can change any edge | 5 Oct 2026 |
| Q67 | The user measures **the visible opening plus each track's depth**; the page adds the depth where an edge goes into a track | 5 Oct 2026 |
| Q68 | The edge the **sash presses on gets the same edge strip**, with a flat face for the sash; a seal can go on it later (Q17) | 5 Oct 2026 |
| Q69 | The edge strip sits **inside the track**: as tall as the track is deep, its slot at the top, so nothing shows above the track. In a track shallower than the slot plus a 2 mm base it stands out by the difference | 5 Oct 2026 |
| Q70 | The edge strip is **0.5 mm narrower than the track on each side**, adjustable under advanced | 5 Oct 2026 |
| Q71 | Where two edge strips meet, **one runs through the corner, by window type**: on a slider the top and bottom strips, on a hung window the side strips | 5 Oct 2026 |
| Q72 | Edges not in a track get an edge strip **as wide as the track width**: one width setting for every edge strip | 5 Oct 2026 |
| Q73 | An edge strip longer than the printer can make is split into **the fewest equal segments that fit**, butted end to end; they need not line up with the joints | 5 Oct 2026 |
| Q74 | A **joint strip stops half the slide short of an edge strip**, as at a cross piece (Q57); this settles what Q59 left to `track-edge` | 5 Oct 2026 |
| Q75 | The page **starts with a horizontal slider**, matching the tall example opening; each edge can still be changed | 5 Oct 2026 |
| Q76 | The **smallest piece** is two slot depths (what the strips take at both edges) **plus a strip's width** as the solid band between: 34 mm with the starting values, scaling with the joint settings. Every strip between two crossings is then at least as long as it is wide. This replaces the 30 mm placeholder (Q40) | 5 Oct 2026 |
| Q77 | Commits made in cloud sessions are **signed with a dedicated key the owner creates**, registers on GitHub as a signing key and stores in the cloud environment as `WINDOW_SEALER_SIGNING_KEY_B64`; the startup hook uses it. Without it, the platform's own signing stays, and GitHub shows those commits as unverified. The owner signs on his own machines with his own key | 5 Oct 2026 |
| Q78 | The npm package is called **`parametric-window-sealer`**, the repo's name (free on npm on 5 Oct 2026). Publishing it stays the owner's step | 5 Oct 2026 |
| Q79 | The library gets **its own package folder in one npm workspace**; the page imports it like any user would, and the command-line tool and the MCP server will too | 5 Oct 2026 |
| Q80 | The library offers **one main call plus the steps underneath**: parameters in (the same as the page's form), the plan and the files out; and the layout, joints, edges, shapes and file writers for anyone who wants them | 5 Oct 2026 |
| Q81 | The library runs in **Node.js and in browsers** | 5 Oct 2026 |
| Q82 | **Descriptions** go on the GitHub repository's About box and in the npm package's `description`, worded alike: what the panels close off, then for GitHub "Runs in the browser; nothing to install" and for npm "the geometry as a library for Node.js and browsers". Setting the About box is the owner's step (a cloud session's write to the repository settings is refused, HTTP 403) | 5 Oct 2026 |
| Q83 | The command-line tool is **its own package in the workspace**, `parametric-window-sealer-cli` in `packages/cli`, importing the library by name (as Q79 said it would). Installing it brings the library along; the library alone has no command | 5 Oct 2026 |
| Q84 | The command is called **`window-sealer`**, matching the files it writes | 5 Oct 2026 |
| Q85 | Parameters come from **a JSON file in the library's own shape and from flags, flags overriding the file**. The opening's width and height are required, so the example size is never made by mistake; everything else starts from the page's starting values | 5 Oct 2026 |
| Q86 | With no format given it writes **separate STL files**, one per panel and per strip, cross or edge shape, **into one folder named after the wall** (`window-sealer-600x1000/`); `--format 3mf`, `--packaging` and `--out` change that | 5 Oct 2026 |
| Q87 | It prints **the page's summary lines and the files written**; with **`--json`**, the plan, the summary and the file list as JSON, for scripts and LLM agents | 5 Oct 2026 |
| Q88 | If the output folder exists it **stops unless `--force`**, which replaces the files it writes and leaves any other file in the folder alone | 5 Oct 2026 |
| Q89 | **`--dry-run`** prints the plan and the files it would write, writes nothing and does not start the geometry engine | 5 Oct 2026 |
| Q90 | **Every setting on the page has a flag**, named after the field (`--slot`, `--track-width`, `--top-edge track` ...); `--help` lists them with their starting values | 5 Oct 2026 |
| Q91 | The MCP server is **its own package in the workspace**, `parametric-window-sealer-mcp` in `packages/mcp`, started by the command **`window-sealer-mcp`**; it imports the library by name, like the command-line tool (Q83) | 5 Oct 2026 |
| Q92 | It offers **four tools**: plan a wall (settings in; summary, plan, leftover choices and file list out; nothing built), make the files, list the settings (meaning, starting value, choices), and check settings. The owner answered "All the things", read as all four | 5 Oct 2026 |
| Q93 | **The agent chooses how it receives the files**, on each request: written to the folder, returned in the reply, or both | 5 Oct 2026 |
| Q94 | The server **writes only under one folder the owner sets** when adding it to an agent (`--out-root`); each wall gets a subfolder, and an existing one is kept unless the agent passes overwrite, as with `--force` (Q88) | 5 Oct 2026 |
| Q95 | When the agent does not choose (Q93), the files are **written to the folder** | 5 Oct 2026 |
| Q96 | Started **without `--out-root`, the server still runs, with files only in the reply**: planning, the settings list and files in the reply work, and a request to write to a folder is refused with a message saying to add `--out-root`. Read with Q95: without a folder, the files come in the reply when the agent does not choose | 5 Oct 2026 |
| Q97 | Built on the **official MCP SDK**, `@modelcontextprotocol/sdk` (MIT; 1.32.1 and protocol version 2025-11-25 on 5 Oct 2026), accepting the packages it brings that a local server does not use | 5 Oct 2026 |
| Q98 | An agent starts it **as a local process over stdio**; no port is opened | 5 Oct 2026 |
| Q99 | An agent gives the settings **in the library's shape**, as a `--params` file (Q85): anything left out starts where the page starts, the opening is required, and what one tool returns can be passed to another | 5 Oct 2026 |
| Q100 | A wall's subfolder is **named after the wall** (`window-sealer-600x1000`, as Q86) **or a plain name the agent gives**, such as `kitchen`, never a path outside the folder | 5 Oct 2026 |
| Q101 | The three API forms that need no server (#45 to #47) are **released as `v0.2.0`**, a minor version, with the library, the command and the MCP server at **0.2.0** too. The tag and the GitHub release are the owner's step (a cloud session cannot push tags) | 5 Oct 2026 |
| Q102 | The hose port takes **the hose's round end**, sized to its outside diameter, so it does not depend on a brand's window adapter | 5 Oct 2026 |
| Q104 | The hose is held by a **push-fit collar with a stop**: a short tube the hose end slides into, snug, stopping against a lip; it works whichever way the hose's thread turns | 5 Oct 2026 |
| Q105 | The port is **centred in one piece the user picks** (column and row); it starts in the bottom row's middle piece, near where the AC usually stands | 5 Oct 2026 |
| Q106 | The collar is on **the room side**; the outside face stays flat. The plan's frame is seen from the room: column 1 is at the left, row 1 at the bottom, and the collar points towards the viewer. The piece prints flat with the collar up, its stop lip being the panel itself, so it needs no supports | 5 Oct 2026 |
| Q107 | The collar's sizes are **starting values, adjustable under Advanced**, which a test print confirms: depth 20 mm, wall 2.4 mm, clearance 0.5 mm per side, a stop lip 5 mm wide | 5 Oct 2026 |
| Q108 | The port stays clear of the strips along each edge (the slot depth, 8 mm, plus 2 mm). **If the chosen piece is too small, no port is made**: the page says what size the port needs and what gets there, such as full-size pieces plus a filler or a larger printer size | 5 Oct 2026 |
| Q109 | **No cap** for the port for now; one can be a later backlog item | 5 Oct 2026 |
| Q110 | With an even number of columns the port starts in **the middle piece left of centre**, seen from the room | 5 Oct 2026 |
| Q111 | **One port per wall** on the main form, and **several under Advanced**, each in its own piece. How the main form shows it is Q112 | 5 Oct 2026 |
| Q103 | The page lists **150 mm and 130 mm, or the user's own measurement**, for the hose end's outside diameter, with a note to measure the end that goes in. Sources, checked 5 Oct 2026 (relayed: dealers quoting the maker's part number): 150 mm outside for De'Longhi part 5515110881 (pgservice.cc) and TL2829 (baldiassistenza.com) and for Electrolux/AEG/Frigidaire part 4055349213 (huoltopalvelu.com); 130 mm outside for De'Longhi NE2211 (pgservice.cc). Window-end fittings can differ: 120 to 155 mm on De'Longhi models | 5 Oct 2026 |
| Q112 | The main form offers the port as **an appliance choice**, "What is in the window?": None (a plain wall) or Portable AC hose; the window AC and the fan join it when they are built (Q15) | 5 Oct 2026 |
| Q113 | Under Advanced, **an "Add another port" button** adds a row with its own hose size, column and row, and a Remove button; each port is checked on its own (Q108), and two ports cannot share a piece | 5 Oct 2026 |
| Q114 | The command takes ports as **`--port`, repeatable**: `--port 150` in the starting piece, `--port 150@2,1` in column 2, row 1. A `--params` file and the MCP server take `ports: [{ hoseMm, column, row }]` | 5 Oct 2026 |
| Q49 | The 3D preview is drawn with **three.js**. Measured in [`spikes/viewer-benchmark/`](../spikes/viewer-benchmark/README.md) against Babylon.js and model-viewer: the smallest download (132.5 KiB) and the first frame 1.5 to 2.6× sooner; asked how they compare as the model grows more complex, three.js and Babylon.js stay within about 10 % of each other up to 953 580 triangles, and the triangle count, not the library, is what slows a preview | 5 Oct 2026 |
| Q33 | Within P1, the **three API forms that need no server come first**, ahead of the round hose port that Q28 had put first in line | 5 Oct 2026 |
| Q32 | The **hosted web API is parked** (`api-hosted`, #48, moved to P3): "I don't have the funding to run a server" | 5 Oct 2026 |
| Q48 | The three API forms that need no server, the **npm library, the command-line tool and the local MCP server** (#45, #46, #47), **stay at P1** right after the MVP | 5 Oct 2026 |
| Q44 | The **user chooses the download format**, STL or 3MF | 5 Oct 2026 |
| Q45 | Clicking Download **opens a dialog with the options**; "a zip is an option, not a default" | 5 Oct 2026 |
| Q46 | The dialog offers **STL as separate files, STL in one zip, 3MF as one file holding every piece, and 3MF one file per piece** | 5 Oct 2026 |
| Q47 | Nothing is selected the first time; after that the dialog **remembers the user's last choice** in their own browser | 5 Oct 2026 |
| Q36 | The code that defines the pieces' shapes is **MPL-2.0**, like the rest of the code; CERN-OHL-S-2.0 stays for the documentation (Q1). **Files the tool generates are the user's**: "people can do what they want with the STL output". The README and the page say so in one sentence, checked by a test. Prusa's Open Community License was considered and not chosen: it restricts commercial use and automated use, against this decision and issue #1 | 5 Oct 2026 |

The first four rows were answered before questions carried IDs.

## Open questions

None at the moment.

## Repository follow-ups

- **Owner's step (Q101):** tag the release commit `chore(release): v0.2.0, the API` as `v0.2.0`
  (annotated) and publish its GitHub release from the CHANGELOG's 0.2.0 section.
- **Owner's step (Q82):** set the repository's About description on GitHub (the gear beside
  About on the repository's main page) to: "Parametric, 3D-printable panels that close off the part of a window left open around a window air conditioner, fan or hose. Runs in the browser; nothing to install."
- Before the first npm publish (Q78): the package holds only `dist/` and its README, so add
  the MPL-2.0 text and say where the source is (MPL-2.0 section 3.2).
- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
