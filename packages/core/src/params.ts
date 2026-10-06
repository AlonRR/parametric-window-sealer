// The basic parameters (backlog item params-basic, #5): what the user sets, the values
// the page starts with, and what the user will get.
//
// Form values arrive as strings. readParams checks every field at once and names each one
// that is wrong, so the page can mark them all; nothing is generated from a bad value.

import { EDGES, EXAMPLE_TRACK, WINDOW_PRESETS, edgeShapes, jointStripInsetMm, panelSpan, planEdges } from './edge.js';
import type { EdgeName, EdgeParams, EdgeRole, EdgeStripPlacement, WindowType } from './edge.js';
import { DEFAULT_JOINT, jointWidthMm, minPieceMm, partShapes, planJoints } from './joint.js';
import type { JointParams, JointPlan } from './joint.js';
import { layoutGrid } from './layout.js';
import type { Axis, AxisMode, FillerPosition, GridLayout, Leftover } from './layout.js';
import { DEFAULT_MAX_PIECE, maxPieceSize } from './printer.js';
import type { PieceSize, PrinterChoice } from './printer.js';
import { DEFAULT_BED_MARGIN_MM } from './printer.js';
import { PRINTER_IDS } from './printers.js';
import {
  DEFAULT_COLLAR,
  checkPort,
  collarInnerMm,
  defaultPortPiece,
  formatPorts,
  parsePorts,
  portHoleMm,
} from './port.js';
import type { CollarParams, PortSetting } from './port.js';
import { DEFAULT_RIM, checkCutout, formatCutouts, linedRim, parseCutouts, rimInnerMm } from './cutout.js';
import type { CutoutSetting, RimParams } from './cutout.js';
import { DEFAULT_TAPE, NO_SEAL, TAPE_GROOVE_PLAY_MM, TAPE_GROOVE_WALL_MM, tapeFit, tapedCollar } from './tape.js';
import { TPU_FIN_MM, gasketBaseMm } from './tpu.js';
import {
  DEFAULT_BRICK,
  DEFAULT_DIAMOND,
  DEFAULT_GRID,
  DEFAULT_HEXAGON,
  FILL_KINDS,
  MIN_BAR_MM,
  PATTERN_STYLES,
  SEALED,
} from './fill.js';
import type { FillKind, FillParams } from './fill.js';
import { fillFor, formatPieceFills, parsePieceFills } from './piece-fill.js';
import type { PieceFill } from './piece-fill.js';
import { reliefDepthMm } from './pattern.js';
import type { SealKind, SealParams } from './tape.js';

export interface AxisChoice {
  mode: AxisMode;
  filler: FillerPosition; // used only when mode is full-plus-filler
  leftover: Leftover; // used only when full pieces leave less than a joint (Q60)
}

export interface Params {
  openingWidthMm: number;
  openingHeightMm: number;
  printer: PrinterChoice;
  bedMarginMm: number; // a listed printer's bed less this, each way (Q117)
  width: AxisChoice;
  height: AxisChoice;
  thicknessMm: number;
  joint: JointParams;
  edges: EdgeParams;
  ports: Required<PortSetting>[]; // none for a plain wall (Q112); column and row from 1
  collar: CollarParams;
  seal: SealParams; // none to start with (Q122)
  fill: FillParams; // sealed to start with (Q141)
  pieceFills: PieceFill[]; // pieces with a fill of their own (#21); none to start with
  cutouts: Required<CutoutSetting>[]; // measured cutouts (#23); none to start with
  rim: RimParams; // round each cutout (C42)
}

// The page starts here: an example opening (Q42, labelled as an example, Q18), the default
// piece size (Q38), all-equal pieces on both axes (Q41), 3 mm panels (Q39) and the joint's
// starting dimensions (Q51). Spreading the pieces is the default way out (Q61). The window
// starts as a horizontal slider (Q75) with example tracks (Q18), and no seal (Q122).
export const EXAMPLE_PARAMS: Params = {
  openingWidthMm: 600,
  openingHeightMm: 1000,
  printer: { kind: 'default' },
  bedMarginMm: DEFAULT_BED_MARGIN_MM,
  width: { mode: 'equal', filler: 'end', leftover: 'spread' },
  height: { mode: 'equal', filler: 'end', leftover: 'spread' },
  thicknessMm: 3,
  joint: DEFAULT_JOINT,
  edges: { window: 'slider', roles: WINDOW_PRESETS.slider, track: EXAMPLE_TRACK },
  ports: [],
  collar: DEFAULT_COLLAR,
  seal: NO_SEAL,
  fill: SEALED,
  pieceFills: [],
  cutouts: [],
  rim: DEFAULT_RIM,
};

