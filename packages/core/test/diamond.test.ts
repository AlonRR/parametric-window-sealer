// The diamond pattern (backlog item pattern-diamond, #19), on the pattern framework. Chosen
// without asking (Q144; docs/choices.md): diamond openings set point-up in a lattice, the bars
// running diagonally both ways, as a leaded window (C22); 20 mm wide and 30 mm tall across the
// corners, with 3 mm bars, to start with (C23); a width, a height and a bar of its own (C24);
// a bar no thinner than 0.8 mm, as every pattern (Q143).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAMOND,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  SEALED,
  SETTINGS,
  describePlan,
  diamondTile,
  fillPattern,
  loadEngine,
  pieceOpenings,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FillParams, FormValues } from '../src/index.js';

const diamond = (over: Partial<FillParams> = {}): FillParams => ({ ...SEALED, kind: 'diamond', ...over });

describe('the diamond tile', () => {
  it('is a choice after the bricks: 20 × 30 mm across the corners, 3 mm bars (C23)', () => {
    expect(FILL_KINDS.slice(0, 5)).toEqual(['sealed', 'grid', 'hexagon', 'brick', 'diamond']);
    expect(DEFAULT_DIAMOND).toEqual({ widthMm: 20, heightMm: 30, barMm: 3 });
    expect(SEALED.diamond).toEqual(DEFAULT_DIAMOND);
  });

  it('point-up diamonds, every other row shifted half a pitch (C22)', () => {
    const t = diamondTile(DEFAULT_DIAMOND);
    expect(t.openings).toEqual([
      [
        [10, 0],
        [0, 15],
        [-10, 0],
        [0, -15],
      ],
    ]);
    expect(t.rowShiftMm).toBeCloseTo(t.pitchXMm / 2, 12);
    expect(t.pitchYMm / t.pitchXMm).toBeCloseTo(30 / 40, 12); // the lattice keeps the diamond's shape
    expect(t.barMm).toBe(3);
  });

  it('every opening is a bar’s width from each neighbour, along the diagonals too', async () => {
    const engine = await loadEngine();
    const o = pieceOpenings(engine, diamondTile(DEFAULT_DIAMOND), [100, 100], { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 }, 10);
    const area = (20 * 30) / 2;
    const whole = o.toPolygons().filter((ring) => {
      let a = 0;
      for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i] ?? [0, 0];
        const [x2, y2] = ring[(i + 1) % ring.length] ?? [0, 0];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(Math.abs(a / 2) - area) < 1e-6;
    });
    expect(whole.length).toBeGreaterThan(20);
    // Grown by half a bar with mitred corners, a diamond stays a diamond: neighbours just touch.
    const wholeOnes = new engine.CrossSection(whole, 'Positive');
    const touch = wholeOnes.offset(1.5 - 1e-3, 'Miter', 10);
    const merge = wholeOnes.offset(1.5 + 1e-3, 'Miter', 10);
    expect(touch.numContour()).toBe(whole.length);
    expect(merge.numContour()).toBeLessThan(whole.length);
    for (const m of [o, wholeOnes, touch, merge]) m.delete();
  });

  it('fillPattern gives the diamonds inside the joint’s border', () => {
    expect(fillPattern(diamond(), DEFAULT_JOINT)).toEqual({
      tile: diamondTile(DEFAULT_DIAMOND),
      style: 'relief',
      reliefPct: 50,
      borderMm: 10,
    });
  });
});

describe('the form (C24)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('its own width, height and bar, and back through the form', () => {
    expect(example).toMatchObject({ diamondWidthMm: '20', diamondHeightMm: '30', diamondBarMm: '3' });
    const r = read({ fill: 'diamond', diamondWidthMm: '20', diamondHeightMm: '20', diamondBarMm: '2' });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'diamond', diamond: { widthMm: 20, heightMm: 20, barMm: 2 } } } });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('read only when the diamonds are chosen; a bar under 0.8 mm refused (Q143)', () => {
    expect(read({ fill: 'brick', diamondBarMm: '0.1' })).toMatchObject({ ok: true });
    expect(read({ fill: 'diamond', diamondBarMm: '0.5' })).toMatchObject({
      ok: false,
      errors: { diamondBarMm: 'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.' },
    });
  });
});

describe('the plan text and the settings', () => {
  it('names the diamonds and how they are cut', () => {
    const p = { ...EXAMPLE_PARAMS, fill: diamond() };
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: diamonds 20 mm wide and 30 mm tall and 3 mm bars, cut 1.5 mm into the room side.',
    );
  });

  it('lists the diamonds’ sizes; given alone they mean the diamonds', () => {
    expect(SETTINGS.filter((s) => s.path.startsWith('fill.diamond')).map((s) => s.field)).toEqual([
      'diamondWidthMm',
      'diamondHeightMm',
      'diamondBarMm',
    ]);
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, fill: { diamond: { heightMm: 20 } } });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'diamond', diamond: { widthMm: 20, heightMm: 20 } } } });
    expect(readSettings({ openingWidthMm: 600, openingHeightMm: 1000 }, { diamondBarMm: '2' })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'diamond' } },
    });
  });
});
