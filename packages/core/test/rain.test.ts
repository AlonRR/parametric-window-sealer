// Rain on the outside face (rain-face, #117), from the design review against published work. Water
// running down the outside gets into the strips' slots; weep holes in each strip's outside flange
// let it out again, as a window frame's do. A drip groove under each edge strip breaks the path
// of water creeping under it, where no seal does. And a window AC must keep its outward tilt and
// its drain.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  SETTINGS,
  WEEP_LENGTH_MM,
  WEEP_MM,
  buildExport,
  describePlan,
  edgeProfile,
  edgeStripSolid,
  loadEngine,
  planWall,
  readParams,
  stripSolid,
  tapeFit,
  toFormValues,
  wallPartShapes,
  partName,
  weepPlacesMm,
} from '../src/index.js';
import type { FormValues, MeshData, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};
const volumeOf = (s: Manifold) => {
  const v = s.volume();
  s.delete();
  return v;
};
const meshVolume = (mesh: MeshData) => {
  const at = (triangle: number, corner: number): [number, number, number] => {
    const i = 3 * (mesh.triangles[triangle + corner] ?? 0);
    return [mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0];
  };
  let sum = 0;
  for (let t = 0; t < mesh.triangles.length; t += 3) {
    const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = [at(t, 0), at(t, 1), at(t, 2)];
    sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return sum / 6;
};

describe('the setting', () => {
  it('is on to start with, after the sun, and goes back through the form', () => {
    expect(EXAMPLE_PARAMS.rain).toBe(true);
    expect(example.rain).toBe('yes');
    expect(read({ rain: 'no' }).rain).toBe(false);
    expect(toFormValues(read({ rain: 'no' })).rain).toBe('no');
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('rain')).toBe(fields.indexOf('sun') + 1);
    expect(SETTINGS.find((s) => s.field === 'rain')).toMatchObject({ path: 'rain', onOff: true });
  });
});

describe('where the weep holes go', () => {
  it('one every 50 mm or so, midway between the ribs, so none cuts one', () => {
    expect(weepPlacesMm(150)).toEqual([25, 75, 125]);
    expect(weepPlacesMm(100)).toEqual([25, 75]);
    expect(weepPlacesMm(40)).toEqual([20]);
    expect([WEEP_MM, WEEP_LENGTH_MM]).toEqual([1.5, 5]);
  });
});

describe('a joint strip', () => {
  // Along a horizontal joint: u along X, across the strip up Y, the outside flange from z = -1.8 to -0.2.
  const strip = (weeps: boolean) => stripSolid(engine, 150, DEFAULT_JOINT, 3, 'wall-horizontal', weeps);

  it('has weep holes through its outside flange beside the web, both sides, and none in the room side', () => {
    const s = strip(true);
    const plain = strip(false);
    try {
      for (const u of [25, 75, 125]) {
        expect(probe(s, u, 10.75, -1)).toBe(0); // above the web: the bottom of the upper slot
        expect(probe(s, u, 7.25, -1)).toBe(0); // below it, so the strip goes either way up
        expect(probe(plain, u, 10.75, -1)).toBeGreaterThan(0); // control
      }
      expect(probe(s, 75, 10.75, 4)).toBeGreaterThan(0); // the room side's flange whole
      expect(probe(s, 50, 10.75, -1)).toBeGreaterThan(0); // between the holes
      expect(probe(s, 75, 12, -1)).toBeGreaterThan(0); // above the hole, 1.5 mm tall
    } finally {
      s.delete();
      plain.delete();
    }
  });

  it('loses 5 × 1.5 mm through its 1.6 mm flange for each hole: 6 holes in 150 mm', () => {
    const lost = volumeOf(strip(false)) - volumeOf(strip(true));
    expect(lost).toBeCloseTo(6 * WEEP_LENGTH_MM * WEEP_MM * 1.6, 6);
  });
});

