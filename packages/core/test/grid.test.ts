// The grid pattern and the panel fill (backlog item pattern-grid, #16; Q139 to Q143). The fill
// is sealed to start with, or a pattern from the list, cut through or in relief (Q141); a
// pattern starts in relief (Q142). The grid's square openings start at 15 mm with 3 mm bars
// (Q139); both can change (Q140), a bar no thinner than 0.8 mm (Q143). It is built on the
// pattern framework (patterns-core, #20).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  MIN_BAR_MM,
  SEALED,
  SETTINGS,
  buildExport,
  describePlan,
  fillPattern,
  gridTile,
  loadEngine,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FillParams, FormValues } from '../src/index.js';

const grid = (over: Partial<FillParams> = {}): FillParams => ({ ...SEALED, kind: 'grid', ...over });

describe('the grid and the fill', () => {
  it('starts sealed; a pattern starts in relief, half the panel deep (Q141, Q142, Q138)', () => {
    expect(FILL_KINDS.slice(0, 2)).toEqual(['sealed', 'grid']);
    expect(EXAMPLE_PARAMS.fill).toEqual(SEALED);
    expect(SEALED).toMatchObject({ kind: 'sealed', style: 'relief', reliefPct: 50, grid: DEFAULT_GRID });
  });

  it('15 mm square openings and 3 mm bars: an 18 mm pitch (Q139)', () => {
    expect(DEFAULT_GRID).toEqual({ openingMm: 15, barMm: 3 });
    expect(gridTile(DEFAULT_GRID)).toEqual({
      pitchXMm: 18,
      pitchYMm: 18,
      rowShiftMm: 0,
      openings: [
        [
          [-7.5, -7.5],
          [7.5, -7.5],
          [7.5, 7.5],
          [-7.5, 7.5],
        ],
      ],
      barMm: 3,
    });
    expect(MIN_BAR_MM).toBe(0.8);
  });

  it('fillPattern: nothing when sealed; the grid inside the joint’s border otherwise', () => {
    expect(fillPattern(SEALED, DEFAULT_JOINT)).toBeUndefined();
    expect(fillPattern(grid({ style: 'through' }), DEFAULT_JOINT)).toEqual({
      tile: gridTile(DEFAULT_GRID),
      style: 'through',
      reliefPct: 50,
      borderMm: 10,
    });
  });
});

describe('the form', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts sealed, the pattern’s fields at their starting values', () => {
    expect(example).toMatchObject({
      fill: 'sealed',
      fillStyle: 'relief',
      reliefPct: '50',
      gridOpeningMm: '15',
      gridBarMm: '3',
    });
  });

  it('a grid, and back through the form', () => {
    const r = read({ fill: 'grid', fillStyle: 'through', gridOpeningMm: '12', gridBarMm: '2' });
    expect(r).toMatchObject({
      ok: true,
      params: { fill: { kind: 'grid', style: 'through', reliefPct: 50, grid: { openingMm: 12, barMm: 2 } } },
    });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('sealed, the pattern’s fields not filled in are no problem', () => {
    expect(read({ gridBarMm: '', reliefPct: 'x', fillStyle: '' })).toMatchObject({
      ok: true,
      params: { fill: SEALED },
    });
  });

  it('refuses a bar under 0.8 mm, an opening of nothing and a relief of the whole panel (Q143)', () => {
    expect(read({ fill: 'grid', gridBarMm: '0.5' })).toMatchObject({
      ok: false,
      errors: { gridBarMm: 'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.' },
    });
    expect(read({ fill: 'grid', gridBarMm: '0.8' })).toMatchObject({ ok: true });
    expect(read({ fill: 'grid', gridOpeningMm: '0' })).toMatchObject({
      ok: false,
      errors: { gridOpeningMm: 'Enter a size in mm, greater than 0.' },
    });
    for (const pct of ['0', '100', '120']) {
      expect(read({ fill: 'grid', reliefPct: pct })).toMatchObject({
        ok: false,
        errors: { reliefPct: 'Enter a percentage greater than 0 and less than 100.' },
      });
    }
  });
});

describe('the plan text', () => {
  const line = (fill: FillParams) => {
    const p = { ...EXAMPLE_PARAMS, fill };
    return describePlan(planWall(p), p).fill;
  };

  it('sealed, relief and cut through', () => {
    expect(line(SEALED)).toBe('Fill: sealed.');
    expect(line(grid())).toBe('Fill: a grid of 15 mm square openings and 3 mm bars, cut 1.5 mm into the room side.');
    expect(line(grid({ style: 'through' }))).toBe(
      'Fill: a grid of 15 mm square openings and 3 mm bars, cut through: air passes through the wall.',
    );
  });
});

describe('the files', () => {
  it('a grid wall’s pieces carry the openings; the strips do not change', async () => {
    const engine = await loadEngine();
    const sealed = buildExport(engine, EXAMPLE_PARAMS);
    const through = buildExport(engine, { ...EXAMPLE_PARAMS, fill: grid({ style: 'through' }) });
    expect(through.pieces).toHaveLength(sealed.pieces.length);
    for (const [i, piece] of through.pieces.entries()) {
      expect(piece.mesh.triangles.length, `piece ${i}`).toBeGreaterThan(sealed.pieces[i]?.mesh.triangles.length ?? 0);
    }
    expect(through.parts.map((p) => [p.name, p.mesh.triangles.length])).toEqual(
      sealed.parts.map((p) => [p.name, p.mesh.triangles.length]),
    );
  });
});

describe('settings in the library’s shape', () => {
  it('lists the fill’s settings', () => {
    const fill = SETTINGS.filter((s) => s.path.startsWith('fill'));
    expect(fill.find((s) => s.path === 'fill.kind')?.values).toEqual(FILL_KINDS);
    expect(
      // The fill's own settings and the grid's; each other pattern's are checked in its own test.
      fill
        .filter((s) => !/^fill\.[a-z]+\./.test(s.path) || s.path.startsWith('fill.grid.'))
        .map((s) => [s.path, s.values ?? null]),
    ).toEqual([
      ['fill.kind', FILL_KINDS],
      ['fill.style', ['relief', 'through']],
      ['fill.reliefPct', null],
      ['fill.grid.openingMm', null],
      ['fill.grid.barMm', null],
    ]);
  });

  it('grid settings without a kind mean the grid, as tape settings mean tape', () => {
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, fill: { grid: { barMm: 4 } } });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'grid', grid: { openingMm: 15, barMm: 4 } } } });
    expect(readSettings({ openingWidthMm: 600, openingHeightMm: 1000 }, { gridBarMm: '4' })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'grid' } },
    });
  });
});
