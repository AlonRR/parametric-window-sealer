// The pieces (backlog item plain-panel, #6). MPL-2.0 like the rest of the code (Q36); what it
// generates belongs to the user.
//
// Every piece of the plan lies as it is printed: width along X, height along Y, thickness along Z,
// starting at the origin. A piece is a plain block (panel.ts), or the piece a fitting makes
// (fittings/: the hose port, the measured cutout), and the wall's pattern is cut into either.

import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { GridLayout } from './layout.js';
import { DEFAULT_COLLAR } from './port.js';
import type { CollarParams, PortSetting } from './port.js';
import { DEFAULT_RIM } from './cutout.js';
import { DEFAULT_CLAMP } from './clamp.js';
import { DEFAULT_INSERT } from './insert.js';
import { NO_MODEL } from './appliance-model.js';
import { DEFAULT_SOCKET } from './socket.js';
import type { CutoutSetting, Rectangle, RimParams } from './cutout.js';
import type { TapeFit } from './tape.js';
import { patternedPanel, pieceOpenings } from './pattern.js';
import type { FillChoice } from './fill.js';
import { organisedPanel, organiserOpenings } from './organiser.js';
import { tileCells, tiledPanel } from './mesh-tile.js';
import type { PatternChoice, Point } from './pattern.js';
import { plainPanel } from './panel.js';
import { fittingIn, placedFittings } from './fittings/index.js';
import type { InPiece, PlacedFitting } from './fittings/index.js';
import { pinSlotsIn } from './joint.js';
import type { JointParams, PinPlacement } from './joint.js';
import { pinSlotCuts } from './joint-geometry.js';
import { hollowCut } from './double.js';
import { printReady, printReadyOutline } from './piece-print.js';
import { dovetailOutline } from './dovetail.js';
import type { PieceDovetails } from './dovetail.js';
import { railsOn } from './slider.js';
import type { PieceRails } from './slider.js';
import { flangesOn } from './flange.js';
import type { PieceFlanges } from './flange.js';

export { plainPanel } from './panel.js';
export type { PanelSize } from './panel.js';

export interface BuiltPiece {
  column: number;
  row: number;
  hoseMm?: number; // the piece holds a hose port of this size
  cutout?: Rectangle; // or a cutout for an appliance this size (#23)
  tag?: string; // its fitting in its file name: "-port-150"
  solid: Manifold; // WebAssembly memory: the caller frees it with solid.delete()
}

export type PiecePattern = PatternChoice & { borderMm: number };

// The pins through the strips (joint-lock, #110), in the wall's frame: each piece gets a slot for
// each pin in it.
export interface PiecePins {
  joint: JointParams;
  pins: readonly PinPlacement[];
}
const OUTLINE_TALL_MM = 1000; // the outline cuts through whatever stands on the room side

type PatternFor = FillChoice | ((cell: { column: number; row: number }) => FillChoice | undefined);

