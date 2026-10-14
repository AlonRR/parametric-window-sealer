// The clamps (clamps, #32; Q16): an appliance measured roughly, through an opening in one piece,
// gripped by four printed jaws that slide on bolts through slots in them.
import { describe, expect, it } from 'vitest';
import {
  CLAMP_BOLT_HOLE_MM,
  DEFAULT_CLAMP,
  EXAMPLE_PARAMS,
  buildPiecesWith,
  clampBoltMm,
  clampFootprintMm,
  clampOpeningMm,
  clampPanel,
  clampPieceMm,
  clampRangeMm,
  describePlan,
  fittingSource,
  formatClamps,
  jawShapes,
  jawSolid,
  loadEngine,
  parseClamps,
  partName,
  placedFittings,
  planFiles,
  planWall,
  plainPanel,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const APPLIANCE = { widthMm: 120, heightMm: 80 };

describe('a clamp’s sizes', () => {
  it('starts with jaws that slide 10 mm and stand 15 mm out on the room side, on M4 bolts', () => {
    expect(DEFAULT_CLAMP).toEqual({ travelMm: 10, depthMm: 15 });
    expect(CLAMP_BOLT_HOLE_MM).toBe(4.5);
  });

  it('opens half the travel round the appliance, and grips the measured size give or take the travel', () => {
    expect(clampOpeningMm(APPLIANCE, DEFAULT_CLAMP)).toEqual({ widthMm: 130, heightMm: 90 });
    expect(clampRangeMm(APPLIANCE, DEFAULT_CLAMP)).toEqual({
      from: { widthMm: 110, heightMm: 70 },
      to: { widthMm: 130, heightMm: 90 },
    });
  });

  it('needs a piece that holds the jaws, slid right out, clear of the strips (as Q108)', () => {
    // Each jaw's foot reaches 21.25 mm out from its lip: the bolt 6 mm out from the opening,
    // the travel, half a bolt hole and 3 mm beyond.
    expect(clampFootprintMm(APPLIANCE, DEFAULT_CLAMP)).toEqual({ widthMm: 172.5, heightMm: 132.5 });
    expect(clampPieceMm(APPLIANCE, DEFAULT_CLAMP, EXAMPLE_PARAMS.joint)).toEqual({ widthMm: 192.5, heightMm: 152.5 });
  });

  it('takes bolts through a jaw’s foot and the panel, with a washer each side and a nut', () => {
    expect(clampBoltMm(3)).toBe(12);
    expect(clampBoltMm(4.2)).toBe(15);
  });
});

describe('the --clamp form', () => {
  it('reads the appliance’s size, optionally with its piece, several separated by spaces', () => {
    expect(parseClamps('120x80 90x60@3,1')).toEqual({
      ok: true,
      clamps: [
        { widthMm: 120, heightMm: 80 },
        { widthMm: 90, heightMm: 60, column: 3, row: 1 },
      ],
    });
    expect(parseClamps('')).toEqual({ ok: true, clamps: [] });
    expect(parseClamps('120')).toEqual({
      ok: false,
      message:
        'Clamp 1: write each as the appliance’s measured width x height in mm, then optionally @column,row, ' +
        'as 120x80 or 120x80@2,1.',
    });
    expect(parseClamps('120x80@0,1').ok).toBe(false);
  });

  it('writes back what it reads', () => {
    const text = '120x80 90.5x60@3,1';
    const read = parseClamps(text);
    if (!read.ok) throw new Error(read.message);
    expect(formatClamps(read.clamps)).toBe(text);
  });
});

describe('the jaws', () => {
  it('are two long ones across the top and bottom and two short ones at the sides, the same sizes printed together', () => {
    const shapes = jawShapes([APPLIANCE, APPLIANCE, { widthMm: 90, heightMm: 90 }], DEFAULT_CLAMP, 3);
    // The long ones reach 4 mm past the opening at each end, covering its corners; the short
    // ones fit between them at the tightest, 0.5 mm clear at each end.
    expect(shapes.map((s) => [s.lengthMm, s.widthMm, s.depthMm, s.count])).toEqual([
      [138, 21.25, 15, 4],
      [69, 21.25, 15, 4],
      [108, 21.25, 15, 2],
      [79, 21.25, 15, 2],
    ]);
    expect(shapes.map(partName)).toEqual([
      'jaw-138x21.3x15-print-4',
      'jaw-69x21.3x15-print-4',
      'jaw-108x21.3x15-print-2',
      'jaw-79x21.3x15-print-2',
    ]);
  });

  it('print flat: a foot as thick as the panel with two slots the travel long, and a lip at its inner edge', () => {
    const [long] = jawShapes([APPLIANCE], DEFAULT_CLAMP, 3);
    if (long === undefined) throw new Error('no jaw');
    const solid = jawSolid(engine, long);
    try {
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], min[2], max[0], max[1], max[2]].map((v) => Math.round(v * 1000) / 1000)).toEqual([
        0, 0, 0, 138, 21.25, 15,
      ]);
      expect(solid.genus()).toBe(2);
      const probe = (x: number, y: number, z: number) =>
        engine.Manifold.cube([0.2, 0.2, 0.2], true).translate([x, y, z]).intersect(solid).volume();
      // Each slot runs from 6 to 16 mm out from the lip's face, a quarter of the way in from each end.
      for (const x of [34.5, 103.5]) {
        for (const y of [6, 11, 16]) expect(probe(x, y, 1.5), `slot at ${x}, ${y}`).toBe(0);
        expect(probe(x, 19.5, 1.5), `beyond the slot at ${x}`).toBeGreaterThan(0);
      }
      expect(probe(69, 1.2, 14)).toBeGreaterThan(0); // the lip, 2.4 mm thick, stands the full depth
      expect(probe(69, 4, 14)).toBe(0); // and only the lip
    } finally {
      solid.delete();
    }
  });
});

