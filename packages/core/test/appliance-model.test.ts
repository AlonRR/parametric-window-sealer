// The wall cut round an imported model of the appliance (mesh-appliance, #35): the model's file
// read as mesh-import reads it, turned so the side the user names faces the room, its outline seen
// from the room cut through one piece with the cutout's clearance and rim round it, checked against
// its piece as the other fittings are, and given its line in the plan.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RIM,
  EXAMPLE_PARAMS,
  MODEL_VIEWS,
  NO_MODEL,
  buildPiecesWith,
  describePlan,
  encodeModelFile,
  fittingSource,
  loadEngine,
  modelOutline,
  modelPanel,
  placedFittings,
  planFiles,
  planWall,
  readApplianceModel,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { ApplianceModel, FormValues, ModelView } from '../src/index.js';
import { modelFileOf, stlOf } from './model-file.js';

const engine = await loadEngine();
const { Manifold } = engine;

// A box 120 mm across (x), 50 mm deep (y) and 80 mm high (z), as a modelling program draws an
// appliance standing up with its front towards -y.
const BOX = modelFileOf(Manifold.cube([120, 50, 80]));
// A box and, apart from it to its right, a small block at its foot: which way the model faces shows.
const TWO = modelFileOf(
  Manifold.union(Manifold.cube([100, 50, 80]), Manifold.cube([20, 50, 20]).translate([110, 0, 0])),
);
// A frame: a box with a hole through it from front to back.
const FRAME = modelFileOf(Manifold.cube([100, 50, 80]).subtract(Manifold.cube([60, 60, 40]).translate([20, -5, 20])));

const model = (file: string, view: ModelView = 'front'): ApplianceModel => {
  const read = readApplianceModel(file, view);
  if (!read.ok) throw new Error(read.message);
  return read.model;
};

const probe = (solid: InstanceType<typeof Manifold>, x: number, y: number, z: number, size = 0.1) => {
  const cube = Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('reading the model', () => {
  it('takes the file as its bytes in base64, as the page and the command give it', () => {
    expect(encodeModelFile(new Uint8Array([0, 1, 2, 250, 251, 252, 253]))).toBe('AAEC+vv8/Q==');
    expect(encodeModelFile(new Uint8Array([77, 97]))).toBe('TWE=');
    expect(encodeModelFile(new Uint8Array([]))).toBe('');
  });

  it('turns it so the side named faces the room: its outline seen from the room, and its depth', () => {
    const seen: Record<ModelView, [number, number, number]> = {
      front: [120, 80, 50],
      back: [120, 80, 50],
      left: [50, 80, 120],
      right: [50, 80, 120],
      top: [120, 50, 80],
      bottom: [120, 50, 80],
    };
    expect(MODEL_VIEWS).toEqual(['front', 'back', 'left', 'right', 'top', 'bottom']);
    for (const view of MODEL_VIEWS) {
      const m = model(BOX, view);
      expect([m.outlineMm.widthMm, m.outlineMm.heightMm, m.depthMm], view).toEqual(seen[view]);
      expect(m.format).toBe('stl');
      expect(m.sizeMm).toEqual([120, 50, 80]);
    }
  });

  it('refuses a file that is not base64, no file, and a mesh it cannot use, saying why', () => {
    expect(readApplianceModel('not base64!', 'front')).toEqual({
      ok: false,
      message: 'The model file should be the file’s bytes in base64.',
    });
    expect(readApplianceModel('', 'front')).toEqual({ ok: false, message: 'Choose the model’s file.' });
    // A cube with one face missing is not closed.
    const cube = Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    cube.delete();
    const open = encodeModelFile(stlOf(mesh.vertProperties, mesh.triVerts.slice(3), mesh.numProp));
    const read = readApplianceModel(open, 'front');
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.message).toMatch(/^The mesh is not closed: 3 edges belong to one face only\./);
  });

  it('says what it repaired, and when it may have been drawn in another unit', () => {
    const tiny = model(modelFileOf(Manifold.cube([0.12, 0.05, 0.08])));
    expect(tiny.notes).toEqual([
      'It is 0.12 × 0.05 × 0.08 mm: if it was drawn in metres or inches, scale it to mm before importing.',
    ]);
    expect(model(BOX).repairs).toEqual([]);
  });
});

