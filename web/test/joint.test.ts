// Backlog item connector-strip (#10): where the strips and cross pieces go. A strip runs
// along each joint between two crossings (Q13); a cross piece, as wide as the strip, sits
// where four pieces meet (Q57); strips stop half the slide short of a cross piece (Q57) and
// run flush to the wall's outer edge (Q59). Identical strips are one shape (Q58).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOINT,
  jointWidthMm,
  minPieceMm,
  partShapes,
  planJoints,
  stripThicknessMm,
  stripWidthMm,
} from '../src/joint';
import type { JointParams, StripPlacement } from '../src/joint';
import { layoutGrid } from '../src/layout';
import type { GridSpec } from '../src/layout';

const grid = (over: Partial<GridSpec> = {}, joint: JointParams = DEFAULT_JOINT) =>
  layoutGrid({
    widthMm: 600,
    heightMm: 1000,
    maxPieceWidthMm: 200,
    maxPieceHeightMm: 200,
    minPieceMm: 30,
    jointMm: jointWidthMm(joint),
    jointSpreadMm: joint.slideMm,
    width: { mode: 'equal' },
    height: { mode: 'equal' },
    ...over,
  });

const vertical = (strips: StripPlacement[]) => strips.filter((s) => s.axis === 'vertical');
const horizontal = (strips: StripPlacement[]) => strips.filter((s) => s.axis === 'horizontal');

describe('the joint dimensions (Q51, Q56)', () => {
  it('starts from the owner’s numbers: slot 8, slide 3, web 2, flanges 1.6, fit 0.2', () => {
    expect(DEFAULT_JOINT).toEqual({ slotMm: 8, slideMm: 3, webMm: 2, flangeMm: 1.6, fitMm: 0.2 });
  });

  it('a joint takes the web plus the slide: each piece sits in the middle of its slide', () => {
    expect(jointWidthMm(DEFAULT_JOINT)).toBe(5);
  });

  it('the smallest piece: two slot depths and a strip’s width between them (Q76)', () => {
    expect(minPieceMm(DEFAULT_JOINT)).toBe(34);
    expect(minPieceMm({ ...DEFAULT_JOINT, slotMm: 10, webMm: 3 })).toBe(10 + 10 + 23);
  });

  it('at the smallest piece, a strip between two crossings is as long as it is wide', () => {
    const plan = planJoints(
      grid({ heightMm: 3 * 34 + 2 * 5, maxPieceHeightMm: 34 }),
      DEFAULT_JOINT,
    );
    const middleRow = plan.strips.filter((s) => s.axis === 'vertical')[1];
    expect(middleRow?.lengthMm).toBeCloseTo(stripWidthMm(DEFAULT_JOINT), 9);
  });

  it('the strip is two slots and a web wide, and the panel plus fit and flanges thick', () => {
    expect(stripWidthMm(DEFAULT_JOINT)).toBe(18);
    expect(stripThicknessMm(DEFAULT_JOINT, 3)).toBeCloseTo(6.6, 9);
  });
});

