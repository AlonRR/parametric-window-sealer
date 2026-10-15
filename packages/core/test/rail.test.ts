// The filler between the sashes (meeting-rail, #116), from the design review against published work:
// where a hung window's two sashes overlap, or a slider's, a gap runs between them from outside to
// the room, and every hung-window kit ships foam for it. Here it is a printed bar the gap's size, the
// wall's seal in a groove on both faces, printed in lengths that lap.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_RAIL,
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  RAIL_LAP_MM,
  SETTINGS,
  describePlan,
  loadEngine,
  planRail,
  planWall,
  railEdge,
  railShapes,
  railSolid,
  readParams,
  toFormValues,
  wallPartShapes,
  partName,
} from '../src/index.js';
import type { FormValues, Params, RailShape } from '../src/index.js';

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
const hung = { window: 'hung', topEdge: 'sash', bottomEdge: 'sill', leftEdge: 'track', rightEdge: 'track' };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.2) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the setting', () => {
  it('is none to start with, and goes back through the form', () => {
    expect(DEFAULT_RAIL).toEqual({ gapMm: 0 });
    expect(EXAMPLE_PARAMS.rail).toEqual(DEFAULT_RAIL);
    expect(example.railGapMm).toBe('0');
    const p = read({ ...hung, railGapMm: '20' });
    expect(p.rail).toEqual({ gapMm: 20 });
    expect(toFormValues(p).railGapMm).toBe('20');
  });

  it('is in the settings list, after the track clearance', () => {
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('railGapMm')).toBe(fields.indexOf('trackClearanceMm') + 1);
    expect(SETTINGS.find((s) => s.field === 'railGapMm')?.path).toBe('rail.gapMm');
  });

  it('refuses a gap too narrow for a filler with the seal on both faces, and no sash to fill against', () => {
    expect(errors({ ...hung, seal: 'tape', railGapMm: '5.9' }).railGapMm).toBe(
      'At least 6 mm, for a filler with the seal on both faces; a narrower gap takes foam tape on one sash.',
    );
    expect(errors({ ...hung, seal: 'tape', railGapMm: '6' }).railGapMm).toBeUndefined(); // control
    expect(errors({ ...hung, railGapMm: '4' }).railGapMm).toBe(
      'At least 4.5 mm, for a filler to slide in; a narrower gap takes foam tape on one sash.',
    );
    expect(errors({ ...hung, railGapMm: '-1' }).railGapMm).toBeDefined();
    expect(errors({ rightEdge: 'track', railGapMm: '20' }).railGapMm).toBe(
      'No edge is pressed by a sash: a filler goes where two sashes overlap.',
    );
    expect(errors({ rightEdge: 'track', railGapMm: '0' }).railGapMm).toBeUndefined(); // control
  });
});

