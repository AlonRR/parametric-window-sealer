// The basic parameters (backlog item params-basic, #5): what the user sets, the values
// the page starts with, and what the user will get.
//
// Form values arrive as strings. readParams checks every field at once and names each one
// that is wrong, so the page can mark them all; nothing is generated from a bad value.

import {
  EDGES,
  EXAMPLE_TRACK,
  WINDOW_PRESETS,
  edgeShapes,
  jointStripInsetMm,
  panelSpan,
  planEdges,
} from './edge.js';
import type { EdgeName, EdgeParams, EdgeRole, EdgeStripPlacement, WindowType } from './edge.js';
import { DEFAULT_JOINT, jointWidthMm, minPieceMm, partShapes, planJoints } from './joint.js';
import type { JointParams, JointPlan } from './joint.js';
import { layoutGrid } from './layout.js';
import type { Axis, AxisMode, FillerPosition, GridLayout, Leftover } from './layout.js';
import { DEFAULT_MAX_PIECE, maxPieceSize } from './printer.js';
import type { PrinterChoice } from './printer.js';
import { DEFAULT_COLLAR, checkPort, defaultPortPiece, formatPorts, parsePorts, portHoleMm } from './port.js';
import type { CollarParams, PortSetting } from './port.js';

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
  edges: EdgeParams;
  ports: Required<PortSetting>[]; // none for a plain wall (Q112); column and row from 1
  collar: CollarParams;
}

