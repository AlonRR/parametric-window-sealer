// The guided test print (fit-test-print, #63): the test coupon is printed, and the answer to which
// of its five sections held the tab best moves the joint's settings for the next print, until one
// holds. Every section too loose moves the grip up past the last coupon's tightest; every one too
// tight moves it down; and when even a section with no ribs was too tight, the slot itself prints
// narrow, so the fit goes up instead.
import { describe, expect, it } from 'vitest';
import { DEFAULT_JOINT, FIT_TEST_FIT_STEP_MM, couponGrips, nextTestPrint } from '../src/index.js';

const joint = (gripMm: number, fitMm = DEFAULT_JOINT.fitMm) => ({ ...DEFAULT_JOINT, gripMm, fitMm });

describe('a section held', () => {
  it('takes that section’s grip, and the test is done', () => {
    const next = nextTestPrint(joint(0.15), 2);
    expect(next.done).toBe(true);
    expect(next.joint).toEqual(joint(0.1));
    expect(next.say).toBe(
      'Section 2 held: print the strips with a grip of 0.1 mm per face. The coupon can come out of the download.',
    );
  });

  it('any of the five, and only those', () => {
    expect([1, 2, 3, 4, 5].map((n) => nextTestPrint(joint(0.15), n).joint.gripMm)).toEqual(couponGrips(0.15));
    for (const bad of [0, 6, 2.5, Number.NaN]) expect(() => nextTestPrint(joint(0.15), bad)).toThrow(RangeError);
  });
});

describe('every section too loose', () => {
  it('moves the grip up, so the next coupon starts one step above the last one’s tightest', () => {
    const next = nextTestPrint(joint(0.15), 'all-loose');
    expect(next.done).toBe(false);
    expect(next.joint).toEqual(joint(0.4));
    expect(couponGrips(next.joint.gripMm)).toEqual([0.3, 0.35, 0.4, 0.45, 0.5]);
    expect(next.say).toBe(
      'The tab slipped out of every section, so the grip goes up to 0.4 mm per face: print the coupon ' +
        'again, which now tries 0.3 to 0.5 mm. Measuring a strip’s slot with calipers (step 4) can save a print.',
    );
  });
});

describe('every section too tight', () => {
  it('moves the grip down, so the next coupon ends one step below the last one’s loosest', () => {
    const next = nextTestPrint(joint(0.5), 'all-tight');
    expect(next.done).toBe(false);
    expect(next.joint).toEqual(joint(0.25));
    expect(couponGrips(next.joint.gripMm)).toEqual([0.15, 0.2, 0.25, 0.3, 0.35]);
    expect(next.say).toBe(
      'The tab went into no section, so the grip goes down to 0.25 mm per face: print the coupon ' +
        'again, which now tries 0.15 to 0.35 mm. Measuring a strip’s slot with calipers (step 4) can save a print.',
    );
  });

  it('never below nothing: the next coupon starts at no ribs', () => {
    expect(nextTestPrint(joint(0.15), 'all-tight').joint).toEqual(joint(0));
    expect(couponGrips(0)[0]).toBe(0);
  });

  it('when even the section with no ribs was too tight, the slot prints narrow: the fit goes up', () => {
    expect(FIT_TEST_FIT_STEP_MM).toBe(0.1);
    const next = nextTestPrint(joint(0.05), 'all-tight');
    expect(next.done).toBe(false);
    expect(next.joint).toEqual(joint(0.05, 0.3));
    expect(next.say).toBe(
      'The tab went into no section, not even the one with no ribs, so the slot prints narrower than the ' +
        'piece: the fit goes up to 0.3 mm per face. Print the coupon again; measuring a strip’s slot with ' +
        'calipers (step 4) gives the fit in one go.',
    );
  });

  it('keeps the rest of the joint as it was', () => {
    const own = { ...DEFAULT_JOINT, slotDepthMm: 10, pins: false, gripMm: 0.2 };
    for (const answer of [1, 'all-loose', 'all-tight'] as const) {
      const { joint: next } = nextTestPrint(own, answer);
      expect({ ...next, gripMm: 0, fitMm: 0 }).toEqual({ ...own, gripMm: 0, fitMm: 0 });
    }
  });
});