describe('the plan', () => {
  it('runs along the edge the sash presses: across a hung window, up a slider', () => {
    expect(railEdge(read(hung).edges)).toBe('top');
    expect(railEdge(EXAMPLE_PARAMS.edges)).toBe('right');
    expect(railEdge(read({ rightEdge: 'track' }).edges)).toBeUndefined();
  });

  it('a 599 mm filler for a 600 mm hung window: 18 mm thick in a 20 mm gap with tape, 4 lengths that lap', () => {
    const rail = planRail(read({ ...hung, seal: 'tape', railGapMm: '20' }));
    expect(rail).toEqual({
      edge: 'top',
      gapMm: 20,
      lengthMm: 599,
      depthMm: 18, // the tape stands 1 mm out of each groove
      heightMm: 20,
      groove: { widthMm: 9.5, depthMm: 1 },
      pieces: 4,
      pieceMm: 157.2, // 4 × 157.2 less 3 laps of 10 is 598.8, within 0.2 mm of 599
      lapMm: RAIL_LAP_MM,
    });
    expect(planRail(read({ ...hung, railGapMm: '0' }))).toBeUndefined();
  });

  it('with printed TPU, in its deeper groove; with no seal, 0.5 mm less than the gap and no groove', () => {
    expect(planRail(read({ ...hung, seal: 'tpu', railGapMm: '20' }))).toMatchObject({
      depthMm: 19.2,
      groove: { widthMm: 9.5, depthMm: 1.6 },
    });
    const bare = planRail(read({ ...hung, railGapMm: '20' }));
    expect(bare).toMatchObject({ depthMm: 19.5, heightMm: 20 });
    expect(bare?.groove).toBeUndefined();
  });

  it('taller than 20 mm where a wide tape needs it, with 2 mm above and below its groove', () => {
    const wide = { kind: 'tape' as const, tape: { ...DEFAULT_TAPE, widthMm: 20 } };
    const p = { ...read(hung), seal: wide, rail: { gapMm: 20 } };
    expect(planRail(p)).toMatchObject({ heightMm: 24.5, groove: { widthMm: 20.5 } });
  });

  it('up a slider, as long as the opening is high: 999 mm in 6 lengths', () => {
    expect(planRail(read({ railGapMm: '20' }))).toMatchObject({ edge: 'right', lengthMm: 999, pieces: 6 });
  });

  it('in one piece when the printer makes it', () => {
    const rail = planRail(read({ ...hung, openingWidthMm: '180', railGapMm: '20' }));
    expect(rail).toMatchObject({ lengthMm: 179, pieces: 1, pieceMm: 179 });
  });

  it('says what to print and where it goes', () => {
    const p = read({ ...hung, seal: 'tape', railGapMm: '20' });
    expect(describePlan(planWall(p), p).rail).toEqual([
      'Between the sashes: a filler for the 20 mm gap where they overlap, 599 mm long in 4 lengths of 157.2 mm ' +
        'that lap 10 mm, 18 mm thick and 20 mm tall, with the seal in a groove on both faces.',
    ]);
    const bare = read({ ...hung, railGapMm: '20' });
    expect(describePlan(planWall(bare), bare).rail).toEqual([
      'Between the sashes: a filler for the 20 mm gap where they overlap, 599 mm long in 4 lengths of 157.2 mm ' +
        'that lap 10 mm, 19.5 mm thick and 20 mm tall, 0.5 mm less than the gap to slide in; foam tape on both ' +
        'faces would seal it.',
    ]);
    expect(describePlan(planWall(read(hung)), read(hung)).rail).toEqual([]);
  });

  it('counts the tape along both faces in the seal’s line', () => {
    const without = read({ ...hung, seal: 'tape' });
    const withRail = read({ ...hung, seal: 'tape', railGapMm: '20' });
    const metres = (p: Params) => Number(/: ([0-9.]+) m in all/.exec(describePlan(planWall(p), p).seal)?.[1]);
    expect(Math.round((metres(withRail) - metres(without)) * 10) / 10).toBe(1.2); // 2 × 599 mm
    expect(describePlan(planWall(withRail), withRail).seal).toContain(
      ', and along both faces of the filler between the sashes:',
    );
    const tpu = read({ ...hung, seal: 'tpu', railGapMm: '20' });
    expect(describePlan(planWall(tpu), tpu).seal).toContain(
      ', and 1.2 m more along both faces of the filler between the sashes',
    );
  });
});

