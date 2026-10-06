// The page and the library agree (code-params-page, #95): every field the library reads has a
// control on the page, every line of the plan has a place, and every condition in the page's
// HTML names a field and is well formed. A new setting or plan line that misses the page fails
// here, not in a user's browser.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, FIELD_NAMES, describePlan, planWall } from 'parametric-window-sealer';
import { holds, parseCondition } from '../src/show-when';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const all = (pattern: RegExp): string[] => [...page.matchAll(pattern)].map((m) => m[1] ?? '');

describe("the page's controls", () => {
  const names = all(/\bname="([A-Za-z]+)"/g);

  it('one control for each field the library reads (radios share one name)', () => {
    for (const field of FIELD_NAMES) {
      const radios = all(new RegExp(`<input type="radio" name="${field}"`, 'g')).length;
      const count = names.filter((n) => n === field).length;
      expect(count === 1 || (radios > 1 && count === radios), `${field}: ${count} controls`).toBe(true);
    }
  });

  it('a place for the plan’s every line, and no place for a line it does not have', () => {
    const text = describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS);
    const lines = Object.keys(text).filter((k) => k !== 'leftovers'); // the leftovers go with the warnings
    expect(all(/data-plan="([A-Za-z]+)"/g).sort()).toEqual(lines.sort());
  });

  it('each condition is well formed and names a control on the page', () => {
    const conditions = all(/data-(?:show|enable)-when="([^"]*)"/g);
    expect(conditions.length).toBeGreaterThan(20);
    for (const text of conditions) expect(names).toContain(parseCondition(text).field);
  });
});

describe('a condition in the page', () => {
  const values: Record<string, string> = { seal: 'tape', fill: 'sealed' };
  const valueOf = (field: string) => values[field];

  it('holds while the field has the value, or one of several', () => {
    expect(holds(parseCondition('seal=tape'), valueOf)).toBe(true);
    expect(holds(parseCondition('seal=tpu'), valueOf)).toBe(false);
    expect(holds(parseCondition('seal=tpu|tape'), valueOf)).toBe(true);
  });

  it('with != holds while the field has none of them, or no such field exists', () => {
    expect(holds(parseCondition('fill!=sealed'), valueOf)).toBe(false);
    expect(holds(parseCondition('seal!=none'), valueOf)).toBe(true);
    expect(holds(parseCondition('appliance!=hose'), valueOf)).toBe(true);
    expect(holds(parseCondition('appliance=hose'), valueOf)).toBe(false);
  });

  it('refuses what it cannot read', () => {
    for (const text of ['', 'seal', 'seal==tape', '=tape', 'seal=', 'seal=a||b']) {
      expect(() => parseCondition(text), text).toThrow('Not a condition');
    }
  });
});
