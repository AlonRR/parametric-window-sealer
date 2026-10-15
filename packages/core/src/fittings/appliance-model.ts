// The imported model of the appliance as a fitting (mesh-appliance, #35): one piece cut round the
// model's outline seen from the room, with the measured cutout's rim. Reading, turning, the outline
// and the check are in appliance-model.ts.
import { describeModel, modelPanel, modelProblem, modelTag, readApplianceModel } from '../appliance-model.js';
import type { ApplianceModel, ModelSetting } from '../appliance-model.js';
import { rimOuterMm } from '../cutout.js';
import type { RimParams } from '../cutout.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { defaultPortPiece } from '../port.js';
import type { FittingDefinition } from './define.js';
import type { Placed } from './place.js';

// The model in its piece: the piece given, or the starting piece as every fitting's; then its
// room there; and a piece of its own, apart from the fittings placed before it.
export function placeModel(
  plan: GridLayout,
  setting: ModelSetting,
  model: ApplianceModel,
  rim: RimParams,
  joint: JointParams,
  earlier: readonly Placed[] = [],
): { ok: true; placed: ModelSetting } | { ok: false; problem: string } {
  const start = defaultPortPiece(plan);
  const at =
    setting.column === 0 && setting.row === 0
      ? { column: start.column + 1, row: start.row + 1 }
      : { column: setting.column, row: setting.row };
  const problem = modelProblem(plan, model, at, rim, joint);
  if (problem !== undefined) return { ok: false, problem };
  for (const kind of earlier) {
    const other = kind.placed.findIndex((p) => p.column === at.column && p.row === at.row);
    if (other >= 0) {
      return {
        ok: false,
        problem:
          `The model and ${kind.label.toLowerCase()} ${other + 1} are both in column ${at.column}, row ${at.row}; ` +
          'give each its own piece.',
      };
    }
  }
  return { ok: true, placed: { ...setting, ...at } };
}

// The model, read: the settings were checked when they were read, so a model that cannot be read
// here is a caller's mistake.
const modelOf = (setting: ModelSetting): ApplianceModel => {
  const read = readApplianceModel(setting.file, setting.view);
  if (!read.ok) throw new RangeError(read.message);
  return read.model;
};

export const APPLIANCE_MODEL: FittingDefinition = {
  kind: 'model',
  placed: ({ model: setting, rim }) => {
    if (setting.file === '') return [];
    const model = modelOf(setting);
    return [
      {
        kind: 'model',
        column: setting.column,
        row: setting.row,
        tag: modelTag(model),
        marks: {},
        solid: (engine, size) => modelPanel(engine, size, model, rim),
        // A pattern stays its border clear of the rim's box.
        keepOut: (size, borderMm) => {
          const around = rimOuterMm(model.outlineMm, rim);
          return {
            xMm: size.widthMm / 2,
            yMm: size.heightMm / 2,
            widthMm: around.widthMm + 2 * borderMm,
            heightMm: around.heightMm + 2 * borderMm,
          };
        },
        // The rim follows the outline; it is not lined with the seal.
        lining: () => undefined,
      },
    ];
  },
  parts: () => [],
  lining: () => undefined,
  describe: ({ model: setting, rim }) => (setting.file === '' ? [] : [describeModel(setting, modelOf(setting), rim)]),
};
