// A sash stop that comes off by hand from inside (sash-stop, #118), from the design review against
// published work: window-AC kits fit a stop so the sash cannot be opened from outside, portable-AC
// kits have none, and an escape window must still open from inside without a tool. Here it is a
// printed strut that lies in the track the sash runs in, from the sash's edge to the frame, standing
// out of the track to lift it by; the wall itself is not a lock.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_STOP,
  EXAMPLE_PARAMS,
  SETTINGS,
  STOP_LAP_MM,
  describePlan,
  loadEngine,
  partName,
  planStop,
  planWall,
  readParams,
  stopShapes,
  stopSolid,
  stopTrack,
  toFormValues,
  wallPartShapes,
} from '../src/index.js';
import type { FormValues, Params, StopShape } from '../src/index.js';

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
  it('is none to start with, after the gap between the sashes, and goes back through the form', () => {
    expect(DEFAULT_STOP).toEqual({ lengthMm: 0 });
    expect(EXAMPLE_PARAMS.stop).toEqual(DEFAULT_STOP);
    expect(example.sashStopMm).toBe('0');
    const p = read({ sashStopMm: '418' });
    expect(p.stop).toEqual({ lengthMm: 418 });
    expect(toFormValues(p).sashStopMm).toBe('418');
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('sashStopMm')).toBe(fields.indexOf('railGapMm') + 1);
    expect(SETTINGS.find((s) => s.field === 'sashStopMm')?.path).toBe('stop.lengthMm');
  });

  it('refuses a stop with no track beside the sash, and one too short to hold', () => {
    expect(errors({ bottomEdge: 'sill', topEdge: 'sill', sashStopMm: '418' }).sashStopMm).toBe(
      'A sash stop lies in the track the sash runs in: put the edges beside the sash in a track.',
    );
    expect(errors({ sashStopMm: '9' }).sashStopMm).toBe('Make it at least 10 mm, or 0 for none.');
    expect(errors({ sashStopMm: '10' }).sashStopMm).toBeUndefined(); // control
    expect(errors({ bottomEdge: 'sill', topEdge: 'sill', sashStopMm: '0' }).sashStopMm).toBeUndefined();
  });
});

describe('the plan', () => {
  it('lies in the track the sash runs in: a slider’s bottom one, a hung window’s side one', () => {
    expect(stopTrack(EXAMPLE_PARAMS.edges)).toBe('bottom');
    expect(stopTrack(read({ bottomEdge: 'sill' }).edges)).toBe('top');
    expect(stopTrack(read(hung).edges)).toBe('left');
    expect(stopTrack(read({ ...hung, leftEdge: 'sill' }).edges)).toBe('right');
    expect(stopTrack(read({ bottomEdge: 'sill', topEdge: 'sill' }).edges)).toBeUndefined();
  });

  it('a strut the track’s width less its clearance, standing 10 mm out of it, in lengths that lap 20 mm', () => {
    expect(planStop(read({ sashStopMm: '418' }))).toEqual({
      track: 'bottom',
      lengthMm: 417,
      widthMm: 14, // a 15 mm track less 0.5 mm each side
      heightMm: 20, // 10 mm deep, and 10 mm to lift it by
      pieces: 3,
      pieceMm: 152.3,
      lapMm: STOP_LAP_MM,
    });
    expect(planStop(read({ sashStopMm: '150' }))).toMatchObject({ lengthMm: 149, pieces: 1, pieceMm: 149 });
    expect(planStop(EXAMPLE_PARAMS)).toBeUndefined();
  });

  it('says where it goes, how it comes out, and that the wall is not a lock', () => {
    const stop = (p: Params) => describePlan(planWall(p), p).stop;
    expect(stop(read({ sashStopMm: '418' }))).toEqual([
      'Sash stop: a strut 14 mm wide and 20 mm tall, 417 mm long in 3 lengths of 152.3 mm that lap 20 mm, each ' +
        'lap pinned with 14 mm of 1.75 mm filament. Lay it in the bottom track from the sash’s edge to the ' +
        'frame, standing 10 mm out: it stops the sash opening further, and lifts out by hand from inside. The ' +
        'wall itself is not a lock.',
    ]);
    expect(stop(read({ ...hung, sashStopMm: '150' }))).toEqual([
      'Sash stop: a strut 14 mm wide and 20 mm tall, 149 mm long in one piece. Lay it in the left track from the ' +
        'sash’s edge to the frame, standing 10 mm out: it stops the sash opening further, and lifts out by hand ' +
        'from inside. The wall itself is not a lock.',
    ]);
    expect(stop(EXAMPLE_PARAMS)).toEqual([]);
  });
});