export type FieldName =
  | 'openingWidthMm'
  | 'openingHeightMm'
  | 'printer'
  | 'printerModel'
  | 'bedMarginMm'
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
  | 'collarLipMm'
  | 'seal'
  | 'tapeWidthMm'
  | 'tapeThicknessMm'
  | 'tapeGrooveMm'
  | 'tapeSqueezePct'
  | 'tapeSides'
  | 'tapePort'
  | 'tpuJoints'
  | 'fill'
  | 'fillStyle'
  | 'reliefPct'
  | 'gridOpeningMm'
  | 'gridBarMm'
  | 'hexOpeningMm'
  | 'hexBarMm'
  | 'brickWidthMm'
  | 'brickHeightMm'
  | 'brickBarMm'
  | 'diamondWidthMm'
  | 'diamondHeightMm'
  | 'diamondBarMm'
  | 'pieceFills'
  | 'cutouts'
  | 'rimDepthMm'
  | 'rimWallMm'
  | 'rimClearanceMm';

export type FormValues = Partial<Record<FieldName, string>>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ReadResult = { ok: true; params: Params } | { ok: false; errors: FieldErrors };

const MODES: readonly AxisMode[] = ['equal', 'full-plus-filler'];
const FILLERS: readonly FillerPosition[] = ['start', 'end', 'middle', 'split'];
const LEFTOVERS: readonly Leftover[] = ['spread', 'equal', 'shorten'];
const WINDOWS: readonly WindowType[] = ['slider', 'hung'];
const ROLES: readonly EdgeRole[] = ['track', 'sash', 'sill', 'unit'];
const SEALS: readonly SealKind[] = ['none', 'tape', 'tpu'];
const YES_NO = ['no', 'yes'] as const;

export function toFormValues(p: Params): FormValues {
  return {
    openingWidthMm: String(p.openingWidthMm),
    openingHeightMm: String(p.openingHeightMm),
    printer: p.printer.kind,
    customWidthMm: p.printer.kind === 'custom' ? String(p.printer.widthMm) : '',
    customHeightMm: p.printer.kind === 'custom' ? String(p.printer.heightMm) : '',
    printerModel: p.printer.kind === 'model' ? p.printer.id : '',
    bedMarginMm: String(p.bedMarginMm),
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
    seal: p.seal.kind,
    tapeWidthMm: String(p.seal.tape.widthMm),
    tapeThicknessMm: String(p.seal.tape.thicknessMm),
    tapeGrooveMm: String(p.seal.tape.grooveMm),
    tapeSqueezePct: String(p.seal.tape.squeezePct),
    tapeSides: p.seal.tape.sides ? 'yes' : 'no',
    tapePort: p.seal.tape.port ? 'yes' : 'no',
    tpuJoints: p.seal.tape.joints ? 'yes' : 'no',
    fill: p.fill.kind,
    fillStyle: p.fill.style,
    reliefPct: String(p.fill.reliefPct),
    gridOpeningMm: String(p.fill.grid.openingMm),
    gridBarMm: String(p.fill.grid.barMm),
    hexOpeningMm: String(p.fill.hexagon.openingMm),
    hexBarMm: String(p.fill.hexagon.barMm),
    brickWidthMm: String(p.fill.brick.widthMm),
    brickHeightMm: String(p.fill.brick.heightMm),
    brickBarMm: String(p.fill.brick.barMm),
    diamondWidthMm: String(p.fill.diamond.widthMm),
    diamondHeightMm: String(p.fill.diamond.heightMm),
    diamondBarMm: String(p.fill.diamond.barMm),
    pieceFills: formatPieceFills(p.pieceFills),
    cutouts: formatCutouts(p.cutouts),
    rimDepthMm: String(p.rim.depthMm),
    rimWallMm: String(p.rim.wallMm),
    rimClearanceMm: String(p.rim.clearanceMm),
  };
}

