// Sliding dovetail rails (joint-rails, #30), a joint style beside the H-strips and the puzzle
// dovetails: the pieces meet edge to edge, each has half a dovetail rail along every edge it shares,
// standing on its room side, and a printed slider with a dovetail groove slides along the two halves,
// holding the pieces together in and across the wall's plane.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  SETTINGS,
  SLIDER,
  buildPiecesWith,
  describePlan,
  jointStripInsetMm,
  layoutGrid,
  loadEngine,
  partName,
  planParts,
  planSliders,
  planWall,
  readParams,
  sliderSolid,
  sliderWidthMm,
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
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};
const rails = { jointStyle: 'rails' };
const joint = { ...DEFAULT_JOINT, style: 'rails' as const };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

const equal = { width: { mode: 'equal' }, height: { mode: 'equal' } } as const;
// Pieces up to 100 mm across, and as high as asked: the pair is one row, two by two is two.
const grid = (widthMm: number, heightMm: number, maxHeightMm = heightMm) =>
  layoutGrid({ widthMm, heightMm, maxPieceWidthMm: 100, maxPieceHeightMm: maxHeightMm, minPieceMm: 34, ...equal });

describe('the setting', () => {
  it('a third joint style', () => {
    expect(read(rails).joint.style).toBe('rails');
    expect(SETTINGS.find((s) => s.field === 'jointStyle')?.values).toEqual(['strips', 'dovetails', 'rails']);
  });
});

describe('the plan', () => {
  it('a slider along every joint, stopping short of the edge strips and of the sliders across it', () => {
    expect(SLIDER).toEqual({ railHeightMm: 4, railBaseMm: 3, railTopMm: 4, wallMm: 2, gapMm: 1 });
    expect(sliderWidthMm(joint)).toBeCloseTo(12.4, 9);
    const inset = jointStripInsetMm(joint);
    expect(planSliders(grid(200, 130), joint, inset)).toEqual([
      { axis: 'vertical', xMm: 100, yMm: inset, lengthMm: 130 - 2 * inset },
    ]);
    // Two by two: each joint in two lengths, each stopping 7.2 mm short of the crossing.
    const four = planSliders(grid(200, 200, 100), joint, inset);
    expect(four.map((s) => [s.axis, s.xMm, s.yMm, Math.round(s.lengthMm * 100) / 100])).toEqual([
      ['vertical', 100, inset, 92.8 - inset],
      ['vertical', 100, 107.2, 92.8 - inset],
      ['horizontal', inset, 100, 92.8 - inset],
      ['horizontal', 107.2, 100, 92.8 - inset],
    ]);
    expect(planSliders(grid(200, 130), DEFAULT_JOINT, inset)).toEqual([]);
  });

  it('the pieces meet with no joint between them; the download has sliders, and no strips or cross pieces', () => {
    const p = read(rails);
    const plan = planWall(p);
    expect(plan.columnJointsMm.every((j) => j === 0)).toBe(true);
    expect(planParts(p, plan).joints).toEqual({ strips: [], crosses: [] });
    const names = wallPartShapes(p).map(partName);
    expect(names.some((n) => n.startsWith('strip-') || n.startsWith('cross-'))).toBe(false);
    expect(names.filter((n) => n.startsWith('slider-'))).toHaveLength(4);
    // Across 6 rows: 6 sliders beside the top and bottom edges, 153.6 mm, and 12 between, 154.4.
    expect(names).toContain('slider-153.6x12.4-print-6');
    expect(names).toContain('slider-154.4x12.4-print-12');
  });
});

describe('the pieces and the slider', () => {
  const pair = grid(200, 130);
  const sliders = planSliders(pair, joint, jointStripInsetMm(joint));
  const built = buildPiecesWith(engine, pair, 3, [], undefined, undefined, undefined, () => true, undefined, {
    joint,
    sliders,
  });
  const [left, right] = built.map((b) => b.solid);
  if (left === undefined || right === undefined) throw new Error('two pieces');

  it('half a dovetail rail on each, 3 mm wide at the face and 4 at the top, flush with the joint', () => {
    expect(probe(left, 98.5, 65, 5)).toBeGreaterThan(0);
    expect(probe(left, 96.2, 65, 6.8)).toBeGreaterThan(0); // the flare, at the top
    expect(probe(left, 96.2, 65, 3.3)).toBe(0); // narrower at the face
    expect(probe(left, 98.5, 4, 5)).toBe(0); // short of the edge strip
    expect(probe(right, 1.5, 65, 5)).toBeGreaterThan(0);
    expect(probe(right, 3.8, 65, 6.8)).toBeGreaterThan(0);
    expect(probe(right, 3.8, 65, 3.3)).toBe(0);
    expect(left.boundingBox().max).toEqual([100, 130, 7]);
  });

  it('square corners, and the bed-side chamfer', () => {
    expect(probe(left, 0.5, 0.5, 2)).toBeGreaterThan(0);
    expect(probe(left, 0.1, 65, 0.1)).toBe(0);
  });

  it('the slider: a groove 8.4 mm wide at its floor and 6.4 at its mouth, printed groove up', () => {
    const slider = sliderSolid(engine, 50, joint);
    try {
      const { min, max } = slider.boundingBox();
      expect([...min, ...max].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0, 50, 12.4, 6.2]);
      expect(probe(slider, 25, 6.2, 1)).toBeGreaterThan(0); // the floor
      expect(probe(slider, 25, 6.2 + 4.1, 2.1)).toBe(0); // the groove, wide at its floor
      expect(probe(slider, 25, 6.2 + 4.1, 6.1)).toBeGreaterThan(0); // the lip, narrowing its mouth
      expect(probe(slider, 25, 6.2 + 3.1, 6.1)).toBe(0); // the mouth
    } finally {
      slider.delete();
    }
  });
});

describe('what they rule out, and what the plan says', () => {
  it('printed pieces only, no strips in TPU, and no coupon', () => {
    expect(errors({ ...rails, pieceSource: 'sheet' })).toMatchObject({
      jointStyle: 'Sliding rails are printed: print the pieces, or choose the H-strips.',
    });
    expect(errors({ ...rails, seal: 'tpu', tpuJoints: 'yes' })).toMatchObject({
      tpuJoints: 'Sliding rails have no strips to print in TPU.',
    });
    expect(errors({ ...rails, coupon: 'yes' })).toMatchObject({
      coupon: 'The coupon tries the strips’ grip; sliding rails have no strips.',
    });
  });

  it('the joints, the stiffeners and the rain', () => {
    const p = read(rails);
    const text = describePlan(planWall(p), p);
    // 4 columns and 6 rows, as with the dovetails less the room for tabs: 18 joints across, 20 up.
    expect(text.joints).toBe(
      'Joints: sliding dovetail rails, 38 sliders in 4 lengths: lay the pieces room side up, edge to edge, and ' +
        'slide a slider along each pair of rails from its end. They hold the pieces in and across the wall’s ' +
        'plane, and slide off to take the wall apart.',
    );
    expect(text.stiffeners[0]).toContain('the stiffeners clip to the H-strips, so choose them to stiffen it.');
    expect(text.rain[0]).toContain('Rain: every edge strip has weep holes');
  });
});
