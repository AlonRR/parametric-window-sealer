// Backlog item printer-default (#4): one safe default for the maximum piece size, plus
// "custom" (Q5). The default is 200 x 200 mm (Q38) because it fits every full-size printer
// in docs/printer-beds.md with 10 mm to spare. This test reads that table, so the number
// and its evidence cannot drift apart.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_PIECE, maxPieceSize } from '../src/printer.js';

interface Bed {
  model: string;
  x: number;
  y: number;
  group: string;
}

function readBeds(): Bed[] {
  const md = readFileSync(new URL('../../../docs/printer-beds.md', import.meta.url), 'utf8');
  const section = md.split('## Build volumes')[1]?.split('\n## ')[0] ?? '';
  const rows = section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Model'))
    .map((line) => line.split('|').map((cell) => cell.trim()));
  return rows.map((cells) => ({
    model: cells[1] ?? '',
    x: Number(cells[2]),
    y: Number(cells[3]),
    group: cells[5] ?? '',
  }));
}

const MARGIN_MM = 10;
const fits = (bed: Bed) =>
  DEFAULT_MAX_PIECE.widthMm + MARGIN_MM <= Math.min(bed.x, bed.y) &&
  DEFAULT_MAX_PIECE.heightMm + MARGIN_MM <= Math.min(bed.x, bed.y);

describe('the default maximum piece size', () => {
  const beds = readBeds();

  it('is 200 x 200 mm (Q38)', () => {
    expect(DEFAULT_MAX_PIECE).toEqual({ widthMm: 200, heightMm: 200 });
  });

  it('reads all 29 printers from the table, 27 full-size and 2 mini, every number valid', () => {
    expect(beds).toHaveLength(29);
    expect(beds.filter((b) => b.group === 'full-size')).toHaveLength(27);
    expect(beds.filter((b) => b.group === 'mini')).toHaveLength(2);
    for (const b of beds) {
      expect(b.x, b.model).toBeGreaterThan(0);
      expect(b.y, b.model).toBeGreaterThan(0);
    }
  });

  it('fits every full-size printer with 10 mm to spare', () => {
    const misfits = beds.filter((b) => b.group === 'full-size' && !fits(b)).map((b) => b.model);
    expect(misfits).toEqual([]);
  });

  it('discriminates: the check refuses both minis, which the default does not fit', () => {
    const minis = beds.filter((b) => b.group === 'mini');
    expect(minis.filter(fits)).toEqual([]);
  });
});

describe('maxPieceSize', () => {
  it('gives the default until the user enters their own', () => {
    expect(maxPieceSize({ kind: 'default' })).toEqual({ widthMm: 200, heightMm: 200 });
  });

  it('gives a custom size as entered, for a mini or any other printer', () => {
    expect(maxPieceSize({ kind: 'custom', widthMm: 170, heightMm: 165 })).toEqual({
      widthMm: 170,
      heightMm: 165,
    });
  });

  it('returns a copy: changing the result does not change the default', () => {
    const size = maxPieceSize({ kind: 'default' });
    size.widthMm = 1;
    expect(DEFAULT_MAX_PIECE.widthMm).toBe(200);
  });

  it.each([
    ['zero width', 0, 200],
    ['negative height', 200, -1],
    ['NaN width', Number.NaN, 200],
    ['infinite height', 200, Number.POSITIVE_INFINITY],
  ])('refuses a custom size with %s', (_label, widthMm, heightMm) => {
    expect(() => maxPieceSize({ kind: 'custom', widthMm, heightMm })).toThrow(RangeError);
  });
});
