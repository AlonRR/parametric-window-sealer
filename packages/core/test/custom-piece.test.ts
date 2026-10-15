// A whole piece of your own (mesh-custom-piece, #41): a mesh read as mesh-import reads one, turned
// so the side named faces the room, centred on its piece and trimmed to the area inside the border
// the joints take, with a frame as thick as the pieces round it for the joints.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  NO_CUSTOM_PIECE,
  buildPiecesWith,
  customPanel,
  describePlan,
  fittingSource,
  loadEngine,
  placedFittings,
  planFiles,
  planWall,
  readApplianceModel,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { ApplianceModel, FormValues } from '../src/index.js';
import { modelFileOf } from './model-file.js';

const engine = await loadEngine();
const { Manifold } = engine;
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });
const probe = (solid: InstanceType<typeof Manifold>, x: number, y: number, z: number, size = 0.1) => {
  const cube = Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

// A piece drawn lying flat, as a piece is drawn to print: a plate 5 mm deep with a 40 mm round hole
// through its middle.
const plate = (side: number) =>
  modelFileOf(
    Manifold.cube([side, side, 5]).subtract(Manifold.cylinder(7, 20, 20, 64).translate([side / 2, side / 2, -1])),
  );
const PLATE = plate(200);
const turned = (file: string): ApplianceModel => {
  const r = readApplianceModel(file, 'top');
  if (!r.ok) throw new Error(r.message);
  return r.model;
};

describe('its piece', () => {
  const size = { widthMm: 197.7, heightMm: 198.6, thicknessMm: 3 };

  it('the mesh trimmed to the area inside the border, and a frame as thick as the pieces round it', () => {
    const solid = customPanel(engine, size, turned(PLATE), 10);
    try {
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], max[0], max[1]].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 197.7, 198.6]);
      expect(max[2]).toBeCloseTo(5, 6);
      expect(solid.genus()).toBe(1);
      expect(probe(solid, 5, 5, 1.5)).toBeGreaterThan(0); // the frame, for the joints
      expect(probe(solid, 5, 5, 4)).toBe(0); // as thick as the pieces
      expect(probe(solid, 5, 100, 4)).toBe(0);
      expect(probe(solid, 15, 100, 4.5)).toBeGreaterThan(0); // the mesh, inside the border
      expect(probe(solid, 15, 100, 5.5)).toBe(0);
      expect(probe(solid, 98.85, 99.3, 2)).toBe(0); // its hole, through the wall
      expect(probe(solid, 98.85, 99.3 + 21, 2)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });
});

describe('the custom piece in the wall', () => {
  it('starts with none, and reads it into the bottom row’s middle piece', () => {
    expect(EXAMPLE_PARAMS.customPiece).toEqual(NO_CUSTOM_PIECE);
    expect(NO_CUSTOM_PIECE).toEqual({ file: '', view: 'top', column: 0, row: 0 });
    const r = read({ customPieceFile: PLATE });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.params.customPiece).toEqual({ file: PLATE, view: 'top', column: 2, row: 1 });
    expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses one too small for its piece, a shared piece, and half a piece', () => {
    expect(read({ customPieceFile: plate(150) })).toEqual({
      ok: false,
      errors: {
        customPieceFile:
          'The custom piece is 150 × 150 mm seen from the room; column 2, row 1 needs one at least 177.7 × 178.6 mm, ' +
          'its area inside the 10 mm border the joints take, or the wall would be left open round it. Draw it ' +
          'larger, or make the pieces smaller.',
      },
    });
    expect(read({ customPieceFile: PLATE, fans: '120@2,1' })).toEqual({
      ok: false,
      errors: { customPieceFile: 'The custom piece and fan 1 are both in column 2, row 1; give each its own piece.' },
    });
    expect(read({ customPieceFile: PLATE, modelFile: modelFileOf(Manifold.cube([120, 50, 80])) })).toEqual({
      ok: false,
      errors: {
        customPieceFile: 'The custom piece and the model are both in column 2, row 1; give each its own piece.',
      },
    });
    expect(read({ customPieceFile: PLATE, customPieceColumn: '1' })).toEqual({
      ok: false,
      errors: { customPieceRow: 'Give the custom piece’s column and row, or 0 for both.' },
    });
    expect(read({ customPieceFile: 'bm90IGEgbWVzaA==' })).toEqual({
      ok: false,
      errors: { customPieceFile: 'The file is not a mesh: choose an STL, OBJ or 3MF file.' },
    });
    // Without a file, its view and piece are not read.
    expect(read({ customPieceView: 'side', customPieceColumn: 'x' }).ok).toBe(true);
  });

  it('is built into its piece, named after it, and given a line in the plan', () => {
    const r = read({ customPieceFile: PLATE, customPieceColumn: '1', customPieceRow: '2' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const { params } = r;
    const plan = planWall(params);
    const built = buildPiecesWith(engine, plan, 3, placedFittings(fittingSource(params)));
    try {
      const piece = built.find((b) => b.column === 0 && b.row === 1);
      expect(piece?.tag).toBe('-custom-200x200');
      expect(piece?.solid.genus()).toBe(1);
    } finally {
      for (const b of built) b.solid.delete();
    }
    const names = planFiles(params, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.includes('-custom-'))).toEqual([
      expect.stringMatching(/^piece-c1-r2-.*-custom-200x200\.stl$/),
    ]);
    expect(describePlan(plan, params).customPiece).toEqual([
      'Custom piece: the piece in column 1, row 2, from the STL file: 200 × 200 mm seen from its top and 5 mm deep, ' +
        'trimmed to fit inside a 10 mm frame as thick as the pieces, for the joints.',
    ]);
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).customPiece).toEqual([]);
  });
});
