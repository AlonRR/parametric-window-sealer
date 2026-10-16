// The parameters (backlog item params-basic, #5): what the user sets, the values the page starts
// with, and the page's form as text both ways.
//
// readParams reads the form one section at a time (code-params-page, #95), each section beside
// the function that writes it back (its ...Form), then runs the checks that need several
// sections. Every problem is kept against its field, so the page can mark them all; nothing is
// made from a bad value. The checks run in a fixed order: a later one may need the earlier ones
// to have found nothing, and the command and the MCP server list the problems in that order.
//
// A new setting: its field in FIELD_NAMES, its place in Params and EXAMPLE_PARAMS, and its
// section's reader and ...Form; docs/extending.md lists the rest, and which tests fail if a step
// is missed.

import { EDGES, EXAMPLE_TRACK, WINDOW_PRESETS, panelSpan } from './edge.js';
import type { EdgeName, EdgeParams, EdgeRole, WindowType } from './edge.js';
import { DOVETAIL } from './dovetail.js';
import { DEFAULT_JOINT, JOINT_STYLES, PIN_HOLD_MM, jointWidthMm } from './joint.js';
import type { JointParams } from './joint.js';
import type { AxisMode, FillerPosition, GridLayout, Leftover } from './layout.js';
import { DEFAULT_MAX_PIECE, maxPieceSize } from './printer.js';
import type { PrinterChoice } from './printer.js';
import { DEFAULT_BED_MARGIN_MM } from './printer.js';
import { PRINTER_IDS } from './printers.js';
import { DEFAULT_COLLAR, formatPorts, parsePorts } from './port.js';
import type { CollarParams, PortSetting } from './port.js';
import { DEFAULT_RIM, formatCutouts, parseCutouts } from './cutout.js';
import type { CutoutSetting, RimParams } from './cutout.js';
import { DEFAULT_TAPE, NO_SEAL, TAPE_GROOVE_PLAY_MM, TAPE_GROOVE_WALL_MM, tapeFit } from './tape.js';
import type { SealKind, SealParams, TapeFit } from './tape.js';
import { TPU_FIN_MM, gasketBaseMm, gasketFinsAcrossMm } from './tpu.js';
import { FILL_KINDS, PATTERN_STYLES, SEALED, isPatternKind } from './fill.js';
import { organiserOf } from './organisers/index.js';
import { MIN_BAR_MM } from './pattern.js';
import { readSvgDrawing } from './svg/drawing.js';
import type { FillKind, FillParams } from './fill.js';
import { PATTERNS, PATTERN_FIELDS, patternSizes, sizesOf } from './patterns/index.js';
import { formatPieceFills, parsePieceFills } from './piece-fill.js';
import type { PieceFill } from './piece-fill.js';
import { DEFAULT_SHEET, PIECE_SOURCES } from './sheet.js';
import type { SheetParams } from './sheet.js';
import { COLOURS, DEFAULT_MATERIAL, MATERIAL_KINDS } from './material.js';
import type { MaterialParams } from './material.js';
import { DEFAULT_SOCKET, PORT_LOCKS } from './socket.js';
import type { SocketParams } from './socket.js';
import { DEFAULT_RAIL, railEdge, railLeastGapMm } from './rail.js';
import type { RailParams } from './rail.js';
import { DEFAULT_STOP, STOP_LEAST_MM, stopTrack } from './stop.js';
import { DOUBLE_LEAST_GAP_MM, DOUBLE_SKIN_MM, WALL_KINDS, doubleLeastMm } from './double.js';
import type { WallKind } from './double.js';
import type { StopParams } from './stop.js';
import { FormReader, SIZE_MESSAGE, SIZE_OR_ZERO_MESSAGE } from './form-reader.js';
import { planWall } from './plan.js';
import {
  clampProblem,
  cutoutProblem,
  insertProblem,
  fanProblem,
  placeFittings,
  placeCustomPiece,
  placeModel,
  portProblem,
} from './fittings/index.js';
import { formatFans, parseFans } from './fan.js';
import type { FanSetting } from './fan.js';
import { DEFAULT_CLAMP, formatClamps, parseClamps } from './clamp.js';
import type { ClampParams, ClampSetting } from './clamp.js';
import { DEFAULT_INSERT, formatInserts, parseInserts } from './insert.js';
import type { InsertParams, InsertSetting } from './insert.js';
import { MODEL_VIEWS, NO_MODEL, readApplianceModel } from './appliance-model.js';
import { NO_MESH_TILE, readMeshTile } from './mesh-tile.js';
import { NO_CUSTOM_PIECE } from './custom-piece.js';
import type { CustomPieceSetting } from './custom-piece.js';
import { patternBorderMm } from './pattern.js';
import type { ApplianceModel, ModelSetting } from './appliance-model.js';
import type { InPiece } from './fittings/index.js';
import { capitalised, hundredth, mm } from './words.js';
import { EXAMPLE_TILT, EXAMPLE_TURN, refuseForWedge, sashForm, wedgeSetup } from './wedge-window.js';
import type { TiltParams, TurnParams } from './wedge-window.js';

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
  fans: Required<FanSetting>[]; // fans from the list (#28); none to start with
  clamps: Required<ClampSetting>[]; // appliances held by clamps (#32); none to start with
  clamp: ClampParams; // their jaws
  inserts: Required<InsertSetting>[]; // appliances in a sliding insert (#38); none to start with
  insert: InsertParams; // its shutters
  model: ModelSetting; // an imported model of the appliance to cut round (#35); none to start with
  customPiece: CustomPieceSetting; // a whole piece of your own (#41); none to start with
  coupon: boolean; // the joint's test coupon in the download too (joint-lock, #110)
  sheet: SheetParams; // the pieces printed, or cut from sheet (sheet-pieces, #112)
  material: MaterialParams; // what the parts are printed in, and whether the wall is in sun (#113)
  socket: SocketParams; // how the hose ports hold the hose, with caps and screens (#114)
  rail: RailParams; // the filler between the sashes (meeting-rail, #116); none to start with
  tilt: TiltParams; // a tilted sash's gap at the top, for its wedge (sash-wedge, #159)
  turn: TurnParams; // a turned sash's gap at the latch side, for its wedge
  rain: boolean; // weep holes in the strips and a drip groove under the edge strips (rain-face, #117)
  stop: StopParams; // a strut in the sash's track that lifts out by hand (sash-stop, #118); none to start with
  wall: WallKind; // single, or double with hollow pieces for winter (double-wall, #119)
  stiffen: boolean; // aluminium angle on printed clips across a span over 500 mm (stiffener-strips, #111)
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
  fans: [],
  clamps: [],
  clamp: DEFAULT_CLAMP,
  inserts: [],
  insert: DEFAULT_INSERT,
  model: NO_MODEL,
  customPiece: NO_CUSTOM_PIECE,
  coupon: false,
  sheet: DEFAULT_SHEET,
  material: DEFAULT_MATERIAL,
  socket: DEFAULT_SOCKET,
  rail: DEFAULT_RAIL,
  rain: true,
  stop: DEFAULT_STOP,
  wall: 'single',
  stiffen: true,
  tilt: EXAMPLE_TILT,
  turn: EXAMPLE_TURN,
};

