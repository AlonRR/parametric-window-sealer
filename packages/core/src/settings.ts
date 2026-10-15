// Every setting on the page, and settings given in the library's own shape, possibly partial:
// a --params file for the command (Q85) or a tool's input for the MCP server (Q99).
//
// Order, as on the page: its starting values, then the input, then any overrides in the
// page's form values (the command's flags). Setting the window type presets the four edges
// (Q66); edges given with it, or after it, change them. A printer size means a custom
// printer, and a tape setting means tape, or the TPU seal when it is its joints in TPU. The opening has no starting value: it is required.
import { EDGES, WINDOW_PRESETS } from './edge.js';
import type { WindowType } from './edge.js';
import { EXAMPLE_PARAMS, readParams, toFormValues } from './params.js';
import { PRINTER_IDS } from './printers.js';
import { FILL_KINDS, PATTERN_STYLES } from './fill.js';
import { PATTERNS } from './patterns/index.js';
import { FANS } from './fan.js';
import { PIECE_SOURCES } from './sheet.js';
import { COLOURS, MATERIAL_KINDS } from './material.js';
import { PORT_LOCKS } from './socket.js';
import type { FieldName, FormValues, Params } from './params.js';

export interface Setting {
  field: FieldName; // the page's field
  path: string; // where it sits in the library's shape, as `edges.track.widthMm`
  help: string; // in the page's words
  values?: readonly string[]; // a choice; otherwise a length in mm, unless a list, on or off, or text
  list?: ListKind; // a list in the shape, written in the form as the command's --port takes it
  onOff?: true; // true or false in the shape, written yes or no in the form
  text?: true; // text in the shape and in the form, as an SVG file's
}

const DIVISION = ['equal', 'full-plus-filler'] as const;
const FILLER = ['start', 'end', 'middle', 'split'] as const;
const LEFTOVER = ['spread', 'equal', 'shorten'] as const;
const ROLE = ['track', 'sash', 'sill', 'unit', 'frame'] as const;
const YES_NO = ['no', 'yes'] as const;

// The settings that are lists, and the shape of each item: what each field holds.
export type ListKind = 'ports' | 'pieceFills' | 'cutouts' | 'fans' | 'clamps' | 'inserts';
export const LIST_ITEMS: Record<ListKind, Record<string, 'number' | 'text'>> = {
  ports: { hoseMm: 'number', column: 'number', row: 'number' },
  pieceFills: { column: 'number', row: 'number', kind: 'text', style: 'text' },
  cutouts: { widthMm: 'number', heightMm: 'number', column: 'number', row: 'number' },
  fans: { sizeMm: 'number', column: 'number', row: 'number' },
  clamps: { widthMm: 'number', heightMm: 'number', column: 'number', row: 'number' },
  inserts: { widthMm: 'number', heightMm: 'number', column: 'number', row: 'number' },
};

const axis = (name: 'width' | 'height'): Setting[] => [
  {
    field: `${name}Mode`,
    path: `${name}.mode`,
    help: `Dividing the ${name}: equal pieces, or full pieces plus one filler.`,
    values: DIVISION,
  },
  {
    field: `${name}Filler`,
    path: `${name}.filler`,
    help: `With full-plus-filler: where the ${name}'s filler goes.`,
    values: FILLER,
  },
  {
    field: `${name}Leftover`,
    path: `${name}.leftover`,
    help: `When full pieces leave too little for a joint: what to do instead.`,
    values: LEFTOVER,
  },
];

// Each pattern's sizes, as the pattern declares them (patterns/).
const patternSettings = (): Setting[] =>
  PATTERNS.flatMap((p) => p.sizes.map((s) => ({ field: s.field, path: `fill.${p.kind}.${s.key}`, help: s.help })));