// The page starts here: an example opening (Q42, labelled as an example, Q18), the default
// piece size (Q38), all-equal pieces on both axes (Q41), 3 mm panels (Q39) and the joint's
// starting dimensions (Q51). Spreading the pieces is the default way out (Q61). The window
// starts as a horizontal slider (Q75) with example tracks (Q18).
export const EXAMPLE_PARAMS: Params = {
  openingWidthMm: 600,
  openingHeightMm: 1000,
  printer: { kind: 'default' },
  width: { mode: 'equal', filler: 'end', leftover: 'spread' },
  height: { mode: 'equal', filler: 'end', leftover: 'spread' },
  thicknessMm: 3,
  joint: DEFAULT_JOINT,
  edges: { window: 'slider', roles: WINDOW_PRESETS.slider, track: EXAMPLE_TRACK },
  ports: [],
  collar: DEFAULT_COLLAR,
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
  | 'fitMm'
  | 'window'
  | 'topEdge'
  | 'bottomEdge'
  | 'leftEdge'
  | 'rightEdge'
  | 'trackWidthMm'
  | 'topDepthMm'
  | 'bottomDepthMm'
  | 'leftDepthMm'
  | 'rightDepthMm'
  | 'trackClearanceMm'
  | 'ports'
  | 'collarDepthMm'
  | 'collarWallMm'
  | 'collarClearanceMm'
  | 'collarLipMm';

export type FormValues = Partial<Record<FieldName, string>>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ReadResult = { ok: true; params: Params } | { ok: false; errors: FieldErrors };

const MODES: readonly AxisMode[] = ['equal', 'full-plus-filler'];
const FILLERS: readonly FillerPosition[] = ['start', 'end', 'middle', 'split'];
const LEFTOVERS: readonly Leftover[] = ['spread', 'equal', 'shorten'];
const WINDOWS: readonly WindowType[] = ['slider', 'hung'];
const ROLES: readonly EdgeRole[] = ['track', 'sash', 'sill'];

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
    window: p.edges.window,
    topEdge: p.edges.roles.top,
    bottomEdge: p.edges.roles.bottom,
    leftEdge: p.edges.roles.left,
    rightEdge: p.edges.roles.right,
    trackWidthMm: String(p.edges.track.widthMm),
    topDepthMm: String(p.edges.track.depthMm.top),
    bottomDepthMm: String(p.edges.track.depthMm.bottom),
    leftDepthMm: String(p.edges.track.depthMm.left),
    rightDepthMm: String(p.edges.track.depthMm.right),
    trackClearanceMm: String(p.edges.track.clearanceMm),
    ports: formatPorts(p.ports),
    collarDepthMm: String(p.collar.depthMm),
    collarWallMm: String(p.collar.wallMm),
    collarClearanceMm: String(p.collar.clearanceMm),
    collarLipMm: String(p.collar.lipMm),
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
  const window = oneOf('window', WINDOWS);
  const roleOf = (edge: EdgeName) => oneOf(`${edge}Edge` as FieldName, ROLES);
  const roles = { top: roleOf('top'), bottom: roleOf('bottom'), left: roleOf('left'), right: roleOf('right') };
  // A track's depth is read only where the edge is in a track, as the custom size is read
  // only for a custom printer.
  const depthOf = (edge: EdgeName) => {
    const field = `${edge}DepthMm` as FieldName;
    if (roles[edge] === 'track') return sizeOrZero(field);
    const n = number(field);
    return Number.isFinite(n) ? n : EXAMPLE_TRACK.depthMm[edge];
  };
  const track = {
    widthMm: size('trackWidthMm'),
    clearanceMm: sizeOrZero('trackClearanceMm'),
    depthMm: { top: depthOf('top'), bottom: depthOf('bottom'), left: depthOf('left'), right: depthOf('right') },
  };
  const edges: EdgeParams = { window, roles, track };
  // An edge strip keeps walls as thick as the joint's flanges either side of its slot.
  const anyTrack = EDGES.some((e) => roles[e] === 'track');
  const narrowest =
    thicknessMm + 2 * joint.fitMm + 2 * joint.flangeMm + (anyTrack ? 2 * track.clearanceMm : 0);
  if (Number.isFinite(narrowest) && track.widthMm < narrowest - 1e-9) {
    errors.trackWidthMm = `Make it at least ${mm(narrowest)} mm: an edge strip needs walls as thick as the flanges.`;
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

  // The hose port's collar (Q107): the clearance may be zero, as the joint's fit may.
  const collar: CollarParams = {
    depthMm: size('collarDepthMm'),
    wallMm: size('collarWallMm'),
    clearanceMm: sizeOrZero('collarClearanceMm'),
    lipMm: size('collarLipMm'),
  };
  const given = parsePorts(values.ports ?? '');
  if (!given.ok) errors.ports = given.message;

  if (Object.keys(errors).length === 0) {
    // The edge strips must leave the pieces something to cover.
    const span = panelSpan(openingWidthMm, openingHeightMm, edges, joint);
    if (span.widthMm <= 0) errors.openingWidthMm = 'Too small for the edge strips.';
    if (span.heightMm <= 0) errors.openingHeightMm = 'Too small for the edge strips.';
  }

  const base = { openingWidthMm, openingHeightMm, printer, width, height, thicknessMm, joint, edges, collar };
  const ports: Required<PortSetting>[] = [];
  if (Object.keys(errors).length === 0 && given.ok && given.ports.length > 0) {
    errors.ports = placePorts({ ...base, ports: [] }, given.ports, ports);
    if (errors.ports === undefined) delete errors.ports;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, params: { ...base, ports } };
}

// Each port in its piece (Q105, Q110), its lip leaving a hole, the piece there and big enough
// (Q108), and no two in one piece (Q113). Fills `placed`; returns the first problem, if any.
function placePorts(params: Params, given: PortSetting[], placed: Required<PortSetting>[]): string | undefined {
  const plan = planWall(params);
  const start = defaultPortPiece(plan);
  for (const [i, port] of given.entries()) {
    const column = port.column ?? start.column + 1;
    const row = port.row ?? start.row + 1;
    if (!(portHoleMm(port.hoseMm, params.collar) > 0)) {
      return `Port ${i + 1}: the ${mm(params.collar.lipMm)} mm lip would close a ${mm(port.hoseMm)} mm hose’s port; make the lip smaller.`;
    }
    const fit = checkPort(plan, { hoseMm: port.hoseMm, column: column - 1, row: row - 1 }, params.collar, params.joint);
    if (!fit.ok) return `Port ${i + 1}: ${fit.message}`;
    const other = placed.findIndex((p) => p.column === column && p.row === row);
    if (other >= 0) {
      return `Ports ${other + 1} and ${i + 1} are both in column ${column}, row ${row}; give each its own piece.`;
    }
    placed.push({ hoseMm: port.hoseMm, column, row });
  }
  return undefined;
}

export function planWall(p: Params): GridLayout {
  const max = maxPieceSize(p.printer);
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint);
  return layoutGrid({
    widthMm: span.widthMm,
    heightMm: span.heightMm,
    maxPieceWidthMm: max.widthMm,
    maxPieceHeightMm: max.heightMm,
    minPieceMm: minPieceMm(p.joint), // Q76
    jointMm: jointWidthMm(p.joint),
    jointSpreadMm: p.joint.slideMm, // each piece moves half of it, from the middle (Q56)
    width: p.width,
    height: p.height,
  });
}