// Every field of the page's form. The page reads and writes these by name; the settings list
// (settings.ts), the command's flags and the MCP server's schema each have one entry per field,
// and their tests fail when one is missing. A pattern's fields come with the pattern.
export const FIELD_NAMES = [
  'openingWidthMm',
  'openingHeightMm',
  'printer',
  'printerModel',
  'bedMarginMm',
  'customWidthMm',
  'customHeightMm',
  'widthMode',
  'widthFiller',
  'heightMode',
  'heightFiller',
  'thicknessMm',
  'wall',
  'pieceSource',
  'sheetWidthMm',
  'sheetHeightMm',
  'material',
  'colour',
  'sun',
  'rain',
  'stiffen',
  'widthLeftover',
  'heightLeftover',
  'jointStyle',
  'slotMm',
  'slideMm',
  'webMm',
  'flangeMm',
  'fitMm',
  'gripMm',
  'pins',
  'coupon',
  'window',
  'tiltGapMm',
  'turnGapMm',
  'topEdge',
  'bottomEdge',
  'leftEdge',
  'rightEdge',
  'trackWidthMm',
  'topDepthMm',
  'bottomDepthMm',
  'leftDepthMm',
  'rightDepthMm',
  'trackClearanceMm',
  'railGapMm',
  'sashStopMm',
  'ports',
  'collarDepthMm',
  'collarWallMm',
  'collarClearanceMm',
  'collarLipMm',
  'portLock',
  'portCap',
  'portScreen',
  'seal',
  'tapeWidthMm',
  'tapeThicknessMm',
  'tapeGrooveMm',
  'tapeSqueezePct',
  'tapeSides',
  'tapePort',
  'tpuJoints',
  'fill',
  'fillStyle',
  'reliefPct',
  'fillDrawing',
  'fillMeshFile',
  'fillMeshView',
  'pieceFills',
  'cutouts',
  'rimDepthMm',
  'rimWallMm',
  'rimClearanceMm',
  'fans',
  'clamps',
  'clampTravelMm',
  'clampDepthMm',
  'inserts',
  'insertTravelMm',
  'insertClearanceMm',
  'modelFile',
  'modelView',
  'modelColumn',
  'modelRow',
  'customPieceFile',
  'customPieceView',
  'customPieceColumn',
  'customPieceRow',
  // Each pattern's sizes, as the patterns declare them (patterns/).
  ...PATTERN_FIELDS,
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];
export type FormValues = Partial<Record<FieldName, string>>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ReadResult = { ok: true; params: Params } | { ok: false; errors: FieldErrors };

const MODES: readonly AxisMode[] = ['equal', 'full-plus-filler'];
const FILLERS: readonly FillerPosition[] = ['start', 'end', 'middle', 'split'];
const LEFTOVERS: readonly Leftover[] = ['spread', 'equal', 'shorten'];
const WINDOWS: readonly WindowType[] = ['slider', 'hung', 'frame', 'shutter', 'tilt', 'turn'];
const ROLES: readonly EdgeRole[] = ['track', 'sash', 'sill', 'unit', 'frame'];
const SEALS: readonly SealKind[] = ['none', 'tape', 'tpu'];
const PRINTER_KINDS = ['default', 'custom', 'model'] as const;
const YES_NO = ['no', 'yes'] as const;

const yesNo = (on: boolean): 'yes' | 'no' => (on ? 'yes' : 'no');
const positive = (n: number) => n > 0;
// A pattern's bar is no thinner than two lines from a 0.4 mm nozzle (Q143).
const barFits = (n: number) => n >= MIN_BAR_MM - 1e-9;
const BAR_MESSAGE = `Make it at least ${mm(MIN_BAR_MM)} mm: two lines from a 0.4 mm nozzle.`;

// The opening: the gap the wall fills, as the user measures it.

const openingForm = (p: Params): FormValues => ({
  openingWidthMm: String(p.openingWidthMm),
  openingHeightMm: String(p.openingHeightMm),
});

function readOpening(r: FormReader) {
  return { openingWidthMm: r.size('openingWidthMm'), openingHeightMm: r.size('openingHeightMm') };
}

// The printer: the largest piece it makes (Q5, Q38, Q115). A custom size is read only for a
// custom printer, a listed printer only when one is chosen.

const printerForm = (p: Params): FormValues => ({
  printer: p.printer.kind,
  customWidthMm: p.printer.kind === 'custom' ? String(p.printer.widthMm) : '',
  customHeightMm: p.printer.kind === 'custom' ? String(p.printer.heightMm) : '',
  printerModel: p.printer.kind === 'model' ? p.printer.id : '',
  bedMarginMm: String(p.bedMarginMm),
});

function readPrinter(r: FormReader): { printer: PrinterChoice; bedMarginMm: number } {
  const kind = r.oneOf('printer', PRINTER_KINDS);
  const printer: PrinterChoice =
    kind === 'custom'
      ? { kind, widthMm: r.size('customWidthMm'), heightMm: r.size('customHeightMm') }
      : kind === 'model'
        ? { kind, id: r.oneOf('printerModel', PRINTER_IDS) }
        : { kind };
  return { printer, bedMarginMm: r.sizeOrZero('bedMarginMm') };
}

// How each axis is divided into pieces (Q11, Q12, Q60).

const divisionForm = (p: Params): FormValues => ({
  widthMode: p.width.mode,
  widthFiller: p.width.filler,
  widthLeftover: p.width.leftover,
  heightMode: p.height.mode,
  heightFiller: p.height.filler,
  heightLeftover: p.height.leftover,
});

function readDivision(r: FormReader): { width: AxisChoice; height: AxisChoice } {
  return {
    width: {
      mode: r.oneOf('widthMode', MODES),
      filler: r.oneOf('widthFiller', FILLERS),
      leftover: r.oneOf('widthLeftover', LEFTOVERS),
    },
    height: {
      mode: r.oneOf('heightMode', MODES),
      filler: r.oneOf('heightFiller', FILLERS),
      leftover: r.oneOf('heightLeftover', LEFTOVERS),
    },
  };
}

