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
| (none) | CAD engine: **decided later**, once the design is workshopped | 5 Oct 2026 |
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

The first four rows were answered before questions carried IDs.

## Open questions

### Panels and patterns

- **Q20.** Which decorative patterns: brick, diamond, grid, and which others? With honeycomb now
  the organiser system (Q9), is a decorative hexagon pattern wanted as well?

### Dividing the opening

- **Q11.** Is the gap divided along one direction only (a strip of pieces), or as a grid when it
  is larger than the bed in both directions?
- **Q12.** In "maximum pieces plus one filler" mode: where does the filler go (an end, the
  middle, chosen), and what happens when the remainder is too small to print or to hold?

### Joining and mounting

- **Q13.** How do pieces join each other: dovetail or puzzle joints, sliding rails,
  tongue-and-groove, snap clips, separate connector strips, bolts? Removable for the season, or
  permanent?
- **Q14.** How does the panel stay in the window: held in the track by the closed sash, friction
  fit, telescoping to the exact width, screws, adhesive, foam tape? Rented windows may rule out
  screws.
- **Q15.** Which appliances must it fit: a window AC (the body passes through), a portable AC's
  exhaust hose, an exhaust fan (which kind)?
- **Q16.** How does it attach to the appliance, and how is that adjustable: slotted holes, a
  sliding insert, an adjustable clamp, a compressible gasket?
- **Q17.** How sealed must it be: against air, rain, insects, heat? And where do the optional seals
  (Q6) sit: panel to window, panel to panel, panel to appliance? For tape, a groove or a flat
  strip of edge?

### A real case to design against

- **Q18.** The dimensions of your window's open area and of the appliance in it, so the first
  model is tested against a real fit.

### Sessions

- **Q19.** The tools this repo's checks need (pre-commit, reuse) and the commit-identity setup are
  lost when a new cloud session starts. Persist them with a startup hook committed in the repo,
  with the cloud environment's setup script, both, or neither?

## Repository follow-ups

- The kit's `yaml` lint profile is not adopted. On yamllint's default rules `--strict` refuses
  the kit's own files (80-column lines, no `---`, aligned colons in `PROJECT.yml`), and the kit
  has no yamllint config. Adopting it means writing that policy first; the owner has been told.
- The kit also has a `gitleaks.toml` template that is not in its file table. Not adopted; ask
  for it if the secret scanner needs custom rules.
