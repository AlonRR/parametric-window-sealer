// Guidance and warnings (safety-guidance, #121), from the design review against published work: a
// wall in a window is near children, escape routes, heaters and power cords, and in winter it can
// run wet. The page and the reader's safety notes say the same seven things, and neither the page
// nor the README claims what the evidence does not support. This test fails if one drifts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

export const SAFETY_LINES = [
  'The wall is not a fall barrier: it will not stop a child, or anyone, falling out of the window.',
  'Do not block a bedroom’s only escape window unless the wall comes out in seconds, by hand, with no tool.',
  'On a ground floor, or wherever the window can be reached from outside, add a metal window lock: neither the wall nor its sash stop is a lock.',
  'In winter, check the wall and the window for condensation, and air the room if they run wet.',
  'PLA softens in a sunny window: print the wall in PETG, or in ASA where it gets sun.',
  'Printed plastics burn: keep the wall away from heaters and flames, and do not trap a power cord in it.',
  'Put the wall together whole, away from the window, then set it in the window in one piece.',
];

export const NOT_CLAIMED =
  'This project claims no energy saving, and the wall is not airtight, weatherproof, secure, child-safe or ' +
  'flame retardant; it has no wind, rain or UV rating.';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\s+/g, ' ');
const page = read('../index.html');
const readme = read('../../README.md');
const notes = read('../../docs/safety.md');

// A claim the evidence does not support, written as one.
const CLAIMS = [/air-?tight/gi, /weather-?proof/gi, /child-?safe/gi, /flame[- ]retardant/gi, /energy[- ]sav/gi];
const unclaimed = (text: string) => {
  const rest = text.split(NOT_CLAIMED).join(' ');
  return CLAIMS.flatMap((claim) => rest.match(claim) ?? []);
};

describe('the warnings (#121)', () => {
  it('are on the page, and in the safety notes, word for word', () => {
    for (const line of SAFETY_LINES) {
      expect(page).toContain(line);
      expect(notes).toContain(line);
    }
  });

  it('say what is not claimed, on the page and in the README', () => {
    expect(page).toContain(NOT_CLAIMED);
    expect(readme).toContain(NOT_CLAIMED);
  });

  it('leave no such claim made anywhere else on the page or in the README', () => {
    expect(unclaimed(page)).toEqual([]);
    expect(unclaimed(readme)).toEqual([]);
    expect(unclaimed('An airtight, weatherproof wall.')).toEqual(['airtight', 'weatherproof']); // the check works
  });
});
