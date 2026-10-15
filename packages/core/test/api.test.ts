// Backlog item api-library (#45): the package's main call and what it exports (Q80). The
// parameters are the page's (EXAMPLE_PARAMS is the page's starting point), checked by the
// page's own rules, and the files are the ones the page's download would save.
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';
import {
  DEFAULT_JOINT,
  DEFAULT_RIM,
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  ParamsError,
  WINDOW_PRESETS,
  loadEngine,
  makeFiles,
  makeWall,
  planFiles,
  validateParams,
} from '../src/index.js';
import type { DownloadChoice, Params } from '../src/index.js';

describe('makeWall', () => {
  it('turns the page’s parameters into the plan and the files: STL in one zip', async () => {
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'zip' });
    expect(wall.plan.pieces).toHaveLength(15);
    expect(wall.summary.headline).toBe('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(wall.files.map((f) => f.name)).toEqual(['window-sealer-600x1000-stl.zip']);
    const names = Object.keys(unzipSync(wall.files[0]?.bytes ?? new Uint8Array()));
    // The pieces, 2 strip shapes, the cross, 3 edge shapes, and the stiffeners' clips (#111).
    expect(names).toHaveLength(15 + 6 + 1);
    expect(names).toContain('stiffener-clip-print-4.stl');
    expect(names).toContain('cross-18x18-print-8.stl');
  });

  it('one 3MF holding everything', async () => {
    const wall = await makeWall(EXAMPLE_PARAMS, { format: '3mf', packaging: 'single' });
    expect(wall.files.map((f) => f.name)).toEqual(['window-sealer-600x1000.3mf']);
    const model = strFromU8(
      unzipSync(wall.files[0]?.bytes ?? new Uint8Array())['3D/3dModel.model'] ?? new Uint8Array(),
    );
    expect([...model.matchAll(/<item /g)]).toHaveLength(15 + 22 + 8 + 18 + 4); // with 4 stiffener clips
  });

  it('uses an engine it is given', async () => {
    const engine = await loadEngine();
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' }, { engine });
    expect(wall.files).toHaveLength(15 + 6 + 1);
  });

  it('refuses what the page marks, naming each field', async () => {
    const bad = { ...EXAMPLE_PARAMS, joint: { ...DEFAULT_JOINT, slideMm: 8 } };
    const error = await makeWall(bad, { format: 'stl', packaging: 'zip' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ParamsError);
    expect(error).toBeInstanceOf(RangeError);
    expect((error as ParamsError).errors).toEqual({
      slideMm: 'Make it less than the slot depth, so a piece always stays in its slot.',
    });
    expect((error as ParamsError).message).toContain('slideMm');
    const tiny = await makeWall({ ...EXAMPLE_PARAMS, openingWidthMm: -5 }, { format: 'stl', packaging: 'zip' }).catch(
      (e: unknown) => e,
    );
    expect((tiny as ParamsError).errors).toHaveProperty('openingWidthMm');
  });

  it('refuses "one file" for STL, which holds a single object', async () => {
    await expect(makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'single' })).rejects.toThrow(RangeError);
  });
});

