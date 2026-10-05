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
import { tapedCollar } from './tape.js';
import type { TapeFit } from './tape.js';
import { patternedPanel, pieceOpenings } from './pattern.js';
import type { PatternChoice, Point } from './pattern.js';

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
// so the hose end stops on the panel and the piece prints flat with no supports. With tape
// inside the collar (seal-tape, #15; Q129), a groove for it runs round the collar's inside,
// centred on its depth; the collar given is already the taped one (tapedCollar).
export function portPanel(
  engine: Engine,
  size: PanelSize,
  hoseMm: number,
  collar: CollarParams,
  groove?: { widthMm: number; depthMm: number },
): Manifold {
  const hole = portHoleMm(hoseMm, collar);
  if (!(hole > 0)) {
    throw new RangeError(`The lip (${collar.lipMm} mm) closes a ${hoseMm} mm hose's port; make it smaller`);
  }
  if (groove !== undefined && (groove.widthMm > collar.depthMm || groove.depthMm >= collar.wallMm)) {
    throw new RangeError(`A ${groove.widthMm} × ${groove.depthMm} mm groove does not fit the collar`);
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
    const inner = collarInnerMm(hoseMm, collar);
    const inside = keep(Manifold.cylinder(collar.depthMm + 2, inner / 2, -1, PORT_SEGMENTS));
    let ring = keep(outer.subtract(keep(inside.translate([0, 0, -1]))));
    if (groove !== undefined && groove.depthMm > 0) {
      const cutter = keep(Manifold.cylinder(groove.widthMm, inner / 2 + groove.depthMm, -1, PORT_SEGMENTS));
      ring = keep(ring.subtract(keep(cutter.translate([0, 0, (collar.depthMm - groove.widthMm) / 2]))));
    }
    return keep(panel.subtract(cut)).add(keep(ring.translate([x, y, t])));
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The squeezed tape inside a port's collar, for the preview only (Q132): a ring from the hose
// out to its groove's floor, as tall as the tape is wide, centred on the collar's depth. The
// collar given is the taped one.
export function portTapeSolid(engine: Engine, size: PanelSize, hoseMm: number, collar: CollarParams, tape: TapeFit): Manifold {
  const { Manifold } = engine;
  const outer = Manifold.cylinder(tape.widthMm, collarInnerMm(hoseMm, collar) / 2 + tape.grooveDepthMm, -1, PORT_SEGMENTS);
  const inner = Manifold.cylinder(tape.widthMm + 2, hoseMm / 2, -1, PORT_SEGMENTS);
  const moved = inner.translate([0, 0, -1]);
  const ring = outer.subtract(moved);
  const z = size.thicknessMm + (collar.depthMm - tape.widthMm) / 2;
  const solid = ring.translate([size.widthMm / 2, size.heightMm / 2, z]);
  for (const m of [outer, inner, moved, ring]) m.delete();
  return solid;
}

export interface BuiltPiece {
  column: number;
  row: number;
  hoseMm?: number; // the piece holds a hose port of this size
  solid: Manifold; // WebAssembly memory: the caller frees it with solid.delete()
}

// Every piece of the plan; a piece with a port (columns and rows from 1, as in Params) gets it.
// With a pattern (patterns-core, #20), each piece gets the wall's pattern inside its border,
// and a port's piece stays solid that far beyond the collar (Q134, Q137). The pattern can be
// given for each piece, by its column and row from 0 (params-advanced, #21).
export type PiecePattern = PatternChoice & { borderMm: number };
export function buildPieces(
  engine: Engine,
  plan: GridLayout,
  thicknessMm: number,
  ports: readonly PortSetting[] = [],
  collar: CollarParams = DEFAULT_COLLAR,
  tape?: TapeFit,
  pattern?: PiecePattern | ((cell: { column: number; row: number }) => PiecePattern | undefined),
): BuiltPiece[] {
  const built: BuiltPiece[] = [];
  const taped = tapedCollar(collar, tape);
  const groove = tape?.port === true ? { widthMm: tape.grooveWidthMm, depthMm: tape.grooveDepthMm } : undefined;
  // The wall's centre, where the pattern's tiles are centred (Q135).
  const centre: Point = [
    Math.max(0, ...plan.pieces.map((c) => c.xMm + c.widthMm)) / 2,
    Math.max(0, ...plan.pieces.map((c) => c.yMm + c.heightMm)) / 2,
  ];
  const withPattern = (solid: Manifold, cell: GridLayout['pieces'][number], hoseMm?: number): Manifold => {
    const here = typeof pattern === 'function' ? pattern(cell) : pattern;
    if (here === undefined) return solid;
    const keepOut =
      hoseMm === undefined
        ? undefined
        : { xMm: cell.widthMm / 2, yMm: cell.heightMm / 2, radiusMm: collarOuterMm(hoseMm, taped) / 2 + here.borderMm };
    const openings = pieceOpenings(engine, here.tile, centre, cell, here.borderMm, keepOut);
    try {
      return patternedPanel(engine, solid, openings, thicknessMm, here.style, here.reliefPct);
    } finally {
      openings.delete();
    }
  };
  try {
    for (const cell of plan.pieces) {
      const size = { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm };
      const port = ports.find((p) => p.column === cell.column + 1 && p.row === cell.row + 1);
      built.push(
        port === undefined
          ? { column: cell.column, row: cell.row, solid: withPattern(plainPanel(engine, size), cell) }
          : {
              column: cell.column,
              row: cell.row,
              hoseMm: port.hoseMm,
              solid: withPattern(portPanel(engine, size, port.hoseMm, taped, groove), cell, port.hoseMm),
            },
      );
    }
  } catch (error) {
    for (const b of built) b.solid.delete(); // nothing half-built is left behind
    throw error;
  }
  return built;
}
