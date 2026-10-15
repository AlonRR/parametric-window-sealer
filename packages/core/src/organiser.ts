// Organiser boards (docs/organisers.md): where a board's openings go in a piece, and the piece
// with its board. Frames as in pattern.ts: the wall's is the pieces' frame, a piece's starts at its
// lower-left corner, as every piece is built.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { OrganiserDefinition } from './organisers/define.js';
import { keepOutZone } from './pattern.js';
import type { KeepOut, PieceArea, Point } from './pattern.js';

const EPS = 1e-9;

// A lattice of whole cells: one opening's box, and the spacing, as an organiser's board has them.
export type Lattice = Pick<OrganiserDefinition, 'widthMm' | 'heightMm' | 'pitchXMm' | 'pitchYMm' | 'rowShiftMm'>;

// Whether one opening centred here stays clear of the zone kept solid round a fitting: its box
// against the circle round a port, or against the rectangle round a cutout.
function clearOf(o: Lattice, [x, y]: Point, keepOut: KeepOut): boolean {
  const [halfW, halfH] = [o.widthMm / 2, o.heightMm / 2];
  if ('radiusMm' in keepOut) {
    const dx = Math.max(Math.abs(x - keepOut.xMm) - halfW, 0);
    const dy = Math.max(Math.abs(y - keepOut.yMm) - halfH, 0);
    return Math.hypot(dx, dy) >= keepOut.radiusMm - EPS;
  }
  return (
    Math.abs(x - keepOut.xMm) >= halfW + keepOut.widthMm / 2 - EPS ||
    Math.abs(y - keepOut.yMm) >= halfH + keepOut.heightMm / 2 - EPS
  );
}

// The board's openings in a piece, in the piece's frame: each point of the lattice centred on the
// wall's centre whose whole opening lies inside the piece's border and clear of its fitting. An
// opening that would cross either is left out, not cut short.
export function organiserOpenings(
  o: Lattice,
  wallCentre: Point,
  piece: PieceArea,
  borderMm: number,
  keepOut?: KeepOut,
): Point[] {
  const [halfW, halfH] = [o.widthMm / 2, o.heightMm / 2];
  const [xFrom, xTo] = [piece.xMm + borderMm + halfW, piece.xMm + piece.widthMm - borderMm - halfW];
  const [yFrom, yTo] = [piece.yMm + borderMm + halfH, piece.yMm + piece.heightMm - borderMm - halfH];
  const [cx, cy] = wallCentre;
  const found: Point[] = [];
  for (let row = Math.ceil((yFrom - cy - EPS) / o.pitchYMm); cy + row * o.pitchYMm <= yTo + EPS; row++) {
    const shift = ((row % 2) + 2) % 2 === 1 ? o.rowShiftMm : 0;
    const y = cy + row * o.pitchYMm - piece.yMm;
    const first = Math.ceil((xFrom - cx - shift - EPS) / o.pitchXMm);
    for (let col = first; cx + shift + col * o.pitchXMm <= xTo + EPS; col++) {
      const at: Point = [cx + shift + col * o.pitchXMm - piece.xMm, y];
      if (keepOut === undefined || clearOf(o, at, keepOut)) found.push(at);
    }
  }
  return found;
}

// The piece with its board: where the piece is thinner than the board, raised on the room side to
// the board's thickness inside its border and clear of its fitting, so the joint strips still fit
// its edges; then each opening cut through. A piece with no whole opening is left as it is. Takes
// the solid and frees it.
export function organisedPanel(
  engine: Engine,
  solid: Manifold,
  o: OrganiserDefinition,
  openings: readonly Point[],
  size: { widthMm: number; heightMm: number; thicknessMm: number },
  borderMm: number,
  keepOut?: KeepOut,
): Manifold {
  if (openings.length === 0) return solid;
  const { CrossSection, Manifold: M } = engine;
  const temporary: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(made: T): T => {
    temporary.push(made);
    return made;
  };
  try {
    let body = solid;
    if (o.boardMm > size.thicknessMm + EPS) {
      const inner = keep(
        CrossSection.square([size.widthMm - 2 * borderMm, size.heightMm - 2 * borderMm]).translate([
          borderMm,
          borderMm,
        ]),
      );
      const area = keepOut === undefined ? inner : keep(inner.subtract(keep(keepOutZone(engine, keepOut))));
      const pad = keep(keep(area.extrude(o.boardMm - size.thicknessMm)).translate([0, 0, size.thicknessMm]));
      body = keep(solid.add(pad));
    }
    const one = keep(o.cut(engine));
    const cuts = keep(M.compose(openings.map(([x, y]) => keep(one.translate([x, y, 0])))));
    return body.subtract(cuts);
  } finally {
    for (const m of temporary) m.delete();
    solid.delete();
  }
}