// What a dry run lists (Q89): the files makeFiles would write, without building anything.
describe('planFiles', () => {
  const CHOICES: DownloadChoice[] = [
    { format: 'stl', packaging: 'separate' },
    { format: 'stl', packaging: 'zip' },
    { format: '3mf', packaging: 'separate' },
    { format: '3mf', packaging: 'single' },
  ];
  const WALLS: [string, Params][] = [
    ['the example slider', EXAMPLE_PARAMS],
    [
      'a hung window with a filler row and a custom printer',
      {
        ...EXAMPLE_PARAMS,
        openingWidthMm: 812.5,
        openingHeightMm: 455,
        printer: { kind: 'custom', widthMm: 250, heightMm: 210 },
        height: { mode: 'full-plus-filler', filler: 'start', leftover: 'spread' },
        edges: { ...EXAMPLE_PARAMS.edges, window: 'hung', roles: WINDOW_PRESETS.hung },
      },
    ],
    ['a single piece', { ...EXAMPLE_PARAMS, openingWidthMm: 150, openingHeightMm: 120 }],
    [
      'two hose ports',
      {
        ...EXAMPLE_PARAMS,
        ports: [
          { hoseMm: 150, column: 2, row: 1 },
          { hoseMm: 130, column: 1, row: 4 },
        ],
      },
    ],
    [
      'the printed TPU seal everywhere, with a hose port',
      {
        ...EXAMPLE_PARAMS,
        ports: [{ hoseMm: 150, column: 2, row: 1 }],
        seal: { kind: 'tpu', tape: { ...DEFAULT_TAPE, sides: true, port: true, joints: true } },
      },
    ],
    [
      'two measured cutouts lined with TPU, beside a hose port',
      {
        ...EXAMPLE_PARAMS,
        ports: [{ hoseMm: 150, column: 2, row: 1 }],
        cutouts: [
          { widthMm: 120, heightMm: 80, column: 1, row: 1 },
          { widthMm: 120, heightMm: 80, column: 3, row: 3 },
        ],
        rim: DEFAULT_RIM,
        seal: { kind: 'tpu', tape: DEFAULT_TAPE },
      },
    ],
  ];
  const cases = WALLS.flatMap(([wall, params]) =>
    CHOICES.map((choice) => [wall, `${choice.format} ${choice.packaging}`, params, choice] as const),
  );

  it.each(cases)('%s, %s: the names and types makeFiles writes', async (_wall, _choice, params, choice) => {
    const engine = await loadEngine();
    const written = makeFiles(engine, params, choice).map(({ name, type }) => ({ name, type }));
    expect(planFiles(params, choice)).toEqual(written);
  });

  it('answers at once, without the engine', () => {
    const files = planFiles(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' });
    expect(Array.isArray(files)).toBe(true);
    expect(files).toHaveLength(15 + 6 + 1);
  });

  it('refuses what makeWall refuses', () => {
    expect(() => planFiles({ ...EXAMPLE_PARAMS, thicknessMm: 0 }, CHOICES[0] as DownloadChoice)).toThrow(ParamsError);
    expect(() => planFiles(EXAMPLE_PARAMS, { format: 'stl', packaging: 'single' })).toThrow(
      'Only 3MF holds every piece in one file; STL holds one object',
    );
  });
});

describe('validateParams', () => {
  it('accepts the page’s starting point and names what is wrong otherwise', () => {
    expect(validateParams(EXAMPLE_PARAMS)).toEqual({});
    expect(Object.keys(validateParams({ ...EXAMPLE_PARAMS, thicknessMm: 0 }))).toEqual(['thicknessMm']);
  });
});

describe('the package’s exports (Q80): the main call and the steps underneath', () => {
  const FUNCTIONS = [
    'makeWall',
    'validateParams',
    'loadEngine',
    'readParams',
    'toFormValues',
    'planWall',
    'planParts',
    'describePlan',
    'divideAxis',
    'layoutGrid',
    'planJoints',
    'partShapes',
    'panelSpan',
    'planEdges',
    'edgeShapes',
    'edgeProfile',
    'plainPanel',
    'buildPieces',
    'stripSolid',
    'crossSolid',
    'edgeStripSolid',
    'meshOf',
    'toStl',
    'to3mf',
    'packageDownload',
    'buildExport',
    'makeFiles',
    'planFiles',
    'maxPieceSize',
    'minPieceMm',
  ];
  it.each(FUNCTIONS)('%s', (name) => {
    expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
  });

  it('and the starting values', () => {
    expect(api.EXAMPLE_PARAMS.openingWidthMm).toBe(600);
    expect(api.DEFAULT_JOINT.slotMm).toBe(8);
    expect(api.EXAMPLE_TRACK.widthMm).toBe(15);
    expect(api.DEFAULT_MAX_PIECE).toEqual({ widthMm: 200, heightMm: 200 });
  });
});
