// Puzzle dovetails (joint-dovetail, #29), a joint style beside the H-strips: the pieces meet
// edge to edge, and along each joint the piece on the left, or below, has dovetail tabs that press
// down into sockets in its neighbour, with the joint's fit as clearance all along. There are no
// strips or cross pieces; the edge strips stay.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  DOVETAIL,
  EXAMPLE_PARAMS,
  SETTINGS,
  buildPiecesWith,
  describePlan,
  layoutGrid,
  loadEngine,
  partName,
  planDovetails,
  planParts,
  planWall,
  printLimit,
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
const dovetails = { jointStyle: 'dovetails' };
const joint = { ...DEFAULT_JOINT, style: 'dovetails' as const };

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

// Two pieces of 100 × 130 mm side by side, meeting at x = 100.
const equal = { width: { mode: 'equal' }, height: { mode: 'equal' } } as const;
const pair = layoutGrid({
  widthMm: 200,
  heightMm: 130,
  maxPieceWidthMm: 100,
  maxPieceHeightMm: 200,
  minPieceMm: 34,
  ...equal,
});

describe('the setting', () => {
  it('H-strips to start with, or puzzle dovetails, just before the joint’s sizes', () => {
    expect(EXAMPLE_PARAMS.joint.style).toBe('strips');
    expect(example.jointStyle).toBe('strips');
    expect(read(dovetails).joint.style).toBe('dovetails');
    expect(toFormValues(read(dovetails)).jointStyle).toBe('dovetails');
    const fields = SETTINGS.map((s) => s.field);
    expect(fields.indexOf('jointStyle')).toBe(fields.indexOf('slotMm') - 1);
    expect(SETTINGS.find((s) => s.field === 'jointStyle')).toMatchObject({
      path: 'joint.style',
      values: ['strips', 'dovetails'],
    });
  });
});

describe('the plan', () => {
  it('the pieces meet with no joint between them, and there are no strips or cross pieces', () => {
    const p = read(dovetails);
    const plan = planWall(p);
    expect(plan.columnJointsMm.every((j) => j === 0)).toBe(true);
    expect(plan.rowJointsMm.every((j) => j === 0)).toBe(true);
    const parts = planParts(p, plan);
    expect(parts.joints).toEqual({ strips: [], crosses: [] });
    expect(parts.edges.length).toBeGreaterThan(0);
    const names = wallPartShapes(p).map(partName);
    expect(names.some((n) => n.startsWith('strip-') || n.startsWith('cross-'))).toBe(false);
    expect(names.some((n) => n.startsWith('edge-'))).toBe(true);
  });

  it('leaves room on the printer’s bed for the tabs beyond each piece', () => {
    const p = read({ ...dovetails, openingWidthMm: '588' });
    const max = printLimit(p);
    const plan = planWall(p);
    for (const cell of plan.pieces) {
      expect(cell.widthMm + DOVETAIL.depthMm).toBeLessThanOrEqual(max.widthMm);
      expect(cell.heightMm + DOVETAIL.depthMm).toBeLessThanOrEqual(max.heightMm);
    }
  });

  it('a tab about each 60 mm along every joint, centred in equal lengths, none within 14 mm of an end', () => {
    expect(DOVETAIL).toEqual({ depthMm: 6, neckMm: 8, headMm: 12, pitchMm: 60, endMm: 14 });
    expect(planDovetails(pair, joint)).toEqual([
      { axis: 'vertical', xMm: 100, yMm: 32.5 },
      { axis: 'vertical', xMm: 100, yMm: 97.5 },
    ]);
    const stacked = layoutGrid({
      widthMm: 40,
      heightMm: 80,
      maxPieceWidthMm: 100,
      maxPieceHeightMm: 40,
      minPieceMm: 34,
      ...equal,
    });
    expect(planDovetails(stacked, joint)).toEqual([{ axis: 'horizontal', xMm: 20, yMm: 40 }]);
    expect(planDovetails(pair, DEFAULT_JOINT)).toEqual([]);
  });
});

