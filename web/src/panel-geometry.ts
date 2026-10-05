// The pieces' shapes (backlog item plain-panel, #6). MPL-2.0 like the rest of the code
// (Q36); what it generates belongs to the user.
//
// A plain sealed piece (Q8) is a solid block. It lies as it is printed: width along X,
// height along Y, thickness along Z, starting at the origin. Joints (connector-strip, #10)
// and the edge that sits in the window track (track-edge, #11) add to it later.

import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine';
import type { GridLayout } from './layout';

export interface PieceSize {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function plainPanel(engine: Engine, size: PieceSize): Manifold {
  requirePositive('widthMm', size.widthMm);
  requirePositive('heightMm', size.heightMm);
  requirePositive('thicknessMm', size.thicknessMm);
  return engine.Manifold.cube([size.widthMm, size.heightMm, size.thicknessMm]);
}

export interface BuiltPiece {
  column: number;
  row: number;
  solid: Manifold; // WebAssembly memory: the caller frees it with solid.delete()
}

export function buildPieces(engine: Engine, plan: GridLayout, thicknessMm: number): BuiltPiece[] {
  const built: BuiltPiece[] = [];
  try {
    for (const cell of plan.pieces) {
      built.push({
        column: cell.column,
        row: cell.row,
        solid: plainPanel(engine, { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm }),
      });
    }
  } catch (error) {
    for (const b of built) b.solid.delete(); // nothing half-built is left behind
    throw error;
  }
  return built;
}
