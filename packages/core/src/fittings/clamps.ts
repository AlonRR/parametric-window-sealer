// The clamps as a fitting (clamps, #32; Q16): an appliance measured roughly, through an opening in
// one piece, gripped by four printed jaws on bolts. Its sizes, form, check and jaws are in clamp.ts.
import {
  checkClamp,
  clampBoltMm,
  clampFootprintMm,
  clampOpeningMm,
  clampPanel,
  clampRangeMm,
  clampTag,
  jawShapes,
  jawSolid,
} from '../clamp.js';
import type { ClampParams, ClampSetting } from '../clamp.js';
import { partName } from '../export.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { mm } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

// A clamp in its piece, by column and row from 1: what is wrong with it there, if anything.
export function clampProblem(
  plan: GridLayout,
  clamp: ClampSetting & InPiece,
  params: ClampParams,
  joint: JointParams,
): string | undefined {
  const room = checkClamp(plan, { ...clamp, column: clamp.column - 1, row: clamp.row - 1 }, params, joint);
  return room.ok ? undefined : room.message;
}

const size = (r: { widthMm: number; heightMm: number }) => `${mm(r.widthMm)} × ${mm(r.heightMm)} mm`;

export const CLAMPS: FittingDefinition = {
  kind: 'clamp',
  placed: ({ clamps, clamp }) =>
    clamps.map((c) => {
      const appliance = { widthMm: c.widthMm, heightMm: c.heightMm };
      return {
        kind: 'clamp',
        column: c.column,
        row: c.row,
        tag: clampTag(appliance),
        marks: {},
        solid: (engine, panel) => clampPanel(engine, panel, appliance, clamp),
        // A pattern stays its border clear of the jaws, slid right out: they need a flat face.
        keepOut: (panel, borderMm) => {
          const around = clampFootprintMm(appliance, clamp);
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
  // The jaws, whatever the seal: two long and two short for each clamp.
  parts: ({ clamps, clamp, thicknessMm }) =>
    jawShapes(clamps, clamp, thicknessMm).map((shape) => ({
      shape,
      name: partName(shape),
      solid: (engine) => jawSolid(engine, shape),
    })),
  // The jaws grip the appliance; they are not lined with the seal.
  lining: () => undefined,
  describe: ({ clamps, clamp, thicknessMm }) =>
    clamps.map((c) => {
      const range = clampRangeMm(c, clamp);
      return (
        `Clamp: a ${size(c)} appliance, in column ${c.column}, row ${c.row}, through a ` +
        `${size(clampOpeningMm(c, clamp))} opening; four jaws grip anything from ` +
        `${mm(range.from.widthMm)} × ${mm(range.from.heightMm)} to ${size(range.to)}, each on two M4 bolts at least ` +
        `${clampBoltMm(thicknessMm)} mm long, with nuts and washers.`
      );
    }),
};