// The panels' thickness and the joint between them (Q13, Q50 to Q53). The slide and the fit
// may be zero: a joint that does not slide, or a printer that needs no clearance; so may the grip,
// for strips without ribs. A pin needs some slot beyond the slide to hold it (joint-lock, #110).

const panelForm = (p: Params): FormValues => ({
  thicknessMm: String(p.thicknessMm),
  wall: p.wall,
  jointStyle: p.joint.style,
  slotMm: String(p.joint.slotMm),
  slideMm: String(p.joint.slideMm),
  webMm: String(p.joint.webMm),
  flangeMm: String(p.joint.flangeMm),
  fitMm: String(p.joint.fitMm),
  gripMm: String(p.joint.gripMm),
  pins: yesNo(p.joint.pins),
  coupon: yesNo(p.coupon),
  pieceSource: p.sheet.source,
  sheetWidthMm: String(p.sheet.widthMm),
  sheetHeightMm: String(p.sheet.heightMm),
  material: p.material.kind,
  colour: p.material.colour,
  sun: yesNo(p.material.sun),
  rain: yesNo(p.rain),
  stiffen: yesNo(p.stiffen),
});

function readPanel(r: FormReader): {
  thicknessMm: number;
  joint: JointParams;
  coupon: boolean;
  sheet: SheetParams;
  material: MaterialParams;
  rain: boolean;
  stiffen: boolean;
} {
  const thicknessMm = r.size('thicknessMm');
  const joint: JointParams = {
    style: r.oneOf('jointStyle', JOINT_STYLES),
    slotMm: r.size('slotMm'),
    slideMm: r.sizeOrZero('slideMm'),
    webMm: r.size('webMm'),
    flangeMm: r.size('flangeMm'),
    fitMm: r.sizeOrZero('fitMm'),
    gripMm: r.sizeOrZero('gripMm'),
    pins: r.oneOf('pins', YES_NO) === 'yes',
  };
  const coupon = r.oneOf('coupon', YES_NO) === 'yes';
  // The sheet's size is read only for pieces cut from sheet, as a custom printer's only for one.
  const source = r.oneOf('pieceSource', PIECE_SOURCES);
  const cut = source === 'sheet';
  const sheet: SheetParams = {
    source,
    widthMm: r.numberIfUsed('sheetWidthMm', cut, DEFAULT_SHEET.widthMm, positive, SIZE_MESSAGE),
    heightMm: r.numberIfUsed('sheetHeightMm', cut, DEFAULT_SHEET.heightMm, positive, SIZE_MESSAGE),
  };
  if (joint.slideMm >= joint.slotMm) {
    r.fail('slideMm', 'Make it less than the slot depth, so a piece always stays in its slot.');
  } else if (joint.pins && joint.slotMm - joint.slideMm < PIN_HOLD_MM - 1e-9) {
    r.fail(
      'pins',
      `A pin needs the slot at least ${mm(PIN_HOLD_MM)} mm deeper than the slide; this one is ` +
        `${mm(joint.slotMm - joint.slideMm)} mm deeper. Make the slot deeper or the slide shorter, or turn the pins off.`,
    );
  }
  const material: MaterialParams = {
    kind: r.oneOf('material', MATERIAL_KINDS),
    colour: r.oneOf('colour', COLOURS),
    sun: r.oneOf('sun', YES_NO) === 'yes',
  };
  const rain = r.oneOf('rain', YES_NO) === 'yes';
  const stiffen = r.oneOf('stiffen', YES_NO) === 'yes';
  return { thicknessMm, joint, coupon, sheet, material, rain, stiffen };
}

// The window and its four edges (Q66, Q71, Q75). A track's depth is read only where the edge is
// in a track, as the custom size is read only for a custom printer.

const edgesForm = (p: Params): FormValues => ({
  window: p.edges.window,
  tiltGapMm: String(p.tilt.gapMm),
  turnGapMm: String(p.turn.gapMm),
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
  railGapMm: String(p.rail.gapMm),
  sashStopMm: String(p.stop.lengthMm),
});

function readEdges(r: FormReader): EdgeParams {
  const window = r.oneOf('window', WINDOWS);
  const roleOf = (edge: EdgeName) => r.oneOf(`${edge}Edge` as const, ROLES);
  const roles = { top: roleOf('top'), bottom: roleOf('bottom'), left: roleOf('left'), right: roleOf('right') };
  const depthOf = (edge: EdgeName) => {
    const field = `${edge}DepthMm` as const;
    if (roles[edge] === 'track') return r.sizeOrZero(field);
    const n = r.number(field);
    return Number.isFinite(n) ? n : EXAMPLE_TRACK.depthMm[edge];
  };
  const track = {
    widthMm: r.size('trackWidthMm'),
    clearanceMm: r.sizeOrZero('trackClearanceMm'),
    depthMm: { top: depthOf('top'), bottom: depthOf('bottom'), left: depthOf('left'), right: depthOf('right') },
  };
  return { window, roles, track };
}

// A double wall (double-wall, #119): its skins and the air between them must fit in the panel's
// thickness, and they are too thin for a pattern across the wall.
function readWall(r: FormReader, thicknessMm: number, fill: FillKind): WallKind {
  const wall = r.oneOf('wall', WALL_KINDS);
  if (wall === 'single' || !Number.isFinite(thicknessMm)) return wall;
  if (thicknessMm < doubleLeastMm() - 1e-9) {
    r.fail(
      'wall',
      `A double wall needs panels at least ${mm(doubleLeastMm())} mm thick: two ${mm(DOUBLE_SKIN_MM)} mm skins ` +
        `round a ${mm(DOUBLE_LEAST_GAP_MM)} mm air gap.`,
    );
  } else if (fill !== 'sealed') {
    const what = organiserOf(fill)?.words ?? (fill === 'mesh' ? '3D tiles of your own' : 'a pattern');
    r.fail(
      'wall',
      `A double wall’s skins are too thin for ${what} across the wall: choose a sealed fill, or give single ` +
        'pieces a pattern of their own; those are printed solid.',
    );
  }
  return wall;
}

// The sash stop (sash-stop, #118): it lies in the track beside the edge the sash presses on.
function readStop(r: FormReader, edges: EdgeParams): StopParams {
  const lengthMm = r.sizeOrZero('sashStopMm');
  if (!(lengthMm > 0)) return DEFAULT_STOP;
  if (stopTrack(edges) === undefined) {
    r.fail('sashStopMm', 'A sash stop lies in the track the sash runs in: put the edges beside the sash in a track.');
  } else if (lengthMm < STOP_LEAST_MM - 1e-9) {
    r.fail('sashStopMm', `Make it at least ${mm(STOP_LEAST_MM)} mm, or 0 for none.`);
  }
  return { lengthMm };
}

