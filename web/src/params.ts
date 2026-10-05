// The basic parameters (backlog item params-basic, #5): what the user sets, the values
// the page starts with, and what the user will get.
//
// Form values arrive as strings. readParams checks every field at once and names each one
// that is wrong, so the page can mark them all; nothing is generated from a bad value.

import { layoutGrid } from './layout';
import type { AxisMode, FillerPosition, GridLayout } from './layout';
import { maxPieceSize } from './printer';
import type { PrinterChoice } from './printer';

// Until the joint is designed (connector-strip, #10), a placeholder (Q40); the joint's own
// dimensions replace it (Q37).
export const PLACEHOLDER_MIN_PIECE_MM = 30;

export interface AxisChoice {
  mode: AxisMode;
  filler: FillerPosition; // used only when mode is full-plus-filler
}

export interface Params {
  openingWidthMm: number;
  openingHeightMm: number;
  printer: PrinterChoice;
  width: AxisChoice;
  height: AxisChoice;
  thicknessMm: number;
}

// The page starts here: an example opening (Q42, labelled as an example, Q18), the default
// piece size (Q38), all-equal pieces on both axes (Q41) and 3 mm panels (Q39).
export const EXAMPLE_PARAMS: Params = {
  openingWidthMm: 600,
  openingHeightMm: 1000,
  printer: { kind: 'default' },
  width: { mode: 'equal', filler: 'end' },
  height: { mode: 'equal', filler: 'end' },
  thicknessMm: 3,
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
  | 'thicknessMm';

export type FormValues = Partial<Record<FieldName, string>>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ReadResult = { ok: true; params: Params } | { ok: false; errors: FieldErrors };

const MODES: readonly AxisMode[] = ['equal', 'full-plus-filler'];
const FILLERS: readonly FillerPosition[] = ['start', 'end', 'middle', 'split'];

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
  };
}

export function readParams(values: FormValues): ReadResult {
  const errors: FieldErrors = {};

  // A plain decimal number of mm, greater than zero. "600,5" is refused rather than read
  // as 600 or 6005: a silently wrong size is worse than a question.
  const size = (field: FieldName): number => {
    const text = (values[field] ?? '').trim();
    const n = /^[0-9]*\.?[0-9]+(e[0-9]+)?$/i.test(text) ? Number(text) : Number.NaN;
    if (!Number.isFinite(n) || n <= 0) {
      errors[field] = 'Enter a size in mm, greater than 0.';
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
  const width = { mode: oneOf('widthMode', MODES), filler: oneOf('widthFiller', FILLERS) };
  const height = { mode: oneOf('heightMode', MODES), filler: oneOf('heightFiller', FILLERS) };
  const thicknessMm = size('thicknessMm');

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    params: { openingWidthMm, openingHeightMm, printer, width, height, thicknessMm },
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
    width: p.width,
    height: p.height,
  });
}

export interface PlanText {
  headline: string;
  columns: string;
  rows: string;
  warnings: string[];
}

const mm = (n: number) => String(Math.round(n * 10) / 10);

export function describePlan(plan: GridLayout, thicknessMm: number): PlanText {
  const count = plan.pieces.length;
  return {
    headline: `${count} ${count === 1 ? 'piece' : 'pieces'}: ${plan.columns.length} across, ${plan.rows.length} up, ${mm(thicknessMm)} mm thick`,
    columns: `Widths: ${plan.columns.map(mm).join(', ')} mm`,
    rows: `Heights: ${plan.rows.map(mm).join(', ')} mm`,
    warnings: plan.warnings.map((w) => {
      const [where, dimension] = w.axis === 'width' ? ['Column', 'wide'] : ['Row', 'high'];
      const placeholder =
        w.minPieceMm === PLACEHOLDER_MIN_PIECE_MM
          ? ' (a placeholder until the joint is designed)'
          : '';
      return `${where} ${w.index + 1} is ${mm(w.lengthMm)} mm ${dimension}, under the ${mm(w.minPieceMm)} mm minimum${placeholder}.`;
    }),
  };
}
