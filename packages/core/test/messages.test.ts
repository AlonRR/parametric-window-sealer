// What the user reads (code-params-page, #95): the messages for wrong settings and the plan's
// lines are written for someone measuring a window, so none names the project's internal
// question or choice IDs (Q…, C…), which only the repository's working notes explain.
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, describePlan, planWall, readParams, toFormValues } from '../src/index.js';
import type { FormValues } from '../src/index.js';

const INTERNAL_ID = /\b[QC][0-9]{1,3}\b/;

const start = toFormValues(EXAMPLE_PARAMS);
const fields = Object.keys(start) as (keyof FormValues)[];

// Each field given each of these, alone and beside a seal, a pattern, a port and a cutout, so the
// checks that read a field only in such company run too.
const WRONG = ['x', '0', '-1', '0.1', '99999', 'yes', ''];
const COMPANY: FormValues[] = [
  {},
  { seal: 'tape' },
  { seal: 'tpu', tpuJoints: 'yes' },
  { seal: 'tape', tapeSides: 'yes', tapePort: 'yes', ports: '150' },
  { fill: 'grid', pieceFills: '1,1=sealed' },
  { fill: 'hexagon' },
  { fill: 'brick' },
  { fill: 'diamond' },
  { ports: '150@1,1' },
  { cutouts: '120x80' },
  { printer: 'custom', customWidthMm: '200', customHeightMm: '200' },
  { printer: 'model', printerModel: 'prusa-mk4s' },
];

function messages(): string[] {
  const all = new Set<string>();
  for (const company of COMPANY) {
    for (const field of fields) {
      for (const value of WRONG) {
        const read = readParams({ ...start, ...company, [field]: value });
        if (!read.ok) for (const message of Object.values(read.errors)) all.add(message);
      }
    }
  }
  return [...all];
}

function planLines(): string[] {
  const lines: string[] = [];
  for (const company of COMPANY) {
    const read = readParams({ ...start, ...company, bottomEdge: 'unit' });
    if (!read.ok) continue;
    const text = describePlan(planWall(read.params), read.params);
    for (const value of Object.values(text)) {
      if (typeof value === 'string') lines.push(value);
      else {
        for (const item of value) {
          if (typeof item === 'string') lines.push(item);
          else lines.push(item.message, ...item.options.map((o) => o.label));
        }
      }
    }
  }
  return lines;
}

describe('what the user reads names no internal question or choice', () => {
  it('in the messages for wrong settings', () => {
    const all = messages();
    expect(all.length).toBeGreaterThan(40); // the sweep reaches the checks, not just a few
    expect(all.filter((m) => INTERNAL_ID.test(m))).toEqual([]);
  });

  it("in the plan's lines", () => {
    const lines = planLines();
    expect(lines.length).toBeGreaterThan(50);
    expect(lines.filter((l) => INTERNAL_ID.test(l))).toEqual([]);
  });
});
