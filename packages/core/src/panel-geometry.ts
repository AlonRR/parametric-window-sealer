// The pieces' shapes (backlog item plain-panel, #6). MPL-2.0 like the rest of the code
// (Q36); what it generates belongs to the user.
//
// A plain sealed piece (Q8) is a solid block. It lies as it is printed: width along X,
// height along Y, thickness along Z, starting at the origin. Joints (connector-strip, #10)
// and the edge that sits in the window track (track-edge, #11) add to it later.

import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { GridLayout } from './layout.js';
import { DEFAULT_COLLAR, collarInnerMm, collarOuterMm, portHoleMm } from './port.js';
import type { CollarParams, PortSetting } from './port.js';

export interface PanelSize {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function plainPanel(engine: Engine, size: PanelSize): Manifold {
  requirePositive('widthMm', size.widthMm);
  requirePositive('heightMm', size.heightMm);
  requirePositive('thicknessMm', size.thicknessMm);
  return engine.Manifold.cube([size.widthMm, size.heightMm, size.thicknessMm]);
}

// Sides of the polygon drawn for each circle: 128 keeps a 150 mm circle within 0.03 mm.
export const PORT_SEGMENTS = 128;

// The piece with a hose port (hose-port, #12): the panel with a hole, and the collar standing
// on its room side (Q106), centred. The hole is smaller than the collar's inside by the lip,
// so the hose end stops on the panel and the piece prints flat with no supports.
export function portPanel(engine: Engine, size: PanelSize, hoseMm: number, collar: CollarParams): Manifold {
  const hole = portHoleMm(hoseMm, collar);
  if (!(hole > 0)) {
    throw new RangeError(`The lip (${collar.lipMm} mm) closes a ${hoseMm} mm hose's port; make it smaller`);
  }
  const { Manifold } = engine;
  const [x, y] = [size.widthMm / 2, size.heightMm / 2];
  const t = size.thicknessMm;
  const parts: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    parts.push(m);
    return m;
  };
  try {
    const panel = keep(plainPanel(engine, size));
    const cut = keep(Manifold.cylinder(t + 2, hole / 2, -1, PORT_SEGMENTS).translate([x, y, -1]));
    const outer = keep(Manifold.cylinder(collar.depthMm, collarOuterMm(hoseMm, collar) / 2, -1, PORT_SEGMENTS));
    const inside = keep(Manifold.cylinder(collar.depthMm + 2, collarInnerMm(hoseMm, collar) / 2, -1, PORT_SEGMENTS));
    const ring = keep(outer.subtract(keep(inside.translate([0, 0, -1]))).translate([x, y, t]));
    return keep(panel.subtract(cut)).add(ring);
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

export interface BuiltPiece {
  column: number;
  row: number;
  hoseMm?: number; // the piece holds a hose port of this size
  solid: Manifold; // WebAssembly memory: the caller frees it with solid.delete()
}

// Every piece of the plan; a piece with a port (columns and rows from 1, as in Params) gets it.
export function buildPieces(
  engine: Engine,
  plan: GridLayout,
  thicknessMm: number,
  ports: readonly PortSetting[] = [],
  collar: CollarParams = DEFAULT_COLLAR,
): BuiltPiece[] {
  const built: BuiltPiece[] = [];
  try {
    for (const cell of plan.pieces) {
      const size = { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm };
      const port = ports.find((p) => p.column === cell.column + 1 && p.row === cell.row + 1);
      built.push(
        port === undefined
          ? { column: cell.column, row: cell.row, solid: plainPanel(engine, size) }
          : { column: cell.column, row: cell.row, hoseMm: port.hoseMm, solid: portPanel(engine, size, port.hoseMm, collar) },
      );
    }
  } catch (error) {
    for (const b of built) b.solid.delete(); // nothing half-built is left behind
    throw error;
  }
  return built;
}