// The filler between the sashes (meeting-rail, #116), read after the seal, whose grooves it takes:
// it needs a sash edge, along which the sashes overlap, and room for the seal on both faces.
function readRail(r: FormReader, edges: EdgeParams, seal: SealParams): RailParams {
  const gapMm = r.sizeOrZero('railGapMm');
  if (!(gapMm > 0)) return DEFAULT_RAIL;
  if (railEdge(edges) === undefined) {
    r.fail('railGapMm', 'No edge is pressed by a sash: a filler goes where two sashes overlap.');
    return DEFAULT_RAIL;
  }
  const least = railLeastGapMm(seal);
  if (gapMm < least - 1e-9) {
    const filler = seal.kind === 'none' ? 'a filler to slide in' : 'a filler with the seal on both faces';
    r.fail('railGapMm', `At least ${mm(least)} mm, for ${filler}; a narrower gap takes foam tape on one sash.`);
  }
  return { gapMm };
}

// The seal (seal-tape, #15). The tape's fields are read only with a seal, as a custom printer's
// size is; with no seal a value that is not filled in keeps its starting value (Q122). Printed
// TPU (seal-tpu, #22) reads them too, as its gaskets take the tape's size (C35).

const sealForm = (p: Params): FormValues => ({
  seal: p.seal.kind,
  tapeWidthMm: String(p.seal.tape.widthMm),
  tapeThicknessMm: String(p.seal.tape.thicknessMm),
  tapeGrooveMm: String(p.seal.tape.grooveMm),
  tapeSqueezePct: String(p.seal.tape.squeezePct),
  tapeSides: yesNo(p.seal.tape.sides),
  tapePort: yesNo(p.seal.tape.port),
  tpuJoints: yesNo(p.seal.tape.joints),
});

interface SealRead {
  seal: SealParams;
  fit: TapeFit | undefined; // what the seal takes up, with any seal
  sideTape: boolean; // a seal on the edge strips' sides, its sizes all sound
}

function readSeal(r: FormReader): SealRead {
  const kind = r.oneOf('seal', SEALS);
  const used = kind !== 'none';
  const tape = {
    widthMm: r.numberIfUsed('tapeWidthMm', used, DEFAULT_TAPE.widthMm, positive, SIZE_MESSAGE),
    thicknessMm: r.numberIfUsed('tapeThicknessMm', used, DEFAULT_TAPE.thicknessMm, positive, SIZE_MESSAGE),
    grooveMm: r.numberIfUsed('tapeGrooveMm', used, DEFAULT_TAPE.grooveMm, (n) => n >= 0, SIZE_OR_ZERO_MESSAGE),
    squeezePct: r.numberIfUsed(
      'tapeSqueezePct',
      used,
      DEFAULT_TAPE.squeezePct,
      (n) => n > 0 && n <= 100,
      'Enter a percentage greater than 0, up to 100.',
    ),
    sides: r.oneOfIfUsed('tapeSides', used, YES_NO, 'no') === 'yes',
    port: r.oneOfIfUsed('tapePort', used, YES_NO, 'no') === 'yes',
    joints: r.oneOfIfUsed('tpuJoints', used, YES_NO, 'no') === 'yes',
  };
  const seal: SealParams = { kind, tape };
  // Foam tape does not fit a joint (Q128): the joints in TPU are for the TPU seal (C38).
  if (kind === 'tape' && tape.joints) {
    r.fail('tpuJoints', 'Tape does not fit a joint: choose printed TPU for the joints.');
  }
  const fit = tapeFit(seal);
  const sideTape = fit !== undefined && fit.sides && Object.values(tape).every((v) => !Number.isNaN(v));
  if (fit !== undefined && Number.isFinite(fit.standOutMm) && fit.standOutMm <= 1e-9) {
    r.fail(
      'tapeSqueezePct',
      `Squeezed to ${mm((tape.thicknessMm * tape.squeezePct) / 100)} mm, the tape would sit inside its ` +
        `${mm(fit.grooveDepthMm)} mm groove; squeeze it less or make the groove shallower.`,
    );
  }
  return { seal, fit, sideTape };
}

// Puzzle dovetails (#29), sliding rails (#30) and bolted flanges (#31) are printed on the pieces, and
// have no strips: none in TPU, and no coupon for their grip.
const JOINT_NAMES = { dovetails: 'Puzzle dovetails', rails: 'Sliding rails', bolts: 'Bolted flanges' } as const;

function checkJoinery(r: FormReader, joint: JointParams, sheet: SheetParams, seal: SealParams, coupon: boolean) {
  if (joint.style === 'strips') return;
  const name = JOINT_NAMES[joint.style];
  if (sheet.source === 'sheet') r.fail('jointStyle', `${name} are printed: print the pieces, or choose the H-strips.`);
  if (seal.kind === 'tpu' && seal.tape.joints) r.fail('tpuJoints', `${name} have no strips to print in TPU.`);
  if (coupon) r.fail('coupon', `The coupon tries the strips’ grip; ${name.toLowerCase()} have no strips.`);
}

// An edge strip keeps walls as thick as the joint's flanges either side of its slot; a seal on
// its sides takes the clearance's place, its groove cut into those walls (Q127).
function checkTrackWidth(r: FormReader, thicknessMm: number, joint: JointParams, edges: EdgeParams, s: SealRead) {
  const { track, roles } = edges;
  const anyTrack = EDGES.some((e) => roles[e] === 'track');
  const sideRoom = s.sideTape && s.fit !== undefined ? s.fit.standOutMm + s.fit.grooveDepthMm : track.clearanceMm;
  const narrowest = thicknessMm + 2 * joint.fitMm + 2 * joint.flangeMm + (anyTrack ? 2 * sideRoom : 0);
  if (Number.isFinite(narrowest) && track.widthMm < narrowest - 1e-9) {
    r.fail('trackWidthMm', `Make it at least ${mm(narrowest)} mm: an edge strip needs walls as thick as the flanges.`);
  }
}