describe('the files', () => {
  it('two end lengths and the middle ones, each printed as many times as its name says', () => {
    const p = read({ ...hung, seal: 'tape', railGapMm: '20' });
    const names = wallPartShapes(p)
      .filter((s) => s.kind === 'rail')
      .map(partName);
    expect(names).toEqual(['rail-end-157.2x18x20-print-2', 'rail-middle-157.2x18x20-print-2']);
    const one = read({ ...hung, openingWidthMm: '180', railGapMm: '20' });
    expect(
      wallPartShapes(one)
        .filter((s) => s.kind === 'rail')
        .map(partName),
    ).toEqual(['rail-179x19.5x20-print-1']);
    expect(wallPartShapes(read(hung)).some((s) => s.kind === 'rail')).toBe(false); // none without a gap
  });

  it('with printed TPU, gaskets for both faces among the others', () => {
    const p = read({ ...hung, seal: 'tpu', railGapMm: '20' });
    const without = read({ ...hung, seal: 'tpu' });
    const total = (q: Params) =>
      wallPartShapes(q)
        .filter((s) => s.kind === 'gasket')
        .reduce((n, s) => n + s.lengthMm * s.count, 0);
    expect(Math.round(total(p) - total(without))).toBe(2 * 599); // three lengths of 199.7 mm a face
    const names = wallPartShapes(p).map(partName);
    expect(new Set(names).size).toBe(names.length); // no two files with one name
  });

  it('railShapes: one whole length, two ends, or two ends and the middles', () => {
    const rail = planRail(read({ ...hung, railGapMm: '20' }));
    if (rail === undefined) throw new Error('no rail');
    expect(railShapes({ ...rail, pieces: 1 }).map((s) => [s.part, s.count])).toEqual([['whole', 1]]);
    expect(railShapes({ ...rail, pieces: 2 }).map((s) => [s.part, s.count])).toEqual([['end', 2]]);
    expect(railShapes({ ...rail, pieces: 5 }).map((s) => [s.part, s.count])).toEqual([
      ['end', 2],
      ['middle', 3],
    ]);
  });
});

describe('the solid, standing as it prints', () => {
  const shape = (part: RailShape['part']): RailShape => ({
    kind: 'rail',
    part,
    lengthMm: 100,
    depthMm: 18,
    heightMm: 20,
    groove: { widthMm: 9.5, depthMm: 1 },
    lapMm: 10,
    count: 1,
  });

  it('a bar 100 long, 18 thick, 20 tall, a groove 9.5 × 1 mm along the middle of each face', () => {
    const s = railSolid(engine, shape('whole'));
    try {
      const { min, max } = s.boundingBox();
      expect([...min, ...max].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0, 100, 18, 20]);
      expect(s.volume()).toBeCloseTo(100 * 18 * 20 - 2 * 100 * 9.5 * 1, 3);
      expect(probe(s, 50, 0.5, 10)).toBe(0); // in the groove on one face
      expect(probe(s, 50, 17.5, 10)).toBe(0); // and the other
      expect(probe(s, 50, 0.5, 2)).toBeGreaterThan(0); // beside it (control)
      expect(probe(s, 5, 4.5, 10)).toBeGreaterThan(0); // no lap at either end
      expect(probe(s, 95, 4.5, 10)).toBeGreaterThan(0);
    } finally {
      s.delete();
    }
  });

  it('an end length laps at one end, a middle at both, half the thickness each', () => {
    const end = railSolid(engine, shape('end'));
    const middle = railSolid(engine, shape('middle'));
    try {
      expect(probe(end, 5, 4.5, 10)).toBeGreaterThan(0); // its outer end whole
      expect(probe(end, 5, 13.5, 10)).toBeGreaterThan(0);
      expect(probe(end, 95, 4.5, 10)).toBe(0); // the front half gone at its other end
      expect(probe(end, 95, 13.5, 10)).toBeGreaterThan(0);
      expect(probe(middle, 5, 4.5, 10)).toBeGreaterThan(0); // the back half gone at its start
      expect(probe(middle, 5, 13.5, 10)).toBe(0);
      expect(probe(middle, 95, 4.5, 10)).toBe(0);
      expect(probe(middle, 95, 13.5, 10)).toBeGreaterThan(0);
    } finally {
      end.delete();
      middle.delete();
    }
  });

  it('two end lengths, one turned round, lap into a solid bar with nothing between them', () => {
    const first = railSolid(engine, shape('end'));
    const turned = railSolid(engine, shape('end'));
    const last = turned.rotate([0, 0, 180]).translate([190, 18, 0]);
    const both = first.intersect(last);
    try {
      expect(both.volume()).toBeCloseTo(0, 6); // they do not overlap
      expect(probe(first, 95, 13.5, 10)).toBeGreaterThan(0); // the lap filled: one half each
      expect(probe(last, 95, 4.5, 10)).toBeGreaterThan(0);
      expect(probe(last, 185, 4.5, 10)).toBeGreaterThan(0); // the turned one's outer end whole
    } finally {
      for (const m of [first, turned, last, both]) m.delete();
    }
  });
});
