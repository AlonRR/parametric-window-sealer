# Extending the window sealer

For contributors: where a new setting, pattern, fitting, plan line or part of the page goes, and which
test fails if a step is missed. The library (`packages/core`) holds every rule and every shape; the
command (`packages/cli`), the MCP server (`packages/mcp`) and the page (`web/`) only move values
to and from it, so most additions start in the library and reach the other three with little or
no code of their own.

Run the checks in [`CLAUDE.md`](../CLAUDE.md) (or the README's Developing section) before and
after: type check, lint, formatting, unit tests, and the browser test for anything on the page.

## A new setting

A setting is one field of the page's form, the same value in the library's shape, a flag of
the command and a property in the MCP server's schema.

1. **The library** (`packages/core/src/params.ts`):
   - add the field's name to `FIELD_NAMES`;
   - add its place to `Params` (or to the interface of its group, such as `JointParams`) and its
     starting value to `EXAMPLE_PARAMS`;
   - in its section, read it in the section's reader (`readPanel`, `readSeal` …) and write it back
     in the section's `…Form` function, beside each other. Read it with the section's
     `FormReader`: `size`, `sizeOrZero` or `oneOf`, or `numberIfUsed` and `oneOfIfUsed` for a
     value read only in some cases (a pattern's sizes, the tape's). A check that needs other
     sections goes after the reading in `readParams`; the checks keep their order, as the
     command and the MCP server list the problems in it.
2. **The settings list** (`packages/core/src/settings.ts`): its entry in `SETTINGS`: the field,
   its path in the library's shape, its help in the page's words, and its kind if it is not a
   length in mm: a choice's `values`, a `list`, `onOff`, `text` (an SVG file's text, which the
   command reads from the file named), `binary` (a file's bytes in base64, as the appliance's
   model; the command reads the file named) or `whole` (a whole number, as a column). The MCP server's schema is built from this list; a new group in the shape also wants
   its description in `GROUPS` in `packages/mcp/src/schema.ts`.
3. **The command** (`packages/cli/src/flags.ts`): its flag in `FLAG_NAMES`.
4. **The page** (`web/index.html`): a control named after the field, its label, and
   `<span class="error" data-testid="error-<field>"></span>` for its message. If it only matters
   for some answer, say so in the HTML (below); no code is needed.
5. **Tests and notes**: its reading and its messages in `packages/core/test`, a browser test if
   the page does more than show it, and `CHANGELOG.md` under Unreleased.

What fails if a step is missed:

| Missed | Fails |
| --- | --- |
| `FIELD_NAMES`, or the section's `…Form` | `packages/core/test/form-reader.test.ts`: the names and the form differ |
| The entry in `SETTINGS` | `packages/core/test/settings.test.ts`: one entry for each field |
| The flag | the type check (`FLAG_NAMES` covers every field), and `packages/cli/test/flags.test.ts` |
| The page's control | `web/test/page-wiring.test.ts`: one control for each field |
| A message naming an internal ID (Q…, C…) | `packages/core/test/messages.test.ts` |

## A new line in the plan

1. Add its key to `PlanText` and its words to `describePlan` (`packages/core/src/plan-text.ts`):
   a string, or a list of strings for one line per thing.
2. Add an element for it to the plan on the page: `<p data-plan="<key>">` for a line,
   `<ul data-plan="<key>">` for a list.

The command prints every line in `PlanText`'s order, and the MCP server returns the whole plan,
so neither needs a change. `web/test/page-wiring.test.ts` fails if the page has no place for a
line, or a place for a line the plan does not have.

## A new pattern

A pattern for the panel fill is one file in `packages/core/src/patterns/` and one entry in
`PATTERNS` (`patterns/index.ts`), whose order is the page's. Declare it with `definePattern`, as
`grid.ts` does:

- `kind`, its name in the library's shape (`fill.kind`) and the command's `--fill`; `name`, on the
  page; `words`, among the patterns in a sentence ("a grid"); and `group`, the MCP server's
  description of its sizes;
- `sizes`: for each, its `key` in the library's shape (`fill.<kind>.<key>`), the page's `field`,
  the command's `flag`, the page's `label` and `note`, the settings' `help`, its `start`, and
  `bar: true` for the solid between openings, which must be at least 0.8 mm;
- `tile(size, drawing)`, the cell repeated across the wall, and `describe(size, drawing)`, its
  words in the plan, each reading its sizes by name: `size('openingMm')`. The drawing is the SVG
  tile's (`fill.drawing`, the text of an SVG file); a pattern drawn in code leaves it. The tile's
  openings are counter-clockwise outlines, with any holes in them clockwise.

A pattern given as data rather than code is the SVG tile (`patterns/svg.ts`), whose drawing is
read by `svg/drawing.ts`; [`svg-tiles.md`](svg-tiles.md) says what it reads.

Nothing else changes. The settings list, the command's flags and help, the MCP server's schema,
the page's fill list, its sizes under Advanced, the piece-by-piece list and the plan all take the
pattern from `PATTERNS`, and a pattern's sizes given without a kind mean that pattern.
`packages/core/test/patterns.test.ts` holds every pattern in the list to the same rules (its own
fields and flags, its settings, its starting tile, its reading, checking and words), and
`web/e2e/page-wiring.spec.ts` finds its controls on the running page; give the pattern a test file
of its own for its tile's shape, as `grid.test.ts` has.

## A new organiser

An organiser board (Q9) is one file in `packages/core/src/organisers/` and one entry in
`ORGANISERS` (`organisers/index.ts`), whose order is the page's, after the patterns. Declare it
with `defineOrganiser`, as `skadis.ts` does:

