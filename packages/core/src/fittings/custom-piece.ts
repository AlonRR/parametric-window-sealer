// A whole piece of your own as a fitting (mesh-custom-piece, #41): the mesh trimmed to its piece,
// inside a frame for the joints. Reading is the model's; the piece and its check are in
// custom-piece.ts.
import { readApplianceModel } from '../appliance-model.js';
import type { ApplianceModel } from '../appliance-model.js';
import { customPanel, customProblem, customTag, describeCustomPiece } from '../custom-piece.js';
import type { CustomPieceSetting } from '../custom-piece.js';
import type { GridLayout } from '../layout.js';
import type { FittingDefinition } from './define.js';
import { placeOne } from './place.js';
import type { Placed } from './place.js';

// The custom piece in its piece, as the model is placed.
export const placeCustomPiece = (
  plan: GridLayout,
  setting: CustomPieceSetting,
  model: ApplianceModel,
  borderMm: number,
  earlier: readonly Placed[] = [],
): { ok: true; placed: CustomPieceSetting } | { ok: false; problem: string } =>
  placeOne(plan, setting, 'The custom piece', (at) => customProblem(plan, model, at, borderMm), earlier);

// The mesh, read: the settings were checked when they were read, so one that cannot be read here
// is a caller's mistake.
const meshOf = (setting: CustomPieceSetting): ApplianceModel => {
  const read = readApplianceModel(setting.file, setting.view);
  if (!read.ok) throw new RangeError(read.message);
  return read.model;
};

export const CUSTOM_PIECE: FittingDefinition = {
  kind: 'custom',
  placed: ({ customPiece: setting, borderMm }) => {
    if (setting.file === '') return [];
    const model = meshOf(setting);
    return [
      {
        kind: 'custom',
        column: setting.column,
        row: setting.row,
        tag: customTag(model),
        marks: {},
        solid: (engine, size) => customPanel(engine, size, model, borderMm),
        // The whole piece is the user's: no pattern in it.
        keepOut: (size) => ({
          xMm: size.widthMm / 2,
          yMm: size.heightMm / 2,
          widthMm: size.widthMm,
          heightMm: size.heightMm,
        }),
        lining: () => undefined,
      },
    ];
  },
  parts: () => [],
  lining: () => undefined,
  describe: ({ customPiece: setting, borderMm }) =>
    setting.file === '' ? [] : [describeCustomPiece(setting, meshOf(setting), borderMm)],
};
