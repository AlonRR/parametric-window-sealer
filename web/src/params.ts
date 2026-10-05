// The basic parameters (backlog item params-basic, #5): what the user sets, the values
// the page starts with, and what the user will get.
//
// Form values arrive as strings. readParams checks every field at once and names each one
// that is wrong, so the page can mark them all; nothing is generated from a bad value.

import { DEFAULT_JOINT, jointWidthMm, partShapes, planJoints } from './joint';
import type { JointParams } from './joint';
import { layoutGrid } from './layout';
import type { Axis, AxisMode, FillerPosition, GridLayout, Leftover } from './layout';
import { DEFAULT_MAX_PIECE, maxPieceSize } from './printer';
import type { PrinterChoice } from './printer';

// The smallest piece the joint can hold is still a placeholder (Q40); the joint's own
// dimensions replace it (Q37). That replacement is backlog item min-piece-from-joint (#53),
// part of the MVP, so v0.1.0 cannot ship with this constant still here.
export const PLACEHOLDER_MIN_PIECE_MM = 30;

export interface AxisChoice {
  mode: AxisMode;
  filler: FillerPosition; // used only when mode is full-plus-filler
  leftover: Leftover; // used only when full pieces leave less than a joint (Q60)
}

export interface Params {
  openingWidthMm: number;
  openingHeightMm: number;
  printer: PrinterChoice;
  width: AxisChoice;
  height: AxisChoice;
  thicknessMm: number;
  joint: JointParams;
}

// The page starts here: an example opening (Q42, labelled as an example, Q18), the default
// piece size (Q38), all-equal pieces on both axes (Q41), 3 mm panels (Q39) and the joint's
// starting dimensions (Q51). Spreading the pieces is the default way out (Q61).
export const EXAMPLE_PARAMS: Params = {
  openingWidthMm: 600,
  openingHeightMm: 1000,
  printer: { kind: 'default' },
  width: { mode: 'equal', filler: 'end', leftover: 'spread' },
  height: { mode: 'equal', filler: 'end', leftover: 'spread' },
  thicknessMm: 3,
  joint: DEFAULT_JOINT,
};

export type FieldName =
  | 'openingWidthMm'
  | 'openingHeightMm'
  | 'printer'
  | 'customWidthMm'
  | 'customHeightMm'
  | 'widthMode'
  | 'widthFiller'
  | 'heightMode'
  | 'heightFiller'
  | 'thicknessMm'
  | 'widthLeftover'
  | 'heightLeftover'
  | 'slotMm'
  | 'slideMm'
  | 'webMm'
  | 'flangeMm'
  | 'fitMm';

export type FormValues = Partial<Record<FieldName, string>>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ReadResult = { ok: true; params: Params } | { ok: false; errors: FieldErrors };

const MODES: readonly AxisMode[] = ['equal', 'full-plus-filler'];
const FILLERS: readonly FillerPosition[] = ['start', 'end', 'middle', 'split'];
const LEFTOVERS: readonly Leftover[] = ['spread', 'equal', 'shorten'];

export function toFormValues(p: Params): FormValues {
  return {
    openingWidthMm: String(p.openingWidthMm),
    openingHeightMm: String(p.openingHeightMm),
    printer: p.printer.kind,
    customWidthMm: p.printer.kind === 'custom' ? String(p.printer.widthMm) : '',
    customHeightMm: p.printer.kind === 'custom' ? String(p.printer.heightMm) : '',
    widthMode: p.width.mode,
    widthFiller: p.width.filler,
    heightMode: p.height.mode,
    heightFiller: p.height.filler,
    thicknessMm: String(p.thicknessMm),
    widthLeftover: p.width.leftover,
    heightLeftover: p.height.leftover,
    slotMm: String(p.joint.slotMm),
    slideMm: String(p.joint.slideMm),
    webMm: String(p.joint.webMm),
    flangeMm: String(p.joint.flangeMm),
    fitMm: String(p.joint.fitMm),
  };
}

