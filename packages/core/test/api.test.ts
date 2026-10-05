// Backlog item api-library (#45): the package's main call and what it exports (Q80). The
// parameters are the page's (EXAMPLE_PARAMS is the page's starting point), checked by the
// page's own rules, and the files are the ones the page's download would save.
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';
import { DEFAULT_JOINT, EXAMPLE_PARAMS, ParamsError, loadEngine, makeWall, validateParams } from '../src/index.js';

describe('makeWall', () => {
  it('turns the page’s parameters into the plan and the files: STL in one zip', async () => {
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'zip' });
    expect(wall.plan.pieces).toHaveLength(15);
    expect(wall.summary.headline).toBe('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(wall.files.map((f) => f.name)).toEqual(['window-sealer-600x1000-stl.zip']);
    const names = Object.keys(unzipSync(wall.files[0]?.bytes ?? new Uint8Array()));
    expect(names).toHaveLength(15 + 6); // the pieces, 2 strip shapes, the cross, 3 edge shapes
    expect(names).toContain('cross-18x18-print-8.stl');
  });

  it('one 3MF holding everything', async () => {
    const wall = await makeWall(EXAMPLE_PARAMS, { format: '3mf', packaging: 'single' });
    expect(wall.files.map((f) => f.name)).toEqual(['window-sealer-600x1000.3mf']);
    const model = strFromU8(unzipSync(wall.files[0]?.bytes ?? new Uint8Array())['3D/3dModel.model'] ?? new Uint8Array());
    expect([...model.matchAll(/<item /g)]).toHaveLength(15 + 22 + 8 + 18);
  });

  it('uses an engine it is given', async () => {
    const engine = await loadEngine();
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' }, { engine });
    expect(wall.files).toHaveLength(15 + 6);
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
    const tiny = await makeWall({ ...EXAMPLE_PARAMS, openingWidthMm: -5 }, { format: 'stl', packaging: 'zip' })
      .catch((e: unknown) => e);
    expect((tiny as ParamsError).errors).toHaveProperty('openingWidthMm');
  });

  it('refuses "one file" for STL, which holds a single object', async () => {
    await expect(makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'single' })).rejects.toThrow(
      RangeError,
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