describe('its outline', () => {
  const parts = (file: string, view: ModelView) => {
    const outline = modelOutline(engine, model(file, view));
    try {
      return outline
        .decompose()
        .map((p) => {
          const { min, max } = p.bounds();
          p.delete();
          return [min[0], min[1], max[0], max[1]].map((v) => Math.round(v * 1000) / 1000);
        })
        .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    } finally {
      outline.delete();
    }
  };

  it('is the model’s shadow seen from the room, centred on its box, the right way round', () => {
    // From the front the block is on the right; from the back, on the left.
    expect(parts(TWO, 'front')).toEqual([
      [-65, -40, 35, 40],
      [45, -40, 65, -20],
    ]);
    expect(parts(TWO, 'back')).toEqual([
      [-65, -40, -45, -20],
      [-35, -40, 65, 40],
    ]);
    // From the top it is 50 mm deep; from the side the block hides behind the box.
    expect(parts(TWO, 'top')).toEqual([
      [-65, -25, 35, 25],
      [45, -25, 65, 25],
    ]);
    expect(parts(TWO, 'right')).toEqual([[-25, -40, 25, 40]]);
  });

  it('has no holes: the wall cannot hold an island inside the opening', () => {
    const outline = modelOutline(engine, model(FRAME));
    try {
      expect(outline.area()).toBeCloseTo(100 * 80, 6);
    } finally {
      outline.delete();
    }
  });
});

describe('its piece', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 4 };

  it('has an opening the clearance round the outline, through the panel, and a rim round it on the room side', () => {
    const solid = modelPanel(engine, size, model(BOX), DEFAULT_RIM);
    try {
      expect(solid.genus()).toBe(1);
      expect(probe(solid, 100, 100, 2)).toBe(0); // the opening
      expect(probe(solid, 160.5, 100, 2)).toBe(0); // the clearance, 1 mm
      expect(probe(solid, 100, 140.5, 2)).toBe(0);
      expect(probe(solid, 160.8, 140.8, 2)).toBeGreaterThan(0); // its corners round, 1 mm from the outline's
      expect(probe(solid, 160.6, 140.6, 2)).toBe(0);
      expect(probe(solid, 162.2, 100, 2)).toBeGreaterThan(0); // the panel
      expect(probe(solid, 162.2, 100, 18.5)).toBeGreaterThan(0); // the rim: 2.4 mm wall, 15 mm deep
      expect(probe(solid, 100, 142.2, 18.5)).toBeGreaterThan(0);
      expect(probe(solid, 162.2, 100, 19.5)).toBe(0);
      expect(probe(solid, 164, 100, 10)).toBe(0);
      expect(probe(solid, 164, 100, 2)).toBeGreaterThan(0);
      expect(probe(solid, 100, 100, -0.5)).toBe(0); // nothing on the outside face
      expect(probe(solid, 150, 30, -0.5)).toBe(0);
    } finally {
      solid.delete();
    }
  });

  it('has an opening for each part of the outline, and none for a hole through the model', () => {
    const two = modelPanel(engine, size, model(TWO), DEFAULT_RIM);
    const frame = modelPanel(engine, size, model(FRAME), DEFAULT_RIM);
    try {
      expect(two.genus()).toBe(2);
      expect(frame.genus()).toBe(1);
      expect(probe(frame, 100, 100, 2)).toBe(0);
    } finally {
      two.delete();
      frame.delete();
    }
  });
});