describe('an edge strip', () => {
  const edges = EXAMPLE_PARAMS.edges; // in a 15 mm track, 10 mm deep
  const plain = edgeProfile('bottom', edges, DEFAULT_JOINT, undefined);
  const taped = edgeProfile(
    'bottom',
    edges,
    DEFAULT_JOINT,
    tapeFit({ kind: 'tape', tape: read({ seal: 'tape' }).seal.tape }),
  );
  const solid = (profile: typeof plain, rain: boolean) =>
    edgeStripSolid(engine, 150, profile, DEFAULT_JOINT, 3, 'bottom', rain);

  it('has weep holes at its slot’s floor through the outside wall, and a drip groove under it', () => {
    // 14 mm wide from z = -5.5 to 8.5, the slot from -0.2 to 3.2 and from y = 2 to 10.
    expect([plain.widthMm, plain.heightMm]).toEqual([14, 10]);
    const s = solid(plain, true);
    const dry = solid(plain, false);
    try {
      for (const u of [25, 75, 125]) expect(probe(s, u, 2.75, -3)).toBe(0);
      expect(probe(s, 50, 2.75, -3)).toBeGreaterThan(0); // between them
      expect(probe(s, 75, 2.75, 5.5)).toBeGreaterThan(0); // the room side whole
      expect(probe(s, 75, 0.5, -3.25)).toBe(0); // the drip groove, 1.5 mm in from the outside face
      expect(probe(s, 75, 0.5, -4.5)).toBeGreaterThan(0); // the 1.5 mm outside it
      expect(probe(s, 75, 0.5, 5)).toBeGreaterThan(0); // none on the room side
      expect(probe(dry, 75, 2.75, -3)).toBeGreaterThan(0); // control: no rain, no holes
      expect(probe(dry, 75, 0.5, -3.25)).toBeGreaterThan(0); // and no groove
      const lost = volumeOf(solid(plain, false)) - volumeOf(solid(plain, true));
      expect(lost).toBeCloseTo(3 * WEEP_LENGTH_MM * WEEP_MM * 5.3 + 150 * 1.5 * 1, 4);
    } finally {
      s.delete();
      dry.delete();
    }
  });

  it('with a seal along its outer face, no drip groove: the seal stops the water', () => {
    const s = solid(taped, true);
    try {
      expect(probe(s, 75, 0.5, -3.25)).toBeGreaterThan(0);
      expect(probe(s, 25, taped.heightMm - 8 + 0.75, -3)).toBe(0); // still the weep holes
    } finally {
      s.delete();
    }
  });
});

describe('the plan', () => {
  const rain = (p: Params) => describePlan(planWall(p), p).rain;

  it('says to fit the holes outside, and what the drip groove is for', () => {
    expect(rain(EXAMPLE_PARAMS)).toEqual([
      'Rain: every strip and edge strip has weep holes in one flange to let water out of its slots; fit each ' +
        'with that flange outside. A groove under each edge strip stops water creeping under it to the room.',
    ]);
    expect(rain(read({ seal: 'tape' }))).toEqual([
      'Rain: every strip and edge strip has weep holes in one flange to let water out of its slots; fit each ' +
        'with that flange outside.',
    ]);
    expect(rain(read({ rain: 'no' }))).toEqual([]);
  });

  it('with a window AC, to keep its tilt and its drain, rain or not', () => {
    const ac = { bottomEdge: 'unit', rain: 'no' };
    expect(rain(read(ac))).toEqual([
      'Window AC: keep the unit tilted outward as its manual says, about 3°, and its drain clear; the wall stands ' +
        'on it and does not level it.',
    ]);
  });
});

describe('the files', () => {
  it('keep their names, the strips and edge strips with their holes', () => {
    const names = (p: Params) => wallPartShapes(p).map(partName);
    expect(names(EXAMPLE_PARAMS)).toEqual(names(read({ rain: 'no' })));
    const volume = (p: Params, prefix: string) => {
      const part = buildExport(engine, p).parts.find((x) => x.name.startsWith(prefix));
      if (part === undefined) throw new Error(`no ${prefix}`);
      return meshVolume(part.mesh);
    };
    expect(volume(EXAMPLE_PARAMS, 'strip-')).toBeLessThan(volume(read({ rain: 'no' }), 'strip-') - 10);
    expect(volume(EXAMPLE_PARAMS, 'edge-')).toBeLessThan(volume(read({ rain: 'no' }), 'edge-') - 10);
  });
});