// A piece must be wider than the joint beside it, or no layout exists.
function checkPieceSize(r: FormReader, printer: PrinterChoice, bedMarginMm: number, joint: JointParams) {
  // Puzzle dovetails (#29) take no width between pieces, but their tabs take room on the bed.
  const jointMm = joint.style === 'dovetails' ? DOVETAIL.depthMm : jointWidthMm(joint);
  if (printer.kind === 'custom' && Number.isFinite(jointMm)) {
    for (const [field, value] of [
      ['customWidthMm', printer.widthMm],
      ['customHeightMm', printer.heightMm],
    ] as const) {
      if (value <= jointMm) r.fail(field, `Make it more than a joint’s ${mm(jointMm)} mm.`);
    }
  } else if (printer.kind === 'model' && Number.isFinite(jointMm) && r.errors.printerModel === undefined) {
    const max = maxPieceSize(printer, bedMarginMm);
    const smallest = Math.min(max.widthMm, max.heightMm);
    if (Number.isFinite(smallest) && smallest <= jointMm) {
      r.fail(
        'bedMarginMm',
        `Leaves pieces of ${mm(smallest)} mm on this printer, no more than a joint’s ${mm(jointMm)} mm; make it smaller.`,
      );
    }
  } else if (printer.kind === 'default') {
    const smallest = Math.min(DEFAULT_MAX_PIECE.widthMm, DEFAULT_MAX_PIECE.heightMm);
    if (jointMm >= smallest) {
      r.fail('webMm', `Make the web and the slide together less than the ${mm(smallest)} mm piece size.`);
    }
  }
}

// The seal's groove in the edge strips, and a TPU gasket's fins.
function checkSealFits(r: FormReader, edges: EdgeParams, s: SealRead) {
  const { fit, sideTape } = s;
  const { tape } = s.seal;
  const { track, roles } = edges;
  if (fit !== undefined && r.errors.tapeSqueezePct === undefined && Number.isFinite(fit.grooveWidthMm)) {
    // The tape on the sides needs a track at least as deep as it is wide (Q127).
    const shallow = sideTape ? EDGES.find((e) => roles[e] === 'track' && track.depthMm[e] < tape.widthMm) : undefined;
    if (shallow !== undefined) {
      r.fail(
        'tapeSides',
        `The ${shallow} track is ${mm(track.depthMm[shallow])} mm deep, less than the ${mm(tape.widthMm)} mm tape ` +
          'is wide, so the tape cannot go on the edge strips’ sides.',
      );
    }
    // Its groove on the outer face leaves the strip walls of at least 0.8 mm (Q131).
    const widths = EDGES.map((e) =>
      roles[e] !== 'track' ? track.widthMm : track.widthMm - 2 * (sideTape ? fit.standOutMm : track.clearanceMm),
    );
    const walls = (Math.min(...widths) - fit.grooveWidthMm) / 2;
    if (walls < TAPE_GROOVE_WALL_MM - 1e-9) {
      r.fail(
        'tapeWidthMm',
        `Leaves walls of ${hundredth(Math.max(0, walls))} mm beside the tape’s groove in the edge strips, under the ` +
          `${mm(TAPE_GROOVE_WALL_MM)} mm they need; choose a narrower tape.`,
      );
    }
  }
  // A TPU gasket's two fins stand on its base, up to the tape's thickness (C32).
  if (s.seal.kind === 'tpu' && fit !== undefined) {
    const base = gasketBaseMm(fit);
    if (tape.thicknessMm <= base + 1e-9) {
      r.fail(
        'tapeThicknessMm',
        `Make it more than ${mm(base)} mm: the gasket’s fins stand on its ${mm(base)} mm base.`,
      );
    }
    if (fit.grooveWidthMm <= 2 * TPU_FIN_MM + 1e-9 && r.errors.tapeWidthMm === undefined) {
      r.fail(
        'tapeWidthMm',
        `Make it more than ${mm(2 * TPU_FIN_MM - TAPE_GROOVE_PLAY_MM)} mm: the gasket’s base holds two ` +
          `${mm(TPU_FIN_MM)} mm fins.`,
      );
    }
    // The fins lean in over the base, so they must not meet at the top (tpu-fin-seals, #115).
    const across = gasketFinsAcrossMm(tape.thicknessMm);
    if (fit.grooveWidthMm < across - 1e-9 && r.errors.tapeWidthMm === undefined && base < tape.thicknessMm) {
      r.fail(
        'tapeWidthMm',
        `Make it at least ${Math.ceil((across - TAPE_GROOVE_PLAY_MM) * 10) / 10} mm: the gasket’s fins, leaning in, ` +
          'would cross.',
      );
    }
  }
}

// The hose ports and their collar (hose-port, #12; Q107): the clearance may be zero, as the
// joint's fit may. The ports are placed once everything else is sound (placePorts).

const portsForm = (p: Params): FormValues => ({
  ports: formatPorts(p.ports),
  collarDepthMm: String(p.collar.depthMm),
  collarWallMm: String(p.collar.wallMm),
  collarClearanceMm: String(p.collar.clearanceMm),
  collarLipMm: String(p.collar.lipMm),
  portLock: p.socket.lock,
  portCap: yesNo(p.socket.cap),
  portScreen: yesNo(p.socket.screen),
});

function readPorts(
  r: FormReader,
  fit: TapeFit | undefined,
): { collar: CollarParams; socket: SocketParams; given: PortSetting[] } {
  const collar: CollarParams = {
    depthMm: r.size('collarDepthMm'),
    wallMm: r.size('collarWallMm'),
    clearanceMm: r.sizeOrZero('collarClearanceMm'),
    lipMm: r.size('collarLipMm'),
  };
  const parsed = parsePorts(r.values.ports ?? '');
  if (!parsed.ok) r.fail('ports', parsed.message);
  const given = parsed.ok ? parsed.ports : [];
  // Tape inside the collar needs a collar as deep as its groove is wide (Q129).
  if (fit?.port === true && given.length > 0 && collar.depthMm < fit.grooveWidthMm - 1e-9) {
    r.fail(
      'collarDepthMm',
      `Make it at least ${mm(fit.grooveWidthMm)} mm, so the tape’s groove fits inside the collar.`,
    );
  }
  const socket: SocketParams = {
    lock: r.oneOf('portLock', PORT_LOCKS),
    cap: r.oneOf('portCap', YES_NO) === 'yes',
    screen: r.oneOf('portScreen', YES_NO) === 'yes',
  };
  return { collar, socket, given };
}

// The measured cutouts and their rim (measured-cutout, #23; C42): the clearance may be zero, as
// the collar's may. With a seal, the rim is lined, and needs to be as deep as the seal's groove
// is wide (C43, as Q129).

const cutoutsForm = (p: Params): FormValues => ({
  cutouts: formatCutouts(p.cutouts),
  rimDepthMm: String(p.rim.depthMm),
  rimWallMm: String(p.rim.wallMm),
  rimClearanceMm: String(p.rim.clearanceMm),
});