const positive = (n: number) => n > 0;
// A pattern's bar is no thinner than two lines from a 0.4 mm nozzle (Q143).
const barFits = (n: number) => n >= MIN_BAR_MM - 1e-9;
const sum = (lengths: number[]) => lengths.reduce((n, l) => n + l, 0);

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
  const kind = oneOf('printer', ['default', 'custom', 'model'] as const);
  const printer: PrinterChoice =
    kind === 'custom'
      ? { kind, widthMm: size('customWidthMm'), heightMm: size('customHeightMm') }
      : kind === 'model'
        ? { kind, id: oneOf('printerModel', PRINTER_IDS) }
        : { kind };
  const bedMarginMm = sizeOrZero('bedMarginMm');
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

  // The seal (seal-tape, #15). The tape's fields are read only with tape, as a custom printer's
  // size is; with no seal a value that is not filled in keeps its starting value (Q122). Printed
  // TPU (seal-tpu, #22) reads them too, as its gaskets take the tape's size (C35).
  const sealKind = oneOf('seal', SEALS);
  const withTape = sealKind !== 'none';
  const tapeNumber = (field: FieldName, fallback: number, fits: (n: number) => boolean, message: string): number => {
    const n = number(field);
    if (fits(n)) return n;
    if (!withTape) return fallback;
    errors[field] = message;
    return Number.NaN;
  };
  const tape = {
    widthMm: tapeNumber('tapeWidthMm', DEFAULT_TAPE.widthMm, positive, 'Enter a size in mm, greater than 0.'),
    thicknessMm: tapeNumber(
      'tapeThicknessMm',
      DEFAULT_TAPE.thicknessMm,
      positive,
      'Enter a size in mm, greater than 0.',
    ),
    grooveMm: tapeNumber('tapeGrooveMm', DEFAULT_TAPE.grooveMm, (n) => n >= 0, 'Enter a size in mm, 0 or more.'),
    squeezePct: tapeNumber(
      'tapeSqueezePct',
      DEFAULT_TAPE.squeezePct,
      (n) => n > 0 && n <= 100,
      'Enter a percentage greater than 0, up to 100.',
    ),
    sides: (withTape ? oneOf('tapeSides', YES_NO) : values.tapeSides) === 'yes',
    port: (withTape ? oneOf('tapePort', YES_NO) : values.tapePort) === 'yes',
    joints: (withTape ? oneOf('tpuJoints', YES_NO) : values.tpuJoints) === 'yes',
  };
  const seal: SealParams = { kind: sealKind, tape };
  // Foam tape does not fit a joint (Q128): the joints in TPU are for the TPU seal (C38).
  if (sealKind === 'tape' && tape.joints) {
    errors.tpuJoints = 'Tape does not fit a joint (Q128): choose printed TPU for the joints.';
  }
  const fit = tapeFit(seal);
  const sideTape = fit !== undefined && fit.sides && Object.values(tape).every((v) => !Number.isNaN(v));
  if (fit !== undefined && Number.isFinite(fit.standOutMm) && fit.standOutMm <= 1e-9) {
    errors.tapeSqueezePct =
      `Squeezed to ${mm((tape.thicknessMm * tape.squeezePct) / 100)} mm, the tape would sit inside its ` +
      `${mm(tape.grooveMm)} mm groove; squeeze it less or make the groove shallower.`;
  }

  // An edge strip keeps walls as thick as the joint's flanges either side of its slot; tape on
  // its sides takes the clearance's place, its groove cut into those walls (Q127).
  const anyTrack = EDGES.some((e) => roles[e] === 'track');
  const sideRoom = sideTape && fit !== undefined ? fit.standOutMm + fit.grooveDepthMm : track.clearanceMm;
  const narrowest = thicknessMm + 2 * joint.fitMm + 2 * joint.flangeMm + (anyTrack ? 2 * sideRoom : 0);
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
  } else if (printer.kind === 'model' && Number.isFinite(jointMm) && errors.printerModel === undefined) {
    const max = maxPieceSize(printer, bedMarginMm);
    const smallest = Math.min(max.widthMm, max.heightMm);
    if (Number.isFinite(smallest) && smallest <= jointMm) {
      errors.bedMarginMm = `Leaves pieces of ${mm(smallest)} mm on this printer, no more than a joint’s ${mm(jointMm)} mm; make it smaller.`;
    }
  } else if (printer.kind === 'default') {
    const smallest = Math.min(DEFAULT_MAX_PIECE.widthMm, DEFAULT_MAX_PIECE.heightMm);
    if (jointMm >= smallest) {
      errors.webMm = `Make the web and the slide together less than the ${mm(smallest)} mm piece size.`;
    }
  }

  if (fit !== undefined && errors.tapeSqueezePct === undefined && Number.isFinite(fit.grooveWidthMm)) {
    // The tape on the sides needs a track at least as deep as it is wide (Q127).
    const shallow = sideTape ? EDGES.find((e) => roles[e] === 'track' && track.depthMm[e] < tape.widthMm) : undefined;
    if (shallow !== undefined) {
      errors.tapeSides =
        `The ${shallow} track is ${mm(track.depthMm[shallow])} mm deep, less than the ${mm(tape.widthMm)} mm tape ` +
        'is wide, so the tape cannot go on the edge strips’ sides.';
    }
    // Its groove on the outer face leaves the strip walls of at least 0.8 mm (Q131).
    const widths = EDGES.map((e) =>
      roles[e] !== 'track' ? track.widthMm : track.widthMm - 2 * (sideTape ? fit.standOutMm : track.clearanceMm),
    );
    const walls = (Math.min(...widths) - fit.grooveWidthMm) / 2;
    if (walls < TAPE_GROOVE_WALL_MM - 1e-9) {
      errors.tapeWidthMm =
        `Leaves walls of ${hundredth(Math.max(0, walls))} mm beside the tape’s groove in the edge strips, under the ` +
        `${mm(TAPE_GROOVE_WALL_MM)} mm they need; choose a narrower tape.`;
    }
  }
  // A TPU gasket's two fins stand on its base, up to the tape's thickness (C32).
  if (sealKind === 'tpu' && fit !== undefined) {
    const base = gasketBaseMm(fit);
    if (tape.thicknessMm <= base + 1e-9) {
      errors.tapeThicknessMm = `Make it more than ${mm(base)} mm: the gasket’s fins stand on its ${mm(base)} mm base.`;
    }
    if (fit.grooveWidthMm <= 2 * TPU_FIN_MM + 1e-9 && errors.tapeWidthMm === undefined) {
      errors.tapeWidthMm =
        `Make it more than ${mm(2 * TPU_FIN_MM - TAPE_GROOVE_PLAY_MM)} mm: the gasket’s base holds two ` +
        `${mm(TPU_FIN_MM)} mm fins.`;
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
  // Tape inside the collar needs a collar as deep as its groove is wide (Q129).
  if (fit?.port === true && given.ok && given.ports.length > 0 && collar.depthMm < fit.grooveWidthMm - 1e-9) {
    errors.collarDepthMm = `Make it at least ${mm(fit.grooveWidthMm)} mm, so the tape’s groove fits inside the collar.`;
  }

  // The measured cutouts' rim (C42): the clearance may be zero, as the collar's may. With a seal,
  // it is lined, and needs to be as deep as the seal's groove is wide (C43, as Q129).
  const rim: RimParams = {
    depthMm: size('rimDepthMm'),
    wallMm: size('rimWallMm'),
    clearanceMm: sizeOrZero('rimClearanceMm'),
  };
  const givenCutouts = parseCutouts(values.cutouts ?? '');
  if (!givenCutouts.ok) errors.cutouts = givenCutouts.message;
  if (
    fit !== undefined &&
    givenCutouts.ok &&
    givenCutouts.cutouts.length > 0 &&
    rim.depthMm < fit.grooveWidthMm - 1e-9
  ) {
    errors.rimDepthMm = `Make it at least ${mm(fit.grooveWidthMm)} mm, so the seal’s groove fits inside the rim.`;
  }

  if (Object.keys(errors).length === 0) {
    // The edge strips must leave the pieces something to cover.
    const span = panelSpan(openingWidthMm, openingHeightMm, edges, joint, fit);
    if (span.widthMm <= 0) errors.openingWidthMm = 'Too small for the edge strips.';
    if (span.heightMm <= 0) errors.openingHeightMm = 'Too small for the edge strips.';
  }

  // The panel fill (Q141): a pattern's fields are read only with a pattern, as the tape's are.
  const fillKind = oneOf('fill', FILL_KINDS);
  const givenFills = parsePieceFills(values.pieceFills ?? '');
  if (!givenFills.ok) errors.pieceFills = givenFills.message;
  // A pattern's sizes are read when the wall or any piece uses it.
  const used = (pattern: FillKind) =>
    fillKind === pattern || (givenFills.ok && givenFills.fills.some((f) => f.kind === pattern));
  const patterned = FILL_KINDS.some((k) => k !== 'sealed' && used(k));
  // Each pattern's own sizes are read only when it is the one chosen (C15).
  const fillNumber = (
    field: FieldName,
    fallback: number,
    fits: (n: number) => boolean,
    message: string,
    readFor: boolean = patterned,
  ): number => {
    const n = number(field);
    if (fits(n)) return n;
    if (!readFor) return fallback;
    errors[field] = message;
    return Number.NaN;
  };
  const barMessage = `Make it at least ${mm(MIN_BAR_MM)} mm: two lines from a 0.4 mm nozzle.`;
  const sizeMessage = 'Enter a size in mm, greater than 0.';
  const fill: FillParams = {
    kind: fillKind,
    style: patterned
      ? oneOf('fillStyle', PATTERN_STYLES)
      : (PATTERN_STYLES.find((v) => v === values.fillStyle) ?? SEALED.style),
    reliefPct: fillNumber(
      'reliefPct',
      SEALED.reliefPct,
      (n) => n > 0 && n < 100,
      'Enter a percentage greater than 0 and less than 100.',
    ),
    grid: {
      openingMm: fillNumber(
        'gridOpeningMm',
        DEFAULT_GRID.openingMm,
        positive,
        'Enter a size in mm, greater than 0.',
        used('grid'),
      ),
      barMm: fillNumber('gridBarMm', DEFAULT_GRID.barMm, barFits, barMessage, used('grid')),
    },
    hexagon: {
      openingMm: fillNumber(
        'hexOpeningMm',
        DEFAULT_HEXAGON.openingMm,
        positive,
        'Enter a size in mm, greater than 0.',
        used('hexagon'),
      ),
      barMm: fillNumber('hexBarMm', DEFAULT_HEXAGON.barMm, barFits, barMessage, used('hexagon')),
    },
    brick: {
      widthMm: fillNumber('brickWidthMm', DEFAULT_BRICK.widthMm, positive, sizeMessage, used('brick')),
      heightMm: fillNumber('brickHeightMm', DEFAULT_BRICK.heightMm, positive, sizeMessage, used('brick')),
      barMm: fillNumber('brickBarMm', DEFAULT_BRICK.barMm, barFits, barMessage, used('brick')),
    },
    diamond: {
      widthMm: fillNumber('diamondWidthMm', DEFAULT_DIAMOND.widthMm, positive, sizeMessage, used('diamond')),
      heightMm: fillNumber('diamondHeightMm', DEFAULT_DIAMOND.heightMm, positive, sizeMessage, used('diamond')),
      barMm: fillNumber('diamondBarMm', DEFAULT_DIAMOND.barMm, barFits, barMessage, used('diamond')),
    },
  };

  const base = {
    openingWidthMm,
    openingHeightMm,
    printer,
    bedMarginMm,
    width,
    height,
    thicknessMm,
    joint,
    edges,
    collar,
    seal,
    fill,
  };
  const ports: Required<PortSetting>[] = [];
  if (Object.keys(errors).length === 0 && given.ok && given.ports.length > 0) {
    errors.ports = placePorts({ ...base, ports: [], pieceFills: [], cutouts: [], rim }, given.ports, ports);
    if (errors.ports === undefined) delete errors.ports;
  }
  const cutouts: Required<CutoutSetting>[] = [];
  if (Object.keys(errors).length === 0 && givenCutouts.ok && givenCutouts.cutouts.length > 0) {
    errors.cutouts = placeCutouts({ ...base, ports, pieceFills: [], cutouts: [], rim }, givenCutouts.cutouts, cutouts);
    if (errors.cutouts === undefined) delete errors.cutouts;
  }

  // Each piece's own fill (#21): a piece the wall has, and one fill for each piece.
  const pieceFills = givenFills.ok ? givenFills.fills : [];
  if (Object.keys(errors).length === 0 && pieceFills.length > 0) {
    const plan = planWall({ ...base, ports, pieceFills: [], cutouts, rim });
    const message = checkPieceFills(plan, pieceFills);
    if (message !== undefined) errors.pieceFills = message;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, params: { ...base, ports, pieceFills, cutouts, rim } };
}

function checkPieceFills(plan: GridLayout, fills: readonly PieceFill[]): string | undefined {
  for (const [i, f] of fills.entries()) {
    if (!plan.pieces.some((p) => p.column === f.column - 1 && p.row === f.row - 1)) {
      const [columns, rows] = [plan.columns.length, plan.rows.length];
      return `Piece fill ${i + 1}: there is no column ${f.column}, row ${f.row}: the wall has ${columns} columns and ${rows} rows.`;
    }
    const other = fills.findIndex((g) => g.column === f.column && g.row === f.row);
    if (other < i) {
      return `Piece fills ${other + 1} and ${i + 1} are both for column ${f.column}, row ${f.row}; give each piece one fill.`;
    }
  }
  return undefined;
}

// Each port in its piece (Q105, Q110), its lip leaving a hole, the piece there and big enough
// (Q108), and no two in one piece (Q113). Fills `placed`; returns the first problem, if any.
function placePorts(params: Params, given: PortSetting[], placed: Required<PortSetting>[]): string | undefined {
  const plan = planWall(params);
  const start = defaultPortPiece(plan);
  const collar = tapedCollar(params.collar, tapeFit(params.seal)); // with tape inside, Q129
  for (const [i, port] of given.entries()) {
    const column = port.column ?? start.column + 1;
    const row = port.row ?? start.row + 1;
    if (!(portHoleMm(port.hoseMm, collar) > 0)) {
      return `Port ${i + 1}: the ${mm(params.collar.lipMm)} mm lip would close a ${mm(port.hoseMm)} mm hose’s port; make the lip smaller.`;
    }
    const fit = checkPort(plan, { hoseMm: port.hoseMm, column: column - 1, row: row - 1 }, collar, params.joint);
    if (!fit.ok) return `Port ${i + 1}: ${fit.message}`;
    const other = placed.findIndex((p) => p.column === column && p.row === row);
    if (other >= 0) {
      return `Ports ${other + 1} and ${i + 1} are both in column ${column}, row ${row}; give each its own piece.`;
    }
    placed.push({ hoseMm: port.hoseMm, column, row });
  }
  return undefined;
}

// Each cutout in its piece (C47, as Q105 and Q110), the piece there and big enough for the rim
// (C40, as Q108), and one cutout or port to a piece. Fills `placed`; returns the first problem.
function placeCutouts(params: Params, given: CutoutSetting[], placed: Required<CutoutSetting>[]): string | undefined {
  const plan = planWall(params);
  const start = defaultPortPiece(plan);
  const rim = linedRim(params.rim, tapeFit(params.seal));
  for (const [i, cutout] of given.entries()) {
    const column = cutout.column ?? start.column + 1;
    const row = cutout.row ?? start.row + 1;
    const fit = checkCutout(plan, { ...cutout, column: column - 1, row: row - 1 }, rim, params.joint);
    if (!fit.ok) return `Cutout ${i + 1}: ${fit.message}`;
    const port = params.ports.findIndex((p) => p.column === column && p.row === row);
    if (port >= 0)
      return `Cutout ${i + 1} and port ${port + 1} are both in column ${column}, row ${row}; give each its own piece.`;
    const other = placed.findIndex((c) => c.column === column && c.row === row);
    if (other >= 0) {
      return `Cutouts ${other + 1} and ${i + 1} are both in column ${column}, row ${row}; give each its own piece.`;
    }
    placed.push({ widthMm: cutout.widthMm, heightMm: cutout.heightMm, column, row });
  }
  return undefined;
}

function layoutFor(p: Params, max: PieceSize): GridLayout {
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tapeFit(p.seal));
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

// The largest piece the plan uses. A listed printer's bed is turned where that needs fewer
// pieces, as a piece can be turned on the bed; on a tie it stays as listed (Q116).
export function pieceLimit(p: Params): PieceSize {
  const asListed = maxPieceSize(p.printer, p.bedMarginMm);
  if (p.printer.kind !== 'model' || asListed.widthMm === asListed.heightMm) return asListed;
  const turned = { widthMm: asListed.heightMm, heightMm: asListed.widthMm };
  return layoutFor(p, turned).pieces.length < layoutFor(p, asListed).pieces.length ? turned : asListed;
}

export function planWall(p: Params): GridLayout {
  return layoutFor(p, pieceLimit(p));
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
  const max = pieceLimit(p);
  const tape = tapeFit(p.seal);
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tape);
  return {
    plan,
    joints: planJoints(plan, p.joint, jointStripInsetMm(p.joint)),
    // A strip can be turned on the bed, so the longer side of the largest piece limits it.
    edges: planEdges(span.widthMm, span.heightMm, p.edges, p.joint, Math.max(max.widthMm, max.heightMm), tape),
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
  cutouts: string[]; // one line for each measured cutout (#23)
  units: string[]; // one line for each edge against a window AC (#24)
  seal: string;
  fill: string;
  pieceFills: string[]; // one line for each piece with a fill of its own (#21)
}

function mm(n: number): string {
  return String(Math.round(n * 10) / 10);
}

const hundredth = (n: number): string => String(Math.round(n * 100) / 100);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// "200, 200, 167 and 30"
function listed(lengths: number[]): string {
  const words = lengths.map(mm);
  const last = words.pop();
  return words.length > 0 ? `${words.join(', ')} and ${last}` : (last ?? '');
}

function describeLeftover(note: GridLayout['leftovers'][number], maxPieceMm: number, joint: JointParams): LeftoverText {
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
    joints.crosses.length > 0 ? `, and ${plural(joints.crosses.length, 'cross piece', 'cross pieces')}` : '';
  return `Joints: ${plural(joints.strips.length, 'strip', 'strips')} in ${plural(lengths, 'length', 'lengths')}${crosses}; each joint ${mm(jointWidthMm(joint))} mm wide.`;
}

// A fill (Q141): sealed, or the pattern, its sizes and how it is cut.
function fillWords(fill: FillParams, thicknessMm: number): string {
  if (fill.kind === 'sealed') return 'sealed.';
  const { grid, hexagon, brick, diamond } = fill;
  const names: Record<Exclude<FillParams['kind'], 'sealed'>, string> = {
    grid: `a grid of ${mm(grid.openingMm)} mm square openings and ${mm(grid.barMm)} mm bars`,
    hexagon: `a honeycomb of hexagonal openings ${mm(hexagon.openingMm)} mm across the flats and ${mm(hexagon.barMm)} mm bars`,
    brick: `bricks of ${mm(brick.widthMm)} × ${mm(brick.heightMm)} mm openings and ${mm(brick.barMm)} mm bars`,
    diamond: `diamonds ${mm(diamond.widthMm)} mm wide and ${mm(diamond.heightMm)} mm tall and ${mm(diamond.barMm)} mm bars`,
  };
  const pattern = names[fill.kind];
  return fill.style === 'through'
    ? `${pattern}, cut through: air passes through the wall.`
    : `${pattern}, cut ${mm(reliefDepthMm(thicknessMm, fill.reliefPct))} mm into the room side.`;
}

// The tape (Q119, Q127, Q129): its size, where it goes, and how much the wall takes, along each
// edge strip, twice more along those in a track for the sides, and round each collar's groove.
// Printed TPU (#22): the gaskets' size and length in the same places, a sleeve in each collar,
// and whether the joints are TPU too.
function describeSeal(params: Params, parts: WallParts): string {
  const fit = tapeFit(params.seal);
  if (fit === undefined) return 'Seal: none.';
  const { tape } = params.seal;
  const outer = sum(parts.edges.map((s) => s.lengthMm));
  const sides = fit.sides
    ? 2 * sum(parts.edges.filter((s) => params.edges.roles[s.edge] === 'track').map((s) => s.lengthMm))
    : 0;
  const ports = fit.port ? params.ports : [];
  const collar = tapedCollar(params.collar, fit);
  const faces = fit.sides ? 'outer faces and sides' : 'outer faces';
  const each = ports.length === 1 ? 'the hose port’s collar' : 'each hose port’s collar';
  // Every cutout's rim is lined (C43).
  const cutouts = params.cutouts;
  const eachRim = cutouts.length === 1 ? 'the cutout’s rim' : 'each cutout’s rim';
  if (params.seal.kind === 'tpu') {
    const metres = Math.round((outer + sides) / 100) / 10;
    const gaskets = `${mm(fit.grooveWidthMm)} × ${mm(tape.thicknessMm)} mm gaskets along the edge strips’ ${faces}: ${metres} m in all`;
    const also = [
      ...(ports.length === 0 ? [] : [`a sleeve inside ${each}`]),
      ...(cutouts.length === 0 ? [] : [`a frame inside ${eachRim}`]),
      ...(tape.joints ? ['the joint strips and cross pieces in TPU'] : []),
    ];
    const list = [gaskets, ...also];
    const last = list.length > 1 ? `, and ${list.pop() ?? ''}` : '';
    return `Seal: printed TPU, ${list.join(', ')}${last}.`;
  }
  const round = sum(ports.map((p) => Math.PI * (collarInnerMm(p.hoseMm, collar) + 2 * fit.grooveDepthMm)));
  const rim = linedRim(params.rim, fit);
  const rims = sum(
    cutouts.map((c) => {
      const floor = rimInnerMm(c, rim);
      return 2 * (floor.widthMm + floor.heightMm) + 8 * fit.grooveDepthMm;
    }),
  );
  const places = [
    ...(ports.length === 0 ? [] : [`inside ${each}`]),
    ...(cutouts.length === 0 ? [] : [`round ${eachRim}`]),
  ];
  const inPorts = places.length === 0 ? '' : `, and ${places.join(' and ')}`;
  const metres = Math.round((outer + sides + round + rims) / 100) / 10;
  return `Seal: ${mm(tape.widthMm)} × ${mm(tape.thicknessMm)} mm foam tape along the edge strips’ ${faces}${inPorts}: ${metres} m in all.`;
}

// Each cutout: the appliance, where, the opening and its rim, and what lines it (C43).
function describeCutouts(params: Params): string[] {
  const rim = linedRim(params.rim, tapeFit(params.seal));
  const lining = { none: '', tape: ', lined with the foam tape', tpu: ', lined with a TPU frame' }[params.seal.kind];
  return params.cutouts.map((c) => {
    const opening = rimInnerMm(c, rim);
    return (
      `Cutout: a ${mm(c.widthMm)} × ${mm(c.heightMm)} mm appliance, in column ${c.column}, row ${c.row}, through a ` +
      `${mm(opening.widthMm)} × ${mm(opening.heightMm)} mm opening in a ${mm(rim.depthMm)} mm rim${lining}.`
    );
  });
}

export function describePlan(plan: GridLayout, params: Params): PlanText {
  const count = plan.pieces.length;
  const max = pieceLimit(params);
  const parts = planParts(params, plan);
  const span = panelSpan(
    params.openingWidthMm,
    params.openingHeightMm,
    params.edges,
    params.joint,
    tapeFit(params.seal),
  );
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
    cutouts: describeCutouts(params),
    units: EDGES.filter((e) => params.edges.roles[e] === 'unit').map(
      (e) =>
        `Window AC: the ${e} edge ${e === 'bottom' ? 'stands on the unit’s top' : e === 'top' ? 'meets the unit’s underside' : 'meets the unit’s side'}.`,
    ),
    seal: describeSeal(params, parts),
    fill: `Fill: ${fillWords(params.fill, params.thicknessMm)}`,
    pieceFills: params.pieceFills.map(
      (f) => `Column ${f.column}, row ${f.row}: ${fillWords(fillFor(params, f.column, f.row), params.thicknessMm)}`,
    ),
  };
}