describe('the files', () => {
  it('the end lengths and the middle ones, or one whole', () => {
    const stops = (p: Params) =>
      wallPartShapes(p)
        .filter((s) => s.kind === 'stop')
        .map(partName);
    expect(stops(read({ sashStopMm: '418' }))).toEqual([
      'stop-end-152.3x14x20-print-2',
      'stop-middle-152.3x14x20-print-1',
    ]);
    expect(stops(read({ sashStopMm: '150' }))).toEqual(['stop-149x14x20-print-1']);
    expect(stops(EXAMPLE_PARAMS)).toEqual([]);
  });

  it('stopShapes: one whole length, two ends, or two ends and the middles', () => {
    const plan = planStop(read({ sashStopMm: '418' }));
    if (plan === undefined) throw new Error('no stop');
    expect(stopShapes({ ...plan, pieces: 1 }).map((s) => [s.part, s.count])).toEqual([['whole', 1]]);
    expect(stopShapes({ ...plan, pieces: 2 }).map((s) => [s.part, s.count])).toEqual([['end', 2]]);
    expect(stopShapes(plan).map((s) => [s.part, s.count])).toEqual([
      ['end', 2],
      ['middle', 1],
    ]);
  });
});

describe('the solid, standing as it prints', () => {
  const shape = (part: StopShape['part']): StopShape => ({
    kind: 'stop',
    part,
    lengthMm: 100,
    widthMm: 14,
    heightMm: 20,
    lapMm: 20,
    count: 1,
  });

  it('a bar 100 long, 14 wide, 20 tall', () => {
    const s = stopSolid(engine, shape('whole'));
    try {
      const { min, max } = s.boundingBox();
      expect([...min, ...max].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0, 100, 14, 20]);
      expect(s.volume()).toBeCloseTo(100 * 14 * 20, 3);
    } finally {
      s.delete();
    }
  });

  it('a middle length laps half its width at both ends, a pin hole across each lap', () => {
    const s = stopSolid(engine, shape('middle'));
    try {
      expect(probe(s, 10, 3.5, 5)).toBeGreaterThan(0); // the front half at its start
      expect(probe(s, 10, 10.5, 5)).toBe(0); // the back half gone
      expect(probe(s, 90, 3.5, 5)).toBe(0); // the other way round at its end
      expect(probe(s, 90, 10.5, 5)).toBeGreaterThan(0);
      expect(probe(s, 10, 3.5, 10)).toBe(0); // the pin hole, across, halfway up, mid-lap
      expect(probe(s, 90, 10.5, 10)).toBe(0);
      expect(probe(s, 50, 7, 10)).toBeGreaterThan(0); // none between the laps
    } finally {
      s.delete();
    }
  });

  it('two end lengths, one turned round, lap with their pin holes in line', () => {
    const first = stopSolid(engine, shape('end'));
    const turned = stopSolid(engine, shape('end'));
    const last = turned.rotate([0, 0, 180]).translate([180, 14, 0]);
    const both = first.intersect(last);
    try {
      expect(both.volume()).toBeCloseTo(0, 6);
      for (const y of [3.5, 10.5]) {
        expect(probe(first, 90, y, 10) + probe(last, 90, y, 10)).toBe(0); // one hole through both
      }
      expect(probe(first, 90, 10.5, 5)).toBeGreaterThan(0);
      expect(probe(last, 90, 3.5, 5)).toBeGreaterThan(0);
    } finally {
      for (const m of [first, turned, last, both]) m.delete();
    }
  });
});
