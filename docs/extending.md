# Extending the window sealer

For contributors: where a new setting, pattern, plan line or part of the page goes, and which
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
   its path in the library's shape, its help in the page's words, and its values if it is a
   choice. The MCP server's schema is built from this list; a new group in the shape also wants
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
- `tile(size)`, the cell repeated across the wall, and `describe(size)`, its words in the plan,
  each reading its sizes by name: `size('openingMm')`.

Nothing else changes. The settings list, the command's flags and help, the MCP server's schema,
the page's fill list, its sizes under Advanced, the piece-by-piece list and the plan all take the
pattern from `PATTERNS`, and a pattern's sizes given without a kind mean that pattern.
`packages/core/test/patterns.test.ts` holds every pattern in the list to the same rules (its own
fields and flags, its settings, its starting tile, its reading, checking and words), and
`web/e2e/page-wiring.spec.ts` finds its controls on the running page; give the pattern a test file
of its own for its tile's shape, as `grid.test.ts` has.

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
joint reaches the layout through `jointWidthMm` and `minPieceMm` (`joint.ts`), the pieces'
edges through `buildPieces` (`panel-geometry.ts`), and the parts list through `partShapes`;
the second joint should turn those into one interface with the H strip as its first kind.
