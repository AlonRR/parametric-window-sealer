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
// Between two pieces is a joint, which takes its own width (connector-strip, #10, Q56):
// the pieces and the joints fill the opening together. A joint can spread a little further
// than planned, within its slide.
//
// Full pieces plus one filler can leave less room than a joint takes, so no filler fits
// (612 mm with 200 mm pieces and 5 mm joints leaves 2 mm). Then there are three ways out
// (Q60, Q62): spread the pieces so the joints take up the rest, divide the axis into equal
// pieces, or shorten one full piece so a filler of the minimum width fits. The user picks
// one; spreading is the default (Q61), and equal pieces when spreading cannot work (Q63).

export type AxisMode = 'equal' | 'full-plus-filler';
export type FillerPosition = 'start' | 'end' | 'middle' | 'split';
export type Leftover = 'spread' | 'equal' | 'shorten';

export interface AxisSpec {
  lengthMm: number;
  maxPieceMm: number;
  mode: AxisMode;
  filler: FillerPosition; // read only in full-plus-filler mode
  minPieceMm: number;
  jointMm?: number; // the width each joint takes as planned; none by default
  jointSpreadMm?: number; // how much wider than planned a joint can spread
  leftover?: Leftover; // the user's way out when full pieces leave too little (Q60)
}

export interface SmallPiece {
  index: number;
  lengthMm: number;
  minPieceMm: number;
}

export interface LeftoverOption {
  possible: boolean;
  pieces: number[]; // empty when not possible
  jointsMm: number[];
}

export interface LeftoverNote {
  leftoverMm: number; // what the full pieces and their joints leave of the opening
  fullPieces: number;
  used: Leftover;
  options: Record<Leftover, LeftoverOption>;
}

export interface AxisLayout {
  pieces: number[]; // lengths in mm, in order from the axis origin
  jointsMm: number[]; // the width of each joint between two pieces, in the same order
  warnings: SmallPiece[];
  leftover?: LeftoverNote; // only when full pieces leave less room than a joint takes
}

// Lengths closer than this are equal. A micrometre is far below what a printer resolves,
// and far above the rounding error of sums of a few millimetre values.
const EPS_MM = 1e-6;

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

// The fewest pieces that fit with their joints, all the same length.
function equalPieces(length: number, max: number, joint: number): number[] {
  const step = max + joint;
  const count = Math.max(1, Math.ceil((length + joint) / step - EPS_MM / step));
  return Array.from({ length: count }, () => (length - (count - 1) * joint) / count);
}

const repeat = (count: number, value: number) => Array.from({ length: count }, () => value);

// Where the filler goes among the full pieces, as an index into the result.
function fillerIndex(full: number, filler: FillerPosition): number {
  if (filler === 'start') return 0;
  if (filler === 'middle') return Math.floor(full / 2);
  return full; // end; a split filler is handled on its own
}

// Shorten the full piece next to the filler so that fillers of the minimum width fit.
function shortened(
  full: number,
  max: number,
  rest: number,
  joint: number,
  min: number,
  filler: FillerPosition,
): LeftoverOption {
  const fillers = filler === 'split' ? 2 : 1;
  const short = rest + max - fillers * (joint + min);
  if (min <= EPS_MM || short <= EPS_MM) return { possible: false, pieces: [], jointsMm: [] };
  let pieces: number[];
  if (filler === 'split') {
    pieces = [min, ...repeat(full - 1, max), short, min];
  } else {
    const at = fillerIndex(full, filler);
    pieces = repeat(full, max);
    pieces.splice(at, 0, min);
    pieces[at > 0 ? at - 1 : at + 1] = short;
  }
  return { possible: true, pieces, jointsMm: repeat(pieces.length - 1, joint) };
}

function fullPlusFiller(spec: Required<AxisSpec>): Omit<AxisLayout, 'warnings'> {
  const { lengthMm: length, maxPieceMm: max, jointMm: joint, filler } = spec;
  const step = max + joint;
  const full = Math.floor((length + joint) / step + EPS_MM / step);
  const nominal = (pieces: number[]) => ({ pieces, jointsMm: repeat(pieces.length - 1, joint) });
  if (full === 0) return nominal([length]);
  // What is left after the full pieces and the joints between them.
  const rest = length - full * max - (full - 1) * joint;
  const fulls = repeat(full, max);
  if (rest <= EPS_MM) return nominal(fulls);
  const fillers = filler === 'split' ? 2 : 1;
  const fillerTotal = rest - fillers * joint; // each filler needs a joint of its own
  if (fillerTotal > EPS_MM) {
    if (filler === 'split') return nominal([fillerTotal / 2, ...fulls, fillerTotal / 2]);
    const pieces = [...fulls];
    pieces.splice(fillerIndex(full, filler), 0, fillerTotal);
    return nominal(pieces);
  }

  // Too little is left for a joint and a filler (Q60).
  const spreadEach = full > 1 ? rest / (full - 1) : Number.POSITIVE_INFINITY;
  const options: Record<Leftover, LeftoverOption> = {
    spread:
      spreadEach <= spec.jointSpreadMm + EPS_MM
        ? { possible: true, pieces: fulls, jointsMm: repeat(full - 1, joint + spreadEach) }
        : { possible: false, pieces: [], jointsMm: [] },
    equal: { possible: true, ...nominal(equalPieces(length, max, joint)) },
    shorten: shortened(full, max, rest, joint, spec.minPieceMm, filler),
  };
  const fallback: Leftover = options.spread.possible ? 'spread' : 'equal';
  const used = options[spec.leftover].possible ? spec.leftover : fallback;
  const { pieces, jointsMm } = options[used];
  return { pieces, jointsMm, leftover: { leftoverMm: rest, fullPieces: full, used, options } };
}

