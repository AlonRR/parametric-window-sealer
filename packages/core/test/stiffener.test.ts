// Strips that stiffen (stiffener-strips, #111), as the owner chose, bought angle: a wall more than 500 mm
// across its short span is stiffened by bought 20 × 20 × 2 mm aluminium angle on its room side, each
// length across that span through the middle of a row (or a column), held by printed clips on the
// joint strips it crosses. Each clip is pinned by its strip's own two pins, cut longer.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  CLIP_LENGTH_MM,
  EXAMPLE_PARAMS,
  SETTINGS,
  STIFFEN_OVER_MM,
  clipSolid,
  describePlan,
  loadEngine,
  partName,
  planStiffeners,
  planWall,
  readParams,
  toFormValues,
  wallPartShapes,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const landscape = { openingWidthMm: '1000', openingHeightMm: '600' };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.2) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the setting', () => {
  it('is on to start with, after the rain, and goes back through the form', () => {
    expect(EXAMPLE_PARAMS.stiffen).toBe(true);
    expect(example.stiffen).toBe('yes');
    expect(read({ stiffen: 'no' }).stiffen).toBe(false);
    expect(toFormValues(read({ stiffen: 'no' })).stiffen).toBe('no');
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('stiffen')).toBe(fields.indexOf('rain') + 1);
    expect(SETTINGS.find((s) => s.field === 'stiffen')).toMatchObject({ path: 'stiffen', onOff: true });
  });
});

describe('the plan', () => {
  it('across a 603 mm wide wall: two lengths of angle through rows 2 and 4, no gap over 500 mm', () => {
    expect(STIFFEN_OVER_MM).toBe(500);
    const plan = planStiffeners(EXAMPLE_PARAMS);
    expect(plan).toMatchObject({ axis: 'horizontal', spanMm: 603, lengthMm: 593, pinMm: 9 });
    expect(plan?.lines.map((l) => [l.index, Math.round(l.atMm * 10) / 10, l.clips.length])).toEqual([
      [1, 302.9, 2],
      [3, 710.1, 2],
    ]);
    // Each clip on a vertical strip's pins, at that row's middle.
    expect(plan?.lines[0]?.clips.map((c) => [Math.round(c.xMm * 100) / 100, Math.round(c.yMm * 10) / 10])).toEqual([
      [200.17, 302.9],
      [402.83, 302.9],
    ]);
  });

  it('up a wall wider than high: through the columns, on the horizontal strips', () => {
    const plan = planStiffeners(read(landscape));
    expect(plan).toMatchObject({ axis: 'vertical', spanMm: 613, lengthMm: 603 });
    expect(plan?.lines.map((l) => [l.index, Math.round(l.atMm * 10) / 10, l.clips.length])).toEqual([
      [1, 299.9, 3],
      [3, 703.1, 3],
    ]);
  });

  it('none for a span of 500 mm or less, or when turned off', () => {
    expect(planStiffeners(read({ openingWidthMm: '450' }))).toBeUndefined();
    expect(planStiffeners(read({ stiffen: 'no' }))).toBeUndefined();
  });

  it('says what to buy, where it goes, and the longer pins', () => {
    const line = (p: Params) => describePlan(planWall(p), p).stiffeners;
    expect(line(EXAMPLE_PARAMS)).toEqual([
      'Stiffeners: the wall is 603 mm across, more than 500, so stiffen it with 2 lengths of 20 × 20 × 2 mm ' +
        'aluminium angle, each 593 mm long, across its room side through rows 2 and 4. 4 printed clips hold them ' +
        'on the joint strips there: cut those strips’ 8 pins 9 mm long instead of 6.6, to go through the clips ' +
        'too, then slide each angle into its clips, its flat leg against the wall.',
    ]);
    expect(line(read(landscape))[0]).toContain('the wall is 613 mm high, more than 500');
    expect(line(read(landscape))[0]).toContain('up its room side through columns 2 and 4. 6 printed clips');
    expect(line(read({ pins: 'no' }))).toEqual([
      'Stiffeners: the wall is 603 mm across, more than 500; turn the pins on to clip a stiffener to it.',
    ]);
    expect(line(read({ stiffen: 'no' }))).toEqual([]);
    expect(line(read({ openingWidthMm: '450' }))).toEqual([]);
  });
});

describe('the clip, standing on its end as it prints', () => {
  it('a base pinned to the strip, a slot for the angle’s flat leg, and a lip over it', () => {
    expect(CLIP_LENGTH_MM).toBe(20);
    const clip = clipSolid(engine);
    try {
      const { min, max } = clip.boundingBox();
      expect([...min, ...max].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0, 24.3, 6.7, 20]); // 2 mm past the corner, 20.3 mm of slot, a 2 mm wall
      expect(probe(clip, 12, 1.2, 10)).toBeGreaterThan(0); // the base, between the pins
      expect(probe(clip, 12, 1.2, 3.5)).toBe(0); // a pin hole, 13 mm from the other
      expect(probe(clip, 12, 1.2, 16.5)).toBe(0);
      expect(probe(clip, 12, 3.5, 10)).toBe(0); // the slot for the 2 mm leg, with 0.3 mm to slide
      expect(probe(clip, 12, 5.7, 10)).toBeGreaterThan(0); // the lip over it
      expect(probe(clip, 23.3, 3.5, 10)).toBeGreaterThan(0); // the back wall
      expect(probe(clip, 1, 5.7, 10)).toBe(0); // open at the corner, where the other leg stands up
    } finally {
      clip.delete();
    }
  });

  it('is in the download, as many as the plan says', () => {
    const names = wallPartShapes(EXAMPLE_PARAMS).map(partName);
    expect(names).toContain('stiffener-clip-print-4');
    expect(wallPartShapes(read({ stiffen: 'no' })).some((s) => s.kind === 'clip')).toBe(false);
    expect(wallPartShapes(read({ pins: 'no' })).some((s) => s.kind === 'clip')).toBe(false);
  });
});
