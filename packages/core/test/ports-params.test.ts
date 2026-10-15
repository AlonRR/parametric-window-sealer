// The hose ports in the parameters (backlog item hose-port, #12): none to start with (Q112),
// one on the page's main form and more under Advanced (Q111, Q113), all in one field written
// as the command's --port takes them (Q114): the hose end's outside diameter in mm, then
// optionally @column,row, counted from 1 at the bottom left seen from the room (Q106).
import { describe, expect, it } from 'vitest';
import {
  COMMON_HOSE_MM,
  DEFAULT_COLLAR,
  EXAMPLE_PARAMS,
  describePlan,
  formatPorts,
  parsePorts,
  planWall,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues } from '../src/index.js';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });
const portsOf = (over: FormValues) => {
  const r = read(over);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params.ports;
};
const errorOf = (over: FormValues, field: keyof FormValues = 'ports') => {
  const r = read(over);
  return r.ok ? undefined : r.errors[field];
};

describe('the starting values', () => {
  it('the listed hose sizes: 150 and 130 mm outside (Q103)', () => {
    expect(COMMON_HOSE_MM).toEqual([150, 130]);
  });

  it('no port (Q112: the appliance starts at none), and the collar’s starting sizes (Q107)', () => {
    expect(EXAMPLE_PARAMS.ports).toEqual([]);
    expect(EXAMPLE_PARAMS.collar).toEqual(DEFAULT_COLLAR);
    expect(example.ports).toBe('');
    expect(example.collarDepthMm).toBe('20');
  });
});

describe('parsePorts and formatPorts', () => {
  it('read and write the --port form, several separated by spaces', () => {
    expect(parsePorts('150@2,1  130@3,4')).toEqual({
      ok: true,
      ports: [
        { hoseMm: 150, column: 2, row: 1 },
        { hoseMm: 130, column: 3, row: 4 },
      ],
    });
    expect(parsePorts('150')).toEqual({ ok: true, ports: [{ hoseMm: 150 }] });
    expect(parsePorts('')).toEqual({ ok: true, ports: [] });
    expect(formatPorts([{ hoseMm: 150, column: 2, row: 1 }, { hoseMm: 127.5 }])).toBe('150@2,1 127.5');
  });

  it('refuse anything else, naming the port', () => {
    const wrong =
      "write each as the hose end's outside diameter in mm, then optionally @column,row, as 150 or 150@2,1.";
    expect(parsePorts('150@2')).toEqual({ ok: false, message: `Port 1: ${wrong}` });
    expect(parsePorts('150 abc')).toEqual({ ok: false, message: `Port 2: ${wrong}` });
    expect(parsePorts('150@0,1')).toEqual({ ok: false, message: `Port 1: ${wrong}` });
    expect(parsePorts('150@1.5,1')).toEqual({ ok: false, message: `Port 1: ${wrong}` });
  });
});

describe('readParams with ports', () => {
  it('a port without a piece goes in the bottom row’s middle piece (Q105)', () => {
    expect(portsOf({ ports: '150' })).toEqual([{ hoseMm: 150, column: 2, row: 1 }]);
  });

  it('a port in a piece named, and more ports in pieces of their own (Q111, Q113)', () => {
    expect(portsOf({ ports: '150@3,1 130@1,5' })).toEqual([
      { hoseMm: 150, column: 3, row: 1 },
      { hoseMm: 130, column: 1, row: 5 },
    ]);
  });

  it('two ports in one piece are refused', () => {
    expect(errorOf({ ports: '150@2,1 130@2,1' })).toBe(
      'Ports 1 and 2 are both in column 2, row 1; give each its own piece.',
    );
    expect(errorOf({ ports: '150 130@2,1' })).toBe(
      'Ports 1 and 2 are both in column 2, row 1; give each its own piece.',
    );
  });

  it('a piece that is not there, or too small for the port, as checkPort says (Q108)', () => {
    expect(errorOf({ ports: '150@4,1' })).toBe(
      'Port 1: There is no column 4, row 1: the wall has 3 columns and 5 rows.',
    );
    expect(errorOf({ ports: '150', openingWidthMm: '405' })).toBe(
      'Port 1: A 150 mm hose port needs a piece at least 175.8 × 175.8 mm; column 2, row 1 is 132.7 × 198.6 mm. ' +
        'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
    );
  });

  it('a lip that would close the port is refused', () => {
    expect(errorOf({ ports: '9' })).toBe('Port 1: the 5 mm lip would close a 9 mm hose’s port; make the lip smaller.');
  });

  it('the collar’s sizes: depth, wall and lip above 0, clearance 0 or more (Q107)', () => {
    expect(portsOf({ ports: '150', collarClearanceMm: '0' })).toHaveLength(1);
    for (const field of ['collarDepthMm', 'collarWallMm', 'collarLipMm'] as const) {
      expect(errorOf({ [field]: '0' }, field)).toBe('Enter a size in mm, greater than 0.');
    }
    expect(errorOf({ collarClearanceMm: '-1' }, 'collarClearanceMm')).toBe('Enter a size in mm, 0 or more.');
  });

  it('survive a round trip through the form', () => {
    const r = read({ ports: '150@3,1 130@1,5', collarDepthMm: '25' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });
});

describe('describePlan', () => {
  it('a line for each port', () => {
    const r = read({ ports: '150@3,1 130@1,5' });
    if (!r.ok) throw new Error('settings');
    expect(describePlan(planWall(r.params), r.params).ports).toEqual([
      'Hose port: a 150 mm hose end, in column 3, row 1. A cap closes the port when the AC is off.',
      'Hose port: a 130 mm hose end, in column 1, row 5. A cap closes the port when the AC is off.',
    ]);
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).ports).toEqual([]);
  });
});