- `kind`, its name in the library's shape (`fill.kind`), the command's `--fill` and a piece's own
  fill; `name`, on the page; `words`, in a sentence ("a Skådis pegboard"); and `accessories`, in a
  message ("Skådis accessories");
- `boardMm`, the thickness its accessories fit: the board is raised to it on the room side, and
  pieces thicker than it are refused;
- the lattice, `pitchXMm`, `pitchYMm` and `rowShiftMm`, as a pattern's tile has it;
- `widthMm` and `heightMm`, one opening at its widest: it is cut only where all of that fits;
- `cut(engine)`, one opening's solid, centred on x = y = 0, through a board lying on z = 0 with its
  room face at `boardMm`, reaching 1 mm past both faces;
- `describe`, its openings and their spacing in the plan.

Nothing else changes: the settings, the command, the MCP server, the page's fill lists and its
note, the plan, the pieces and the preview take it from `ORGANISERS`. Give it a test file of its
own for its openings, as `organiser.test.ts` has for Skådis, and a section in
[`organisers.md`](organisers.md) with its sizes and where they come from.

## A new fitting

A fitting is something in one piece that the appliance or its hose passes through: the hose
port, the measured cutout, the fan mount, the clamps, the sliding insert, the cut round the
appliance's model and a whole piece of your own. A kind a wall has one of at most is placed with
`placeOne` instead of `placeFittings`. Each kind is
one file in `packages/core/src/fittings/` and one entry in `FITTINGS` (`fittings/index.ts`),
whose order is the order the kinds are listed in: keep it the order they are placed in (step 2
below). Write its `FittingDefinition`
(`fittings/define.ts`), as `hose-port.ts` does; `fan-mount.ts` is the smallest:

- `kind`, its name; each fitting's tag in its piece's file name starts with it (`-port-150`);
- `placed(source)`: each fitting in its piece, with the piece's `solid` (start from `plainPanel`
  and cut into it), the `keepOut` zone a pattern stays clear of, its `tag`, and its `lining`, the
  seal drawn in the preview, if it has one. Leave `marks` empty: the hose port's and the cutout's
  fields there are kept for the library's earlier callers;
- `parts(source, tpu)`: what is printed beside the pieces for it, each part with its name and
  its solid: with the TPU seal (`tpu` given), its share of the seal, as the hose port's sleeves;
  and whatever the seal, the parts it always needs, as the clamps' jaws;
- `lining(source)`: its share of the seal in the plan, the tape it takes and where;
- `describe(source)`: its lines in the plan, one for each fitting, naming its piece.

Then:

1. **Its fittings and their settings** go in `FittingSource` and in `fittingSource` (both in
   `fittings/`), from the library's shape.
2. **Its setting** is a setting like any other (above). Place its fittings in `readParams`
   (`params.ts`) with `placeFittings`, after the kinds already there: its `label` and `plural`
   for the messages ("Port 1", "Ports 1 and 2"), its `check` of a fitting in its piece, and the
   kinds placed before it, so that two fittings never share a piece. A fitting given without a
   piece goes in the starting one. A setting that lists several fittings also adds its kind to
   `ListKind` and its items to `LIST_ITEMS` (`settings.ts`); the type checker then names the
   command's and the MCP server's tables that need it too.
3. **Its lines in the plan** need their key in `PlanText`, set from its `describe`, and their
   place on the page (above).
4. **A new kind of part**, if it prints one the wall does not have yet: its shape joins
   `AnyPartShape` and its name `partName`, both in `export.ts`; its solid stays in its file.
5. **On the page**, a control for several fittings is a form part (below), as
   `web/src/fittings.ts` is for the ports, the cutout, the fan and the clamps.

Nothing else changes: the pieces (`buildPiecesWith`), the pattern's keep-out, the files and their
names, the dry run, the seal's line in the plan and the preview take every kind from `FITTINGS`.
`packages/core/test/fittings.test.ts` holds every listed kind to the same rules (placed and
tagged by its kind, through its piece and inside it, a seal in the preview exactly when the plan
gives it one, one plan line for each, its parts named as the download names them) and builds a
kind declared in the test alone; give the new kind a test file of its own for its shape, as
`port.test.ts` and `cutout.test.ts` have.

## A part of the page that shows for some answers

Say it in the HTML: `data-show-when="field=value"` shows an element only while the named
control holds that value; `field=a|b` while it holds either; `field!=value` while it holds
anything else. `data-enable-when` does the same for a control's disabled state. Any named
control can be the field, as `tapeSize` is for the seal's own size.
`web/test/page-wiring.test.ts` fails if a condition is malformed or names no control.

## A control that is more than one field

A list of printers that fills two hidden fields, a row per hose port: these are form parts
(`web/src/form-part.ts`). A part fills its own controls once the starting values are in the
fields (`load`), writes them into the named fields before every reading (`sync`, which may
return a problem it can word more plainly than the library), and hears what a good reading
placed (`placed`). Write it in its own module beside `printer-choice.ts` and `fittings.ts`,
and add it to the list in `web/src/panel.ts`.

## A new kind of joint

Not yet a seam (C65 in [`choices.md`](choices.md)): one joint exists, the H strip, and the
three planned (`joint-dovetail`, `joint-rails`, `joint-bolts`) change the layout itself. The
joint reaches the layout through `jointWidthMm` and `minPieceMm` (`joint.ts`), the
pieces through `buildPiecesWith` (`panel-geometry.ts`), and the parts list through `partShapes`;
the second joint should turn those into one interface with the H strip as its first kind.
