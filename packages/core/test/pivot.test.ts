// A pivot window (pivot-window, #162; docs/pivot.md): a sash turned on an axis across its middle,
// its lower half out and its upper half in. Below the axis the frame is clear from inside, and a
// wall goes in as in a frame with no track, its top edge against the sash where it crosses the
// frame; above it, the sash leaves the wedge a tilted sash does, its apex at the axis. One window
// type gives both, in one plan and one download.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  describePlan,
  loadEngine,
  makeWall,
  pivotWall,
  pivotWedge,
  planFiles,
  planWall,
  readParams,
  readSettings,
  requireWedgeSetup,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const PIVOT = {
  openingWidthMm: 800,
  openingHeightMm: 1200,
  edges: { window: 'pivot' },
  pivot: { atMm: 600, gapMm: 150 },
  seal: { kind: 'tpu' },
  ports: [],
};
const ok = (input: unknown): Params => {
  const r = readSettings(input, {});
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok(PIVOT);
const FORM = toFormValues(PARAMS);
const errors = (overrides: FormValues) => {
  const r = readParams({ ...FORM, ...overrides });
  return r.ok ? {} : r.errors;
};
const CHOICE = { format: 'stl', packaging: 'separate' } as const;

describe('the pivot window as a window type', () => {
  it('a frame all round but the top, which the sash presses; its axis and gap settings of their own', () => {
    expect(WINDOW_PRESETS.pivot).toEqual({ top: 'sash', bottom: 'frame', left: 'frame', right: 'frame' });
    expect(SETTINGS.find((s) => s.field === 'window')?.values).toContain('pivot');
    expect(SETTINGS.find((s) => s.field === 'pivotAtMm')?.path).toBe('pivot.atMm');
    expect(SETTINGS.find((s) => s.field === 'pivotGapMm')?.path).toBe('pivot.gapMm');
    expect(SETTINGS.find((s) => s.field === 'pivotPitchDeg')?.path).toBe('pivot.pitchDeg');
    expect(PARAMS.pivot).toEqual({ atMm: 600, gapMm: 150, pitchDeg: 90, swingsIn: 'top' });
    expect(PARAMS.openingHeightMm).toBe(1200);
    expect(EXAMPLE_PARAMS.pivot).toEqual({ atMm: 500, gapMm: 130, pitchDeg: 90, swingsIn: 'top' });
    const back = readParams({ ...FORM, pivotPitchDeg: '35' });
    expect(back.ok && back.params.pivot).toEqual({ atMm: 600, gapMm: 150, pitchDeg: 35, swingsIn: 'top' });
  });

  it('the wall below the axis and the wedge above it', () => {
    const wall = pivotWall(PARAMS);
    expect([wall.openingWidthMm, wall.openingHeightMm]).toEqual([800, 600]);
    expect(wall.edges.roles).toEqual(WINDOW_PRESETS.pivot);
    const wedge = pivotWedge(PARAMS);
    expect([wedge.openingWidthMm, wedge.openingHeightMm, wedge.tilt.gapMm]).toEqual([800, 600, 150]);
    const setup = requireWedgeSetup(wedge);
    expect(setup.wedge.side.legMm).toBe(600);
    expect(setup.port).toBeUndefined();
  });

  it('the axis inside the opening, with room for the wall below it and the wedge above', () => {
    const inside = 'The pivot is 1300 mm up: give its height inside the opening, above 0 and below 1200 mm.';
    expect(errors({ pivotAtMm: '1300' })).toEqual({ pivotAtMm: inside });
    expect(errors({ pivotAtMm: '0' })).toHaveProperty('pivotAtMm');
    expect(errors({ pivotAtMm: '10' })).toEqual({
      pivotAtMm: 'The wall below the pivot is 10 mm tall. Too small for the edge strips.',
    });
    expect(errors({ pivotAtMm: '1190' })).toEqual({
      pivotGapMm:
        'The gap at the top is 150 mm: the sash’s top moves in less than the 10 mm from the pivot to the top.',
    });
    expect(errors({ jointStyle: 'dovetails' })).toEqual({});
    expect(errors({ pieceSource: 'sheet' })).toEqual({});
    expect(errors({ pivotGapMm: '40' })).toEqual({
      pivotGapMm:
        'The gap at the top is 40 mm; it needs at least 58 mm, for an edge strip each side of the top strip and a ' +
        'piece between them.',
    });
    expect(errors({ pivotGapMm: '600' })).toEqual({
      pivotGapMm:
        'The gap at the top is 600 mm: the sash’s top moves in less than the 600 mm from the pivot to the top.',
    });
    expect(errors({ seal: 'tape' })).toHaveProperty('seal');
  });

  it('the wall below takes what a wall takes, the wedge above staying as a wedge is', () => {
    const port = ok({ ...PIVOT, ports: [{ hoseMm: 150 }], fill: { kind: 'grid' } });
    expect(port.ports).toHaveLength(1);
    expect(requireWedgeSetup(pivotWedge(port)).port).toBeUndefined();
    expect(pivotWedge(port).fill.kind).toBe('sealed');
    const names = planFiles(port, CHOICE).map((f) => f.name);
    expect(names.filter((n) => /^piece-.*-port-150\.stl$/.test(n))).toHaveLength(1);
    expect(names.some((n) => /^wedge-top-\d+-of-\d+-port-/.test(n))).toBe(false);
  });
});

describe('a centre-pivot roof window', () => {
  it('upright, the plan has no roof lines; on a roof, the wall below says what pulls it out, as a roof window’s', () => {
    expect(describePlan(planWall(PARAMS), PARAMS).roof).toEqual([]);
    const roof = ok({ ...PIVOT, pivot: { atMm: 600, gapMm: 150, pitchDeg: 35 }, ports: [{ hoseMm: 150 }] });
    const text = describePlan(planWall(roof), roof);
    expect(text.roof).toHaveLength(3);
    expect(text.roof[0]).toMatch(/^On a roof at 35°, 82% of the wall’s weight pulls it out of the frame into the room/);
    expect(text.roof[1]).toBe('Hang the hose from a hook above the window, so its weight does not pull on the wall.');
  });

  it('refuses a pitch a pivot window does not have, where it is given', () => {
    const message = 'A pivot window lies at 15 to 90° from level: 90 for an upright one, less in a roof.';
    expect(errors({ pivotPitchDeg: '10' })).toEqual({ pivotPitchDeg: message });
    expect(errors({ pivotPitchDeg: '91' })).toEqual({ pivotPitchDeg: message });
    expect(errors({ pivotPitchDeg: '15' })).toEqual({});
  });
});

describe('a pivot window’s plan and files', () => {
  it('the plan is the wall’s, with the wedge’s lines and the pivot’s own', () => {
    const text = describePlan(planWall(PARAMS), PARAMS);
    const wall = describePlan(planWall(pivotWall(PARAMS)), pivotWall(PARAMS));
    expect(text.headline).toMatch(
      /^\d+ pieces: .*, below the pivot; above it, a wedge of \d+ parts and \d+ TPU gaskets$/,
    );
    expect(text.headline.startsWith(`${wall.headline}, below the pivot;`)).toBe(true);
    expect(text.span).toMatch(/for a 800 × 600 mm opening below the pivot\.$/);
    expect(text.columns).toBe(wall.columns);
    expect(text.wedge).toHaveLength(4);
    expect(text.wedge[0]).toMatch(/^The sash leans 14\.5° in\./);
    expect(text.wedge[1]).toMatch(/ joint strips, from [\d.]+ mm above the pivot; /);
    expect(text.pivot).toEqual([
      'A pivot window: the wall goes below the pivot, 600 mm up, its top edge pressed by the sash where it crosses ' +
        'the frame; the wedge goes above it, its point at the pivot. Check that the pivot’s hinges, at the jambs, ' +
        'clear the wall’s top corners and the wedge’s points; a notch in a side edge makes room for one that does ' +
        'not.',
    ]);
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).pivot).toEqual([]);
  });

  it('the files are the wall’s and the wedge’s, its gaskets named apart, as a dry run names them', async () => {
    const names = planFiles(PARAMS, CHOICE).map((f) => f.name);
    const wallNames = planFiles(pivotWall(PARAMS), CHOICE).map((f) => f.name);
    for (const n of wallNames) expect(names, n).toContain(n);
    expect(names.filter((n) => n.startsWith('wedge-gasket-')).length).toBeGreaterThan(0);
    expect(names.filter((n) => n.startsWith('wedge-corner-'))).toEqual(['wedge-corner-print-2.stl']);
    expect(new Set(names).size).toBe(names.length);
    const wall = await makeWall(PARAMS, CHOICE, { engine });
    expect(wall.files.map((f) => f.name)).toEqual(names);
    expect(planFiles(PARAMS, { format: 'stl', packaging: 'zip' })).toEqual([
      { name: 'window-sealer-800x1200-stl.zip', type: 'application/zip' },
    ]);
  });
});