export function readParams(values: FormValues): ReadResult {
  const errors: FieldErrors = {};

  // A plain decimal number of mm, greater than zero. "600,5" is refused rather than read
  // as 600 or 6005: a silently wrong size is worse than a question.
  const number = (field: FieldName): number => {
    const text = (values[field] ?? '').trim();
    return /^[0-9]*\.?[0-9]+(e[0-9]+)?$/i.test(text) ? Number(text) : Number.NaN;
  };
  const size = (field: FieldName): number => {
    const n = number(field);
    if (!Number.isFinite(n) || n <= 0) {
      errors[field] = 'Enter a size in mm, greater than 0.';
      return Number.NaN;
    }
    return n;
  };
  // The slide and the fit may be zero: a joint that does not slide, or a printer that
  // needs no clearance.
  const sizeOrZero = (field: FieldName): number => {
    const n = number(field);
    if (!Number.isFinite(n) || n < 0) {
      errors[field] = 'Enter a size in mm, 0 or more.';
      return Number.NaN;
    }
    return n;
  };

  const oneOf = <T extends string>(field: FieldName, allowed: readonly T[]): T => {
    const v = values[field] as T;
    if (!allowed.includes(v)) {
      errors[field] = 'Choose one of the listed options.';
      return allowed[0] as T;
    }
    return v;
  };

  const openingWidthMm = size('openingWidthMm');
  const openingHeightMm = size('openingHeightMm');
  const kind = oneOf('printer', ['default', 'custom'] as const);
  const printer: PrinterChoice =
    kind === 'custom'
      ? { kind, widthMm: size('customWidthMm'), heightMm: size('customHeightMm') }
      : { kind };
  const width = {
    mode: oneOf('widthMode', MODES),
    filler: oneOf('widthFiller', FILLERS),
    leftover: oneOf('widthLeftover', LEFTOVERS),
  };
  const height = {
    mode: oneOf('heightMode', MODES),
    filler: oneOf('heightFiller', FILLERS),
    leftover: oneOf('heightLeftover', LEFTOVERS),
  };
  const thicknessMm = size('thicknessMm');
  const joint: JointParams = {
    slotMm: size('slotMm'),
    slideMm: sizeOrZero('slideMm'),
    webMm: size('webMm'),
    flangeMm: size('flangeMm'),
    fitMm: sizeOrZero('fitMm'),
  };
  if (joint.slideMm >= joint.slotMm) {
    errors.slideMm = 'Make it less than the slot depth, so a piece always stays in its slot.';
  }
  // A piece must be wider than the joint beside it, or no layout exists.
  const jointMm = jointWidthMm(joint);
  if (printer.kind === 'custom' && Number.isFinite(jointMm)) {
    for (const [field, value] of [
      ['customWidthMm', printer.widthMm],
      ['customHeightMm', printer.heightMm],
    ] as const) {
      if (value <= jointMm) errors[field] = `Make it more than a joint’s ${mm(jointMm)} mm.`;
    }
  } else if (printer.kind === 'default') {
    const smallest = Math.min(DEFAULT_MAX_PIECE.widthMm, DEFAULT_MAX_PIECE.heightMm);
    if (jointMm >= smallest) {
      errors.webMm = `Make the web and the slide together less than the ${mm(smallest)} mm piece size.`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    params: { openingWidthMm, openingHeightMm, printer, width, height, thicknessMm, joint },
  };
}

export function planWall(p: Params): GridLayout {
  const max = maxPieceSize(p.printer);
  return layoutGrid({
    widthMm: p.openingWidthMm,
    heightMm: p.openingHeightMm,
    maxPieceWidthMm: max.widthMm,
    maxPieceHeightMm: max.heightMm,
    minPieceMm: PLACEHOLDER_MIN_PIECE_MM,
    jointMm: jointWidthMm(p.joint),
    jointSpreadMm: p.joint.slideMm, // each piece moves half of it, from the middle (Q56)
    width: p.width,
    height: p.height,
  });
}

export interface LeftoverText {
  axis: Axis;
  message: string;
  used: Leftover;
  options: { value: Leftover; label: string; possible: boolean }[];
}

export interface PlanText {
  headline: string;
  columns: string;
  rows: string;
  joints: string;
  warnings: string[];
  leftovers: LeftoverText[];
}

function mm(n: number): string {
  return String(Math.round(n * 10) / 10);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// "200, 200, 167 and 30"
function listed(lengths: number[]): string {
  const words = lengths.map(mm);
  const last = words.pop();
  return words.length > 0 ? `${words.join(', ')} and ${last}` : (last ?? '');
}

function describeLeftover(
  note: GridLayout['leftovers'][number],
  maxPieceMm: number,
  joint: JointParams,
): LeftoverText {
  const label = note.axis === 'width' ? 'Width' : 'Height';
  const full = plural(note.fullPieces, `full ${mm(maxPieceMm)} mm piece`, `full ${mm(maxPieceMm)} mm pieces`);
  const verb = note.fullPieces === 1 ? 'leaves' : 'leave';
  const spread = note.options.spread;
  const each = note.fullPieces > 1 ? note.leftoverMm / (note.fullPieces - 1) : 0;
  let spreadLabel: string;
  if (spread.possible) {
    spreadLabel = `Spread the pieces ${mm(each)} mm further apart at each joint (they can spread up to ${mm(joint.slideMm)} mm)`;
  } else if (note.fullPieces === 1) {
    spreadLabel = 'Spread the pieces: there is no joint to spread';
  } else {
    spreadLabel = `Spread the pieces: each joint would spread ${mm(each)} mm, more than the ${mm(joint.slideMm)} mm it can`;
  }
  const equal = note.options.equal.pieces;
  const shorten = note.options.shorten;
  return {
    axis: note.axis,
    message: `${label}: ${full} ${verb} ${mm(note.leftoverMm)} mm, too little for another joint and a filler.`,
    used: note.used,
    options: [
      { value: 'spread', label: spreadLabel, possible: spread.possible },
      {
        value: 'equal',
        label: `Equal pieces: ${equal.length} of ${mm(equal[0] ?? 0)} mm`,
        possible: note.options.equal.possible,
      },
      {
        value: 'shorten',
        label: shorten.possible
          ? `Shorten one full piece: ${listed(shorten.pieces)} mm`
          : `Shorten one full piece: no room for a filler of the ${mm(PLACEHOLDER_MIN_PIECE_MM)} mm minimum`,
        possible: shorten.possible,
      },
    ],
  };
}

function describeJoints(plan: GridLayout, joint: JointParams): string {
  const joints = planJoints(plan, joint);
  if (joints.strips.length === 0 && joints.crosses.length === 0) {
    return 'No joints: the wall is one piece.';
  }
  const lengths = partShapes(joints, joint).filter((s) => s.kind === 'strip').length;
  const crosses =
    joints.crosses.length > 0
      ? `, and ${plural(joints.crosses.length, 'cross piece', 'cross pieces')}`
      : '';
  return `Joints: ${plural(joints.strips.length, 'strip', 'strips')} in ${plural(lengths, 'length', 'lengths')}${crosses}; each joint ${mm(jointWidthMm(joint))} mm wide.`;
}

export function describePlan(plan: GridLayout, params: Params): PlanText {
  const count = plan.pieces.length;
  const max = maxPieceSize(params.printer);
  return {
    headline: `${count} ${count === 1 ? 'piece' : 'pieces'}: ${plan.columns.length} across, ${plan.rows.length} up, ${mm(params.thicknessMm)} mm thick`,
    columns: `Widths: ${plan.columns.map(mm).join(', ')} mm`,
    rows: `Heights: ${plan.rows.map(mm).join(', ')} mm`,
    joints: describeJoints(plan, params.joint),
    warnings: plan.warnings.map((w) => {
      const [where, dimension] = w.axis === 'width' ? ['Column', 'wide'] : ['Row', 'high'];
      const placeholder =
        w.minPieceMm === PLACEHOLDER_MIN_PIECE_MM ? ' (a placeholder for now)' : '';
      return `${where} ${w.index + 1} is ${mm(w.lengthMm)} mm ${dimension}, under the ${mm(w.minPieceMm)} mm minimum${placeholder}.`;
    }),
    leftovers: plan.leftovers.map((note) =>
      describeLeftover(note, note.axis === 'width' ? max.widthMm : max.heightMm, params.joint),
    ),
  };
}
