// The sliding insert (sliding-insert, #38; Q16, Q150): two shutters that slide in rails on the
// room face of one piece, closing in round the appliance from each side, each locked by a bolt.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSERT,
  EXAMPLE_PARAMS,
  buildPiecesWith,
  describePlan,
  fittingSource,
  formatInserts,
  insertBoltMm,
  insertFootprintMm,
  insertOpeningMm,
  insertPanel,
  insertPieceMm,
  loadEngine,
  parseInserts,
  partName,
  placedFittings,
  planFiles,
  planWall,
  readParams,
  shutterShapes,
  shutterSolid,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const APPLIANCE = { widthMm: 120, heightMm: 80 };

describe('an insert’s sizes', () => {
  it('starts with shutters that travel 20 mm, 1 mm clear of the appliance above and below', () => {
    expect(DEFAULT_INSERT).toEqual({ travelMm: 20, clearanceMm: 1 });
  });

  it('opens half the travel each side of the width, and the clearance above and below', () => {
    expect(insertOpeningMm(APPLIANCE, DEFAULT_INSERT)).toEqual({ widthMm: 140, heightMm: 82 });
  });

  it('needs a piece that holds the rails and the shutters slid right out, clear of the strips', () => {
    // Each shutter is the travel and 12 mm wide; the rails reach 8 mm beyond the opening.
    expect(insertFootprintMm(APPLIANCE, DEFAULT_INSERT)).toEqual({ widthMm: 204, heightMm: 98 });
    expect(insertPieceMm(APPLIANCE, DEFAULT_INSERT, EXAMPLE_PARAMS.joint)).toEqual({ widthMm: 224, heightMm: 118 });
  });

  it('takes a bolt through a shutter and the panel, with a washer each side and a nut', () => {
    expect(insertBoltMm(3)).toBe(12);
  });
});

describe('the --insert form', () => {
  it('reads the appliance’s size, optionally with its piece, and writes it back', () => {
    const read = parseInserts('120x80 90x60@3,1');
    expect(read).toEqual({
      ok: true,
      inserts: [
        { widthMm: 120, heightMm: 80 },
        { widthMm: 90, heightMm: 60, column: 3, row: 1 },
      ],
    });
    if (read.ok) expect(formatInserts(read.inserts)).toBe('120x80 90x60@3,1');
    expect(parseInserts('120')).toEqual({
      ok: false,
      message:
        'Insert 1: write each as the appliance’s width x height in mm, then optionally @column,row, ' +
        'as 120x80 or 120x80@2,1.',
    });
  });
});

describe('the shutters', () => {
  it('are two of a size, as wide as the travel and 12 mm, as tall as the opening and the rails’ grooves', () => {
    const shapes = shutterShapes([APPLIANCE, APPLIANCE], DEFAULT_INSERT);
    expect(shapes.map((s) => [s.widthMm, s.heightMm, s.count])).toEqual([[32, 89.4, 4]]);
    expect(shapes.map(partName)).toEqual(['shutter-32x89.4-print-4']);
  });

  it('print flat: a plate 2.4 mm thick, its long edges bevelled to slide in the rails, with a slot for the bolt', () => {
    const [shape] = shutterShapes([APPLIANCE], DEFAULT_INSERT);
    if (shape === undefined) throw new Error('no shutter');
    const solid = shutterSolid(engine, shape);
    try {
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], min[2], max[0], max[1], max[2]].map((v) => Math.round(v * 1000) / 1000)).toEqual([
        0, -44.7, 0, 32, 44.7, 2.4,
      ]);
      expect(solid.genus()).toBe(1);
      const probe = (x: number, y: number, z: number) =>
        engine.Manifold.cube([0.1, 0.1, 0.1], true).translate([x, y, z]).intersect(solid).volume();
      for (const x of [6, 16, 26]) expect(probe(x, 0, 1.2), `slot at ${x}`).toBe(0);
      expect(probe(29.5, 0, 1.2)).toBeGreaterThan(0);
      expect(probe(10, 44.5, 0.1)).toBeGreaterThan(0); // the bevel: full height at the bottom
      expect(probe(10, 44.5, 2.3)).toBe(0); // and 2.4 mm less at the top
    } finally {
      solid.delete();
    }
  });
});