const edge = (name: 'top' | 'bottom' | 'left' | 'right'): Setting => ({
  field: `${name}Edge`,
  path: `edges.roles.${name}`,
  help:
    `The ${name} edge: in a track, pressed by the sash, on a flat sill, against a window AC (unit), or pressed ` +
    'into a frame with no track, held by its TPU gasket.',
  values: ROLE,
});

const depth = (name: 'top' | 'bottom' | 'left' | 'right'): Setting => ({
  field: `${name}DepthMm`,
  path: `edges.track.depthMm.${name}`,
  help: `How deep the ${name} track is; used when that edge is in a track.`,
});

export const SETTINGS: readonly Setting[] = [
  { field: 'openingWidthMm', path: 'openingWidthMm', help: 'The opening you can see: its width. Required.' },
  { field: 'openingHeightMm', path: 'openingHeightMm', help: 'The opening you can see: its height. Required.' },
  {
    field: 'printer',
    path: 'printer.kind',
    help: 'The largest piece to print: default (200 × 200 mm), custom, or a listed printer (model).',
    values: ['default', 'custom', 'model'],
  },
  {
    field: 'printerModel',
    path: 'printer.id',
    help: 'Your printer, from the list: its bed less the bed margin is the largest piece. Makes the printer a listed one.',
    values: PRINTER_IDS,
  },
  {
    field: 'bedMarginMm',
    path: 'bedMarginMm',
    help: "How much smaller than a listed printer's bed the largest piece is, each way.",
  },
  { field: 'customWidthMm', path: 'printer.widthMm', help: "A custom printer's largest piece: its width." },
  { field: 'customHeightMm', path: 'printer.heightMm', help: "A custom printer's largest piece: its height." },
  ...axis('width'),
  ...axis('height'),
  { field: 'thicknessMm', path: 'thicknessMm', help: 'Panel thickness; with pieces cut from sheet, the sheet’s.' },
  {
    field: 'wall',
    path: 'wall',
    help:
      'single, or double for winter: each plain printed piece hollow, two skins round an air gap, inside the ' +
      'panel thickness.',
    values: ['single', 'double'],
  },
  {
    field: 'pieceSource',
    path: 'sheet.source',
    help: 'The pieces printed, or cut from sheet: those with a fitting or a pattern of their own are still printed.',
    values: PIECE_SOURCES,
  },
  { field: 'sheetWidthMm', path: 'sheet.widthMm', help: 'The sheet’s width: the widest piece cut from it.' },
  { field: 'sheetHeightMm', path: 'sheet.heightMm', help: 'The sheet’s height: the tallest piece cut from it.' },
  {
    field: 'material',
    path: 'material.kind',
    help: 'What the parts are printed in: PETG, ASA, or PLA for test fits; the plan warns where it gets too hot.',
    values: MATERIAL_KINDS,
  },
  {
    field: 'colour',
    path: 'material.colour',
    help: 'Its colour: light, or dark, which the sun heats more.',
    values: COLOURS,
  },
  {
    field: 'sun',
    path: 'material.sun',
    help: "The wall's outside face gets direct sun: yes or no.",
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'rain',
    path: 'rain',
    help:
      "Rain on the wall's outside: weep holes in one flange of every strip and edge strip, and a groove under " +
      'each edge strip with no seal, to let water out: yes or no.',
    values: YES_NO,
    onOff: true,
  },
  { field: 'slotMm', path: 'joint.slotMm', help: 'How deep a piece can go into a strip.' },
  { field: 'slideMm', path: 'joint.slideMm', help: 'How far a piece can move in its slot.' },
  { field: 'webMm', path: 'joint.webMm', help: "The wall between the strip's two slots." },
  { field: 'flangeMm', path: 'joint.flangeMm', help: 'Each face of the strip, over the panel.' },
  { field: 'fitMm', path: 'joint.fitMm', help: 'Clearance between each panel face and the strip.' },
  {
    field: 'gripMm',
    path: 'joint.gripMm',
    help: "How far the ribs inside the strip's flanges reach past each panel face, to be squeezed; 0 for none.",
  },
  {
    field: 'pins',
    path: 'joint.pins',
    help: "A pin of 1.75 mm filament through each strip's middle, so a piece cannot pull out: yes or no.",
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'coupon',
    path: 'coupon',
    help: 'A test coupon in the download too, five short strips that try the grip: yes or no.',
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'window',
    path: 'edges.window',
    help:
      'Window type: a slider, a hung window, or a frame with no track (a casement screen opening, a tilt-and-turn ' +
      'frame); sets the four edges as the page does.',
    values: ['slider', 'hung', 'frame'],
  },
  edge('top'),
  edge('bottom'),
  edge('left'),
  edge('right'),
  { field: 'trackWidthMm', path: 'edges.track.widthMm', help: 'Track width; every edge strip is this wide.' },
  depth('top'),
  depth('bottom'),
  depth('left'),
  depth('right'),
  { field: 'trackClearanceMm', path: 'edges.track.clearanceMm', help: 'Clearance in the track, per side.' },
  {
    field: 'railGapMm',
    path: 'rail.gapMm',
    help:
      'The gap between the two sashes where they overlap, front to back, for a filler printed to fit it, with the ' +
      'seal on both faces; 0 for none.',
  },
  {
    field: 'sashStopMm',
    path: 'stop.lengthMm',
    help:
      "A sash stop: the gap in the sash's track from its edge to the frame, for a printed strut that stops the " +
      'sash opening further and lifts out by hand from inside; 0 for none.',
  },
  {
    field: 'ports',
    path: 'ports',
    help:
      "Hose ports: none for a plain wall, or for each port the hose end's outside diameter in mm (150 and 130 " +
      'are common; measure the end that goes in) and its piece, by column and row from 1 at the bottom left ' +
      "seen from the room. Without a piece, the first goes in the bottom row's middle piece.",
    list: 'ports',
  },
  { field: 'collarDepthMm', path: 'collar.depthMm', help: "How far the hose end goes into the port's collar." },
  { field: 'collarWallMm', path: 'collar.wallMm', help: "The collar's wall." },
  {
    field: 'collarClearanceMm',
    path: 'collar.clearanceMm',
    help: 'Clearance per side between the hose end and the collar.',
  },
  { field: 'collarLipMm', path: 'collar.lipMm', help: 'The lip the hose end stops against, inside the collar.' },
  {
    field: 'portLock',
    path: 'socket.lock',
    help: 'How a hose port holds the hose: pushed in, or by a printed ring that clamps on it and twists in.',
    values: PORT_LOCKS,
  },
  {
    field: 'portCap',
    path: 'socket.cap',
    help: 'A cap for each hose port, to close it while the AC is off: yes or no.',
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'portScreen',
    path: 'socket.screen',
    help: "Bars across each hose port's hole: yes or no.",
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'seal',
    path: 'seal.kind',
    help: "The seal: none, foam tape along the edge strips' outer faces, or gaskets printed in TPU in its place.",
    values: ['none', 'tape', 'tpu'],
  },
  {
    field: 'tapeWidthMm',
    path: 'seal.tape.widthMm',
    help: 'The foam tape: its width. Listed sizes: 9 × 4, 9.5 × 4.8, 9 × 6 and 9.5 × 6.4 mm.',
  },
  { field: 'tapeThicknessMm', path: 'seal.tape.thicknessMm', help: 'The foam tape: its thickness.' },
  { field: 'tapeGrooveMm', path: 'seal.tape.grooveMm', help: "How deep the tape's groove is; 0 for a flat face." },
  {
    field: 'tapeSqueezePct',
    path: 'seal.tape.squeezePct',
    help: 'How far the tape is squeezed when the wall is in, as a percentage of its thickness.',
  },
  {
    field: 'tapeSides',
    path: 'seal.tape.sides',
    help: 'Tape on the sides of the edge strips in a track too: yes or no.',
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'tapePort',
    path: 'seal.tape.port',
    help: "Tape inside each hose port's collar too: yes or no.",
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'tpuJoints',
    path: 'seal.tape.joints',
    help: 'With printed TPU, the joint strips and cross pieces in TPU too: yes or no.',
    values: YES_NO,
    onOff: true,
  },
  {
    field: 'fill',
    path: 'fill.kind',
    help: `The panel fill: sealed, or a pattern: ${PATTERNS.map((p) => p.words)
      .join(', ')
      .replace(/, ([^,]*)$/, ' or $1')}.`,
    values: FILL_KINDS,
  },
  {
    field: 'fillStyle',
    path: 'fill.style',
    help: "A pattern's style: relief, cut into the room side, or cut through, letting air through.",
    values: PATTERN_STYLES,
  },
  { field: 'reliefPct', path: 'fill.reliefPct', help: "A relief's depth, as a percentage of the panel's thickness." },
  ...patternSettings(),
  {
    field: 'fillDrawing',
    path: 'fill.drawing',
    help:
      "The SVG tile's drawing: the text of an SVG file, its viewBox one cell of the pattern and its filled " +
      'shapes the openings. Starts as one round opening in a square cell.',
    text: true,
  },
  {
    field: 'pieceFills',
    path: 'pieceFills',
    help:
      'Pieces with a fill of their own: for each, its column and row from 1 at the bottom left seen from the room, ' +
      'its fill (sealed or a pattern) and optionally its style; the sizes are the wall’s.',
    list: 'pieceFills',
  },
  {
    field: 'cutouts',
    path: 'cutouts',
    help:
      "Measured cutouts: for each, the appliance's outside width and height in mm, seen from the room, and its " +
      "piece, by column and row from 1 at the bottom left. Without a piece, the bottom row's middle piece. A rim " +
      'stands round it on the room side, lined with the seal if there is one.',
    list: 'cutouts',
  },
  { field: 'rimDepthMm', path: 'rim.depthMm', help: "How far a cutout's rim stands out on the room side." },
  { field: 'rimWallMm', path: 'rim.wallMm', help: "The cutout's rim's wall." },
  { field: 'rimClearanceMm', path: 'rim.clearanceMm', help: 'Clearance per side between the appliance and the rim.' },
  {
    field: 'fans',
    path: 'fans',
    help:
      `Exhaust fans: for each, its size in mm (${FANS.map((f) => f.sizeMm).join(', ')}) and its piece, by column ` +
      "and row from 1 at the bottom left. Without a piece, the bottom row's middle piece. The fan is screwed to " +
      'the piece over an opening.',
    list: 'fans',
  },
  {
    field: 'clamps',
    path: 'clamps',
    help:
      "Appliances held by clamps: for each, the appliance's outside width and height in mm, measured roughly, " +
      "and its piece, by column and row from 1 at the bottom left. Without a piece, the bottom row's middle " +
      'piece. Four printed jaws on M4 bolts grip it, give or take their travel.',
    list: 'clamps',
  },
  { field: 'clampTravelMm', path: 'clamp.travelMm', help: "How far each clamp's jaw slides: the give or take." },
  { field: 'clampDepthMm', path: 'clamp.depthMm', help: "How far a clamp jaw's lip stands out on the room side." },
  {
    field: 'inserts',
    path: 'inserts',
    help:
      "Appliances in a sliding insert: for each, the appliance's outside width and height in mm and its piece, " +
      "by column and row from 1 at the bottom left. Without a piece, the bottom row's middle piece. Two printed " +
      'shutters slide in rails to close round it from each side, each locked by an M4 bolt.',
    list: 'inserts',
  },
  {
    field: 'insertTravelMm',
    path: 'insert.travelMm',
    help: "How far each insert's shutter slides: the give or take in width.",
  },
  {
    field: 'insertClearanceMm',
    path: 'insert.clearanceMm',
    help: 'Clearance above and below the appliance in an insert.',
  },
];

