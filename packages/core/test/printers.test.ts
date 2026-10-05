// The printer list (backlog item printer-presets, #13): the 29 printers in
// docs/printer-beds.md (Q115), each bed less a margin that starts at 10 mm (Q117), turned
// whichever way needs fewer pieces, as listed on a tie (Q116). The list is read against the
// table, so the numbers and their sources cannot drift apart.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BED_MARGIN_MM,
  EXAMPLE_PARAMS,
  PRINTERS,
  maxPieceSize,
  planWall,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

function tableRows(): { model: string; x: number; y: number }[] {
  const md = readFileSync(new URL('../../../docs/printer-beds.md', import.meta.url), 'utf8');
  const section = md.split('## Build volumes')[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Model'))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .map((cells) => ({ model: cells[1] ?? '', x: Number(cells[2]), y: Number(cells[3]) }));
}

describe('PRINTERS (Q115)', () => {
  it('is the table in docs/printer-beds.md, row for row: 29 printers', () => {
    expect(PRINTERS.map((p) => ({ model: p.model, x: p.bedXMm, y: p.bedYMm }))).toEqual(tableRows());
    expect(PRINTERS).toHaveLength(29);
  });

  it('each with a maker it starts with and an id of its own, in lower case and dashes', () => {
    for (const p of PRINTERS) {
      expect(p.model.replace(/^Original /, ''), p.id).toMatch(new RegExp(`^${p.maker}`));
      expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(new Set(PRINTERS.map((p) => p.id)).size).toBe(29);
    expect(PRINTERS.find((p) => p.model === 'Original Prusa MK4S')?.id).toBe('prusa-mk4s');
  });
});

describe('maxPieceSize for a listed printer (Q117)', () => {
  it('is the bed less the margin, 10 mm to start with', () => {
    expect(DEFAULT_BED_MARGIN_MM).toBe(10);
    expect(maxPieceSize({ kind: 'model', id: 'prusa-mk4s' })).toEqual({ widthMm: 240, heightMm: 200 });
    expect(maxPieceSize({ kind: 'model', id: 'prusa-mk4s' }, 20)).toEqual({ widthMm: 230, heightMm: 190 });
    expect(maxPieceSize({ kind: 'model', id: 'bambu-lab-a1-mini' })).toEqual({ widthMm: 170, heightMm: 170 });
  });

  it('refuses a printer it does not know', () => {
    expect(() => maxPieceSize({ kind: 'model', id: 'no-such-printer' })).toThrow(RangeError);
  });
});

// The example slider adds 3 mm across and 13 mm up to the opening (track-edge, #11).
const mk4s = (openingWidthMm: number, openingHeightMm: number): Params => ({
  ...EXAMPLE_PARAMS,
  openingWidthMm,
  openingHeightMm,
  printer: { kind: 'model', id: 'prusa-mk4s' },
});

describe('turning the bed (Q116): pieces up to 240 × 200 mm as listed, 200 × 240 turned', () => {
  it('a 480 × 720 mm span: as listed, 2 × 4 = 8 pieces, not 3 × 3 = 9 turned', () => {
    const plan = planWall(mk4s(477, 707));
    expect([plan.columns.length, plan.rows.length]).toEqual([2, 4]);
  });

  it('a 720 × 480 mm span: turned, 4 × 2 = 8 pieces, not 3 × 3 = 9 as listed', () => {
    const plan = planWall(mk4s(717, 467));
    expect([plan.columns.length, plan.rows.length]).toEqual([4, 2]);
    expect(Math.max(...plan.columns)).toBeLessThanOrEqual(200);
    expect(Math.max(...plan.rows)).toBeLessThanOrEqual(240);
  });

  it('a 470 × 470 mm span: 6 pieces either way, so as listed: 2 across, 3 up', () => {
    const plan = planWall(mk4s(467, 457));
    expect([plan.columns.length, plan.rows.length]).toEqual([2, 3]);
  });
});

describe('the form (Q115, Q117)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts at the 200 mm default, no printer chosen, a 10 mm margin', () => {
    expect(example.printer).toBe('default');
    expect(example.printerModel).toBe('');
    expect(example.bedMarginMm).toBe('10');
    expect(EXAMPLE_PARAMS.bedMarginMm).toBe(10);
  });

  it('a printer from the list, and back through the form', () => {
    const r = read({ printer: 'model', printerModel: 'bambu-lab-a1', bedMarginMm: '15' });
    expect(r).toMatchObject({ ok: true, params: { printer: { kind: 'model', id: 'bambu-lab-a1' }, bedMarginMm: 15 } });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses a printer not on the list, and a margin that leaves no piece', () => {
    expect(read({ printer: 'model', printerModel: 'no-such-printer' })).toMatchObject({
      ok: false,
      errors: { printerModel: 'Choose one of the listed options.' },
    });
    // 180 mm less 176 leaves 4 mm: no more than a joint, as for a custom size.
    expect(read({ printer: 'model', printerModel: 'bambu-lab-a1-mini', bedMarginMm: '176' })).toMatchObject({
      ok: false,
      errors: { bedMarginMm: 'Leaves pieces of 4 mm on this printer, no more than a joint’s 5 mm; make it smaller.' },
    });
  });
});
