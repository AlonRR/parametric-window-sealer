// The measuring guide's sum (backlog item user-guide, #14; Q51, Q54): from a printed strip and a
// printed piece, measured with calipers, the fit per face that gives the joint the play it is meant
// to have. Chosen without asking (Q144; docs/choices.md, C62): the play aimed at is the starting
// fit, 0.2 mm a face (Q51).
import { describe, expect, it } from 'vitest';
import { DEFAULT_JOINT, FIT_TARGET_MM, fitFromMeasured, measuredPlayMm } from '../src/index.js';

describe('the fit from a measured strip and piece (C62)', () => {
  const printed = { fitMm: 0.2, measuredSlotMm: 3.4, measuredPanelMm: 3 };

  it('aims at the starting fit, 0.2 mm a face', () => {
    expect(FIT_TARGET_MM).toBe(DEFAULT_JOINT.fitMm);
    expect(FIT_TARGET_MM).toBe(0.2);
  });

  it('the play each face has now: half the slot less the piece', () => {
    expect(measuredPlayMm(printed)).toBeCloseTo(0.2, 9);
    expect(measuredPlayMm({ ...printed, measuredSlotMm: 3.2 })).toBeCloseTo(0.1, 9);
  });

  it('keeps a fit that printed true', () => {
    expect(fitFromMeasured(printed)).toBe(0.2);
  });

  it('opens the slot by what it printed too tight, and closes it by what it printed too loose', () => {
    expect(fitFromMeasured({ ...printed, measuredSlotMm: 3.2 })).toBe(0.3); // 0.1 a face too tight
    expect(fitFromMeasured({ ...printed, measuredSlotMm: 3.6 })).toBe(0.1); // 0.1 a face too loose
    // A piece printed thick, in a slot printed true, needs that much more room.
    expect(fitFromMeasured({ ...printed, measuredPanelMm: 3.1 })).toBe(0.25);
    // Measured from a strip printed with another fit.
    expect(fitFromMeasured({ fitMm: 0.3, measuredSlotMm: 3.4, measuredPanelMm: 3 })).toBe(0.3);
  });

  it('to the hundredth of a mm, and never below nothing', () => {
    expect(fitFromMeasured({ ...printed, measuredSlotMm: 3.333 })).toBe(0.23);
    expect(fitFromMeasured({ ...printed, measuredSlotMm: 4.2 })).toBe(0);
  });

  it('refuses measurements that are not sizes', () => {
    expect(() => fitFromMeasured({ ...printed, measuredSlotMm: 0 })).toThrow(RangeError);
    expect(() => fitFromMeasured({ ...printed, measuredPanelMm: Number.NaN })).toThrow(RangeError);
  });
});