describe('the pieces', () => {
  const built = buildPiecesWith(engine, pair, 3, [], undefined, undefined, undefined, () => true, {
    joint,
    tabs: planDovetails(pair, joint),
  });
  const [left, right] = built.map((b) => b.solid);
  if (left === undefined || right === undefined) throw new Error('two pieces');

  it('the left one has the tabs, flaring from an 8 mm neck to a 12 mm head, 0.2 mm short all round', () => {
    expect(probe(left, 103, 32.5, 2)).toBeGreaterThan(0);
    expect(probe(left, 105.5, 37.5, 2)).toBeGreaterThan(0); // the head, wider than the neck
    expect(probe(left, 100.5, 37.5, 2)).toBe(0); // beside the neck
    expect(probe(left, 105.9, 32.5, 2)).toBe(0); // its end, 0.2 short of 6 mm
    expect(probe(left, 103, 65, 2)).toBe(0); // no tab between them
    expect(probe(left, 99.9, 65, 2)).toBe(0); // its edge, 0.2 mm back from the joint
    expect(probe(left, 99.7, 65, 2)).toBeGreaterThan(0);
    expect(left.boundingBox().max[0]).toBeCloseTo(105.8, 5);
  });

  it('the right one has the sockets, 0.2 mm larger all round, and keeps its outer edge', () => {
    expect(probe(right, 3, 32.5, 2)).toBe(0);
    expect(probe(right, 6.1, 32.5, 2)).toBe(0);
    expect(probe(right, 6.3, 32.5, 2)).toBeGreaterThan(0);
    expect(probe(right, 0.1, 65, 2)).toBe(0);
    expect(probe(right, 0.3, 65, 2)).toBeGreaterThan(0);
    expect(probe(right, 99.95, 65, 2)).toBeGreaterThan(0);
    expect(right.boundingBox().max[0]).toBeCloseTo(100, 5);
  });

  it('square corners, and the bed-side chamfer following the tabs and the sockets', () => {
    expect(probe(left, 0.5, 0.5, 2)).toBeGreaterThan(0);
    expect(probe(left, 0.1, 65, 0.1)).toBe(0); // the chamfer, along the outer edge
    expect(probe(left, 1.2, 65, 0.1)).toBeGreaterThan(0);
    expect(probe(left, 103, 32.5 + 4.7, 0.1)).toBe(0); // and along the tab's side
    expect(probe(left, 103, 32.5 + 4.7, 2)).toBeGreaterThan(0);
    expect(probe(right, 3, 32.5 + 5.4, 0.1)).toBe(0); // and the socket's
    expect(probe(right, 3, 32.5 + 5.4, 2)).toBeGreaterThan(0);
  });
});

describe('what they rule out, and what the plan says', () => {
  it('printed pieces only, no strips in TPU, and no coupon for the strips’ grip', () => {
    expect(errors({ ...dovetails, pieceSource: 'sheet' })).toMatchObject({
      jointStyle: 'Puzzle dovetails are printed: print the pieces, or choose the H-strips.',
    });
    expect(errors({ ...dovetails, seal: 'tpu', tpuJoints: 'yes' })).toMatchObject({
      tpuJoints: 'Puzzle dovetails have no strips to print in TPU.',
    });
    expect(errors({ ...dovetails, coupon: 'yes' })).toMatchObject({
      coupon: 'The coupon tries the strips’ grip; puzzle dovetails have no strips.',
    });
  });

  it('the joints, the stiffeners and the rain', () => {
    // 4 columns of 150.75 mm and 6 rows of 168.8: 18 joints across with 3 tabs each, 20 up with 3 each.
    const p = read(dovetails);
    const text = describePlan(planWall(p), p);
    expect(text.joints).toBe(
      'Joints: puzzle dovetails, 114 tabs along the 38 edges where pieces meet, each 6 mm deep with 0.2 mm of fit ' +
        'a face: press each tab down into its neighbour’s socket. They hold the pieces together in the wall’s plane; ' +
        'across it only their fit holds them, so glue them for a lasting wall.',
    );
    expect(text.stiffeners).toEqual([
      'Stiffeners: the wall is 603 mm across, more than 500; the stiffeners clip to the H-strips, so choose them ' +
        'to stiffen it.',
    ]);
    expect(text.rain[0]).toBe(
      'Rain: every edge strip has weep holes in one flange to let water out of its slot; fit each with that ' +
        'flange outside. A groove under each edge strip stops water creeping under it to the room.',
    );
  });
});
