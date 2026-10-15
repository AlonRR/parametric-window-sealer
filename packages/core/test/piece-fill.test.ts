// Per-piece fills (backlog item params-advanced, #21; Q7, Q10): the wall's fill to start with,
// and under Advanced a fill for any piece. Chosen without asking (Q144; docs/choices.md): an
// override sets a piece's fill (sealed or a pattern) and its style, the pattern's sizes staying
// the wall's (C26); an overridden piece stays on the wall's lattice (C27); overrides are written
// as `column,row=fill[:style]`, repeatable as --port is (C28).
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SEALED,
  SETTINGS,
  buildExport,
  describePlan,
  fillFor,
  formatPieceFills,
  loadEngine,
  parsePieceFills,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FillParams, FormValues, Params } from '../src/index.js';

const grid: FillParams = { ...SEALED, kind: 'grid' };

describe('the --piece-fill form (C28)', () => {
  it('reads column,row=fill and an optional :style, several separated by spaces', () => {
    expect(parsePieceFills('')).toEqual({ ok: true, fills: [] });
    expect(parsePieceFills('2,1=sealed 3,1=grid:through')).toEqual({
      ok: true,
      fills: [
        { column: 2, row: 1, kind: 'sealed' },
        { column: 3, row: 1, kind: 'grid', style: 'through' },
      ],
    });
    expect(
      formatPieceFills([
        { column: 3, row: 1, kind: 'grid', style: 'through' },
        { column: 2, row: 1, kind: 'sealed' },
      ]),
    ).toBe('3,1=grid:through 2,1=sealed');
  });

  it('refuses what it cannot read, naming the form', () => {
    const message =
      'Piece fill 2: write each as column,row=fill, then optionally :style, as 2,1=sealed or 2,1=grid:through.';
    for (const bad of [
      '2,1=sealed 2=grid',
      '2,1=sealed 0,1=grid',
      '2,1=sealed 2,1=plaid',
      '2,1=sealed 2,1=grid:sideways',
      '2,1=sealed 2,1=sealed:through',
    ]) {
      expect(parsePieceFills(bad)).toEqual({ ok: false, message });
    }
  });
});

describe('fillFor', () => {
  it('the wall’s fill, or a piece’s own kind and style with the wall’s sizes (C26)', () => {
    const p: Params = {
      ...EXAMPLE_PARAMS,
      fill: grid,
      pieceFills: [{ column: 2, row: 1, kind: 'hexagon', style: 'through' }],
    };
    expect(fillFor(p, 1, 1)).toEqual(grid);
    expect(fillFor(p, 2, 1)).toEqual({ ...grid, kind: 'hexagon', style: 'through' });
    const sealedHere: Params = { ...p, pieceFills: [{ column: 2, row: 1, kind: 'sealed' }] };
    expect(fillFor(sealedHere, 2, 1)).toEqual({ ...grid, kind: 'sealed' });
  });
});

describe('the form', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts with none, and keeps them through the form', () => {
    expect(EXAMPLE_PARAMS.pieceFills).toEqual([]);
    expect(example.pieceFills).toBe('');
    const r = read({ fill: 'grid', pieceFills: '2,1=sealed 1,5=diamond:through' });
    expect(r).toMatchObject({
      ok: true,
      params: {
        pieceFills: [
          { column: 2, row: 1, kind: 'sealed' },
          { column: 1, row: 5, kind: 'diamond', style: 'through' },
        ],
      },
    });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses a piece the wall does not have, and two fills for one piece', () => {
    expect(read({ pieceFills: '4,1=grid' })).toMatchObject({
      ok: false,
      errors: { pieceFills: 'Piece fill 1: there is no column 4, row 1: the wall has 3 columns and 5 rows.' },
    });
    expect(read({ pieceFills: '2,1=grid 2,1=sealed' })).toMatchObject({
      ok: false,
      errors: { pieceFills: 'Piece fills 1 and 2 are both for column 2, row 1; give each piece one fill.' },
    });
  });

  it('reads a pattern’s sizes when a piece uses it, though the wall does not', () => {
    expect(read({ hexBarMm: '0.5' })).toMatchObject({ ok: true });
    expect(read({ pieceFills: '2,1=hexagon', hexBarMm: '0.5' })).toMatchObject({
      ok: false,
      errors: { hexBarMm: 'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.' },
    });
  });
});

describe('the plan text', () => {
  it('a line for each piece with its own fill', () => {
    const p: Params = {
      ...EXAMPLE_PARAMS,
      fill: grid,
      pieceFills: [
        { column: 2, row: 1, kind: 'sealed' },
        { column: 3, row: 1, kind: 'grid', style: 'through' },
      ],
    };
    expect(describePlan(planWall(p), p).pieceFills).toEqual([
      'Column 2, row 1: sealed.',
      'Column 3, row 1: a grid of 15 mm square openings and 3 mm bars, cut through: air passes through the wall.',
    ]);
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).pieceFills).toEqual([]);
  });
});

describe('the files', () => {
  it('each piece is built with its own fill; the rest with the wall’s (C27)', async () => {
    const engine = await loadEngine();
    // Without pins, so a sealed piece is a plain box.
    const unpinned = { ...EXAMPLE_PARAMS, joint: { ...EXAMPLE_PARAMS.joint, pins: false } };
    const wall = buildExport(engine, { ...unpinned, fill: grid });
    const one = buildExport(engine, {
      ...unpinned,
      fill: grid,
      pieceFills: [{ column: 2, row: 1, kind: 'sealed' }],
    });
    const tris = (e: typeof wall) => e.pieces.map((p) => p.mesh.triangles.length);
    const [a, b] = [tris(wall), tris(one)];
    const at = one.pieces.findIndex((p) => p.cell.column === 1 && p.cell.row === 0);
    expect(b[at]).toBe(12 * 3); // a sealed box: 12 triangles
    expect(b.filter((_, i) => i !== at)).toEqual(a.filter((_, i) => i !== at));
  });
});

describe('settings in the library’s shape', () => {
  it('a list setting, each item { column, row, kind, style? }', () => {
    expect(SETTINGS.find((s) => s.field === 'pieceFills')).toMatchObject({ path: 'pieceFills', list: 'pieceFills' });
    expect(SETTINGS.find((s) => s.field === 'ports')).toMatchObject({ list: 'ports' });
    const r = readSettings({
      openingWidthMm: 600,
      openingHeightMm: 1000,
      pieceFills: [{ column: 2, row: 1, kind: 'grid' }],
    });
    expect(r).toMatchObject({ ok: true, params: { pieceFills: [{ column: 2, row: 1, kind: 'grid' }] } });
    expect(
      readSettings({
        openingWidthMm: 600,
        openingHeightMm: 1000,
        pieceFills: [{ column: 'two', row: 1, kind: 'grid' }],
      }),
    ).toEqual({
      ok: false,
      problems: [{ kind: 'shape', path: 'pieceFills.0.column', message: 'pieceFills.0.column should be a number' }],
    });
  });
});