function readCutouts(r: FormReader, fit: TapeFit | undefined): { rim: RimParams; given: CutoutSetting[] } {
  const rim: RimParams = {
    depthMm: r.size('rimDepthMm'),
    wallMm: r.size('rimWallMm'),
    clearanceMm: r.sizeOrZero('rimClearanceMm'),
  };
  const parsed = parseCutouts(r.values.cutouts ?? '');
  if (!parsed.ok) r.fail('cutouts', parsed.message);
  const given = parsed.ok ? parsed.cutouts : [];
  if (fit !== undefined && given.length > 0 && rim.depthMm < fit.grooveWidthMm - 1e-9) {
    r.fail('rimDepthMm', `Make it at least ${mm(fit.grooveWidthMm)} mm, so the seal’s groove fits inside the rim.`);
  }
  return { rim, given };
}

// The fans (fan-mount, #28): sizes from the list, placed after the ports and the cutouts.

const fansForm = (p: Params): FormValues => ({ fans: formatFans(p.fans) });

function readFans(r: FormReader): FanSetting[] {
  const parsed = parseFans(r.values.fans ?? '');
  if (!parsed.ok) r.fail('fans', parsed.message);
  return parsed.ok ? parsed.fans : [];
}

// The clamps (clamps, #32): appliances measured roughly, placed after the fans, and their jaws'
// travel and depth, read whether or not there are any, as the rim's are.

const clampsForm = (p: Params): FormValues => ({
  clamps: formatClamps(p.clamps),
  clampTravelMm: String(p.clamp.travelMm),
  clampDepthMm: String(p.clamp.depthMm),
});

function readClamps(r: FormReader): { clamp: ClampParams; given: ClampSetting[] } {
  const clamp: ClampParams = { travelMm: r.size('clampTravelMm'), depthMm: r.size('clampDepthMm') };
  const parsed = parseClamps(r.values.clamps ?? '');
  if (!parsed.ok) r.fail('clamps', parsed.message);
  return { clamp, given: parsed.ok ? parsed.clamps : [] };
}

// The sliding inserts (sliding-insert, #38): placed after the clamps; their shutters' travel and
// the clearance above and below, read whether or not there are any.

const insertsForm = (p: Params): FormValues => ({
  inserts: formatInserts(p.inserts),
  insertTravelMm: String(p.insert.travelMm),
  insertClearanceMm: String(p.insert.clearanceMm),
});

function readInserts(r: FormReader): { insert: InsertParams; given: InsertSetting[] } {
  const insert: InsertParams = { travelMm: r.size('insertTravelMm'), clearanceMm: r.sizeOrZero('insertClearanceMm') };
  const parsed = parseInserts(r.values.inserts ?? '');
  if (!parsed.ok) r.fail('inserts', parsed.message);
  return { insert, given: parsed.ok ? parsed.inserts : [] };
}

// The imported model of the appliance (mesh-appliance, #35): its file, the side facing the room
// and its piece, read only when there is a file; placed after the inserts.

const WHOLE_MESSAGE = 'Enter a whole number, 0 or more.';
const isWhole = (n: number) => Number.isInteger(n) && n >= 0;

const modelForm = (p: Params): FormValues => ({
  modelFile: p.model.file,
  modelView: p.model.view,
  modelColumn: String(p.model.column),
  modelRow: String(p.model.row),
});

// A mesh in one piece, the model or a custom piece: its file, the side facing the room and its
// piece, read only when there is a file.
function readOneMesh(
  r: FormReader,
  fields: { file: FieldName; view: FieldName; column: FieldName; row: FieldName },
  name: string,
  startView: ModelSetting['view'],
): { given: ModelSetting; model: ApplianceModel | undefined } {
  const file = r.values[fields.file] ?? '';
  const used = file !== '';
  const view = r.oneOfIfUsed(fields.view, used, MODEL_VIEWS, startView);
  const column = r.numberIfUsed(fields.column, used, 0, isWhole, WHOLE_MESSAGE);
  const row = r.numberIfUsed(fields.row, used, 0, isWhole, WHOLE_MESSAGE);
  if (used && isWhole(column) && isWhole(row) && (column === 0) !== (row === 0)) {
    r.fail(column === 0 ? fields.column : fields.row, `Give the ${name}’s column and row, or 0 for both.`);
  }
  const given = { file, view, column, row };
  if (!used) return { given, model: undefined };
  const read = readApplianceModel(file, view);
  if (!read.ok) r.fail(fields.file, read.message);
  return { given, model: read.ok ? read.model : undefined };
}

const readModel = (r: FormReader) =>
  readOneMesh(
    r,
    { file: 'modelFile', view: 'modelView', column: 'modelColumn', row: 'modelRow' },
    'model',
    NO_MODEL.view,
  );

// A whole piece of your own (mesh-custom-piece, #41): as the model, its top facing the room to
// start with; placed after it.

const customPieceForm = (p: Params): FormValues => ({
  customPieceFile: p.customPiece.file,
  customPieceView: p.customPiece.view,
  customPieceColumn: String(p.customPiece.column),
  customPieceRow: String(p.customPiece.row),
});

const readCustomPiece = (r: FormReader) =>
  readOneMesh(
    r,
    { file: 'customPieceFile', view: 'customPieceView', column: 'customPieceColumn', row: 'customPieceRow' },
    'custom piece',
    NO_CUSTOM_PIECE.view,
  );

// The panel fill (Q141) and each piece's own (#21). A pattern's sizes are read when the wall or
// any piece uses it (C15), as the tape's are read only with a seal.

function fillForm(p: Params): FormValues {
  const values: FormValues = {
    fill: p.fill.kind,
    fillStyle: p.fill.style,
    reliefPct: String(p.fill.reliefPct),
    fillDrawing: p.fill.drawing,
    fillMeshFile: p.fill.mesh.file,
    fillMeshView: p.fill.mesh.view,
    pieceFills: formatPieceFills(p.pieceFills),
  };
  for (const pattern of PATTERNS) {
    const size = sizesOf(p.fill, pattern.kind);
    for (const s of pattern.sizes) values[s.field] = String(size(s.key));
  }
  return values;
}

