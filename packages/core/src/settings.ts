// Every setting on the page, and settings given in the library's own shape, possibly partial:
// a --params file for the command (Q85) or a tool's input for the MCP server (Q99).
//
// Order, as on the page: its starting values, then the input, then any overrides in the
// page's form values (the command's flags). Setting the window type presets the four edges
// (Q66); edges given with it, or after it, change them. A printer size means a custom
// printer, and a tape setting means tape. The opening has no starting value: it is required.
import { WINDOW_PRESETS } from './edge.js';
import type { WindowType } from './edge.js';
import { EXAMPLE_PARAMS, readParams, toFormValues } from './params.js';
import { PRINTER_IDS } from './printers.js';
import { FILL_KINDS, PATTERN_STYLES } from './fill.js';
import type { FieldName, FormValues, Params } from './params.js';

export interface Setting {
  field: FieldName; // the page's field
  path: string; // where it sits in the library's shape, as `edges.track.widthMm`
  help: string; // in the page's words
  values?: readonly string[]; // a choice; otherwise a length in mm
  list?: true; // a list in the shape, written in the form as the command's --port takes it
  onOff?: true; // true or false in the shape, written yes or no in the form
}

const DIVISION = ['equal', 'full-plus-filler'] as const;
const FILLER = ['start', 'end', 'middle', 'split'] as const;
const LEFTOVER = ['spread', 'equal', 'shorten'] as const;
const ROLE = ['track', 'sash', 'sill'] as const;
const YES_NO = ['no', 'yes'] as const;

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

const edge = (name: 'top' | 'bottom' | 'left' | 'right'): Setting => ({
  field: `${name}Edge`,
  path: `edges.roles.${name}`,
  help: `The ${name} edge: in a track, pressed by the sash, or on a flat sill.`,
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
  { field: 'thicknessMm', path: 'thicknessMm', help: 'Panel thickness.' },
  { field: 'slotMm', path: 'joint.slotMm', help: 'How deep a piece can go into a strip.' },
  { field: 'slideMm', path: 'joint.slideMm', help: 'How far a piece can move in its slot.' },
  { field: 'webMm', path: 'joint.webMm', help: "The wall between the strip's two slots." },
  { field: 'flangeMm', path: 'joint.flangeMm', help: 'Each face of the strip, over the panel.' },
  { field: 'fitMm', path: 'joint.fitMm', help: 'Clearance between each panel face and the strip.' },
  {
    field: 'window',
    path: 'edges.window',
    help: 'Window type; sets the four edges as the page does.',
    values: ['slider', 'hung'],
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
    field: 'ports',
    path: 'ports',
    help:
      "Hose ports: none for a plain wall, or for each port the hose end's outside diameter in mm (150 and 130 " +
      'are common; measure the end that goes in) and its piece, by column and row from 1 at the bottom left ' +
      "seen from the room. Without a piece, the first goes in the bottom row's middle piece.",
    list: true,
  },
  { field: 'collarDepthMm', path: 'collar.depthMm', help: "How far the hose end goes into the port's collar." },
  { field: 'collarWallMm', path: 'collar.wallMm', help: "The collar's wall." },
  { field: 'collarClearanceMm', path: 'collar.clearanceMm', help: 'Clearance per side between the hose end and the collar.' },
  { field: 'collarLipMm', path: 'collar.lipMm', help: 'The lip the hose end stops against, inside the collar.' },
  {
    field: 'seal',
    path: 'seal.kind',
    help: "The seal: none, or foam tape along the edge strips' outer faces.",
    values: ['none', 'tape'],
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
    help: "Tape on the sides of the edge strips in a track too: yes or no.",
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
    field: 'fill',
    path: 'fill.kind',
    help: 'The panel fill: sealed, or a pattern (the grid for now).',
    values: FILL_KINDS,
  },
  {
    field: 'fillStyle',
    path: 'fill.style',
    help: "A pattern's style: relief, cut into the room side, or cut through, letting air through.",
    values: PATTERN_STYLES,
  },
  { field: 'reliefPct', path: 'fill.reliefPct', help: "A relief's depth, as a percentage of the panel's thickness." },
  { field: 'gridOpeningMm', path: 'fill.grid.openingMm', help: "The grid's square openings: each side." },
  { field: 'gridBarMm', path: 'fill.grid.barMm', help: 'The bars between the grid’s openings; at least 0.8 mm.' },
];

// The value at a dotted path, such as `edges.track.widthMm`; undefined if it is not there.
export function settingAt(value: unknown, path: string): unknown {
  let at: unknown = value;
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null) return undefined;
    at = (at as Record<string, unknown>)[key];
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

// The shape an input may have: the library's own, with a custom printer's two sizes, and
// each port as PORT_SHAPE.
const SHAPE: Json = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 0, heightMm: 0, id: '' } };
const PORT_SHAPE: Json = { hoseMm: 0, column: 0, row: 0 };

function checkShape(value: unknown, shape: unknown, path: string, problems: SettingProblem[]): void {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) {
      problems.push({ kind: 'shape', path, message: `${path} should be a list` });
      return;
    }
    for (const [i, item] of value.entries()) {
      const at = `${path}.${i}`;
      checkShape(item, PORT_SHAPE, at, problems);
      if (isObject(item) && 'column' in item !== 'row' in item) {
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
  const params = merge(EXAMPLE_PARAMS, input) as Params;
  const window = settingAt(input, 'edges.window');
  if (isWindow(window)) {
    const roles = settingAt(input, 'edges.roles');
    params.edges.roles = { ...WINDOW_PRESETS[window], ...(isObject(roles) ? roles : {}) };
  }
  // A printer size without a kind means a custom printer; a printer id, a listed one.
  const printer = input['printer'];
  if (isObject(printer) && !('kind' in printer) && ('widthMm' in printer || 'heightMm' in printer)) {
    params.printer = { ...params.printer, kind: 'custom' } as Params['printer'];
  }
  if (isObject(printer) && !('kind' in printer) && 'id' in printer) {
    params.printer = { ...params.printer, kind: 'model' } as Params['printer'];
  }
  const seal = input['seal'];
  if (isObject(seal) && !('kind' in seal) && 'tape' in seal) params.seal = { ...params.seal, kind: 'tape' };
  const fill = input['fill'];
  if (isObject(fill) && !('kind' in fill) && 'grid' in fill) params.fill = { ...params.fill, kind: 'grid' };

  const values: FormValues = toFormValues(params);
  const presetWindow = overrides.window;
  if (isWindow(presetWindow)) {
    for (const [edgeName, role] of Object.entries(WINDOW_PRESETS[presetWindow])) {
      values[`${edgeName}Edge` as FieldName] = role;
    }
  }
  if (overrides.printer === undefined && (overrides.customWidthMm ?? overrides.customHeightMm) !== undefined) {
    values.printer = 'custom';
  }
  if (overrides.printer === undefined && overrides.printerModel !== undefined) values.printer = 'model';
  const tapeOverride = SETTINGS.some((s) => s.path.startsWith('seal.tape.') && overrides[s.field] !== undefined);
  if (overrides.seal === undefined && tapeOverride) values.seal = 'tape';
  const gridOverride = SETTINGS.some((s) => s.path.startsWith('fill.grid.') && overrides[s.field] !== undefined);
  if (overrides.fill === undefined && gridOverride) values.fill = 'grid';
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