describe('planJoints, the example wall (600 x 1000 mm, 3 x 5 pieces)', () => {
  const layout = grid();
  const plan = planJoints(layout, DEFAULT_JOINT);

  it('a strip on every joint between two crossings, a cross piece at every crossing', () => {
    expect(vertical(plan.strips)).toHaveLength(2 * 5);
    expect(horizontal(plan.strips)).toHaveLength(4 * 3);
    expect(plan.crosses).toHaveLength(2 * 4);
  });

  it('a cross piece is centred in both joints where four pieces meet', () => {
    const first = layout.pieces[0];
    expect(plan.crosses[0]?.xMm).toBeCloseTo((first?.widthMm ?? 0) + 2.5, 9);
    expect(plan.crosses[0]?.yMm).toBeCloseTo((first?.heightMm ?? 0) + 2.5, 9);
  });

  it('a strip is centred on its joint, as wide as two slots and the web', () => {
    const s = vertical(plan.strips)[0];
    const jointCentre = (layout.pieces[0]?.widthMm ?? 0) + 2.5;
    expect(s?.xMm).toBeCloseTo(jointCentre - 9, 9);
  });

  it('a strip stops half the slide, 1.5 mm, short of each cross piece (Q57)', () => {
    const cross = plan.crosses[0];
    const above = vertical(plan.strips).find((s) => s.yMm > (cross?.yMm ?? 0));
    const right = horizontal(plan.strips).find((s) => s.xMm > (cross?.xMm ?? 0));
    expect((above?.yMm ?? 0) - ((cross?.yMm ?? 0) + 9)).toBeCloseTo(1.5, 9);
    expect((right?.xMm ?? 0) - ((cross?.xMm ?? 0) + 9)).toBeCloseTo(1.5, 9);
  });

  it('at the wall’s outer edge a strip runs flush with the pieces (Q59)', () => {
    const columnStrips = vertical(plan.strips);
    expect(Math.min(...columnStrips.map((s) => s.yMm))).toBe(0);
    expect(Math.max(...columnStrips.map((s) => s.yMm + s.lengthMm))).toBeCloseTo(1000, 9);
    const rowStrips = horizontal(plan.strips);
    expect(Math.min(...rowStrips.map((s) => s.xMm))).toBe(0);
    expect(Math.max(...rowStrips.map((s) => s.xMm + s.lengthMm))).toBeCloseTo(600, 9);
  });

  it('strips between two crossings are a slot shorter at each end than the piece', () => {
    const lengths = vertical(plan.strips).map((s) => Math.round(s.lengthMm * 1e6) / 1e6);
    expect(lengths.sort((a, b) => a - b)).toEqual([180, 180, 180, 180, 180, 180, 188, 188, 188, 188]);
  });

  it('groups identical strips into one shape with a count (Q58): 4 strips and 1 cross', () => {
    expect(partShapes(plan, DEFAULT_JOINT)).toEqual([
      { kind: 'strip', lengthMm: 188.7, widthMm: 18, count: 8 },
      { kind: 'strip', lengthMm: 188, widthMm: 18, count: 4 },
      { kind: 'strip', lengthMm: 180.7, widthMm: 18, count: 4 },
      { kind: 'strip', lengthMm: 180, widthMm: 18, count: 6 },
      { kind: 'cross', lengthMm: 18, widthMm: 18, count: 8 },
    ]);
  });
});

describe('planJoints, other walls', () => {
  it('one row: strips run the full height, and there is no crossing', () => {
    const plan = planJoints(grid({ heightMm: 150 }), DEFAULT_JOINT);
    expect(plan.crosses).toEqual([]);
    expect(plan.strips.map((s) => [s.axis, s.yMm, s.lengthMm])).toEqual([
      ['vertical', 0, 150],
      ['vertical', 0, 150],
    ]);
  });

  it('with edge strips, a strip stops a slot depth from the outer edge (Q74)', () => {
    const plan = planJoints(grid({ heightMm: 150 }), DEFAULT_JOINT, 8);
    expect(plan.strips.map((s) => [s.yMm, s.lengthMm])).toEqual([
      [8, 134],
      [8, 134],
    ]);
    const rows = planJoints(grid(), DEFAULT_JOINT, 8);
    const columnStrips = vertical(rows.strips);
    expect(Math.min(...columnStrips.map((s) => s.yMm))).toBe(8);
    expect(Math.max(...horizontal(rows.strips).map((s) => s.xMm + s.lengthMm))).toBeCloseTo(592, 9);
  });

  it('one piece: no joint, no strip, no cross piece', () => {
    expect(planJoints(grid({ widthMm: 150, heightMm: 150 }), DEFAULT_JOINT)).toEqual({
      strips: [],
      crosses: [],
    });
  });

  it('spread joints (Q61): cross pieces stay centred and strips keep their clearance', () => {
    const layout = grid({ widthMm: 612, width: { mode: 'full-plus-filler', filler: 'end' } });
    expect(layout.columnJointsMm[0]).toBeCloseTo(6, 9);
    const plan = planJoints(layout, DEFAULT_JOINT);
    const cross = plan.crosses[0];
    expect(cross?.xMm).toBeCloseTo(200 + 3, 9);
    const right = horizontal(plan.strips).find((s) => s.xMm > (cross?.xMm ?? 0));
    expect((right?.xMm ?? 0) - ((cross?.xMm ?? 0) + 9)).toBeCloseTo(1.5, 9);
  });

  it('a strip with no room left between two cross pieces is left out', () => {
    // Rows 11.25 mm high: between two crossings a strip would start 8 mm above a row's
    // bottom and end 8 mm below its top, so it has no length; next to the outer edge
    // 3.25 mm is left, and those strips stay.
    const layout = grid({
      heightMm: 60,
      maxPieceHeightMm: 15,
      width: { mode: 'equal' },
      height: { mode: 'equal' },
    });
    const plan = planJoints(layout, DEFAULT_JOINT);
    for (const s of plan.strips) expect(s.lengthMm).toBeGreaterThan(0);
    const interiorRows = layout.rows.length - 2;
    expect(vertical(plan.strips)).toHaveLength(2 * (layout.rows.length - interiorRows));
  });
});
