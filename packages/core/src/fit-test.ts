// The guided test print (fit-test-print, #63): the test coupon is printed, and the answer to which
// of its five sections held the tab best sets the joint for the next print, until one holds. Every
// section too loose moves the grip up so the next coupon starts one step above the last one's
// tightest; every one too tight moves it down so the next ends one step below the loosest. When
// even a section with no ribs was too tight, the ribs are not the trouble: the slot prints narrower
// than the piece, so the fit goes up. Calipers (the measuring guide's fourth step) can save a print.
import { COUPON_SECTIONS, COUPON_STEP_MM, couponGrips } from './coupon.js';
import type { JointParams } from './joint.js';
import { hundredth } from './words.js';

export const FIT_TEST_FIT_STEP_MM = 0.1; // the fit added when the slot prints too narrow

// The section, 1 to 5, that held the tab best, or none: every one let it slip, or it went into none.
export type CouponAnswer = number | 'all-loose' | 'all-tight';

export interface TestPrintStep {
  joint: JointParams; // the joint to print with next
  done: boolean; // a section held: the strips can be printed with this joint
  say: string;
}

const round = (n: number) => Math.round(n * 100) / 100;
const CALIPERS = 'Measuring a strip’s slot with calipers (step 4) can save a print.';

function again(joint: JointParams, why: string): TestPrintStep {
  const grips = couponGrips(joint.gripMm);
  const tries = `${hundredth(grips[0] ?? 0)} to ${hundredth(grips[grips.length - 1] ?? 0)} mm`;
  return {
    joint,
    done: false,
    say: `${why} ${hundredth(joint.gripMm)} mm per face: print the coupon again, which now tries ${tries}. ${CALIPERS}`,
  };
}

export function nextTestPrint(joint: JointParams, answer: CouponAnswer): TestPrintStep {
  const grips = couponGrips(joint.gripMm);
  if (typeof answer === 'number') {
    const gripMm = Number.isInteger(answer) ? grips[answer - 1] : undefined;
    if (gripMm === undefined) throw new RangeError(`a section is 1 to ${COUPON_SECTIONS}, got ${answer}`);
    return {
      joint: { ...joint, gripMm },
      done: true,
      say:
        `Section ${answer} held: print the strips with a grip of ${hundredth(gripMm)} mm per face. ` +
        'The coupon can come out of the download.',
    };
  }
  const loosest = grips[0] ?? 0;
  const tightest = grips[grips.length - 1] ?? 0;
  if (answer === 'all-loose') {
    const gripMm = round(tightest + 3 * COUPON_STEP_MM);
    return again({ ...joint, gripMm }, 'The tab slipped out of every section, so the grip goes up to');
  }
  if (loosest > 0) {
    const gripMm = Math.max(0, round(loosest - 3 * COUPON_STEP_MM));
    return again({ ...joint, gripMm }, 'The tab went into no section, so the grip goes down to');
  }
  const fitMm = round(joint.fitMm + FIT_TEST_FIT_STEP_MM);
  return {
    joint: { ...joint, fitMm },
    done: false,
    say:
      'The tab went into no section, not even the one with no ribs, so the slot prints narrower than the ' +
      `piece: the fit goes up to ${hundredth(fitMm)} mm per face. Print the coupon again; measuring a ` +
      'strip’s slot with calipers (step 4) gives the fit in one go.',
  };
}