describe('the piece with an insert', () => {
  it('has the opening, a bolt hole each side, and the two rails standing on its room face', () => {
    const size = { widthMm: 250, heightMm: 150, thicknessMm: 3 };
    const solid = insertPanel(engine, size, APPLIANCE, DEFAULT_INSERT);
    try {
      expect(solid.genus()).toBe(3);
      const { min, max } = solid.boundingBox();
      expect([min[0], min[1], min[2], max[0], max[1], max[2]]).toEqual([0, 0, 0, 250, 150, 3 + 5.2]);
      const probe = (x: number, y: number, z: number) =>
        engine.Manifold.cube([0.1, 0.1, 0.1], true)
          .translate([125 + x, 75 + y, z])
          .intersect(solid)
          .volume();
      expect(probe(0, 0, 1.5)).toBe(0); // the opening
      expect(probe(76, 0, 1.5)).toBe(0); // a bolt hole, 6 mm beyond it
      expect(probe(79, 0, 1.5)).toBeGreaterThan(0);
      // The top rail: a groove 2.8 mm high reaching 4 mm past the opening at the face, its cap above.
      expect(probe(0, 44.5, 3.1)).toBe(0);
      expect(probe(0, 46, 4)).toBeGreaterThan(0);
      expect(probe(0, 44, 7)).toBeGreaterThan(0);
      // A dovetail: 2.5 mm up, the groove reaches only 2.5 mm past the opening, so 3 mm past it is rail.
      expect(probe(0, 44, 3 + 2.5)).toBeGreaterThan(0);
      expect(probe(0, 43, 3 + 1.5)).toBe(0);
      expect(probe(0, 48, 3.1)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });
});

describe('an insert in the wall', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });
  // Pieces up to 300 mm: four across, four up.
  const wide = toFormValues({
    ...EXAMPLE_PARAMS,
    openingWidthMm: 1200,
    openingHeightMm: 900,
    printer: { kind: 'custom', widthMm: 300, heightMm: 300 },
  });
  const readWide = (over: FormValues) => readParams({ ...wide, ...over });

  it('starts with none, and reads them', () => {
    expect(EXAMPLE_PARAMS.inserts).toEqual([]);
    expect(EXAMPLE_PARAMS.insert).toEqual(DEFAULT_INSERT);
    expect([example.inserts, example.insertTravelMm, example.insertClearanceMm]).toEqual(['', '20', '1']);
    const r = readWide({ inserts: '120x80' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.inserts).toEqual([{ widthMm: 120, heightMm: 80, column: 2, row: 1 }]);
  });

  it('refuses a piece too small, an appliance narrower than the travel allows, and a shared piece', () => {
    const big = read({ inserts: '160x120' });
    expect(big).toMatchObject({ ok: false });
    if (!big.ok) {
      expect(big.errors.inserts).toBe(
        'Insert 1: a 160 × 120 mm appliance in a sliding insert needs a piece at least 264 × 158 mm; ' +
          'column 2, row 1 is 197.7 × 198.6 mm. Full-size pieces plus a filler, or a larger printer size, ' +
          'make bigger pieces.',
      );
    }
    const narrow = read({ inserts: '25x60' });
    if (!narrow.ok) {
      expect(narrow.errors.inserts).toBe(
        'Insert 1: its shutters close in by 20 mm, so measure an appliance at least 30 mm wide for them, or ' +
          'make their travel shorter.',
      );
    } else throw new Error('a narrow appliance was taken');
    const shared = read({ fans: '120@2,1', inserts: '60x40@2,1' });
    if (!shared.ok) {
      expect(shared.errors.inserts).toBe('Insert 1 and fan 1 are both in column 2, row 1; give each its own piece.');
    } else throw new Error('a shared piece was taken');
    expect(read({ insertTravelMm: '0' })).toMatchObject({ ok: false, errors: { insertTravelMm: expect.any(String) } });
  });

  it('reads back what it writes', () => {
    const r = readWide({ inserts: '120x80 90x60@1,3', insertTravelMm: '16', insertClearanceMm: '0.5' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('is built into its piece, its shutters printed beside it, and given a line in the plan', () => {
    const r = readWide({ inserts: '120x80@3,2' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const params: Params = r.params;
    const plan = planWall(params);
    const built = buildPiecesWith(engine, plan, 3, placedFittings(fittingSource(params)));
    try {
      const piece = built.find((b) => b.column === 2 && b.row === 1);
      expect(piece?.tag).toBe('-insert-120x80');
      expect(piece?.solid.genus()).toBe(3);
    } finally {
      for (const b of built) b.solid.delete();
    }
    const names = planFiles(params, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.endsWith('-insert-120x80.stl'))).toEqual([expect.stringMatching(/^piece-c3-r2-/)]);
    expect(names.filter((n) => n.startsWith('shutter-'))).toEqual(['shutter-32x89.4-print-2.stl']);
    expect(describePlan(plan, params).inserts).toEqual([
      'Sliding insert: a 120 × 80 mm appliance, in column 3, row 2, through a 140 × 82 mm opening; two shutters ' +
        'slide in its rails to close round anything 100 to 140 mm wide, each locked by an M4 bolt at least 12 mm ' +
        'long, with a nut and washers.',
    ]);
  });
});
