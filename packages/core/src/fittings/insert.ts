// The sliding insert as a fitting (sliding-insert, #38; Q16, Q150): two shutters in rails on one
// piece, closing in round the appliance. Its sizes, form, check and shutters are in insert.ts.
import { partName } from '../export.js';
import {
  checkInsert,
  insertBoltMm,
  insertFootprintMm,
  insertOpeningMm,
  insertPanel,
  insertTag,
  shutterShapes,
  shutterSolid,
} from '../insert.js';
import type { InsertParams, InsertSetting } from '../insert.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { mm } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

export function insertProblem(
  plan: GridLayout,
  insert: InsertSetting & InPiece,
  params: InsertParams,
  joint: JointParams,
): string | undefined {
  const room = checkInsert(plan, { ...insert, column: insert.column - 1, row: insert.row - 1 }, params, joint);
  return room.ok ? undefined : room.message;
}

export const SLIDING_INSERT: FittingDefinition = {
  kind: 'insert',
  placed: ({ inserts, insert }) =>
    inserts.map((c) => {
      const appliance = { widthMm: c.widthMm, heightMm: c.heightMm };
      return {
        kind: 'insert',
        column: c.column,
        row: c.row,
        tag: insertTag(appliance),
        marks: {},
        solid: (engine, panel) => insertPanel(engine, panel, appliance, insert),
        // A pattern stays its border clear of the rails and the shutters slid right out.
        keepOut: (panel, borderMm) => {
          const around = insertFootprintMm(appliance, insert);
          return {
            xMm: panel.widthMm / 2,
            yMm: panel.heightMm / 2,
            widthMm: around.widthMm + 2 * borderMm,
            heightMm: around.heightMm + 2 * borderMm,
          };
        },
        lining: () => undefined,
      };
    }),
  // The shutters, whatever the seal: two for each insert.
  parts: ({ inserts, insert }) =>
    shutterShapes(inserts, insert).map((shape) => ({
      shape,
      name: partName(shape),
      solid: (engine) => shutterSolid(engine, shape),
    })),
  lining: () => undefined,
  describe: ({ inserts, insert, thicknessMm }) =>
    inserts.map((c) => {
      const opening = insertOpeningMm(c, insert);
      return (
        `Sliding insert: a ${mm(c.widthMm)} × ${mm(c.heightMm)} mm appliance, in column ${c.column}, row ${c.row}, ` +
        `through a ${mm(opening.widthMm)} × ${mm(opening.heightMm)} mm opening; two shutters slide in its rails to ` +
        `close round anything ${mm(c.widthMm - insert.travelMm)} to ${mm(c.widthMm + insert.travelMm)} mm wide, ` +
        `each locked by an M4 bolt at least ${insertBoltMm(thicknessMm)} mm long, with a nut and washers.`
      );
    }),
};
