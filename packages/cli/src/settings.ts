// From a --params file and the flags to the page's form values (Q85, Q90), so the library
// checks them by the page's own rules and its messages name what is wrong.
//
// Order, as on the page: the page's starting values, then the file, then the flags. Setting
// the window type, in the file or by a flag, presets the four edges (Q66); edges given with
// it, or after it, change them.
import { EXAMPLE_PARAMS, WINDOW_PRESETS, readParams, toFormValues } from 'parametric-window-sealer';
import type { FormValues, Params, WindowType } from 'parametric-window-sealer';
import { SETTING_FLAGS, settingAt } from './flags.js';

export interface Problem {
  flag?: string; // as typed, with its dashes
  setting?: string; // where it sits in a --params file
  message: string;
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The shape a file may have: the library's own, with a custom printer's two sizes.
const SHAPE: Json = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 0, heightMm: 0 } };

function checkShape(value: unknown, shape: unknown, path: string, problems: string[]): void {
  if (isObject(shape)) {
    if (!isObject(value)) {
      problems.push(path === '' ? 'should hold one JSON object' : `${path} should be an object`);
      return;
    }
    for (const [key, inner] of Object.entries(value)) {
      const at = path === '' ? key : `${path}.${key}`;
      if (!(key in shape)) problems.push(`${at} is not a setting`);
      else checkShape(inner, shape[key], at, problems);
    }
  } else if (typeof value !== typeof shape) {
    problems.push(`${path} should be ${typeof shape === 'number' ? 'a number' : 'text'}`);
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

export interface FromFile {
  params: Params;
  hasWidth: boolean;
  hasHeight: boolean;
}

export function readParamsFile(text: string, name: string): FromFile | { problems: Problem[] } {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return { problems: [{ message: `${name} is not valid JSON: ${(error as Error).message}` }] };
  }
  const found: string[] = [];
  checkShape(file, SHAPE, '', found);
  if (found.length > 0 || !isObject(file)) {
    return { problems: found.map((message) => ({ message: `${name}: ${message}` })) };
  }
  const params = merge(EXAMPLE_PARAMS, file) as Params;
  const window = settingAt(file, 'edges.window');
  if (isWindow(window)) {
    const roles = settingAt(file, 'edges.roles');
    params.edges.roles = { ...WINDOW_PRESETS[window], ...(isObject(roles) ? roles : {}) };
  }
  // A printer size without a kind means a custom printer, as with the flags.
  const printer = file['printer'];
  if (isObject(printer) && !('kind' in printer) && ('widthMm' in printer || 'heightMm' in printer)) {
    params.printer = { ...(params.printer as object), kind: 'custom' } as Params['printer'];
  }
  return { params, hasWidth: 'openingWidthMm' in file, hasHeight: 'openingHeightMm' in file };
}

export type Flags = Partial<Record<string, string>>;

// The checked parameters, or every problem found, each naming its flag and its setting.
export function settingsFrom(
  start: FromFile | undefined,
  flags: Flags,
): { params: Params } | { problems: Problem[] } {
  const values: FormValues = toFormValues(start?.params ?? EXAMPLE_PARAMS);
  const window = flags['window'];
  if (isWindow(window)) {
    for (const [edge, role] of Object.entries(WINDOW_PRESETS[window])) {
      values[`${edge}Edge` as keyof FormValues] = role;
    }
  }
  if (flags['printer'] === undefined && (flags['printer-width'] ?? flags['printer-height']) !== undefined) {
    values.printer = 'custom';
  }
  for (const f of SETTING_FLAGS) {
    const value = flags[f.flag];
    if (value !== undefined) values[f.field] = value;
  }

  const problems: Problem[] = [];
  const required = [
    { flag: 'width', given: start?.hasWidth, what: 'width' },
    { flag: 'height', given: start?.hasHeight, what: 'height' },
  ];
  for (const r of required) {
    const f = SETTING_FLAGS.find((s) => s.flag === r.flag);
    if (f === undefined || r.given === true || flags[r.flag] !== undefined) continue;
    problems.push({
      flag: `--${f.flag}`,
      setting: f.path,
      message: `Required: the opening's ${r.what} in mm, as --${f.flag} or as ${f.path} in a --params file.`,
    });
  }
  const read = readParams(values);
  if (!read.ok) {
    for (const f of SETTING_FLAGS) {
      const message = read.errors[f.field];
      if (message === undefined || problems.some((p) => p.setting === f.path)) continue;
      const choices = f.values === undefined ? '' : ` (${f.values.join(', ')})`;
      problems.push({ flag: `--${f.flag}`, setting: f.path, message: `${message}${choices}` });
    }
  }
  if (problems.length > 0 || !read.ok) return { problems };
  return { params: read.params };
}