// A vertical pivot (pivot-vertical, #179): one side of the sash in, the other out. The wall goes
// on the side that swings out, its edge at the pivot pressed by the sash; the turned sash's wedge
// on the side that swings in, its point at the pivot and its strip up the free side.
describe('a pivot on an upright axis', () => {
  const VERTICAL = { ...PIVOT, pivot: { atMm: 400, gapMm: 150, swingsIn: 'right' } };
  const RIGHT = ok(VERTICAL);
  const LEFT = ok({ ...VERTICAL, pivot: { atMm: 300, gapMm: 150, swingsIn: 'left' } });
  const errorsOf = (p: Params, overrides: FormValues) => {
    const r = readParams({ ...toFormValues(p), ...overrides });
    return r.ok ? {} : r.errors;
  };

  it('a setting of its own for the half that swings in, the edge at the pivot preset to the sash', () => {
    expect(SETTINGS.find((s) => s.field === 'pivotSwingsIn')).toMatchObject({
      path: 'pivot.swingsIn',
      values: ['top', 'left', 'right'],
    });
    expect(EXAMPLE_PARAMS.pivot.swingsIn).toBe('top');
    expect(RIGHT.edges.roles).toEqual({ top: 'frame', bottom: 'frame', left: 'frame', right: 'sash' });
    expect(LEFT.edges.roles).toEqual({ top: 'frame', bottom: 'frame', left: 'sash', right: 'frame' });
    const back = readParams(toFormValues(RIGHT));
    expect(back.ok && back.params.pivot).toEqual({ atMm: 400, gapMm: 150, pitchDeg: 90, swingsIn: 'right' });
  });

  it('the wall on the side that swings out, the turned sash’s wedge on the side that swings in', () => {
    expect([pivotWall(RIGHT).openingWidthMm, pivotWall(RIGHT).openingHeightMm]).toEqual([400, 1200]);
    expect([pivotWall(LEFT).openingWidthMm, pivotWall(LEFT).openingHeightMm]).toEqual([500, 1200]);
    const wedge = pivotWedge(RIGHT);
    expect([wedge.edges.window, wedge.openingWidthMm, wedge.openingHeightMm, wedge.turn.gapMm]).toEqual([
      'turn',
      400,
      1200,
      150,
    ]);
    expect(pivotWedge(LEFT).openingWidthMm).toBe(300);
    expect(requireWedgeSetup(wedge).wedge.form).toBe('turn');
  });

  it('the pivot inside the width, the gap less than the side that swings in, the pitch not asked', () => {
    expect(errorsOf(RIGHT, { pivotAtMm: '900' })).toEqual({
      pivotAtMm: 'The pivot is 900 mm from the left jamb: give its place inside the opening, above 0 and below 800 mm.',
    });
    expect(errorsOf(RIGHT, { pivotAtMm: '10' })).toEqual({
      pivotAtMm: 'The wall beside the pivot is 10 mm wide. Too small for the edge strips.',
    });
    expect(errorsOf(RIGHT, { pivotGapMm: '450' })).toEqual({
      pivotGapMm:
        'The gap at the free side is 450 mm: the sash’s free side moves in less than the 400 mm from the pivot to it.',
    });
    expect(errorsOf(RIGHT, { pivotGapMm: '40' }).pivotGapMm).toMatch(/^The gap at the free side is 40 mm; it needs/);
    expect(errorsOf(RIGHT, { pivotPitchDeg: '10' })).toEqual({});
    expect(errorsOf(RIGHT, { pivotSwingsIn: 'bottom' })).toHaveProperty('pivotSwingsIn');
  });

  it('the plan says which side each goes, the wedge’s strip up the free side', () => {
    const text = describePlan(planWall(RIGHT), RIGHT);
    expect(text.headline).toMatch(/, left of the pivot; right of it, a wedge of \d+ parts and \d+ TPU gaskets$/);
    expect(text.span).toMatch(/for a 400 × 1200 mm opening left of the pivot\.$/);
    expect(text.wedge[0]).toMatch(/^The sash turns [\d.]+° in\. The wedge it leaves: a jamb strip 1200 mm long/);
    expect(text.wedge[1]).toMatch(/ mm out from the pivot; nearer the pivot its edge strips close it\./);
    expect(text.pivot).toEqual([
      'A pivot window on an upright axis: the wall goes left of the pivot, 400 mm from the left jamb, its right ' +
        'edge pressed by the sash where it crosses the frame; the wedge goes right of it, its point at the pivot. ' +
        'Check that the pivot’s hinges, at the head and the sill, clear the wall’s corners and the wedge’s points; ' +
        'a notch in the top or bottom edge makes room for one that does not.',
    ]);
    expect(describePlan(planWall(LEFT), LEFT).headline).toMatch(/, right of the pivot; left of it, a wedge of /);
    const pitched = ok({ ...VERTICAL, pivot: { ...VERTICAL.pivot, pitchDeg: 35 } });
    expect(describePlan(planWall(pitched), pitched).roof).toEqual([]);
  });

  it('the files are the wall’s and the turned wedge’s, its strip named for the jamb', async () => {
    const names = planFiles(RIGHT, CHOICE).map((f) => f.name);
    expect(names.some((n) => n.startsWith('wedge-jamb-'))).toBe(true);
    expect(names.some((n) => n.includes('latch'))).toBe(false);
    expect(names.some((n) => n.startsWith('wedge-triangle-'))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
    expect((await makeWall(RIGHT, CHOICE, { engine })).files.map((f) => f.name)).toEqual(names);
  });
});
