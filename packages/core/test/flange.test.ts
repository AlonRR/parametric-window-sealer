// Bolted flanges (joint-bolts, #31), a joint style beside the H-strips, the puzzle dovetails and the
// sliding rails: the pieces meet edge to edge, each has a flange standing on its room side along
// every edge it shares, flush with the joint, and the two flanges back to back are bolted together
// with M4 bolts, a washer and a nut each.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FLANGE,
  SETTINGS,
  buildPiecesWith,
  describePlan,
  flangeBoltMm,
  jointStripInsetMm,
  layoutGrid,
  loadEngine,
  partName,
  planFlanges,
  planParts,
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
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};
const bolts = { jointStyle: 'bolts' };
const joint = { ...DEFAULT_JOINT, style: 'bolts' as const };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

const equal = { width: { mode: 'equal' }, height: { mode: 'equal' } } as const;
// Pieces up to 100 mm across, and as high as asked.
const grid = (widthMm: number, heightMm: number, maxHeightMm = heightMm) =>
  layoutGrid({ widthMm, heightMm, maxPieceWidthMm: 100, maxPieceHeightMm: maxHeightMm, minPieceMm: 34, ...equal });

describe('the setting', () => {
  it('a fourth joint style', () => {
    expect(read(bolts).joint.style).toBe('bolts');
    expect(SETTINGS.find((s) => s.field === 'jointStyle')?.values).toEqual(['strips', 'dovetails', 'rails', 'bolts']);
  });
});

describe('the plan', () => {
  it('flanges along every joint, to the crossings and short of the edge strips, a bolt about each 80 mm', () => {
    expect(FLANGE).toEqual({ heightMm: 10, thicknessMm: 3, holeMm: 4.5, pitchMm: 80, endMm: 15 });
    expect(flangeBoltMm()).toBe(12); // two 3 mm flanges, a washer each side and a nut
    const inset = jointStripInsetMm(joint);
    // One joint 130 mm high, less the edge strips' 8 mm at each end: 114 mm, so 1 bolt.
    expect(planFlanges(grid(200, 130), joint, inset)).toEqual([
      { axis: 'vertical', xMm: 100, yMm: inset, lengthMm: 130 - 2 * inset, boltsMm: [65 - inset] },
    ]);
    // One 250 mm high: 234 mm, so 3 bolts, centred in equal lengths.
    const tall = planFlanges(grid(200, 250), joint, inset);
    expect(tall.map((f) => f.boltsMm)).toEqual([[39, 117, 195]]);
    // Two by two: each joint in two lengths, each running to the crossing.
    const four = planFlanges(grid(200, 200, 100), joint, inset);
    expect(four.map((f) => [f.axis, f.xMm, f.yMm, f.lengthMm])).toEqual([
      ['vertical', 100, inset, 100 - inset],
      ['vertical', 100, 100, 100 - inset],
      ['horizontal', inset, 100, 100 - inset],
      ['horizontal', 100, 100, 100 - inset],
    ]);
    expect(planFlanges(grid(200, 130), DEFAULT_JOINT, inset)).toEqual([]);
  });

  it('the pieces meet with no joint between them; nothing printed but the pieces and the edge strips', () => {
    const p = read(bolts);
    const plan = planWall(p);
    expect(plan.columnJointsMm.every((j) => j === 0)).toBe(true);
    expect(planParts(p, plan).joints).toEqual({ strips: [], crosses: [] });
    const names = wallPartShapes(p).map(partName);
    expect(names.every((n) => n.startsWith('edge-') || n.startsWith('stiffener-'))).toBe(true);
  });
});

describe('the pieces', () => {
  const pair = grid(200, 130);
  const flanges = planFlanges(pair, joint, jointStripInsetMm(joint));
  const built = buildPiecesWith(
    engine,
    pair,
    3,
    [],
    undefined,
    undefined,
    undefined,
    () => true,
    undefined,
    undefined,
    { joint, flanges },
  );
  const [left, right] = built.map((b) => b.solid);
  if (left === undefined || right === undefined) throw new Error('two pieces');

  it('a flange 10 mm high and 3 thick on each, flush with the joint, with a 4.5 mm hole for each bolt', () => {
    expect(probe(left, 98.5, 30, 12.5)).toBeGreaterThan(0);
    expect(probe(left, 96.9, 30, 8)).toBe(0); // 3 mm thick
    expect(probe(left, 98.5, 30, 13.1)).toBe(0); // 10 mm high
    expect(probe(left, 98.5, 4, 8)).toBe(0); // short of the edge strip
    expect(probe(left, 98.5, 65, 8)).toBe(0); // the hole, at the bolt, halfway up
    expect(probe(left, 98.5, 65 + 2.4, 8)).toBeGreaterThan(0); // its edge
    expect(probe(right, 1.5, 30, 12.5)).toBeGreaterThan(0);
    expect(probe(right, 1.5, 65, 8)).toBe(0);
    expect(left.boundingBox().max).toEqual([100, 130, 13]);
  });

  it('square corners, and the bed-side chamfer', () => {
    expect(probe(left, 0.5, 0.5, 2)).toBeGreaterThan(0);
    expect(probe(left, 0.1, 65, 0.1)).toBe(0);
  });
});

describe('what they rule out, and what the plan says', () => {
  it('printed pieces only, no strips in TPU, and no coupon', () => {
    expect(errors({ ...bolts, pieceSource: 'sheet' })).toMatchObject({
      jointStyle: 'Bolted flanges are printed: print the pieces, or choose the H-strips.',
    });
    expect(errors({ ...bolts, seal: 'tpu', tpuJoints: 'yes' })).toMatchObject({
      tpuJoints: 'Bolted flanges have no strips to print in TPU.',
    });
    expect(errors({ ...bolts, coupon: 'yes' })).toMatchObject({
      coupon: 'The coupon tries the strips’ grip; bolted flanges have no strips.',
    });
  });

  it('the joints: how many bolts, nuts and washers to buy', () => {
    const p = read(bolts);
    const text = describePlan(planWall(p), p);
    // 4 columns and 6 rows: 18 flange pairs across, 20 up, each with 2 bolts.
    expect(text.joints).toBe(
      'Joints: bolted flanges along the 38 edges where pieces meet: 76 M4 bolts, 12 mm long, each with a nut and ' +
        '2 washers. Lay the pieces room side up, edge to edge, and bolt each pair of flanges together. They hold the ' +
        'pieces in and across the wall’s plane, and come apart with a screwdriver.',
    );
    expect(text.stiffeners[0]).toContain('the stiffeners clip to the H-strips, so choose them to stiffen it.');
  });
});
