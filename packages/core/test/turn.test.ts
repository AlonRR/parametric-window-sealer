// A wedge for a sash turned part way on its side hinges, as a window type (sash-wedge, #159;
// docs/wedge.md). It is the tilted sash's wedge turned on its side: the triangles lie at the head and
// the sill, the sash's width long, and the strip runs up the latch side, the window's height long.
// The gap at the latch side is asked for; the rest is as for a tilted sash.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  describePlan,
  loadEngine,
  makeWall,
  planFiles,
  planWall,
  readParams,
  readSettings,
  toFormValues,
  wedgeSetup,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const TURN = {
  openingWidthMm: 800,
  openingHeightMm: 1200,
  edges: { window: 'turn' },
  turn: { gapMm: 150 },
  seal: { kind: 'tpu' },
  ports: [{ hoseMm: 150 }],
};
const ok = (input: unknown, overrides: FormValues = {}): Params => {
  const r = readSettings(input, overrides);
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok(TURN);
const FORM = toFormValues(PARAMS);
const errors = (overrides: FormValues) => {
  const r = readParams({ ...FORM, ...overrides });
  return r.ok ? {} : r.errors;
};

describe('the turned sash as a window type', () => {
  it('every edge pressed against the frame or the sash; the gap at the latch side a setting of its own', () => {
    expect(WINDOW_PRESETS.turn).toEqual({ top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' });
    expect(SETTINGS.find((s) => s.field === 'window')?.values).toContain('turn');
    expect(SETTINGS.find((s) => s.field === 'turnGapMm')?.path).toBe('turn.gapMm');
    expect(PARAMS.edges.roles).toEqual(WINDOW_PRESETS.turn);
    expect(PARAMS.turn).toEqual({ gapMm: 150 });
    expect(EXAMPLE_PARAMS.turn).toEqual({ gapMm: 150 });
  });

  it('the gap read back as the form writes it, and read only for a turned sash', () => {
    const back = readParams(FORM);
    expect(back.ok && back.params.turn).toEqual({ gapMm: 150 });
    expect(readParams({ ...toFormValues(EXAMPLE_PARAMS), turnGapMm: 'wide' }).ok).toBe(true);
    expect(errors({ turnGapMm: 'wide' })).toHaveProperty('turnGapMm');
    // Each form reads its own gap only.
    expect(errors({ tiltGapMm: 'wide' })).toEqual({});
    expect(readParams({ ...FORM, window: 'tilt', turnGapMm: 'wide' }).ok).toBe(true);
  });

  it('the wedge is the turned one: its axis along the width, its strip up the height', () => {
    const setup = wedgeSetup(PARAMS);
    if ('problem' in setup) throw new Error(setup.problem);
    expect(setup.wedge.form).toBe('turn');
    expect(setup.wedge.side.legMm).toBe(800);
    expect(setup.wedge.top.lengthMm).toBe(1200);
    expect(setup.wedge.tiltDeg).toBeCloseTo((Math.asin(150 / 800) * 180) / Math.PI, 9);
  });

  it('a gap the wedge cannot take is a problem with the gap, in the turned sash’s words', () => {
    expect(errors({ turnGapMm: '40' })).toEqual({
      turnGapMm:
        'The gap at the latch side is 40 mm; it needs at least 58 mm, for an edge strip each side of the ' +
        'latch-side strip and a piece between them.',
    });
    expect(errors({ turnGapMm: '800' })).toEqual({
      turnGapMm:
        'The gap at the latch side is 800 mm: a turned sash’s latch side moves in less than the window is wide.',
    });
    expect(errors({ printer: 'custom', customWidthMm: '100', customHeightMm: '100', ports: '' })).toEqual({
      turnGapMm:
        'The gap at the latch side is 150 mm: the corner pieces span it, and the printer makes pieces up to 100 mm.',
    });
  });

  it('held by its gaskets’ squeeze: a printed TPU seal', () => {
    expect(errors({ seal: 'tape' })).toHaveProperty('seal');
  });

  it('one hose port, in the latch-side strip; none of a wall’s other settings', () => {
    expect(PARAMS.ports).toEqual([{ hoseMm: 150, column: 1, row: 1 }]);
    expect(errors({ ports: '150 130' })).toEqual({ ports: 'A turned sash’s wedge takes one hose port.' });
    const cases: [FormValues, string, string][] = [
      [{ jointStyle: 'dovetails' }, 'jointStyle', 'A turned sash’s wedge joins its pieces with strips.'],
      [{ wall: 'double' }, 'wall', 'A turned sash’s wedge is a single skin.'],
      [{ fill: 'grid' }, 'fill', 'A turned sash’s wedge takes no pattern: its pieces are sealed.'],
      [{ fans: '120' }, 'fans', 'A turned sash’s wedge has room for a hose port only.'],
      [
        { leftEdge: 'track' },
        'leftEdge',
        'A turned sash’s wedge is pressed against the frame and the sash all round: every edge is a frame edge.',
      ],
    ];
    for (const [overrides, field, message] of cases) {
      expect(errors(overrides), field).toEqual({ [field]: message });
    }
  });
});

describe('a turned sash’s plan and files', () => {
  it('the plan says what the wedge is, in the turned sash’s words', () => {
    const text = describePlan(planWall(PARAMS), PARAMS);
    expect(text.headline).toBe('A wedge for a turned sash: 55 parts and 28 TPU gaskets to print.');
    expect(text.span).toBe('For a 800 × 1200 mm opening, the sash 150 mm in at the latch side.');
    expect(text.joints).toBe('Joints: 11 joint strips.');
    expect(text.edges).toBe('Edges: 28 edge strips and 2 corner pieces.');
    expect(text.wedge).toHaveLength(5);
    expect(text.wedge[0]).toMatch(
      /^The sash turns 10\.8° in\. The wedge it leaves: a latch-side strip 1200 mm long and [\d.]+ mm deep, and a triangle at the head and one at the sill, 800 mm on its two long sides/,
    );
    expect(text.wedge[1]).toMatch(/out from the hinge; nearer the hinge its edge strips close it\./);
    expect(text.wedge[2]).toMatch(/^The latch-side strip: 6 pieces with 5 joint strips/);
    expect(text.wedge[3]).toMatch(/^The hose port is in the latch-side strip’s piece [34]: /);
    expect(text.wedge[4]).toMatch(/along each leg and round its corner, and [\d.]+ mm up the latch side;/);
    for (const key of ['columns', 'rows', 'seal', 'fill'] as const) expect(text[key], key).toBe('');
  });

  it('a piece shorter than the joints need is a warning, in the turned sash’s words', () => {
    const short = ok({ ...TURN, openingHeightMm: 40, ports: [] });
    expect(describePlan(planWall(short), short).warnings).toContain(
      'The latch-side strip’s piece 1 is 26.6 mm long, under the 34 mm the joints need.',
    );
  });

  it('the files a dry run names are the files made, named for the turned sash’s parts', async () => {
    const choice = { format: 'stl', packaging: 'separate' } as const;
    const names = planFiles(PARAMS, choice).map((f) => f.name);
    expect(names).toContain('wedge-corner-print-2.stl');
    expect(names.filter((n) => /^wedge-triangle-\d+-of-4-print-2\.stl$/.test(n))).toHaveLength(4);
    expect(names.filter((n) => /^wedge-latch-\d+-of-6(-port-150)?-print-1\.stl$/.test(n))).toHaveLength(6);
    expect(names.filter((n) => /-port-150-/.test(n))).toHaveLength(1);
    expect(names.some((n) => /^wedge-(side|top)-/.test(n))).toBe(false);
    // A file for each of the 29 parts, and two lengths of gasket.
    expect(names).toHaveLength(29 + 2);
    const wall = await makeWall(PARAMS, choice, { engine });
    expect(wall.files.map((f) => f.name)).toEqual(names);
    expect(wall.summary.headline).toBe('A wedge for a turned sash: 55 parts and 28 TPU gaskets to print.');
  });
});
