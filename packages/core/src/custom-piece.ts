// A whole piece of your own (mesh-custom-piece, #41): a mesh read as mesh-import reads one
// (docs/meshes.md), turned so the side the user names faces the room as the appliance's model is,
// centred on its piece and trimmed to the area inside the border the joints take, with that border
// left a frame as thick as the pieces, so the piece joins the wall as any other. The fitting is in
// fittings/custom-piece.ts.
//
// Chosen without asking (docs/choices.md): trimmed, never scaled; refused when smaller than the
// area inside the border, as the wall would be left open round it; its back on the panel's outside
// face, standing proud on the room side where it is deeper; one to a wall, placed as the model.
import type { Manifold } from 'manifold-3d';
import { FORMAT_WORDS, VIEW_WORDS } from './appliance-model.js';
import type { ApplianceModel, ModelView } from './appliance-model.js';
import type { Engine } from './engine.js';
import type { GridLayout } from './layout.js';
import { meshSolid } from './mesh/index.js';
import { plainPanel } from './panel.js';
import type { PanelSize } from './panel.js';
import { mm } from './words.js';

export interface CustomPieceSetting {
  file: string; // the file's bytes in base64; empty for none
  view: ModelView; // the side facing the room
  column: number; // its piece from 1 at the bottom left seen from the room; 0 and 0, the starting piece
  row: number;
}

// A piece is drawn lying flat to print, its top facing up: the top faces the room.
export const NO_CUSTOM_PIECE: CustomPieceSetting = { file: '', view: 'top', column: 0, row: 0 };

// The piece: a frame as thick as the pieces, as wide as the border, and inside it the mesh,
// centred and trimmed to the frame's inside, its back on the panel's outside face.
export function customPanel(engine: Engine, size: PanelSize, model: ApplianceModel, borderMm: number): Manifold {
  const { CrossSection } = engine;
  const t = size.thicknessMm;
  const freed: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(made: T): T => {
    freed.push(made);
    return made;
  };
  try {
    const inside = keep(
      CrossSection.square([size.widthMm - 2 * borderMm, size.heightMm - 2 * borderMm]).translate([borderMm, borderMm]),
    );
    const hole = keep(keep(inside.extrude(t + 2)).translate([0, 0, -1]));
    const frame = keep(keep(plainPanel(engine, size)).subtract(hole));
    const reach = Math.max(model.depthMm, t) + 2;
    const clip = keep(keep(inside.extrude(reach)).translate([0, 0, -1]));
    const placed = keep(keep(meshSolid(engine, model)).translate([size.widthMm / 2, size.heightMm / 2, 0]));
    return frame.add(keep(placed.intersect(clip)));
  } finally {
    for (const m of freed) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The custom piece in its piece, by column and row from 1: what is wrong with it there, if anything.
// It must cover the area inside the border, or the wall would be left open round it.
export function customProblem(
  plan: GridLayout,
  model: ApplianceModel,
  at: { column: number; row: number },
  borderMm: number,
): string | undefined {
  const where = `column ${at.column}, row ${at.row}`;
  const piece = plan.pieces.find((p) => p.column === at.column - 1 && p.row === at.row - 1);
  if (piece === undefined) {
    return `The custom piece: there is no ${where}: the wall has ${plan.columns.length} columns and ${plan.rows.length} rows.`;
  }
  const needs = { widthMm: piece.widthMm - 2 * borderMm, heightMm: piece.heightMm - 2 * borderMm };
  const { widthMm, heightMm } = model.outlineMm;
  if (widthMm >= needs.widthMm - 1e-9 && heightMm >= needs.heightMm - 1e-9) return undefined;
  return (
    `The custom piece is ${mm(widthMm)} × ${mm(heightMm)} mm seen from the room; ${where} needs one at least ` +
    `${mm(needs.widthMm)} × ${mm(needs.heightMm)} mm, its area inside the ${mm(borderMm)} mm border the joints take, ` +
    'or the wall would be left open round it. Draw it larger, or make the pieces smaller.'
  );
}

export const customTag = (model: ApplianceModel): string =>
  `-custom-${mm(model.outlineMm.widthMm)}x${mm(model.outlineMm.heightMm)}`;

// The custom piece's line in the plan: where, the file, its size and depth, the frame, and what was
// repaired or may be wrong with it.
export function describeCustomPiece(setting: CustomPieceSetting, model: ApplianceModel, borderMm: number): string {
  const { widthMm, heightMm } = model.outlineMm;
  const repaired = model.repairs.length > 0 ? ` Repaired: ${model.repairs.join('; ')}.` : '';
  return (
    `Custom piece: the piece in column ${setting.column}, row ${setting.row}, from the ${FORMAT_WORDS[model.format]} ` +
    `file: ${mm(widthMm)} × ${mm(heightMm)} mm seen from ${VIEW_WORDS[setting.view]} and ${mm(model.depthMm)} mm ` +
    `deep, trimmed to fit inside a ${mm(borderMm)} mm frame as thick as the pieces, for the joints.${repaired}` +
    model.notes.map((n) => ` ${n}`).join('')
  );
}
