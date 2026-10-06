// Settings in the library's own shape, possibly partial (backlog items api-cli #46 and
// api-mcp-local #47; Q85, Q99): what each setting is, and how a partial object becomes the
// page's parameters, checked by the page's rules.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  formatPieceFills,
  formatPorts,
  readParams,
  readSettings,
  settingAt,
  toFormValues,
} from '../src/index.js';
import type { Params } from '../src/index.js';

const CUSTOM_PRINTER: Params = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 250, heightMm: 210 } };
const LISTED_PRINTER: Params = { ...EXAMPLE_PARAMS, printer: { kind: 'model', id: 'prusa-mk4s' } };
const WITH_PORTS: Params = { ...EXAMPLE_PARAMS, ports: [{ hoseMm: 150, column: 2, row: 1 }] };
const WITH_PIECE_FILLS: Params = {
  ...EXAMPLE_PARAMS,
  pieceFills: [{ column: 2, row: 1, kind: 'grid', style: 'through' }],
};
const OPENING = { openingWidthMm: 600, openingHeightMm: 1000 };
const ok = (input: unknown, overrides = {}) => {
  const read = readSettings(input, overrides);
  if (!read.ok) throw new Error(JSON.stringify(read.problems));
  return read.params;
};
const problems = (input: unknown, overrides = {}) => {
  const read = readSettings(input, overrides);
  return read.ok ? [] : read.problems;
};

describe('SETTINGS: every setting on the page', () => {
  it('one entry for each field of the page, and none without one', () => {
    expect(SETTINGS.map((s) => s.field).sort()).toEqual(Object.keys(toFormValues(EXAMPLE_PARAMS)).sort());
  });

  it.each(SETTINGS.map((s) => [s.path, s] as const))('%s holds the value the page shows', (_path, s) => {
    const params = s.field.startsWith('custom')
      ? CUSTOM_PRINTER
      : s.field === 'printerModel'
        ? LISTED_PRINTER
        : s.list === 'ports'
          ? WITH_PORTS
          : s.list === 'pieceFills'
            ? WITH_PIECE_FILLS
            : EXAMPLE_PARAMS;
    const value = settingAt(params, s.path);
    const list = s.list === 'pieceFills' ? formatPieceFills : formatPorts;
    const shown = s.list ? list(value as []) : s.onOff ? (value === true ? 'yes' : 'no') : String(value);
    expect(shown).toBe(toFormValues(params)[s.field]);
  });

  it.each(SETTINGS.filter((s) => s.values).map((s) => [s.path, s] as const))(
    '%s: every listed choice is accepted, and nothing else',
    (_path, s) => {
      // A listed printer's id is read only for a listed printer, as the custom sizes are only
      // for a custom one: the starting values hold both, and the id's own test picks the list.
      // The tape's settings likewise are read only with tape, and a pattern's with a pattern;
      // joints in TPU, with the TPU seal (C38).
      const base = {
        ...toFormValues(CUSTOM_PRINTER),
        printerModel: 'prusa-mk4s',
        ...(s.field === 'printerModel' ? { printer: 'model' } : {}),
        ...(s.path.startsWith('seal.tape.') ? { seal: s.field === 'tpuJoints' ? 'tpu' : 'tape' } : {}),
        ...(s.path.startsWith('fill.') && s.path !== 'fill.kind' ? { fill: 'grid' } : {}),
      };
      for (const value of s.values ?? []) {
        expect(readParams({ ...base, [s.field]: value })).toMatchObject({ ok: true });
      }
      expect(readParams({ ...base, [s.field]: 'not-a-choice' }).ok).toBe(false);
    },
  );

  it('each has a description', () => {
    for (const s of SETTINGS) expect(s.help.length).toBeGreaterThan(10);
  });
});