export interface WallParts {
  plan: GridLayout;
  joints: JointPlan;
  edges: EdgeStripPlacement[];
}

// Everything the wall is made of, in the pieces' frame: the plan, the joint strips and
// cross pieces, and the edge strips. The preview, the download and the plan text all
// start here, so they cannot disagree.
export function planParts(p: Params, plan: GridLayout = planWall(p)): WallParts {
  const max = maxPieceSize(p.printer);
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint);
  return {
    plan,
    joints: planJoints(plan, p.joint, jointStripInsetMm(p.joint)),
    // A strip can be turned on the bed, so the longer side of the largest piece limits it.
    edges: planEdges(span.widthMm, span.heightMm, p.edges, p.joint, Math.max(max.widthMm, max.heightMm)),
  };
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
  span: string;
  joints: string;
  edges: string;
  warnings: string[];
  leftovers: LeftoverText[];
  ports: string[]; // one line for each hose port
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
          : `Shorten one full piece: no room for a filler of the ${mm(minPieceMm(joint))} mm the joints need`,
        possible: shorten.possible,
      },
    ],
  };
}

function describeJoints(joints: JointPlan, joint: JointParams): string {
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
  const parts = planParts(params, plan);
  const span = panelSpan(params.openingWidthMm, params.openingHeightMm, params.edges, params.joint);
  const shapes = edgeShapes(parts.edges).length;
  return {
    headline: `${count} ${count === 1 ? 'piece' : 'pieces'}: ${plan.columns.length} across, ${plan.rows.length} up, ${mm(params.thicknessMm)} mm thick`,
    columns: `Widths: ${plan.columns.map(mm).join(', ')} mm`,
    rows: `Heights: ${plan.rows.map(mm).join(', ')} mm`,
    span: `Pieces and joints: ${mm(span.widthMm)} × ${mm(span.heightMm)} mm, for a ${mm(params.openingWidthMm)} × ${mm(params.openingHeightMm)} mm opening.`,
    joints: describeJoints(parts.joints, params.joint),
    edges: `Edges: ${plural(parts.edges.length, 'edge strip', 'edge strips')} in ${plural(shapes, 'shape', 'shapes')}.`,
    warnings: plan.warnings.map((w) => {
      const [where, dimension] = w.axis === 'width' ? ['Column', 'wide'] : ['Row', 'high'];
      return `${where} ${w.index + 1} is ${mm(w.lengthMm)} mm ${dimension}, under the ${mm(w.minPieceMm)} mm the joints need.`;
    }),
    leftovers: plan.leftovers.map((note) =>
      describeLeftover(note, note.axis === 'width' ? max.widthMm : max.heightMm, params.joint),
    ),
    ports: params.ports.map((p) => `Hose port: a ${mm(p.hoseMm)} mm hose end, in column ${p.column}, row ${p.row}.`),
  };
}