describe('the model in the wall', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts with none, and reads it into the bottom row’s middle piece', () => {
    expect(EXAMPLE_PARAMS.model).toEqual(NO_MODEL);
    expect(NO_MODEL).toEqual({ file: '', view: 'front', column: 0, row: 0 });
    expect([example.modelFile, example.modelView, example.modelColumn, example.modelRow]).toEqual([
      '',
      'front',
      '0',
      '0',
    ]);
    const r = read({ modelFile: BOX });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.params.model).toEqual({ file: BOX, view: 'front', column: 2, row: 1 });
    expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses a piece too small, a piece the wall lacks, a shared piece, and half a piece', () => {
    const wide = read({ modelFile: modelFileOf(Manifold.cube([300, 50, 80])) });
    expect(wide).toEqual({
      ok: false,
      errors: {
        modelFile:
          'The model’s outline, 300 × 80 mm seen from the room, needs a piece at least 326.8 × 106.8 mm; ' +
          'column 2, row 1 is 197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, make ' +
          'bigger pieces.',
      },
    });
    // Seen from its side it is 50 mm across, and fits.
    expect(read({ modelFile: modelFileOf(Manifold.cube([300, 50, 80])), modelView: 'right' }).ok).toBe(true);
    expect(read({ modelFile: BOX, modelColumn: '9', modelRow: '1' })).toEqual({
      ok: false,
      errors: { modelFile: 'The model: there is no column 9, row 1: the wall has 3 columns and 5 rows.' },
    });
    expect(read({ modelFile: BOX, fans: '120@2,1' })).toEqual({
      ok: false,
      errors: { modelFile: 'The model and fan 1 are both in column 2, row 1; give each its own piece.' },
    });
    expect(read({ modelFile: BOX, modelColumn: '2' })).toEqual({
      ok: false,
      errors: { modelRow: 'Give the model’s column and row, or 0 for both.' },
    });
    expect(read({ modelFile: BOX, modelColumn: '1.5', modelRow: '1' })).toEqual({
      ok: false,
      errors: { modelColumn: 'Enter a whole number, 0 or more.' },
    });
    expect(read({ modelFile: BOX, modelView: 'side' })).toMatchObject({
      ok: false,
      errors: { modelView: expect.any(String) },
    });
    expect(read({ modelFile: 'not base64!' })).toMatchObject({
      ok: false,
      errors: { modelFile: 'The model file should be the file’s bytes in base64.' },
    });
    // Without a file, its view and piece are not read.
    expect(read({ modelView: 'side', modelColumn: 'x' }).ok).toBe(true);
  });

  it('is built into its piece, named after it, and given a line in the plan', () => {
    const r = read({ modelFile: BOX, modelColumn: '1', modelRow: '2' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const { params } = r;
    const plan = planWall(params);
    const built = buildPiecesWith(engine, plan, 3, placedFittings(fittingSource(params)));
    try {
      const piece = built.find((b) => b.column === 0 && b.row === 1);
      expect(piece?.tag).toBe('-model-120x80');
      expect(piece?.solid.genus()).toBe(1);
    } finally {
      for (const b of built) b.solid.delete();
    }
    const names = planFiles(params, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.includes('-model-'))).toEqual([
      expect.stringMatching(/^piece-c1-r2-.*-model-120x80\.stl$/),
    ]);
    expect(describePlan(plan, params).model).toEqual([
      'Model: the appliance in the STL file, 120 × 80 mm seen from its front, in column 1, row 2, through an ' +
        'opening 1 mm clear of its outline, in a 15 mm rim.',
    ]);
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).model).toEqual([]);
  });

  it('says in the plan what was repaired and what may be wrong with its size', () => {
    const r = read({ modelFile: modelFileOf(Manifold.cube([0.3, 0.2, 0.1])), modelView: 'top' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(describePlan(planWall(r.params), r.params).model).toEqual([
      'Model: the appliance in the STL file, 0.3 × 0.2 mm seen from its top, in column 2, row 1, through an ' +
        'opening 1 mm clear of its outline, in a 15 mm rim. It is 0.3 × 0.2 × 0.1 mm: if it was drawn in ' +
        'metres or inches, scale it to mm before importing.',
    ]);
  });
});
