// The pattern framework (backlog item patterns-core, #20; the owner's decisions Q133 to Q138).
// MPL-2.0 like the rest of the code (Q36); what it generates belongs to the user.
//
// A pattern is a tile repeated across the whole wall, so it lines up across the joints and the
// wall reads as one surface (Q135). Here the tiles are centred on the wall's centre. Each piece
// keeps a solid border of the slot depth plus 2 mm, clear of the strips (Q134), and a piece
// with a hose port stays solid out to that width beyond the collar (Q137). Openings are cut
// short at a border; a sliver of one thinner than the tile's bars is left solid (Q135). The
// openings go through the piece, or are cut into its room side (+Z) to a percentage of its
// thickness (Q136, Q138).
//
// Frames: the wall's is the pieces' frame (the plan's), the piece's starts at its lower-left
// corner, as every piece is built.
import type { CrossSection, Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import { PORT_EDGE_CLEARANCE_MM } from './port.js';

export type Point = [number, number];
export type PatternStyle = 'through' | 'relief';

// A tile: its openings drawn round the centre of one cell, repeated every pitchXMm across and
// pitchYMm up, with every other row shifted by rowShiftMm (as bricks and hexagons are).
export interface PatternTile {
  pitchXMm: number;
  pitchYMm: number;
  rowShiftMm: number;
  openings: Point[][]; // counter-clockwise polygons; they may reach past the cell
  barMm: number; // the solid between openings; a sliver of opening thinner than this stays solid
}

export interface PatternChoice {
  tile: PatternTile;
  style: PatternStyle;
  reliefPct: number; // a relief's depth, as a percentage of the panel's thickness (Q138)
}

export const DEFAULT_RELIEF_PCT = 50;

export const patternBorderMm = (joint: JointParams): number => joint.slotMm + PORT_EDGE_CLEARANCE_MM;

export const reliefDepthMm = (thicknessMm: number, reliefPct: number): number => (thicknessMm * reliefPct) / 100;

export interface PieceArea {
  xMm: number; // its lower-left corner in the wall's frame
  yMm: number;
  widthMm: number;
  heightMm: number;
}

// Kept solid round a port: a circle in the piece's frame; round a cutout's rim, a rectangle
// centred there (measured-cutout, #23).
export type KeepOut =
  { xMm: number; yMm: number; radiusMm: number } | { xMm: number; yMm: number; widthMm: number; heightMm: number };

const CIRCLE_SEGMENTS = 128; // as the port is drawn (PORT_SEGMENTS)
const MITER_LIMIT = 10; // keeps sharp corners sharp when an opening is shrunk and grown back

// The tile's openings over a piece, in the piece's frame, before any border: every tile that
// can reach the piece, laid on the lattice centred on the wall's centre.
function tiledOver(engine: Engine, tile: PatternTile, centre: Point, piece: PieceArea): CrossSection {
  const reach = Math.max(
    ...tile.openings.flat().map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))),
    tile.pitchXMm,
    tile.pitchYMm,
  );
  const [cx, cy] = centre;
  const rowFrom = Math.floor((piece.yMm - reach - cy) / tile.pitchYMm);
  const rowTo = Math.ceil((piece.yMm + piece.heightMm + reach - cy) / tile.pitchYMm);
  const polygons: Point[][] = [];
  for (let row = rowFrom; row <= rowTo; row++) {
    const shift = ((row % 2) + 2) % 2 === 1 ? tile.rowShiftMm : 0;
    const y = cy + row * tile.pitchYMm - piece.yMm;
    const colFrom = Math.floor((piece.xMm - reach - cx - shift) / tile.pitchXMm);
    const colTo = Math.ceil((piece.xMm + piece.widthMm + reach - cx - shift) / tile.pitchXMm);
    for (let col = colFrom; col <= colTo; col++) {
      const x = cx + shift + col * tile.pitchXMm - piece.xMm;
      for (const ring of tile.openings) polygons.push(ring.map(([px, py]) => [px + x, py + y]));
    }
  }
  // An empty list is refused by the constructor; compose([]) is the empty cross-section.
  return polygons.length === 0 ? engine.CrossSection.compose([]) : new engine.CrossSection(polygons, 'Positive');
}

// A piece's openings, in its own frame: the wall's pattern inside its border and clear of any
// port, slivers thinner than a bar left solid.
export function pieceOpenings(
  engine: Engine,
  tile: PatternTile,
  wallCentre: Point,
  piece: PieceArea,
  borderMm: number,
  keepOut?: KeepOut,
): CrossSection {
  const { CrossSection } = engine;
  const inner = [piece.widthMm - 2 * borderMm, piece.heightMm - 2 * borderMm];
  if (!((inner[0] ?? 0) > 0 && (inner[1] ?? 0) > 0)) return CrossSection.compose([]); // empty
  const made: CrossSection[] = [];
  const keep = (cs: CrossSection): CrossSection => {
    made.push(cs);
    return cs;
  };
  try {
    let allowed = keep(CrossSection.square(inner as [number, number]).translate([borderMm, borderMm]));
    if (keepOut !== undefined) {
      const shape =
        'radiusMm' in keepOut
          ? CrossSection.circle(keepOut.radiusMm, CIRCLE_SEGMENTS)
          : CrossSection.square([keepOut.widthMm, keepOut.heightMm], true);
      const zone = keep(keep(shape).translate([keepOut.xMm, keepOut.yMm]));
      allowed = keep(allowed.subtract(zone));
    }
    const clipped = keep(keep(tiledOver(engine, tile, wallCentre, piece)).intersect(allowed));
    const half = tile.barMm / 2;
    const opened = keep(keep(clipped.offset(-half, 'Miter', MITER_LIMIT)).offset(half, 'Miter', MITER_LIMIT));
    return opened.intersect(allowed); // growing back never reaches past where it was allowed
  } finally {
    for (const cs of made) cs.delete(); // WebAssembly memory: free all but the result
  }
}

// The panel with its openings, cut through or into its room side. Takes the solid and frees it.
export function patternedPanel(
  engine: Engine,
  solid: Manifold,
  openings: CrossSection,
  thicknessMm: number,
  style: PatternStyle,
  reliefPct: number,
): Manifold {
  if (openings.isEmpty()) return solid;
  const depth = style === 'through' ? thicknessMm + 2 : reliefDepthMm(thicknessMm, reliefPct) + 1;
  const from = style === 'through' ? -1 : thicknessMm - reliefDepthMm(thicknessMm, reliefPct);
  const prism = openings.extrude(depth);
  const cutter = prism.translate([0, 0, from]);
  const result = solid.subtract(cutter);
  for (const m of [prism, cutter, solid]) m.delete();
  return result;
}