describe('the piece with a clamp', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };

  it('has the opening and eight bolt holes through it, centred, and nothing standing out', () => {
    const solid = clampPanel(engine, size, APPLIANCE, DEFAULT_CLAMP);
    const plain = plainPanel(engine, size);
    try {
      const hole = engine.Manifold.cylinder(3, CLAMP_BOLT_HOLE_MM / 2, CLAMP_BOLT_HOLE_MM / 2, 128);
      const expected = plain.volume() - 130 * 90 * 3 - 8 * hole.volume();
      hole.delete();
      expect(solid.volume()).toBeCloseTo(expected, 3);
      expect(solid.genus()).toBe(9);
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], min[2], max[0], max[1], max[2]]).toEqual([0, 0, 0, 200, 200, 3]);
      const probe = (x: number, y: number) =>
        engine.Manifold.cube([0.2, 0.2, 1], true)
          .translate([100 + x, 100 + y, 1.5])
          .intersect(solid)
          .volume();
      // The bolts sit 6 mm out from the opening, under each jaw's slots.
      for (const [x, y] of [
        [34.5, 51],
        [-34.5, -51],
        [71, 17.25],
        [-71, -17.25],
      ] as const) {
        expect(probe(x, y), `bolt at ${x}, ${y}`).toBe(0);
        expect(probe(x + 3, y), `beside the bolt at ${x}, ${y}`).toBeGreaterThan(0);
      }
      expect(probe(64, 44)).toBe(0); // inside the opening's corner
      expect(probe(66, 46)).toBeGreaterThan(0); // just outside it
    } finally {
      solid.delete();
      plain.delete();
    }
  });
});

describe('a clamp in the wall', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts with none, and its settings from the start', () => {
    expect(EXAMPLE_PARAMS.clamps).toEqual([]);
    expect(EXAMPLE_PARAMS.clamp).toEqual(DEFAULT_CLAMP);
    expect([example.clamps, example.clampTravelMm, example.clampDepthMm]).toEqual(['', '10', '15']);
    const r = read({ clamps: '120x80' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.clamps).toEqual([{ widthMm: 120, heightMm: 80, column: 2, row: 1 }]);
  });

  it('refuses a piece too small, an appliance too small for the jaws, a shared piece and a wrong setting', () => {
    const small = read({ clamps: '200x150' });
    expect(small.ok).toBe(false);
    if (!small.ok) {
      expect(small.errors.clamps).toBe(
        'Clamp 1: a 200 × 150 mm appliance with clamps needs a piece at least 272.5 × 222.5 mm; ' +
          'column 2, row 1 is 197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, ' +
          'make bigger pieces.',
      );
    }
    const tiny = read({ clamps: '60x30' });
    expect(tiny.ok).toBe(false);
    if (!tiny.ok) {
      expect(tiny.errors.clamps).toBe(
        'Clamp 1: its jaws close in by 10 mm, so measure an appliance at least 32 mm each way for them, or make ' +
          'their travel shorter.',
      );
    }
    expect(read({ clamps: '60x30', clampTravelMm: '5' }).ok).toBe(true);
    const shared = read({ ports: '150@2,1', clamps: '120x80@2,1' });
    expect(shared.ok).toBe(false);
    if (!shared.ok) {
      expect(shared.errors.clamps).toBe('Clamp 1 and port 1 are both in column 2, row 1; give each its own piece.');
    }
    expect(read({ clampTravelMm: '0' })).toMatchObject({ ok: false, errors: { clampTravelMm: expect.any(String) } });
    expect(read({ clampDepthMm: 'x' })).toMatchObject({ ok: false, errors: { clampDepthMm: expect.any(String) } });
  });

  it('reads back what it writes', () => {
    const r = read({ clamps: '120x80 90x60@1,3', clampTravelMm: '8', clampDepthMm: '12' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.clamp).toEqual({ travelMm: 8, depthMm: 12 });
      expect(readParams(toFormValues(r.params))).toEqual(r);
    }
  });

  it('is built into its piece, its jaws printed beside it, named in the files and given a line in the plan', () => {
    const r = read({ clamps: '120x80@3,2' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const params: Params = r.params;
    const plan = planWall(params);
    const built = buildPiecesWith(engine, plan, 3, placedFittings(fittingSource(params)));
    try {
      const piece = built.find((b) => b.column === 2 && b.row === 1);
      expect(piece?.tag).toBe('-clamp-120x80');
      expect(piece?.solid.genus()).toBe(9);
      expect(built.filter((b) => b.solid.genus() > 0)).toHaveLength(1);
    } finally {
      for (const b of built) b.solid.delete();
    }
    // Whatever the seal: the jaws are not part of it.
    for (const seal of ['none', 'tape', 'tpu'] as const) {
      const sealed = { ...params, seal: { ...params.seal, kind: seal } };
      const names = planFiles(sealed, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
      expect(names.filter((n) => n.endsWith('-clamp-120x80.stl'))).toEqual([expect.stringMatching(/^piece-c3-r2-/)]);
      expect(names.filter((n) => n.startsWith('jaw-'))).toEqual([
        'jaw-138x21.3x15-print-2.stl',
        'jaw-69x21.3x15-print-2.stl',
      ]);
    }
    expect(describePlan(plan, params).clamps).toEqual([
      'Clamp: a 120 × 80 mm appliance, in column 3, row 2, through a 130 × 90 mm opening; four jaws grip ' +
        'anything from 110 × 70 to 130 × 90 mm, each on two M4 bolts at least 12 mm long, with nuts and washers.',
    ]);
  });
});