function readFill(r: FormReader): { fill: FillParams; pieceFills: PieceFill[] } {
  const kind = r.oneOf('fill', FILL_KINDS);
  const parsed = parsePieceFills(r.values.pieceFills ?? '');
  if (!parsed.ok) r.fail('pieceFills', parsed.message);
  const pieceFills = parsed.ok ? parsed.fills : [];
  const used = (pattern: FillKind) => kind === pattern || pieceFills.some((f) => f.kind === pattern);
  const patterned = FILL_KINDS.some((k) => isPatternKind(k) && used(k));
  // The SVG tile's drawing, read as its sizes are: only where it is used (svg-tile, #27).
  const drawing = r.values.fillDrawing ?? '';
  const read = readSvgDrawing(drawing);
  if (!read.ok && used('svg')) r.fail('fillDrawing', read.message);
  // The 3D tile's file and the side facing the room, read only where it is used (mesh-tiles, #40).
  const tiled = used('mesh');
  const mesh = {
    file: r.values.fillMeshFile ?? '',
    view: r.oneOfIfUsed('fillMeshView', tiled, MODEL_VIEWS, NO_MESH_TILE.view),
  };
  if (tiled) {
    const tile = readMeshTile(mesh.file, mesh.view);
    if (!tile.ok) r.fail('fillMeshFile', tile.message);
  }
  const fill: FillParams = {
    kind,
    style: r.oneOfIfUsed('fillStyle', patterned, PATTERN_STYLES, SEALED.style),
    reliefPct: r.numberIfUsed(
      'reliefPct',
      patterned,
      SEALED.reliefPct,
      (n) => n > 0 && n < 100,
      'Enter a percentage greater than 0 and less than 100.',
    ),
    drawing: read.ok ? drawing : SEALED.drawing,
    mesh,
    ...patternSizes((pattern, s) =>
      s.bar
        ? r.numberIfUsed(s.field, used(pattern.kind), s.start, barFits, BAR_MESSAGE)
        : r.numberIfUsed(s.field, used(pattern.kind), s.start, positive, SIZE_MESSAGE),
    ),
  };
  return { fill, pieceFills };
}

// An organiser's accessories fit one board's thickness: where the pieces are thinner the board
// is raised to it, but a piece thicker than the board cannot be thinned to it.
function checkBoards(r: FormReader, thicknessMm: number, kind: FillKind, pieceFills: readonly PieceFill[]) {
  if (!Number.isFinite(thicknessMm)) return;
  const tooThin = (k: FillKind) => {
    const o = organiserOf(k);
    return o !== undefined && o.boardMm < thicknessMm - 1e-9 ? o : undefined;
  };
  const said = (field: 'fill' | 'pieceFills', o: { accessories: string; boardMm: number }) =>
    r.fail(
      field,
      `${o.accessories} fit a board ${mm(o.boardMm)} mm thick: make the pieces at most ${mm(o.boardMm)} mm thick, ` +
        'or choose another fill.',
    );
  const wall = tooThin(kind);
  if (wall !== undefined) said('fill', wall);
  const own = pieceFills.map((f) => tooThin(f.kind)).find((o) => o !== undefined);
  if (own !== undefined) said('pieceFills', own);
}

export function toFormValues(p: Params): FormValues {
  return {
    ...openingForm(p),
    ...printerForm(p),
    ...divisionForm(p),
    ...panelForm(p),
    ...edgesForm(p),
    ...portsForm(p),
    ...sealForm(p),
    ...fillForm(p),
    ...cutoutsForm(p),
    ...fansForm(p),
    ...clampsForm(p),
    ...insertsForm(p),
    ...modelForm(p),
    ...customPieceForm(p),
  };
}

