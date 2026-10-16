// A wedge for a tilted sash, as a window type (sash-wedge, #159; docs/wedge.md). Choosing it, the
// opening is the frame's, the gap at the top is asked for, every edge is pressed against the frame
// or the sash with its printed TPU gasket, and the plan, the files and their names are the
// wedge's. A wall's other settings have no place in it and are refused, one by one.
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
  tiltSetup,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';
import { modelFileOf } from './model-file.js';

const engine = await loadEngine();
const TILT = {
  openingWidthMm: 800,
  openingHeightMm: 1200,
  edges: { window: 'tilt' },
  tilt: { gapMm: 150 },
  seal: { kind: 'tpu' },
  ports: [{ hoseMm: 150 }],
};
const settings = (input: unknown, overrides: FormValues = {}) => readSettings(input, overrides);
const ok = (input: unknown, overrides: FormValues = {}): Params => {
  const r = settings(input, overrides);
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok(TILT);
const FORM = toFormValues(PARAMS);
const errors = (overrides: FormValues) => {
  const r = readParams({ ...FORM, ...overrides });
  return r.ok ? {} : r.errors;
};

describe('the window type', () => {
  it('every edge pressed against the frame or the sash; the gap at the top a setting of its own', () => {
    expect(WINDOW_PRESETS.tilt).toEqual({ top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' });
    const window = SETTINGS.find((s) => s.field === 'window');
    expect(window?.values).toContain('tilt');
    expect(SETTINGS.find((s) => s.field === 'tiltGapMm')?.path).toBe('tilt.gapMm');
    expect(PARAMS.edges.roles).toEqual(WINDOW_PRESETS.tilt);
    expect(PARAMS.tilt).toEqual({ gapMm: 150 });
    expect(EXAMPLE_PARAMS.tilt).toEqual({ gapMm: 130 });
  });

  it('the gap read back as the form writes it, and read only for a tilted sash', () => {
    const back = readParams(FORM);
    expect(back.ok && back.params.tilt).toEqual({ gapMm: 150 });
    expect(readParams({ ...toFormValues(EXAMPLE_PARAMS), tiltGapMm: 'wide' }).ok).toBe(true);
    expect(errors({ tiltGapMm: 'wide' })).toHaveProperty('tiltGapMm');
  });

  it('a gap the wedge cannot take is a problem with the gap', () => {
    expect(errors({ tiltGapMm: '40' })).toEqual({
      tiltGapMm:
        'The gap at the top is 40 mm; it needs at least 58 mm, for an edge strip each side of the top strip and a ' +
        'piece between them.',
    });
    expect(errors({ tiltGapMm: '1200' })).toEqual({
      tiltGapMm: 'The gap at the top is 1200 mm: a tilted sash’s top moves in less than the window is tall.',
    });
    // The corner pieces span the gap: with a 100 mm printer, at most what it makes.
    expect(errors({ printer: 'custom', customWidthMm: '100', customHeightMm: '100', ports: '' })).toEqual({
      tiltGapMm: 'The gap at the top is 150 mm: the corner pieces span it, and the printer makes pieces up to 100 mm.',
    });
  });

  it('held by its gaskets’ squeeze: a printed TPU seal', () => {
    expect(errors({ seal: 'tape' })).toHaveProperty('seal');
    expect(errors({ seal: 'none' })).toHaveProperty('seal');
  });

  it('one hose port, in the top strip, sized there', () => {
    expect(PARAMS.ports).toEqual([{ hoseMm: 150, column: 1, row: 1 }]);
    expect(errors({ ports: '150 130' })).toEqual({ ports: 'A tilted sash’s wedge takes one hose port.' });
    expect(errors({ ports: '400' })).toEqual({
      ports: 'A 400 mm hose’s collar is wider than the printer makes a piece: 200 mm.',
    });
    expect(readParams({ ...FORM, ports: '' }).ok).toBe(true);
  });

  it('none of a wall’s other settings, each refused where it is set', () => {
    const plate = modelFileOf(engine.Manifold.cube([100, 100, 5]));
    const cases: [FormValues, string, string][] = [
      [{ jointStyle: 'dovetails' }, 'jointStyle', 'A tilted sash’s wedge joins its pieces with strips.'],
      [{ wall: 'double' }, 'wall', 'A tilted sash’s wedge is a single skin.'],
      [{ pieceSource: 'sheet' }, 'pieceSource', 'A tilted sash’s wedge is printed; none of it is cut from sheet.'],
      [{ fill: 'grid' }, 'fill', 'A tilted sash’s wedge takes no pattern: its pieces are sealed.'],
      [{ pieceFills: '1,1=grid' }, 'pieceFills', 'A tilted sash’s wedge takes no pattern: its pieces are sealed.'],
      [{ cutouts: '120x80' }, 'cutouts', 'A tilted sash’s wedge has room for a hose port only.'],
      [{ fans: '120' }, 'fans', 'A tilted sash’s wedge has room for a hose port only.'],
      [{ clamps: '120x80' }, 'clamps', 'A tilted sash’s wedge has room for a hose port only.'],
      [{ inserts: '120x80' }, 'inserts', 'A tilted sash’s wedge has room for a hose port only.'],
      [{ modelFile: plate }, 'modelFile', 'A tilted sash’s wedge has room for a hose port only.'],
      [{ customPieceFile: plate }, 'customPieceFile', 'A tilted sash’s wedge has room for a hose port only.'],
      [
        { topEdge: 'track' },
        'topEdge',
        'A tilted sash’s wedge is pressed against the frame and the sash all round: every edge is a frame edge.',
      ],
    ];
    for (const [overrides, field, message] of cases) {
      expect(errors(overrides), field).toEqual({ [field]: message });
    }
  });
});

describe('a tilted sash’s plan and files', () => {
  const setup = tiltSetup(PARAMS);
  if ('problem' in setup) throw new Error(setup.problem);

  it('the plan says what the wedge is, and the wall’s grid is not in it', () => {
    const text = describePlan(planWall(PARAMS), PARAMS);
    expect(text.headline).toBe('A wedge for a tilted sash: 59 parts and 32 TPU gaskets to print.');
    expect(text.span).toBe('For a 800 × 1200 mm opening, the sash 150 mm in at the top.');
    expect(text.joints).toBe('Joints: 11 joint strips.');
    expect(text.edges).toBe('Edges: 32 edge strips and 2 corner pieces.');
    expect(text.wedge).toHaveLength(5);
    expect(text.wedge[0]).toMatch(/^The sash leans 7\.2° in\./);
    for (const key of ['columns', 'rows', 'seal', 'fill'] as const) expect(text[key], key).toBe('');
    for (const key of ['ports', 'cutouts', 'fans', 'units', 'frame', 'shutter'] as const) {
      expect(text[key], key).toEqual([]);
    }
  });

  it('a wall’s weep holes, stiffeners and test coupon, on by default, are left out of it', () => {
    const own = ok(TILT, { rain: 'yes', stiffen: 'yes', coupon: 'yes' });
    const text = describePlan(planWall(own), own);
    expect([text.rain, text.stiffeners]).toEqual([[], []]);
    expect(planFiles(own, { format: 'stl', packaging: 'separate' })).toEqual(
      planFiles(PARAMS, { format: 'stl', packaging: 'separate' }),
    );
  });

  it('a piece shorter than the joints need is a warning, as in a wall', () => {
    const narrow = ok({ ...TILT, openingWidthMm: 40, ports: [] });
    expect(describePlan(planWall(narrow), narrow).warnings).toContain(
      'The top strip’s piece 1 is 26.6 mm long, under the 34 mm the joints need.',
    );
  });

  it('a wall’s plan has no wedge in it', () => {
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).wedge).toEqual([]);
  });

  it('the files a dry run names are the files made, one for each part, packed as chosen', async () => {
    const choice = { format: 'stl', packaging: 'separate' } as const;
    const planned = planFiles(PARAMS, choice);
    expect(planned.map((f) => f.name)).toContain('wedge-corner-print-2.stl');
    expect(planned.map((f) => f.name)).toContain('wedge-top-2-of-4-port-150-print-1.stl');
    expect(planned.filter((f) => f.name.startsWith('gasket-'))).toHaveLength(2);
    // A file for each of the 27 parts, and two lengths of gasket.
    expect(planned).toHaveLength(27 + 2);
    const wall = await makeWall(PARAMS, choice, { engine });
    expect(wall.files.map((f) => f.name)).toEqual(planned.map((f) => f.name));
    expect(wall.summary.wedge).toHaveLength(5);
    expect(planFiles(PARAMS, { format: 'stl', packaging: 'zip' })).toEqual([
      { name: 'window-sealer-800x1200-stl.zip', type: 'application/zip' },
    ]);
    expect(planFiles(PARAMS, { format: '3mf', packaging: 'single' }).map((f) => f.name)).toEqual([
      'window-sealer-800x1200.3mf',
    ]);
  });
});
