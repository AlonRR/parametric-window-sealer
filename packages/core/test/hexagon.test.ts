// The hexagon pattern (backlog item pattern-hexagon, #17), on the pattern framework. Chosen
// without asking (Q144; docs/choices.md): pointy-top hexagons in rows, every other row shifted
// half a pitch, a honeycomb (C13); 15 mm across the flats with 3 mm bars to start with, as the
// grid (C14); sizes of its own (C15); a bar no thinner than 0.8 mm, as every pattern (Q143).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEXAGON,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  SEALED,
  SETTINGS,
  describePlan,
  fillPattern,
  hexagonTile,
  loadEngine,
  pieceOpenings,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FillParams, FormValues } from '../src/index.js';

const hexagon = (over: Partial<FillParams> = {}): FillParams => ({ ...SEALED, kind: 'hexagon', ...over });
const R = 15 / Math.sqrt(3); // the corner radius of a hexagon 15 mm across the flats

describe('the hexagon tile', () => {
  it('is a choice after the grid, starting at 15 mm across the flats with 3 mm bars (C14)', () => {
    expect(FILL_KINDS.slice(0, 3)).toEqual(['sealed', 'grid', 'hexagon']);
    expect(DEFAULT_HEXAGON).toEqual({ openingMm: 15, barMm: 3 });
    expect(SEALED.hexagon).toEqual(DEFAULT_HEXAGON);
  });

  it('pointy-top, 15 mm across the flats; rows 18 mm apart along, shifted 9 mm, 18·√3/2 up (C13)', () => {
    const t = hexagonTile(DEFAULT_HEXAGON);
    expect(t.pitchXMm).toBe(18);
    expect(t.pitchYMm).toBeCloseTo(18 * (Math.sqrt(3) / 2), 12);
    expect(t.rowShiftMm).toBe(9);
    expect(t.barMm).toBe(3);
    const [ring] = t.openings;
    expect(ring).toHaveLength(6);
    const xs = (ring ?? []).map((p) => p[0]);
    const ys = (ring ?? []).map((p) => p[1]);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-7.5, 7.5]);
    expect(Math.min(...ys)).toBeCloseTo(-R, 12);
    expect(Math.max(...ys)).toBeCloseTo(R, 12);
  });

  it('every opening is a bar’s width from each neighbour, along a row and across rows', async () => {
    const engine = await loadEngine();
    const t = hexagonTile(DEFAULT_HEXAGON);
    // Openings of a wide piece; each one's area is a regular hexagon's, 15 mm across the flats.
    const o = pieceOpenings(engine, t, [100, 100], { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 }, 10);
    const area = (Math.sqrt(3) / 2) * 15 * 15;
    const whole = o.toPolygons().filter((ring) => {
      let a = 0;
      for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i] ?? [0, 0];
        const [x2, y2] = ring[(i + 1) % ring.length] ?? [0, 0];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(Math.abs(a / 2) - area) < 1e-6;
    });
    expect(whole.length).toBeGreaterThan(50);
    // Whole openings only: those cut short at the border have sharp corners that a mitred
    // growth turns into spikes. Grown by half a bar, two neighbours just touch: grown by a
    // little more, they merge.
    const wholeOnes = new engine.CrossSection(whole, 'Positive');
    const touch = wholeOnes.offset(1.5 - 1e-3, 'Miter', 10);
    const merge = wholeOnes.offset(1.5 + 1e-3, 'Miter', 10);
    expect(touch.numContour()).toBe(whole.length);
    expect(merge.numContour()).toBeLessThan(whole.length);
    for (const m of [o, wholeOnes, touch, merge]) m.delete();
  });

  it('fillPattern gives the hexagon inside the joint’s border', () => {
    expect(fillPattern(hexagon({ style: 'through' }), DEFAULT_JOINT)).toEqual({
      tile: hexagonTile(DEFAULT_HEXAGON),
      style: 'through',
      reliefPct: 50,
      borderMm: 10,
    });
  });
});

describe('the form (C15)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('its own sizes, and back through the form', () => {
    expect(example).toMatchObject({ hexOpeningMm: '15', hexBarMm: '3' });
    const r = read({ fill: 'hexagon', hexOpeningMm: '10', hexBarMm: '2' });
    expect(r).toMatchObject({
      ok: true,
      params: { fill: { kind: 'hexagon', hexagon: { openingMm: 10, barMm: 2 }, grid: { openingMm: 15 } } },
    });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('reads only the chosen pattern’s sizes: a wrong grid size does not stop a hexagon', () => {
    expect(read({ fill: 'hexagon', gridBarMm: '0.1' })).toMatchObject({ ok: true });
    expect(read({ fill: 'grid', hexBarMm: '0.1' })).toMatchObject({ ok: true });
  });

  it('refuses a bar under 0.8 mm (Q143)', () => {
    expect(read({ fill: 'hexagon', hexBarMm: '0.5' })).toMatchObject({
      ok: false,
      errors: { hexBarMm: 'Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.' },
    });
  });
});

describe('the plan text', () => {
  it('names the honeycomb and how it is cut', () => {
    const p = { ...EXAMPLE_PARAMS, fill: hexagon() };
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: a honeycomb of hexagonal openings 15 mm across the flats and 3 mm bars, cut 1.5 mm into the room side.',
    );
  });
});

describe('settings in the library’s shape', () => {
  it('lists the hexagon’s sizes after the grid’s', () => {
    expect(SETTINGS.filter((s) => s.path.startsWith('fill.hexagon')).map((s) => [s.path, s.field])).toEqual([
      ['fill.hexagon.openingMm', 'hexOpeningMm'],
      ['fill.hexagon.barMm', 'hexBarMm'],
    ]);
  });

  it('hexagon settings without a kind mean the hexagon', () => {
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, fill: { hexagon: { openingMm: 10 } } });
    expect(r).toMatchObject({ ok: true, params: { fill: { kind: 'hexagon', hexagon: { openingMm: 10, barMm: 3 } } } });
    expect(readSettings({ openingWidthMm: 600, openingHeightMm: 1000 }, { hexBarMm: '2' })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'hexagon' } },
    });
  });
});
