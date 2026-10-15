// A double wall for winter (double-wall, #119), from the design review against published work: two
// skins with still air between them roughly halve what a single printed skin loses, and keep the
// room side above the dew point to a higher room humidity. Here the wall keeps its thickness, which
// must fit the track, and each plain printed piece is hollow inside its solid border.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DOUBLE_RIB_MM,
  DOUBLE_SKIN_MM,
  EXAMPLE_PARAMS,
  SETTINGS,
  airGapResistance,
  buildExport,
  condensesAtPct,
  describePlan,
  hollowCut,
  loadEngine,
  plainPanel,
  planWall,
  readParams,
  toFormValues,
  wallUValue,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};
// A 10 mm wall fits the example's 15 mm track: 10.4 mm with the fit, and 1.6 mm flanges each side.
const double = { wall: 'double', thicknessMm: '10' };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.2) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the setting', () => {
  it('is a single wall to start with, after the thickness, and goes back through the form', () => {
    expect(EXAMPLE_PARAMS.wall).toBe('single');
    expect(example.wall).toBe('single');
    expect(read(double).wall).toBe('double');
    expect(toFormValues(read(double)).wall).toBe('double');
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('wall')).toBe(fields.indexOf('thicknessMm') + 1);
    expect(SETTINGS.find((s) => s.field === 'wall')).toMatchObject({ path: 'wall', values: ['single', 'double'] });
  });

  it('refuses a double wall too thin for two skins and an air gap, or with a pattern across it', () => {
    expect(errors({ wall: 'double', thicknessMm: '6' }).wall).toBe(
      'A double wall needs panels at least 6.4 mm thick: two 1.2 mm skins round a 4 mm air gap.',
    );
    expect(errors({ wall: 'double', thicknessMm: '6.4' }).wall).toBeUndefined(); // control
    expect(errors({ ...double, fill: 'grid' }).wall).toBe(
      'A double wall’s skins are too thin for a pattern across the wall: choose a sealed fill, or give single ' +
        'pieces a pattern of their own; those are printed solid.',
    );
    expect(errors({ fill: 'grid' }).wall).toBeUndefined(); // control: a single wall takes it
  });
});

describe('what it gains, by calculation', () => {
  it('an air gap’s resistance from ISO 6946’s table, between its rows and level beyond 25 mm', () => {
    expect(airGapResistance(5)).toBeCloseTo(0.11, 9);
    expect(airGapResistance(7.6)).toBeCloseTo(0.134, 9);
    expect(airGapResistance(15)).toBeCloseTo(0.17, 9);
    expect(airGapResistance(40)).toBeCloseTo(0.18, 9);
  });

  it('the review’s figures: 5.4 W/m²K and 40 % for a single 3 mm wall, and less for a double one', () => {
    expect(wallUValue(3, 'single')).toBeCloseTo(5.4, 1);
    expect(condensesAtPct(wallUValue(3, 'single'))).toBe(40);
    expect(wallUValue(10, 'single')).toBeCloseTo(4.545, 3);
    expect(condensesAtPct(wallUValue(10, 'single'))).toBe(47);
    expect(wallUValue(10, 'double')).toBeCloseTo(3.16, 2);
    expect(condensesAtPct(wallUValue(10, 'double'))).toBe(59);
    // The review's 10 to 25 mm gaps between two 3 mm skins: 2.9 and 2.6 W/m²K.
    expect(1 / (0.17 + 0.03 + airGapResistance(10))).toBeCloseTo(2.86, 2);
  });

  it('says so in the plan, with the solid pieces, and the twin-wall sheet when the pieces are cut', () => {
    const line = (p: Params) => describePlan(planWall(p), p).double;
    expect(line(read(double))).toEqual([
      'Double wall: each plain printed piece is hollow, two 1.2 mm skins round a 7.6 mm air gap with ribs about ' +
        'every 20 mm, inside its 10 mm solid border; a piece with a fitting or a pattern of its own is solid. By ' +
        'calculation the wall loses about 3.2 W/m²K where a solid one as thick loses 4.5, and its room side stays ' +
        'dry up to about 59 % room humidity, against 47 %, at 20 °C inside and 0 °C outside.',
    ]);
    expect(line(read({ ...double, pieceSource: 'sheet' }))[0]).toContain(
      'Cut the pieces from twin-wall sheet 10 mm thick, or as near as is sold.',
    );
    expect(line(EXAMPLE_PARAMS)).toEqual([]);
  });
});

describe('a hollow piece', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 10 };

  it('two 1.2 mm skins round the air, inside a 10 mm border, with ribs every 20 mm', () => {
    const solid = plainPanel(engine, size);
    const cut = hollowCut(engine, size, 10);
    const hollow = solid.subtract(cut);
    try {
      expect(probe(hollow, 20, 100, 5)).toBe(0); // the air, halfway through
      expect(probe(hollow, 20, 100, 0.6)).toBeGreaterThan(0); // the outside skin
      expect(probe(hollow, 20, 100, 9.4)).toBeGreaterThan(0); // the room side's
      expect(probe(hollow, 5, 100, 5)).toBeGreaterThan(0); // the border, where the strip holds it
      expect(probe(hollow, 100, 5, 5)).toBeGreaterThan(0);
      expect(probe(hollow, 30, 100, 5)).toBeGreaterThan(0); // a rib, up the piece
      expect(probe(hollow, 170, 100, 5)).toBeGreaterThan(0); // the last of eight
      expect(probe(hollow, 180, 100, 5)).toBe(0);
      const air = 180 * 180 * (10 - 2 * DOUBLE_SKIN_MM) - 8 * DOUBLE_RIB_MM * 180 * (10 - 2 * DOUBLE_SKIN_MM);
      expect(solid.volume() - hollow.volume()).toBeCloseTo(air, 3);
    } finally {
      for (const m of [solid, cut, hollow]) m.delete();
    }
  });

  it('none in a piece too small for a cavity inside its border', () => {
    const cut = hollowCut(engine, { widthMm: 21, heightMm: 200, thicknessMm: 10 }, 10);
    try {
      expect(cut.volume()).toBe(0);
    } finally {
      cut.delete();
    }
  });
});

describe('the download', () => {
  it('hollows the plain pieces, keeps a piece with a port solid, and keeps the names', () => {
    const port = { ports: '150@2,1' };
    const single = buildExport(engine, read({ thicknessMm: '10', ...port }));
    const hollow = buildExport(engine, read({ ...double, ...port }));
    const cells = (b: typeof single) => b.pieces.map((p) => [p.cell.column, p.cell.row, p.hoseMm ?? 0]);
    expect(cells(hollow)).toEqual(cells(single));
    const triangles = (b: typeof single, column: number, row: number) =>
      b.pieces.find((p) => p.cell.column === column && p.cell.row === row)?.mesh.triangles.length ?? 0;
    expect(triangles(hollow, 0, 0)).toBeGreaterThan(triangles(single, 0, 0)); // a cavity and ribs
    expect(triangles(hollow, 1, 0)).toBe(triangles(single, 1, 0)); // the port's piece as it was
    expect(hollow.pieces.find((p) => p.cell.column === 1 && p.cell.row === 0)?.hoseMm).toBe(150);
  });
});
