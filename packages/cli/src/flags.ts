// Every setting on the page as a flag (Q90), named after the page's field. What each setting
// is, where it sits in a --params file and its choices come from the library's SETTINGS, so
// the command and the MCP server describe them alike.
import { PATTERNS, SETTINGS } from 'parametric-window-sealer';
import type { FieldName, PatternField, Setting } from 'parametric-window-sealer';

export { settingAt } from 'parametric-window-sealer';

export interface SettingFlag extends Setting {
  flag: string; // without the leading dashes
}

// A Record over every field but the patterns', so a field the library adds without a flag fails
// the type check. Each pattern declares its own flags (packages/core/src/patterns/); a pattern's
// flag without --fill means that pattern (C11, C16, C21, C25).
type OwnField = Exclude<FieldName, PatternField>;
const FLAG_NAMES: Record<OwnField, string> = {
  openingWidthMm: 'width',
  openingHeightMm: 'height',
  printer: 'printer',
  printerModel: 'printer-model', // makes the printer a listed one (Q115)
  bedMarginMm: 'bed-margin',
  customWidthMm: 'printer-width',
  customHeightMm: 'printer-height',
  widthMode: 'width-mode',
  widthFiller: 'width-filler',
  widthLeftover: 'width-leftover',
  heightMode: 'height-mode',
  heightFiller: 'height-filler',
  heightLeftover: 'height-leftover',
  thicknessMm: 'thickness',
  wall: 'wall', // single, or double for winter (#119)
  pieceSource: 'pieces', // printed, or cut from sheet (#112)
  sheetWidthMm: 'sheet-width', // a sheet size without --pieces means cutting from sheet
  sheetHeightMm: 'sheet-height',
  material: 'material', // petg, asa or pla (#113)
  colour: 'colour',
  sun: 'sun',
  rain: 'rain', // weep holes and drip grooves (#117), yes to start with
  stiffen: 'stiffen', // aluminium angle on printed clips over 500 mm (#111), yes to start with
  jointStyle: 'joint-style', // strips, or puzzle dovetails (#29)
  slotMm: 'slot',
  slideMm: 'slide',
  webMm: 'web',
  flangeMm: 'flange',
  fitMm: 'fit',
  gripMm: 'grip',
  pins: 'pins',
  coupon: 'coupon',
  window: 'window',
  topEdge: 'top-edge',
  bottomEdge: 'bottom-edge',
  leftEdge: 'left-edge',
  rightEdge: 'right-edge',
  trackWidthMm: 'track-width',
  topDepthMm: 'top-depth',
  bottomDepthMm: 'bottom-depth',
  leftDepthMm: 'left-depth',
  rightDepthMm: 'right-depth',
  trackClearanceMm: 'track-clearance',
  railGapMm: 'rail-gap', // the filler between the sashes (#116); 0 for none
  sashStopMm: 'sash-stop', // a strut in the sash's track (#118); 0 for none
  ports: 'port', // repeatable: one --port for each port (Q114)
  collarDepthMm: 'collar-depth',
  collarWallMm: 'collar-wall',
  collarClearanceMm: 'collar-clearance',
  collarLipMm: 'collar-lip',
  portLock: 'port-lock', // push, or twist: a ring on the hose end twists into the collar (#114)
  portCap: 'port-cap',
  portScreen: 'port-screen',
  seal: 'seal', // none, tape (Q122) or tpu (#22)
  tapeWidthMm: 'tape-width', // a tape flag without --seal means tape, as a printer size means custom
  tapeThicknessMm: 'tape-thickness',
  tapeGrooveMm: 'tape-groove',
  tapeSqueezePct: 'tape-squeeze',
  tapeSides: 'tape-sides',
  tapePort: 'tape-port',
  tpuJoints: 'tpu-joints', // without --seal means the TPU seal (C39)
  fill: 'fill', // sealed, a pattern or an organiser board
  fillStyle: 'fill-style',
  reliefPct: 'relief-depth',
  fillDrawing: 'svg-tile', // names a file, whose text is the drawing; without --fill means the tile (#27)
  fillMeshFile: 'mesh-tile', // names a file, read as its bytes; without --fill means the 3D tile (#40)
  fillMeshView: 'mesh-tile-view',
  pieceFills: 'piece-fill', // repeatable: one --piece-fill for each piece (C28)
  cutouts: 'cutout', // repeatable, as --port (C44)
  rimDepthMm: 'rim-depth',
  rimWallMm: 'rim-wall',
  rimClearanceMm: 'rim-clearance',
  fans: 'fan', // repeatable, as --port (#28)
  clamps: 'clamp', // repeatable, as --cutout (#32)
  clampTravelMm: 'clamp-travel',
  clampDepthMm: 'clamp-depth',
  inserts: 'insert', // repeatable, as --cutout (#38)
  insertTravelMm: 'insert-travel',
  insertClearanceMm: 'insert-clearance',
  modelFile: 'model-file', // names a file, read as its bytes (#35)
  modelView: 'model-view',
  modelColumn: 'model-column',
  modelRow: 'model-row',
  customPieceFile: 'custom-piece', // names a file, read as its bytes (#41)
  customPieceView: 'custom-piece-view',
  customPieceColumn: 'custom-piece-column',
  customPieceRow: 'custom-piece-row',
};

const PATTERN_FLAGS = new Map<string, string>(PATTERNS.flatMap((p) => p.sizes.map((s) => [s.field, s.flag])));
const isOwn = (field: FieldName): field is OwnField => !PATTERN_FLAGS.has(field);
const flagName = (field: FieldName): string => (isOwn(field) ? FLAG_NAMES[field] : (PATTERN_FLAGS.get(field) ?? field));

export const SETTING_FLAGS: readonly SettingFlag[] = SETTINGS.map((s) => ({ ...s, flag: flagName(s.field) }));

export const flagFor = (field: FieldName): string => `--${flagName(field)}`;