// The value at a dotted path, such as `edges.track.widthMm`; undefined if it is not there.
export function settingAt(value: unknown, path: string): unknown {
  let at: unknown = value;
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null) return undefined;
    const next: unknown = Reflect.get(at, key);
    at = next;
  }
  return at;
}

export interface SettingProblem {
  kind: 'shape' | 'required' | 'value'; // not the library's shape; the opening missing; refused by the page
  field?: FieldName;
  path: string; // '' for the whole input
  message: string;
}

export type SettingsResult = { ok: true; params: Params } | { ok: false; problems: SettingProblem[] };

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The shape an input may have: the library's own, with a custom printer's two sizes, and each
// list's items as LIST_ITEMS says.
const SHAPE: Json = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 0, heightMm: 0, id: '' } };
const itemShape = (kind: ListKind): Json =>
  Object.fromEntries(Object.entries(LIST_ITEMS[kind]).map(([key, type]) => [key, type === 'number' ? 0 : '']));

function checkShape(value: unknown, shape: unknown, path: string, problems: SettingProblem[]): void {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) {
      problems.push({ kind: 'shape', path, message: `${path} should be a list` });
      return;
    }
    const kind = SETTINGS.find((s) => s.path === path)?.list;
    if (kind === undefined) throw new Error(`No list setting at ${path}`);
    for (const [i, item] of value.entries()) {
      const at = `${path}.${i}`;
      checkShape(item, itemShape(kind), at, problems);
      if (kind !== 'pieceFills' && isObject(item) && 'column' in item !== 'row' in item) {
        problems.push({ kind: 'shape', path: at, message: `${at} needs both column and row, or neither` });
      }
    }
  } else if (isObject(shape)) {
    if (!isObject(value)) {
      const message = path === '' ? 'should be one JSON object' : `${path} should be an object`;
      problems.push({ kind: 'shape', path, message });
      return;
    }
    for (const [key, inner] of Object.entries(value)) {
      const at = path === '' ? key : `${path}.${key}`;
      if (!Object.hasOwn(shape, key)) problems.push({ kind: 'shape', path: at, message: `${at} is not a setting` });
      else checkShape(inner, shape[key], at, problems);
    }
  } else if (typeof value !== typeof shape) {
    const kind = typeof shape === 'number' ? 'a number' : typeof shape === 'boolean' ? 'true or false' : 'text';
    problems.push({ kind: 'shape', path, message: `${path} should be ${kind}` });
  }
}

