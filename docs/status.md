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
| Q13 | Pieces join with **separate connector strips** by default (a tongue on each edge, an H-profile strip between pieces, a cross piece where four meet; removable, sealable in TPU, a few mm of slide per joint). **Puzzle dovetails, sliding dovetail rails and bolted flanges** are advanced options | 5 Oct 2026 |
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
| Q37 | A piece is **"too small" (Q12's warning) when it is narrower than the joint needs**: the connector's width on both edges plus a solid band between. It is computed from the joint's dimensions once `connector-strip` (#10) exists; until then the page uses a placeholder, labelled as one. The layout code takes the minimum as an input | 5 Oct 2026 |
| Q38 | The **default maximum piece size is 200 × 200 mm**: it fits all 27 full-size printers in [`printer-beds.md`](printer-beds.md) (build volumes read from the makers' own sites) with at least 10 mm to spare. The two small-bed printers (180 × 180 mm) use "custom", or later their entry in the printer list | 5 Oct 2026 |
| Q39 | The **panel thickness starts at 3 mm**; the user can change it. The edge that sits in the window track is sized separately (`track-edge`, #11) | 5 Oct 2026 |
| Q40 | The **placeholder minimum piece width is 30 mm**, shown as a placeholder, until the joint's own size replaces it (Q37). The replacement is its own MVP backlog item, `min-piece-from-joint` (#53), so it is not missed | 5 Oct 2026 |
| Q41 | Both width and height **start as "all pieces the same size"**; the user can change each | 5 Oct 2026 |
| Q42 | The page **starts with a 600 × 1000 mm example opening**, labelled as an example (Q18) | 5 Oct 2026 |
| Q43 | The site is **built on every push**; it is **published only when the owner sets the repository variable `PAGES_PUBLISH` to `true`** (after setting the Pages source to GitHub Actions). Until then the deploy job is skipped. The steps are in the README | 5 Oct 2026 |
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

- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