export function readParams(values: FormValues): ReadResult {
  const r = new FormReader(values);
  const opening = readOpening(r);
  const { printer, bedMarginMm } = readPrinter(r);
  const { width, height } = readDivision(r);
  const { thicknessMm, joint, coupon, sheet, material, rain, stiffen } = readPanel(r);
  const edges = readEdges(r);
  const tilt: TiltParams = {
    gapMm: r.numberIfUsed('tiltGapMm', edges.window === 'tilt', EXAMPLE_TILT.gapMm, (n) => n > 0, SIZE_MESSAGE),
  };
  const turn: TurnParams = {
    gapMm: r.numberIfUsed('turnGapMm', edges.window === 'turn', EXAMPLE_TURN.gapMm, (n) => n > 0, SIZE_MESSAGE),
  };
  const sealRead = readSeal(r);
  const { seal, fit } = sealRead;
  const rail = readRail(r, edges, seal);
  if (EDGES.some((e) => edges.roles[e] === 'frame') && seal.kind !== 'tpu') {
    r.fail(
      'seal',
      'An edge pressed into a frame is held by the squeeze of its printed TPU gasket: choose printed TPU as the seal.',
    );
  }
  const stop = readStop(r, edges);
  checkJoinery(r, joint, sheet, seal, coupon);
  checkTrackWidth(r, thicknessMm, joint, edges, sealRead);
  checkPieceSize(r, printer, bedMarginMm, joint);
  checkSealFits(r, edges, sealRead);
  const { collar, socket, given: givenPorts } = readPorts(r, fit);
  const { rim, given: givenCutouts } = readCutouts(r, fit);
  const givenFans = readFans(r);
  const { clamp, given: givenClamps } = readClamps(r);
  const { insert, given: givenInserts } = readInserts(r);
  const { given: givenModel, model: modelRead } = readModel(r);
  const { given: givenCustom, model: customRead } = readCustomPiece(r);
  if (r.ok) {
    // The edge strips must leave the pieces something to cover.
    const span = panelSpan(opening.openingWidthMm, opening.openingHeightMm, edges, joint, fit);
    if (span.widthMm <= 0) r.fail('openingWidthMm', 'Too small for the edge strips.');
    if (span.heightMm <= 0) r.fail('openingHeightMm', 'Too small for the edge strips.');
  }
  const { fill, pieceFills } = readFill(r);
  const wall = readWall(r, thicknessMm, fill.kind);
  const board = organiserOf(fill.kind);
  if (sheet.source === 'sheet' && board !== undefined) {
    r.fail(
      'pieceSource',
      `${capitalised(board.words)} for the whole wall is printed into every piece, so none would be cut: choose ` +
        'a sealed fill, or give single pieces the board.',
    );
  } else if (sheet.source === 'sheet' && fill.kind === 'mesh') {
    r.fail(
      'pieceSource',
      '3D tiles of your own for the whole wall are printed into every piece, so none would be cut: choose a ' +
        'sealed fill, or give single pieces the tiles.',
    );
  } else if (sheet.source === 'sheet' && fill.kind !== 'sealed') {
    r.fail(
      'pieceSource',
      'A pattern for the whole wall is printed into every piece, so none would be cut: choose a sealed fill, or ' +
        'give single pieces a pattern of their own.',
    );
  }
  checkBoards(r, thicknessMm, fill.kind, pieceFills);

  // What is placed in pieces, once everything else is sound: the ports, the cutouts, the fans and
  // the clamps, then each piece's own fill, each against the plan the ones before it allow.
  const base = {
    ...opening,
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
    coupon,
    sheet,
    material,
    socket,
    rail,
    rain,
    stop,
    wall,
    stiffen,
    tilt,
    turn,
  };
  // A tilted or turned sash has a wedge, not a wall: none of a wall's fittings or patterns, its one
  // port in the strip, and its own problems in place of the wall's plan's.
  const form = sashForm(edges.window);
  if (form !== undefined) {
    refuseForWedge(r, form, {
      joint,
      wall,
      pieceSource: sheet.source,
      fill: fill.kind,
      pieceFills: pieceFills.length,
      ports: givenPorts.length,
      cutouts: givenCutouts.length,
      fans: givenFans.length,
      clamps: givenClamps.length,
      inserts: givenInserts.length,
      model: modelRead !== undefined,
      customPiece: customRead !== undefined,
      roles: edges.roles,
    });
    const params: Params = {
      ...base,
      ports: givenPorts.slice(0, 1).map((p) => ({ hoseMm: p.hoseMm, column: 1, row: 1 })),
      pieceFills: [],
      cutouts: [],
      rim,
      fans: [],
      clamps: [],
      clamp,
      inserts: [],
      insert,
      model: NO_MODEL,
      customPiece: NO_CUSTOM_PIECE,
    };
    if (r.ok) {
      const setup = wedgeSetup(params);
      if ('problem' in setup) r.fail(setup.field, setup.problem);
    }
    return r.ok ? { ok: true, params } : { ok: false, errors: r.errors };
  }
  // Fittings and pieces' own patterns are placed against the plan they will be in: with any to
  // place, a printed piece keeps every piece to the printer's size, before they are placed.
  const given = [givenPorts, givenCutouts, givenFans, givenClamps, givenInserts];
  const printedAnyway =
    given.some((g) => g.length > 0) ||
    modelRead !== undefined ||
    customRead !== undefined ||
    pieceFills.some((f) => f.kind !== 'sealed');
  const toPlaceIn = { ...base, sheet: printedAnyway ? { ...sheet, source: 'printed' as const } : sheet };
  const none = {
    ports: [],
    pieceFills: [],
    cutouts: [],
    rim,
    fans: [],
    clamps: [],
    clamp,
    inserts: [],
    insert,
    model: NO_MODEL,
    customPiece: NO_CUSTOM_PIECE,
  };
  const plan = r.ok ? planWall({ ...toPlaceIn, ...none }) : undefined;
  let ports: Required<PortSetting>[] = [];
  if (plan !== undefined && givenPorts.length > 0) {
    const check = (port: PortSetting & InPiece) => portProblem(plan, port, collar, fit, joint, socket);
    const placing = placeFittings(plan, { label: 'Port', plural: 'Ports', given: givenPorts, check });
    if (placing.ok) ports = placing.placed;
    else r.fail('ports', placing.problem);
  }
  let cutouts: Required<CutoutSetting>[] = [];
  if (r.ok && plan !== undefined && givenCutouts.length > 0) {
    const check = (cutout: CutoutSetting & InPiece) => cutoutProblem(plan, cutout, rim, fit, joint);
    const earlier = [{ label: 'Port', placed: ports }];
    const placing = placeFittings(plan, { label: 'Cutout', plural: 'Cutouts', given: givenCutouts, check }, earlier);
    if (placing.ok) cutouts = placing.placed;
    else r.fail('cutouts', placing.problem);
  }
  let fans: Required<FanSetting>[] = [];
  if (r.ok && plan !== undefined && givenFans.length > 0) {
    const check = (fan: FanSetting & InPiece) => fanProblem(plan, fan, joint);
    const earlier = [
      { label: 'Port', placed: ports },
      { label: 'Cutout', placed: cutouts },
    ];
    const placing = placeFittings(plan, { label: 'Fan', plural: 'Fans', given: givenFans, check }, earlier);
    if (placing.ok) fans = placing.placed;
    else r.fail('fans', placing.problem);
  }
  let clamps: Required<ClampSetting>[] = [];
  if (r.ok && plan !== undefined && givenClamps.length > 0) {
    const check = (c: ClampSetting & InPiece) => clampProblem(plan, c, clamp, joint);
    const earlier = [
      { label: 'Port', placed: ports },
      { label: 'Cutout', placed: cutouts },
      { label: 'Fan', placed: fans },
    ];
    const placing = placeFittings(plan, { label: 'Clamp', plural: 'Clamps', given: givenClamps, check }, earlier);
    if (placing.ok) clamps = placing.placed;
    else r.fail('clamps', placing.problem);
  }
  let inserts: Required<InsertSetting>[] = [];
  if (r.ok && plan !== undefined && givenInserts.length > 0) {
    const check = (c: InsertSetting & InPiece) => insertProblem(plan, c, insert, joint);
    const earlier = [
      { label: 'Port', placed: ports },
      { label: 'Cutout', placed: cutouts },
      { label: 'Fan', placed: fans },
      { label: 'Clamp', placed: clamps },
    ];
    const placing = placeFittings(plan, { label: 'Insert', plural: 'Inserts', given: givenInserts, check }, earlier);
    if (placing.ok) inserts = placing.placed;
    else r.fail('inserts', placing.problem);
  }
  let model = givenModel;
  if (r.ok && plan !== undefined && modelRead !== undefined) {
    const earlier = [
      { label: 'Port', placed: ports },
      { label: 'Cutout', placed: cutouts },
      { label: 'Fan', placed: fans },
      { label: 'Clamp', placed: clamps },
      { label: 'Insert', placed: inserts },
    ];
    const placing = placeModel(plan, givenModel, modelRead, rim, joint, earlier);
    if (placing.ok) model = placing.placed;
    else r.fail('modelFile', placing.problem);
  }
  let customPiece = givenCustom;
  if (r.ok && plan !== undefined && customRead !== undefined) {
    const earlier = [
      { label: 'Port', placed: ports },
      { label: 'Cutout', placed: cutouts },
      { label: 'Fan', placed: fans },
      { label: 'Clamp', placed: clamps },
      { label: 'Insert', placed: inserts },
      { label: 'Model', placed: model.file === '' ? [] : [model], alone: true as const },
    ];
    const placing = placeCustomPiece(plan, givenCustom, customRead, patternBorderMm(joint), earlier);
    if (placing.ok) customPiece = placing.placed;
    else r.fail('customPieceFile', placing.problem);
  }
  if (r.ok && pieceFills.length > 0) {
    const fitted = {
      ports,
      pieceFills: [],
      cutouts,
      rim,
      fans,
      clamps,
      clamp,
      inserts,
      insert,
      model,
      customPiece,
    };
    const problem = checkPieceFills(planWall({ ...toPlaceIn, ...fitted }), pieceFills);
    if (problem !== undefined) r.fail('pieceFills', problem);
  }

  if (!r.ok) return { ok: false, errors: r.errors };
  return {
    ok: true,
    params: { ...base, ports, pieceFills, cutouts, rim, fans, clamps, clamp, inserts, insert, model, customPiece },
  };
}

// A piece the wall has, and one fill for each piece.
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