// Every piece of the plan, each with the fitting placed in it, if any (columns and rows from 1, as
// in Params). With a pattern (patterns-core, #20), each piece gets the wall's pattern inside its
// border, clear of the strips, and stays solid that far clear of its fitting; with an organiser's
// board, its whole openings there, the board raised to its thickness. The pattern can be given for
// each piece, by its column and row from 0 (params-advanced, #21). With pins, each piece has a slot
// for each pin through the strips along its edges.
export function buildPiecesWith(
  engine: Engine,
  plan: GridLayout,
  thicknessMm: number,
  fittings: readonly PlacedFitting[],
  pattern?: PatternFor,
  pins?: PiecePins,
  hollow?: { borderMm: number }, // a double wall (#119): plain pieces hollow inside this border
  printed: (cell: { column: number; row: number }) => boolean = () => true, // not cut from sheet (#112)
  dovetails?: PieceDovetails, // puzzle dovetails (#29): tabs and sockets on the edges pieces share
  rails?: PieceRails, // sliding dovetail rails (#30): half rails on the edges pieces share
  flanges?: PieceFlanges, // bolted flanges (#31): a flange on each edge pieces share, with bolt holes
): BuiltPiece[] {
  const built: BuiltPiece[] = [];
  // The wall's centre, where the pattern's tiles are centred (Q135).
  const centre: Point = [
    Math.max(0, ...plan.pieces.map((c) => c.xMm + c.widthMm)) / 2,
    Math.max(0, ...plan.pieces.map((c) => c.yMm + c.heightMm)) / 2,
  ];
  try {
    for (const cell of plan.pieces) {
      const size = { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm };
      const fitting = fittingIn(fittings, cell.column + 1, cell.row + 1);
      let solid = fitting === undefined ? plainPanel(engine, size) : fitting.solid(engine, size);
      const slots = pins === undefined ? [] : pinSlotsIn(cell, pins.pins);
      if (pins !== undefined && slots.length > 0) {
        const cuts = pinSlotCuts(engine, size, slots, pins.joint);
        const slotted = solid.subtract(cuts);
        cuts.delete();
        solid.delete();
        solid = slotted;
      }
      const here = typeof pattern === 'function' ? pattern(cell) : pattern;
      if (hollow !== undefined && fitting === undefined && here === undefined && printed(cell)) {
        const air = hollowCut(engine, size, hollow.borderMm);
        const hollowed = solid.subtract(air);
        air.delete();
        solid.delete();
        solid = hollowed;
      }
      if (here !== undefined && 'meshTile' in here) {
        // A 3D tile: whole cells only, each the tile instead of the panel.
        const keepOut = fitting?.keepOut(size, here.borderMm);
        const at = tileCells(here.meshTile, centre, cell, here.borderMm, keepOut);
        solid = tiledPanel(engine, solid, here.meshTile, at, thicknessMm);
      } else if (here !== undefined && 'organiser' in here) {
        // An organiser's board: whole openings only, the board raised inside the border.
        const keepOut = fitting?.keepOut(size, here.borderMm);
        const at = organiserOpenings(here.organiser, centre, cell, here.borderMm, keepOut);
        solid = organisedPanel(engine, solid, here.organiser, at, size, here.borderMm, keepOut);
      } else if (here !== undefined) {
        const keepOut = fitting?.keepOut(size, here.borderMm);
        const openings = pieceOpenings(engine, here.tile, centre, cell, here.borderMm, keepOut);
        try {
          solid = patternedPanel(engine, solid, openings, thicknessMm, here.style, here.reliefPct);
        } finally {
          openings.delete();
        }
      }
      // With puzzle dovetails, the tabs beyond its cell are added, and the piece is cut to its
      // outline: its sockets, and the fit's clearance along every edge it shares.
      const outline = dovetails === undefined ? undefined : dovetailOutline(engine, plan, cell, dovetails);
      try {
        if (outline !== undefined) {
          const cellSquare = engine.CrossSection.square([cell.widthMm, cell.heightMm]);
          const tabs = outline.subtract(cellSquare);
          // A piece with no tabs of its own has nothing to add: an empty outline extrudes to nothing.
          const tabSolid = tabs.isEmpty() ? undefined : tabs.extrude(thicknessMm);
          const shape = outline.extrude(OUTLINE_TALL_MM);
          const added = tabSolid === undefined ? solid : solid.add(tabSolid);
          const cut = added.intersect(shape);
          for (const m of new Set([cellSquare, tabs, tabSolid, shape, added, solid])) m?.delete();
          solid = cut;
        }
        // With sliding rails, half a rail stands on its room side along each edge it shares; with
        // bolted flanges, a flange with its bolt holes.
        const standing = [
          ...(rails === undefined ? [] : railsOn(engine, cell, thicknessMm, rails.sliders)),
          ...(flanges === undefined ? [] : flangesOn(engine, cell, thicknessMm, flanges.flanges)),
        ];
        if (standing.length > 0) {
          const joined = engine.Manifold.union([solid, ...standing]);
          for (const m of [...standing, solid]) m.delete();
          solid = joined;
        }
        // Rounded corners and a chamfer against warping (#122), on a piece to print; one cut from
        // sheet is cut square. Pieces that meet with nothing over their corners, dovetailed, railed or
        // flanged, keep square corners, a dovetailed one's chamfer following its tabs.
        if (printed(cell)) {
          if (outline !== undefined) solid = printReadyOutline(engine, solid, outline);
          else if (rails !== undefined || flanges !== undefined) {
            const square = engine.CrossSection.square([cell.widthMm, cell.heightMm]);
            solid = printReadyOutline(engine, solid, square);
            square.delete();
          } else solid = printReady(engine, solid, size);
        }
      } finally {
        outline?.delete();
      }
      built.push({
        column: cell.column,
        row: cell.row,
        ...(fitting === undefined ? {} : { ...fitting.marks, tag: fitting.tag }),
        solid,
      });
    }
  } catch (error) {
    for (const b of built) b.solid.delete(); // nothing half-built is left behind
    throw error;
  }
  return built;
}

const inAPiece = <T extends Partial<InPiece>>(item: T): item is T & InPiece =>
  item.column !== undefined && item.row !== undefined;

// The same, from the ports and cutouts as Params holds them; one without a piece makes none.
export function buildPieces(
  engine: Engine,
  plan: GridLayout,
  thicknessMm: number,
  ports: readonly PortSetting[] = [],
  collar: CollarParams = DEFAULT_COLLAR,
  tape?: TapeFit,
  pattern?: PatternFor,
  cutouts: readonly CutoutSetting[] = [],
  rim: RimParams = DEFAULT_RIM,
): BuiltPiece[] {
  // The tape and the TPU seal are built alike (C31); their kind only changes the plan's words.
  const sealKind = tape === undefined ? 'none' : 'tape';
  const source = {
    ports: ports.filter(inAPiece),
    cutouts: cutouts.filter(inAPiece),
    fans: [],
    clamps: [],
    inserts: [],
    model: NO_MODEL,
    collar,
    socket: DEFAULT_SOCKET,
    rim,
    clamp: DEFAULT_CLAMP,
    insert: DEFAULT_INSERT,
    thicknessMm,
    tape,
    sealKind,
  } as const;
  return buildPiecesWith(engine, plan, thicknessMm, placedFittings(source), pattern);
}
