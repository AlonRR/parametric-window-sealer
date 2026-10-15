// A tile drawn on the page (draw-tile, #39): the openings of one cell, drawn in squares of a grid
// and written as the SVG text the SVG tile reads (docs/svg-tiles.md), so the library, the command
// and the MCP server take a drawn tile as they take a file. The cell's size on the wall is the SVG
// tile's width, as for any drawing.
export type DrawnPoint = readonly [number, number]; // in squares, from the cell's top-left corner, down as on the screen

export type DrawnShape =
  { kind: 'corners'; corners: readonly DrawnPoint[] } | { kind: 'circle'; centre: DrawnPoint; radius: number };

export interface DrawnTile {
  widthSquares: number;
  heightSquares: number;
  shapes: readonly DrawnShape[];
}

// A point placed by clicking lands on the nearest half square; a typed one stays as typed.
export const SNAP_SQUARES = 0.5;
export const snap = (v: number): number => Math.round(v / SNAP_SQUARES) * SNAP_SQUARES + 0; // + 0: never -0

// A thousandth of a square, enough for any tile and short to read.
const num = (v: number): string => String(Math.round(v * 1000) / 1000 + 0);

// A shape that encloses nothing is no opening: fewer than three corners, or a circle of no size.
export const isFinished = (shape: DrawnShape): boolean =>
  shape.kind === 'corners' ? shape.corners.length >= 3 : shape.radius > 0;

const element = (shape: DrawnShape): string =>
  shape.kind === 'corners'
    ? `<polygon points="${shape.corners.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')}"/>`
    : `<circle cx="${num(shape.centre[0])}" cy="${num(shape.centre[1])}" r="${num(shape.radius)}"/>`;

export function drawnTileSvg(tile: DrawnTile): string {
  const shapes = tile.shapes.filter(isFinished).map(element).join('');
  const box = `0 0 ${num(tile.widthSquares)} ${num(tile.heightSquares)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${shapes}</svg>`;
}

export function describeDrawnTile(tile: DrawnTile): string {
  const n = tile.shapes.filter(isFinished).length;
  return n === 0 ? 'no shapes' : `${n} shape${n === 1 ? '' : 's'}`;
}
