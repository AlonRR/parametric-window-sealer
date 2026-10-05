# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 5 Oct 2026. Phase: **requirements**. No model has been written yet, and the CAD
engine is deliberately undecided until the design questions below are settled.

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
| (none) | CAD engine: **decided later**, once the design is workshopped (now asked as Q22) | 5 Oct 2026 |
| Q1 | Licence: **CERN-OHL-S-2.0** for the design and docs, **MPL-2.0** for code | 5 Oct 2026 |
| Q2 | Branch: commit to **`main`** | 5 Oct 2026 |
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

The first four rows were answered before questions carried IDs.

## Open questions

### Engine and how the page is used

- **Q22.** Which engine builds the geometry? The owner's answer (5 Oct 2026): "my thinking was
  that the page would run locally and users would add stl or other similar files". That needs
  Q24 and Q25 settled first. The candidates so far:
  - a custom web page with the model in OpenSCAD files, rendered in the browser by OpenSCAD's
    WebAssembly build (GPL, so the deployed page would be GPL-licensed as a whole (inferred));
  - a custom web page with the model in TypeScript on the Manifold geometry library
    (`manifold-3d`, Apache-2.0, verified on npm 5 Oct 2026), with no OpenSCAD files;
  - the OpenSCAD Customizer page alone (one piece at a time).
- **Q24.** What does "run locally" mean: the page runs in the visitor's browser with nothing sent
  to a server (true of every candidate above, even when served from GitHub Pages), a download
  people open offline on their own computer, or both?
- **Q25.** What are the user-added STL (or similar) files for: the user's own organiser or
  accessory tiles placed on a panel, their own 3D pattern tiles, a model of their appliance to
  cut around, or a whole custom piece the tool fits connectors to?

### A real case to design against

- **Q18.** The dimensions of your window's open area and of the appliance in it, so the first
  model is tested against a real fit.

### Sessions

- **Q23.** The startup hook (Q19) is tested in a fresh clone (20 of 20), but it has not been seen
  to fire in a real new cloud session. In this session it did not fire, most likely because the
  session's project directory holds two repositories, so the repo's own `.claude/settings.json`
  is not the project's (inferred). Verify it by opening a throwaway cloud session on this repo
  alone, checking the identity and hooks, then archiving the session?

## Repository follow-ups

- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
