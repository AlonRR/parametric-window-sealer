// Dividing the opening into pieces (backlog item layout, #3).
//
// The opening is a grid (Q11). Each axis is divided on its own, in one of two modes:
//   equal             the fewest pieces that fit, all the same length
//   full-plus-filler  as many full-size pieces as fit, plus one filler for the rest,
//                     placed at the start, the end or the middle, or split in two
//                     halves, one at each end, for symmetry (Q12)
// A piece under the minimum is kept and reported, not refused: the user decides (Q12).
// The minimum is the joint's to set (Q37), so it is an input here, never a constant.
//
// Joints are not here yet: the pieces tile the opening edge to edge. The connector strip
// (#10) decides how much width a joint takes.

export type AxisMode = 'equal' | 'full-plus-filler';
export type FillerPosition = 'start' | 'end' | 'middle' | 'split';

export interface AxisSpec {
  lengthMm: number;
  maxPieceMm: number;
  mode: AxisMode;
  filler: FillerPosition; // read only in full-plus-filler mode
  minPieceMm: number;
}

export interface SmallPiece {
  index: number;
  lengthMm: number;
  minPieceMm: number;
}

export interface AxisLayout {
  pieces: number[]; // lengths in mm, in order from the axis origin
  warnings: SmallPiece[];
}

// Lengths closer than this are equal. A micrometre is far below what a printer resolves,
// and far above the rounding error of sums of a few millimetre values.
const EPS_MM = 1e-6;

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

function equalPieces(length: number, max: number): number[] {
  const count = Math.max(1, Math.ceil(length / max - EPS_MM / max));
  return Array.from({ length: count }, () => length / count);
}

function fullPlusFiller(length: number, max: number, filler: FillerPosition): number[] {
  const full = Math.floor(length / max + EPS_MM / max);
  const rest = length - full * max;
  const fulls = Array.from({ length: full }, () => max);
  if (rest <= EPS_MM) return fulls;
  switch (filler) {
    case 'start':
      return [rest, ...fulls];
    case 'end':
      return [...fulls, rest];
    case 'middle': {
      const before = Math.floor(full / 2);
      return [...fulls.slice(0, before), rest, ...fulls.slice(before)];
    }
    case 'split':
      // With no full piece there is nothing to be symmetric about: one piece.
      return full === 0 ? [rest] : [rest / 2, ...fulls, rest / 2];
  }
}

export function divideAxis(spec: AxisSpec): AxisLayout {
  requirePositive('lengthMm', spec.lengthMm);
  requirePositive('maxPieceMm', spec.maxPieceMm);
  if (!Number.isFinite(spec.minPieceMm) || spec.minPieceMm < 0) {
    throw new RangeError(`minPieceMm must be zero or more mm, got ${spec.minPieceMm}`);
  }
  const pieces =
    spec.mode === 'equal'
      ? equalPieces(spec.lengthMm, spec.maxPieceMm)
      : fullPlusFiller(spec.lengthMm, spec.maxPieceMm, spec.filler);
  const warnings = pieces.flatMap((lengthMm, index) =>
    lengthMm < spec.minPieceMm - EPS_MM ? [{ index, lengthMm, minPieceMm: spec.minPieceMm }] : [],
  );
  return { pieces, warnings };
}

export interface GridSpec {
  widthMm: number;
  heightMm: number;
  maxPieceWidthMm: number;
  maxPieceHeightMm: number;
  minPieceMm: number;
  width: { mode: AxisMode; filler?: FillerPosition };
  height: { mode: AxisMode; filler?: FillerPosition };
}

export interface GridPiece {
  column: number;
  row: number;
  xMm: number; // from the opening's left edge
  yMm: number; // from the opening's bottom edge
  widthMm: number;
  heightMm: number;
}

export interface GridLayout {
  columns: number[];
  rows: number[];
  pieces: GridPiece[];
  warnings: (SmallPiece & { axis: 'width' | 'height' })[];
}

function offsets(lengths: number[]): number[] {
  let at = 0;
  return lengths.map((length) => {
    const start = at;
    at += length;
    return start;
  });
}

export function layoutGrid(spec: GridSpec): GridLayout {
  const across = divideAxis({
    lengthMm: spec.widthMm,
    maxPieceMm: spec.maxPieceWidthMm,
    mode: spec.width.mode,
    filler: spec.width.filler ?? 'end',
    minPieceMm: spec.minPieceMm,
  });
  const up = divideAxis({
    lengthMm: spec.heightMm,
    maxPieceMm: spec.maxPieceHeightMm,
    mode: spec.height.mode,
    filler: spec.height.filler ?? 'end',
    minPieceMm: spec.minPieceMm,
  });
  const xs = offsets(across.pieces);
  const ys = offsets(up.pieces);
  const pieces = up.pieces.flatMap((heightMm, row) =>
    across.pieces.map((widthMm, column) => ({
      column,
      row,
      xMm: xs[column] ?? 0,
      yMm: ys[row] ?? 0,
      widthMm,
      heightMm,
    })),
  );
  return {
    columns: across.pieces,
    rows: up.pieces,
    pieces,
    warnings: [
      ...across.warnings.map((w) => ({ ...w, axis: 'width' as const })),
      ...up.warnings.map((w) => ({ ...w, axis: 'height' as const })),
    ],
  };
}
