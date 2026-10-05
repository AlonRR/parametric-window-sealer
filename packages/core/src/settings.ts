// Every setting on the page, and settings given in the library's own shape, possibly partial:
// a --params file for the command (Q85) or a tool's input for the MCP server (Q99).
//
// Order, as on the page: its starting values, then the input, then any overrides in the
// page's form values (the command's flags). Setting the window type presets the four edges
// (Q66); edges given with it, or after it, change them. A printer size means a custom
// printer. The opening has no starting value: it is required.
import { WINDOW_PRESETS } from './edge.js';
import type { WindowType } from './edge.js';
import { EXAMPLE_PARAMS, readParams, toFormValues } from './params.js';
import type { FieldName, FormValues, Params } from './params.js';

export interface Setting {
  field: FieldName; // the page's field
  path: string; // where it sits in the library's shape, as `edges.track.widthMm`
  help: string; // in the page's words
  values?: readonly string[]; // a choice; otherwise a length in mm
}

const DIVISION = ['equal', 'full-plus-filler'] as const;
const FILLER = ['start', 'end', 'middle', 'split'] as const;
const LEFTOVER = ['spread', 'equal', 'shorten'] as const;
const ROLE = ['track', 'sash', 'sill'] as const;

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
    help: 'The largest piece to print: default (200 × 200 mm) or custom.',
    values: ['default', 'custom'],
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

// The shape an input may have: the library's own, with a custom printer's two sizes.
const SHAPE: Json = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 0, heightMm: 0 } };

function checkShape(value: unknown, shape: unknown, path: string, problems: SettingProblem[]): void {
  if (isObject(shape)) {
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
    const kind = typeof shape === 'number' ? 'a number' : 'text';
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
  const printer = input['printer'];
  if (isObject(printer) && !('kind' in printer) && ('widthMm' in printer || 'heightMm' in printer)) {
    params.printer = { ...params.printer, kind: 'custom' } as Params['printer'];
  }

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
