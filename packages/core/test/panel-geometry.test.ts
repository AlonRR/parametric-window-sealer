// Backlog item plain-panel (#6): a plain sealed piece of any size and thickness (Q8), and
// one such piece for every cell of the plan. A piece lies flat as it is printed: width
// along X, height along Y, thickness along Z, from the origin.
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { buildPieces, plainPanel } from '../src/panel-geometry.js';
import { printReady } from '../src/piece-print.js';
import { EXAMPLE_PARAMS } from '../src/params.js';
import { planWall } from '../src/plan.js';

describe('plainPanel', () => {
  it('is a solid block of exactly the given size, lying flat from the origin', async () => {
    const engine = await loadEngine();
    const piece = plainPanel(engine, { widthMm: 200, heightMm: 150, thicknessMm: 3 });
    const box = piece.boundingBox();
    expect(Array.from(box.min)).toEqual([0, 0, 0]);
    expect(Array.from(box.max)).toEqual([200, 150, 3]);
    expect(piece.volume()).toBeCloseTo(200 * 150 * 3, 6);
    expect(piece.genus()).toBe(0); // sealed: no holes through it
    expect(piece.isEmpty()).toBe(false);
    piece.delete();
  });

  it.each([
    ['zero width', { widthMm: 0, heightMm: 150, thicknessMm: 3 }],
    ['negative height', { widthMm: 200, heightMm: -1, thicknessMm: 3 }],
    ['NaN thickness', { widthMm: 200, heightMm: 150, thicknessMm: Number.NaN }],
  ])('refuses %s', async (_label, size) => {
    const engine = await loadEngine();
    expect(() => plainPanel(engine, size)).toThrow(RangeError);
  });
});

describe('buildPieces', () => {
  it('builds one piece per cell of the plan, each the size of its cell', async () => {
    const engine = await loadEngine();
    const params = { ...EXAMPLE_PARAMS, openingWidthMm: 500 };
    const plan = planWall(params);
    const pieces = buildPieces(engine, plan, params.thicknessMm);
    try {
      expect(pieces).toHaveLength(plan.pieces.length);
      for (const [i, p] of pieces.entries()) {
        const cell = plan.pieces[i];
        expect(p.column).toBe(cell?.column);
        expect(p.row).toBe(cell?.row);
        const max = Array.from(p.solid.boundingBox().max);
        // To a micrometre: the rounded corners' outline is worked in fixed point (#122).
        expect(max[0]).toBeCloseTo(cell?.widthMm ?? Number.NaN, 6);
        expect(max[1]).toBeCloseTo(cell?.heightMm ?? Number.NaN, 6);
        expect(max[2]).toBeCloseTo(3, 9);
      }
      // The pieces fill the opening plus the edges' reach, 503 x 1013 mm on the example
      // slider (track-edge, #11), less the 5 mm joints: 2 across, 4 up (Q56).
      const area = plan.pieces.reduce((sum, c) => sum + c.widthMm * c.heightMm, 0);
      expect(area).toBeCloseTo((503 - 2 * 5) * (1013 - 4 * 5), 6);
      // Each as printed, its corners rounded and its bed-side edge chamfered (#122).
      const ready = (c: { widthMm: number; heightMm: number }) => {
        const size = { widthMm: c.widthMm, heightMm: c.heightMm, thicknessMm: 3 };
        const solid = printReady(engine, plainPanel(engine, size), size);
        const v = solid.volume();
        solid.delete();
        return v;
      };
      const total = pieces.reduce((sum, p) => sum + p.solid.volume(), 0);
      expect(total).toBeCloseTo(
        plan.pieces.reduce((sum, c) => sum + ready(c), 0),
        3,
      );
    } finally {
      for (const p of pieces) p.solid.delete();
    }
  });
});