describe('readSettings', () => {
  it('the opening alone gives the page’s starting point', () => {
    expect(ok(OPENING)).toEqual(EXAMPLE_PARAMS);
  });

  it('the opening is required', () => {
    expect(problems({})).toEqual([
      {
        kind: 'required',
        field: 'openingWidthMm',
        path: 'openingWidthMm',
        message: "Required: the opening's width in mm.",
      },
      {
        kind: 'required',
        field: 'openingHeightMm',
        path: 'openingHeightMm',
        message: "Required: the opening's height in mm.",
      },
    ]);
    expect(ok({}, { openingWidthMm: '600', openingHeightMm: '1000' })).toEqual(EXAMPLE_PARAMS);
  });

  it('what is left out starts where the page starts', () => {
    const p = ok({ ...OPENING, thicknessMm: 4, joint: { fitMm: 0.3 } });
    expect(p.thicknessMm).toBe(4);
    expect(p.joint).toEqual({ ...EXAMPLE_PARAMS.joint, fitMm: 0.3 });
    expect(p.edges).toEqual(EXAMPLE_PARAMS.edges);
  });

  it('the window type presets the four edges; edges given with it change them', () => {
    expect(ok({ ...OPENING, edges: { window: 'hung' } }).edges.roles).toEqual(WINDOW_PRESETS.hung);
    expect(ok({ ...OPENING, edges: { window: 'hung', roles: { top: 'track' } } }).edges.roles).toEqual({
      ...WINDOW_PRESETS.hung,
      top: 'track',
    });
  });

  it('overrides, in the page’s form values, come last; a window override presets again', () => {
    expect(ok({ ...OPENING, thicknessMm: 4 }, { thicknessMm: '5' }).thicknessMm).toBe(5);
    const file = { ...OPENING, edges: { window: 'hung', roles: { top: 'track' } } };
    expect(ok(file, { window: 'slider' }).edges.roles).toEqual(WINDOW_PRESETS.slider);
    expect(ok(file, { window: 'slider', leftEdge: 'sash' }).edges.roles).toEqual({
      ...WINDOW_PRESETS.slider,
      left: 'sash',
    });
  });

  it('a printer size makes the printer custom, in the input or as an override', () => {
    expect(ok({ ...OPENING, printer: { widthMm: 250, heightMm: 210 } }).printer).toEqual(CUSTOM_PRINTER.printer);
    expect(ok(OPENING, { customWidthMm: '250', customHeightMm: '210' }).printer).toEqual(CUSTOM_PRINTER.printer);
    expect(ok(OPENING, { printer: 'default', customWidthMm: '250' }).printer).toEqual({ kind: 'default' });
  });

  it('refuses an unknown setting or a value of the wrong kind, naming where', () => {
    expect(problems({ ...OPENING, edges: { track: { widht: 15 } } })).toEqual([
      { kind: 'shape', path: 'edges.track.widht', message: 'edges.track.widht is not a setting' },
    ]);
    expect(problems({ ...OPENING, thicknessMm: '3' })).toEqual([
      { kind: 'shape', path: 'thicknessMm', message: 'thicknessMm should be a number' },
    ]);
    expect(problems({ ...OPENING, joint: 4 })).toEqual([
      { kind: 'shape', path: 'joint', message: 'joint should be an object' },
    ]);
    expect(problems([600, 1000])).toEqual([{ kind: 'shape', path: '', message: 'should be one JSON object' }]);
  });

  it('refuses what the page refuses, with the page’s message and the choices', () => {
    expect(problems({ ...OPENING, joint: { slideMm: 8 }, width: { mode: 'grid' } })).toEqual([
      {
        kind: 'value',
        field: 'widthMode',
        path: 'width.mode',
        message: 'Choose one of the listed options. (equal, full-plus-filler)',
      },
      {
        kind: 'value',
        field: 'slideMm',
        path: 'joint.slideMm',
        message: 'Make it less than the slot depth, so a piece always stays in its slot.',
      },
    ]);
  });

  it('ports as a list in the library’s shape (Q114), each checked as the page checks it', () => {
    expect(ok({ ...OPENING, ports: [{ hoseMm: 150 }] }).ports).toEqual([{ hoseMm: 150, column: 2, row: 1 }]);
    expect(ok({ ...OPENING, ports: [{ hoseMm: 130, column: 3, row: 2 }] }).ports).toEqual([
      { hoseMm: 130, column: 3, row: 2 },
    ]);
    expect(problems({ ...OPENING, ports: 150 })).toEqual([
      { kind: 'shape', path: 'ports', message: 'ports should be a list' },
    ]);
    expect(problems({ ...OPENING, ports: [{ hoseMm: '150' }] })).toEqual([
      { kind: 'shape', path: 'ports.0.hoseMm', message: 'ports.0.hoseMm should be a number' },
    ]);
    expect(problems({ ...OPENING, ports: [{ size: 150 }] })).toContainEqual({
      kind: 'shape',
      path: 'ports.0.size',
      message: 'ports.0.size is not a setting',
    });
    expect(problems({ ...OPENING, ports: [{ hoseMm: 150, column: 2 }] })).toEqual([
      { kind: 'shape', path: 'ports.0', message: 'ports.0 needs both column and row, or neither' },
    ]);
    expect(problems({ ...OPENING, ports: [{ hoseMm: 150, column: 4, row: 1 }] })).toEqual([
      {
        kind: 'value',
        field: 'ports',
        path: 'ports',
        message: 'Port 1: There is no column 4, row 1: the wall has 3 columns and 5 rows.',
      },
    ]);
  });

  it('a printer from the list: by id alone, or as an override (Q115)', () => {
    expect(ok({ ...OPENING, printer: { id: 'prusa-mk4s' } }).printer).toEqual({ kind: 'model', id: 'prusa-mk4s' });
    expect(ok(OPENING, { printerModel: 'bambu-lab-a1' }).printer).toEqual({ kind: 'model', id: 'bambu-lab-a1' });
    expect(ok({ ...OPENING, bedMarginMm: 15 }).bedMarginMm).toBe(15);
  });

  it('does not change what it is given', () => {
    const input = { ...OPENING, edges: { window: 'hung' } };
    const before = JSON.stringify(input);
    ok(input, { thicknessMm: '4' });
    expect(JSON.stringify(input)).toBe(before);
    expect(EXAMPLE_PARAMS.edges.roles).toEqual(WINDOW_PRESETS.slider);
  });
});
