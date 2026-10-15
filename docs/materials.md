# Which material to print in

The tool works with PLA, PETG and ASA, and you choose. A wall in a window gets hotter than a room,
though, and the plan warns where your choice would come near what it can take.

| Material | Gave at, loaded, in an oven test | Use it for |
| --- | --- | --- |
| PLA | 60 °C | test fits only: it softens in a summer window, and beside a hose's exhaust |
| PETG | 80 °C | the wall, in a light colour: the starting choice |
| ASA | softened at 110 °C, failed at 120 °C | pieces in sun, and anything beside a hose |

Where these figures come from (from the design review, `research/design-review.md`):

- **The oven test:** CNC Kitchen loaded printed parts in an oven and raised the heat (verified).
- **The sun:** it heats a black surface about 44 °C above the air and a white one about 20 °C
  (verified). On a 30 °C day a dark wall in sun reaches about 74 °C and a light one about 50 °C
  (inferred).
- **The hose:** a portable AC's exhaust is 40 to 50 °C (verified).
- **Creep:** printed PLA creeps under a constant load well below where it softens (verified), so
  the plan warns 10 °C short of where each material gave.
- **UV:** PETG lost 36 % of its strength after 24 hours of UV-B in one test, PLA 5 % (verified);
  ASA held up in UV ageing (verified from an abstract). No outdoor study over months was found.

## The settings

Under **The panel**: **Material** (PETG, ASA, or PLA for test fits), **Colour** (light or dark),
and **The outside of the wall gets direct sun**. The command takes `--material`, `--colour` and
`--sun yes`; the library and the MCP server `material: { kind, colour, sun }`.

The plan names the material, and in sun how hot the wall gets. It warns:

- of PLA in sun, or in a wall with a hose port;
- of PETG in a dark colour in sun;

and in sun it suggests ASA over PETG for the light.

## Not yet confirmed

The temperatures are worked from the sources above, not measured on a printed wall. A thermometer
on the wall's outside face on a sunny day would settle it.
