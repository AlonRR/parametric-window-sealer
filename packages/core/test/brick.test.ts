// The brick pattern (backlog item pattern-brick, #18), on the pattern framework. Chosen without
// asking (Q144; docs/choices.md): brick-shaped openings in a running bond, every other row
// shifted half a brick (C18); 30 × 12 mm openings with 3 mm bars to start with (C19); a width,
// a height and a bar of its own (C20); a bar no thinner than 0.8 mm, as every pattern (Q143).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRICK,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  SEALED,
  SETTINGS,
  brickTile,
  describePlan,
  fillPattern,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FillParams, FormValues } from '../src/index.js';

const brick = (over: Partial<FillParams> = {}): FillParams => ({ ...SEALED, kind: 'brick', ...over });

describe('the brick tile', () => {
  it('is a choice after the hexagon: 30 × 12 mm openings, 3 mm bars (C19)', () => {
    expect(FILL_KINDS).toEqual(['sealed', 'grid', 'hexagon', 'brick']);
    expect(DEFAULT_BRICK).toEqual({ widthMm: 30, heightMm: 12, barMm: 3 });
    expect(SEALED.brick).toEqual(DEFAULT_BRICK);
  });

  it('a running bond: 33 mm along, 15 mm up, every other row shifted 16.5 mm (C18)', () => {
    expect(brickTile(DEFAULT_BRICK)).toEqual({
      pitchXMm: 33,
      pitchYMm: 15,
      rowShiftMm: 16.5,
      openings: [
        [
          [-15, -6],
          [15, -6],
          [15, 6],
          [-15, 6],
        ],
      ],
      barMm: 3,
    });
  });

  it('fillPattern gives the bricks inside the joint’s border', () => {
    expect(fillPattern(brick(), DEFAULT_JOINT)).toEqual({
      tile: brickTile(DEFAULT_BRICK),
      style: 'relief',
      reliefPct: 50,
      borderMm: 10,
    });
  });
});

describe('the form (C20)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('its own width, height and bar, and back through the form', () => {
    expect(example).toMatchObject({ brickWidthMm: '30', brickHeightMm: '12', brickBarMm: '3' });
    const r = read({ fill: 'brick', brickWidthMm: '40', brickHeightMm: '10', brickBarMm: '2' });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'brick', brick: { widthMm: 40, heightMm: 10, barMm: 2 } } } });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('read only when the bricks are chosen; a bar under 0.8 mm refused (Q143)', () => {
    expect(read({ fill: 'grid', brickBarMm: '0.1' })).toMatchObject({ ok: true });
    expect(read({ fill: 'brick', brickBarMm: '0.5' })).toMatchObject({
      ok: false,
      errors: { brickBarMm: 'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.' },
    });
    expect(read({ fill: 'brick', brickHeightMm: '0' })).toMatchObject({
      ok: false,
      errors: { brickHeightMm: 'Enter a size in mm, greater than 0.' },
    });
  });
});

describe('the plan text', () => {
  it('names the bricks and how they are cut', () => {
    const p = { ...EXAMPLE_PARAMS, fill: brick({ style: 'through' }) };
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: bricks of 30 × 12 mm openings and 3 mm bars, cut through: air passes through the wall.',
    );
  });
});

describe('settings in the library’s shape', () => {
  it('lists the bricks’ sizes after the hexagon’s', () => {
    expect(SETTINGS.filter((s) => s.path.startsWith('fill.brick')).map((s) => [s.path, s.field])).toEqual([
      ['fill.brick.widthMm', 'brickWidthMm'],
      ['fill.brick.heightMm', 'brickHeightMm'],
      ['fill.brick.barMm', 'brickBarMm'],
    ]);
  });

  it('brick settings without a kind mean the bricks', () => {
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, fill: { brick: { widthMm: 40 } } });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'brick', brick: { widthMm: 40, heightMm: 12, barMm: 3 } } } });
    expect(readSettings({ openingWidthMm: 600, openingHeightMm: 1000 }, { brickBarMm: '2' })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'brick' } },
    });
  });
});
