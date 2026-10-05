# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 5 Oct 2026. Phase: **requirements settled**. No model has been written yet; the
engine is chosen (Q22) and measured in `spikes/engine-benchmark/`.

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

The first four rows were answered before questions carried IDs.

## Open questions

### API

- **Q32.** The hosted web API (Q31) needs a server, which GitHub Pages is not. Where should it
  run, who pays for and maintains it, and is a service that receives the user's sizes acceptable
  next to Q24's "nothing sent to a server" for the page? Until this is answered, `api-hosted`
  (#48) cannot start; the other three forms do not depend on it.
- **Q33.** Within P1, the round hose port was first in line after the MVP (Q28), and the API was
  put "right after the MVP" (Q31). The backlog keeps `hose-port` first and the API rows next.
  Should the API rows come before `hose-port` instead?

## Repository follow-ups

- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