export function divideAxis(input: AxisSpec): AxisLayout {
  const spec: Required<AxisSpec> = { jointMm: 0, jointSpreadMm: 0, leftover: 'spread', ...input };
  requirePositive('lengthMm', spec.lengthMm);
  requirePositive('maxPieceMm', spec.maxPieceMm);
  if (!Number.isFinite(spec.minPieceMm) || spec.minPieceMm < 0) {
    throw new RangeError(`minPieceMm must be zero or more mm, got ${spec.minPieceMm}`);
  }
  if (!Number.isFinite(spec.jointMm) || spec.jointMm < 0 || spec.jointMm >= spec.maxPieceMm) {
    throw new RangeError(
      `jointMm must be zero or more mm and less than the largest piece, got ${spec.jointMm}`,
    );
  }
  if (!Number.isFinite(spec.jointSpreadMm) || spec.jointSpreadMm < 0) {
    throw new RangeError(`jointSpreadMm must be zero or more mm, got ${spec.jointSpreadMm}`);
  }
  const layout =
    spec.mode === 'equal'
      ? (() => {
          const pieces = equalPieces(spec.lengthMm, spec.maxPieceMm, spec.jointMm);
          return { pieces, jointsMm: repeat(pieces.length - 1, spec.jointMm) };
        })()
      : fullPlusFiller(spec);
  const warnings = layout.pieces.flatMap((lengthMm, index) =>
    lengthMm < spec.minPieceMm - EPS_MM ? [{ index, lengthMm, minPieceMm: spec.minPieceMm }] : [],
  );
  return { ...layout, warnings };
}

export interface AxisDivision {
  mode: AxisMode;
  filler?: FillerPosition;
  leftover?: Leftover;
}

export interface GridSpec {
  widthMm: number;
  heightMm: number;
  maxPieceWidthMm: number;
  maxPieceHeightMm: number;
  minPieceMm: number;
  jointMm?: number;
  jointSpreadMm?: number;
  width: AxisDivision;
  height: AxisDivision;
}

export interface GridPiece {
  column: number;
  row: number;
  xMm: number; // from the opening's left edge
  yMm: number; // from the opening's bottom edge
  widthMm: number;
  heightMm: number;
}

export type Axis = 'width' | 'height';

export interface GridLayout {
  columns: number[];
  rows: number[];
  columnJointsMm: number[]; // between column i and i + 1
  rowJointsMm: number[]; // between row i and i + 1
  pieces: GridPiece[];
  warnings: (SmallPiece & { axis: Axis })[];
  leftovers: (LeftoverNote & { axis: Axis })[];
}

function offsets(lengths: number[], joints: number[]): number[] {
  let at = 0;
  return lengths.map((length, i) => {
    const start = at;
    at += length + (joints[i] ?? 0);
    return start;
  });
}

export function layoutGrid(spec: GridSpec): GridLayout {
  const along = (axis: Axis): AxisLayout => {
    const [lengthMm, maxPieceMm, choice] =
      axis === 'width'
        ? [spec.widthMm, spec.maxPieceWidthMm, spec.width]
        : [spec.heightMm, spec.maxPieceHeightMm, spec.height];
    return divideAxis({
      lengthMm,
      maxPieceMm,
      mode: choice.mode,
      filler: choice.filler ?? 'end',
      minPieceMm: spec.minPieceMm,
      jointMm: spec.jointMm ?? 0,
      jointSpreadMm: spec.jointSpreadMm ?? 0,
      leftover: choice.leftover ?? 'spread',
    });
  };
  const across = along('width');
  const up = along('height');
  const xs = offsets(across.pieces, across.jointsMm);
  const ys = offsets(up.pieces, up.jointsMm);
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
    columnJointsMm: across.jointsMm,
    rowJointsMm: up.jointsMm,
    pieces,
    warnings: [
      ...across.warnings.map((w) => ({ ...w, axis: 'width' as const })),
      ...up.warnings.map((w) => ({ ...w, axis: 'height' as const })),
    ],
    leftovers: [
      ...(across.leftover ? [{ ...across.leftover, axis: 'width' as const }] : []),
      ...(up.leftover ? [{ ...up.leftover, axis: 'height' as const }] : []),
    ],
  };
}
