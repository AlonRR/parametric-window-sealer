// A 3D tile of your own as the panel fill (mesh-tiles, #40): a mesh read as mesh-import reads one
// (docs/meshes.md), turned so the side the user names faces the room as the appliance's model is,
// and set side by side in whole cells on one lattice across the wall, each cell's panel replaced by
// the tile: an organiser's own tile, or a tile of a 3D pattern.
//
// Chosen without asking (docs/choices.md): the tile's box seen from the room is its cell and the
// spacing, so tiles meet face to face; whole cells only, inside each piece's border and clear of a
// fitting, centred on the wall, as an organiser's openings; the tile's back on the panel's outside
// face, standing proud on the room side where it is deeper; a tile with no flat face on a side of its
// box is refused, as it would not join the tile beside it.
import type { Manifold } from 'manifold-3d';
import { FORMAT_WORDS, VIEW_WORDS, readApplianceModel } from './appliance-model.js';
import { meshSolid } from './mesh/index.js';
import type { ApplianceModel, ModelRead, ModelView } from './appliance-model.js';
import type { Engine } from './engine.js';
import { organiserOpenings } from './organiser.js';
import type { KeepOut, PieceArea, Point } from './pattern.js';
import { mm } from './words.js';

export interface MeshTileSetting {
  file: string; // the file's bytes in base64; empty for none
  view: ModelView; // the side facing the room
}

// Tiles are drawn lying flat to print, their top facing up: the top faces the room.
export const NO_MESH_TILE: MeshTileSetting = { file: '', view: 'top' };

const SIDE_MM = 1e-3; // a corner this close to a side of the box lies on it
const SIDES = [
  { name: 'left', axis: 0, high: false },
  { name: 'right', axis: 0, high: true },
  { name: 'bottom', axis: 1, high: false },
  { name: 'top', axis: 1, high: true },
] as const;

// Whether some face of the tile lies flat on this side of its box, with an area: the side it meets
// its neighbour by.
function hasFaceOn(model: ApplianceModel, side: (typeof SIDES)[number]): boolean {
  const half = (side.axis === 0 ? model.outlineMm.widthMm : model.outlineMm.heightMm) / 2;
  const at = side.high ? half : -half;
  const p = model.positions;
  const [u, v] = side.axis === 0 ? [1, 2] : [0, 2]; // the face's other two axes
  const t = model.triangles;
  for (let f = 0; f < t.length; f += 3) {
    const [a, b, c] = [3 * (t[f] ?? 0), 3 * (t[f + 1] ?? 0), 3 * (t[f + 2] ?? 0)];
    const on = [a, b, c].every((i) => Math.abs((p[i + side.axis] ?? 0) - at) <= SIDE_MM);
    if (!on) continue;
    const cross =
      ((p[b + u] ?? 0) - (p[a + u] ?? 0)) * ((p[c + v] ?? 0) - (p[a + v] ?? 0)) -
      ((p[b + v] ?? 0) - (p[a + v] ?? 0)) * ((p[c + u] ?? 0) - (p[a + u] ?? 0));
    if (Math.abs(cross) > 1e-9) return true;
  }
  return false;
}

// The tile in a file given as the setting holds it, turned to the wall, if tiles of it would join.
export function readMeshTile(file: string, view: ModelView): ModelRead {
  if (file === '') return { ok: false, message: 'Choose the tile’s file.' };
  const read = readApplianceModel(file, view);
  if (!read.ok) return read;
  const open = SIDES.find((s) => !hasFaceOn(read.model, s));
  if (open === undefined) return read;
  return {
    ok: false,
    message:
      `The tile has no flat face on its ${open.name} side, so it would not join the tile beside it: tiles are set ` +
      'side by side, so give it a flat face on each side of its box, seen from the room.',
  };
}

// The tiles in a piece, in the piece's frame: each whole cell of the lattice centred on the wall's
// centre inside the piece's border and clear of its fitting, its box the tile's.
export function tileCells(
  tile: ApplianceModel,
  wallCentre: Point,
  piece: PieceArea,
  borderMm: number,
  keepOut?: KeepOut,
): Point[] {
  const { widthMm, heightMm } = tile.outlineMm;
  const lattice = { widthMm, heightMm, pitchXMm: widthMm, pitchYMm: heightMm, rowShiftMm: 0 };
  return organiserOpenings(lattice, wallCentre, piece, borderMm, keepOut);
}

// The piece with its tiles: each cell's panel cut away and the tile set in its place, its back on
// the panel's outside face. A piece with no whole cell is left as it is. Takes the solid and frees it.
export function tiledPanel(
  engine: Engine,
  solid: Manifold,
  tile: ApplianceModel,
  cells: readonly Point[],
  thicknessMm: number,
): Manifold {
  if (cells.length === 0) return solid;
  const { CrossSection, Manifold: M } = engine;
  const { widthMm, heightMm } = tile.outlineMm;
  const freed: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(made: T): T => {
    freed.push(made);
    return made;
  };
  try {
    const squares = cells.map(([x, y]) => keep(CrossSection.square([widthMm, heightMm], true).translate([x, y])));
    const area = keep(CrossSection.union(squares));
    const hole = keep(keep(area.extrude(thicknessMm + 2)).translate([0, 0, -1]));
    const one = keep(meshSolid(engine, tile));
    const tiles = keep(M.union(cells.map(([x, y]) => keep(one.translate([x, y, 0])))));
    return keep(solid.subtract(hole)).add(tiles);
  } finally {
    for (const m of freed) m.delete(); // WebAssembly memory: free everything but the result
    solid.delete();
  }
}

// The tiles in the plan's words, after "Fill: ".
export function describeMeshTile(setting: MeshTileSetting, tile: ApplianceModel, thicknessMm: number): string {
  const { widthMm, heightMm } = tile.outlineMm;
  const proud = tile.depthMm - thicknessMm;
  const against =
    proud > 1e-9
      ? `standing ${mm(proud)} mm proud on the room side`
      : proud < -1e-9
        ? `${mm(-proud)} mm short of the room face`
        : 'flush with both faces';
  const repaired = tile.repairs.length > 0 ? ` Repaired: ${tile.repairs.join('; ')}.` : '';
  return (
    `3D tiles of your own, from the ${FORMAT_WORDS[tile.format]} file: each ${mm(widthMm)} × ${mm(heightMm)} mm ` +
    `seen from ${VIEW_WORDS[setting.view]} and ${mm(tile.depthMm)} mm deep, set side by side in whole cells inside ` +
    `each piece’s border, ${against}.${repaired}${tile.notes.map((n) => ` ${n}`).join('')}`
  );
}
