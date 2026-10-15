// Skådis (organiser-skadis, #33): a board for IKEA's SKÅDIS pegboard accessories. IKEA publishes
// no slot sizes; these follow a public-domain reference model of the board and the allowances of
// printed boards (docs/organisers.md): upright slots 5 by 15 mm with round ends, 40 mm apart along a
// row, rows 20 mm apart with every other row shifted 20 mm, in a board 5 ± 0.2 mm thick. Printed
// here 5.2 by 15.2 mm in a board 4.8 mm thick, so the hooks slide on.
import { mm } from '../words.js';
import { defineOrganiser } from './define.js';

export const SKADIS_SLOT = { widthMm: 5.2, lengthMm: 15.2 };
const BOARD_MM = 4.8;
const SEGMENTS = 48; // each round end: fine enough for a 2.6 mm radius

export const SKADIS = defineOrganiser({
  kind: 'skadis',
  name: 'Skådis pegboard',
  words: 'a Skådis pegboard',
  accessories: 'Skådis accessories',
  boardMm: BOARD_MM,
  pitchXMm: 40,
  pitchYMm: 20,
  rowShiftMm: 20,
  widthMm: SKADIS_SLOT.widthMm,
  heightMm: SKADIS_SLOT.lengthMm,
  cut(engine) {
    const r = SKADIS_SLOT.widthMm / 2;
    const reach = (SKADIS_SLOT.lengthMm - SKADIS_SLOT.widthMm) / 2;
    const round = engine.CrossSection.circle(r, SEGMENTS);
    const ends = [reach, -reach].map((y) => round.translate([0, y]));
    const slot = engine.CrossSection.hull(ends);
    const prism = slot.extrude(BOARD_MM + 2);
    const cut = prism.translate([0, 0, -1]);
    for (const m of [round, ...ends, slot, prism]) m.delete();
    return cut;
  },
  describe:
    `upright slots ${mm(SKADIS_SLOT.widthMm)} × ${mm(SKADIS_SLOT.lengthMm)} mm, 40 mm apart in rows 20 mm ` +
    'apart, every other row shifted 20 mm',
});