function merge(base: unknown, over: unknown): unknown {
  if (!isObject(base) || !isObject(over)) return over;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(over)) out[key] = merge(base[key], value);
  return out;
}

const isWindow = (value: unknown): value is WindowType =>
  typeof value === 'string' && Object.hasOwn(WINDOW_PRESETS, value);

const OPENING: { field: FieldName; what: string }[] = [
  { field: 'openingWidthMm', what: 'width' },
  { field: 'openingHeightMm', what: 'height' },
];

export function readSettings(input: unknown, overrides: FormValues = {}): SettingsResult {
  const shape: SettingProblem[] = [];
  checkShape(input, SHAPE, '', shape);
  if (shape.length > 0 || !isObject(input)) return { ok: false, problems: shape };

  // merge copies every object the input touches, so neither the input nor EXAMPLE_PARAMS changes.
  // checkShape has held every key and value in the input to EXAMPLE_PARAMS' own, so the result
  // has its shape; readParams then checks every value as the page does.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the shape is checked above
  const params = merge(EXAMPLE_PARAMS, input) as Params;
  const window = settingAt(input, 'edges.window');
  if (isWindow(window)) {
    const roles = settingAt(input, 'edges.roles');
    params.edges.roles = { ...WINDOW_PRESETS[window], ...(isObject(roles) ? roles : {}) };
  }
  // A printer size without a kind means a custom printer; a printer id, a listed one.
  const printer = input['printer'];
  // A size or id missing reads as not a number or as no printer, and the page's checks say so.
  const given = (key: string) => (isObject(printer) ? printer[key] : undefined);
  const size = (key: string) => {
    const v = given(key);
    return typeof v === 'number' ? v : Number.NaN;
  };
  if (isObject(printer) && !('kind' in printer) && ('widthMm' in printer || 'heightMm' in printer)) {
    params.printer = { kind: 'custom', widthMm: size('widthMm'), heightMm: size('heightMm') };
  }
  if (isObject(printer) && !('kind' in printer) && 'id' in printer) {
    const id = given('id');
    params.printer = { kind: 'model', id: typeof id === 'string' ? id : '' };
  }
  // A sheet's size without a source means cutting the pieces from it.
  const sheet = input['sheet'];
  if (isObject(sheet) && !('source' in sheet) && ('widthMm' in sheet || 'heightMm' in sheet)) {
    params.sheet = { ...params.sheet, source: 'sheet' };
  }
  const seal = input['seal'];
  if (isObject(seal) && !('kind' in seal) && 'tape' in seal) {
    // Joints in TPU mean the TPU seal (C39); any other tape setting, tape.
    const tape = seal['tape'];
    params.seal = { ...params.seal, kind: isObject(tape) && tape['joints'] === true ? 'tpu' : 'tape' };
  }
  // A pattern's sizes without a kind mean that pattern (C11, C16, C21, C25), and a drawing the
  // SVG tile.
  const fill = input['fill'];
  for (const p of PATTERNS) {
    if (isObject(fill) && !('kind' in fill) && p.kind in fill) params.fill = { ...params.fill, kind: p.kind };
  }
  if (isObject(fill) && !('kind' in fill) && 'drawing' in fill) params.fill = { ...params.fill, kind: 'svg' };

  const values: FormValues = toFormValues(params);
  const presetWindow = overrides.window;
  if (isWindow(presetWindow)) {
    for (const side of EDGES) values[`${side}Edge` as const] = WINDOW_PRESETS[presetWindow][side];
  }
  if (overrides.printer === undefined && (overrides.customWidthMm ?? overrides.customHeightMm) !== undefined) {
    values.printer = 'custom';
  }
  if (overrides.printer === undefined && overrides.printerModel !== undefined) values.printer = 'model';
  if (overrides.pieceSource === undefined && (overrides.sheetWidthMm ?? overrides.sheetHeightMm) !== undefined) {
    values.pieceSource = 'sheet';
  }
  const tapeOverride = SETTINGS.some((s) => s.path.startsWith('seal.tape.') && overrides[s.field] !== undefined);
  if (overrides.seal === undefined && tapeOverride) values.seal = overrides.tpuJoints === 'yes' ? 'tpu' : 'tape';
  for (const p of PATTERNS) {
    const sized = p.sizes.some((s) => overrides[s.field] !== undefined);
    if (overrides.fill === undefined && sized) values.fill = p.kind;
  }
  if (overrides.fill === undefined && overrides.fillDrawing !== undefined) values.fill = 'svg';
  Object.assign(values, overrides);

  const problems: SettingProblem[] = [];
  for (const { field, what } of OPENING) {
    if (field in input || overrides[field] !== undefined) continue;
    problems.push({ kind: 'required', field, path: field, message: `Required: the opening's ${what} in mm.` });
  }
  const read = readParams(values);
  if (!read.ok) {
    for (const s of SETTINGS) {
      const message = read.errors[s.field];
      if (message === undefined || problems.some((p) => p.field === s.field)) continue;
      const choices = s.values === undefined ? '' : ` (${s.values.join(', ')})`;
      problems.push({ kind: 'value', field: s.field, path: s.path, message: `${message}${choices}` });
    }
  }
  if (problems.length > 0 || !read.ok) return { ok: false, problems };
  return { ok: true, params: read.params };
}
