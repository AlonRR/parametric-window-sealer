// Organiser boards: a board a wall-organiser system's own accessories hang on. The first is
// Skådis (organiser-skadis, #33): upright slots 5.2 × 15.2 mm, 40 mm apart along a row, rows 20 mm
// apart with every other row shifted 20 mm, in a board 4.8 mm thick, raised on the room side inside
// each piece's border where the pieces are thinner; every slot whole, on one lattice across the wall.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  ORGANISERS,
  SETTINGS,
  SKADIS,
  buildExport,
  buildPiecesWith,
  describePlan,
  fillChoice,
  layoutGrid,
  loadEngine,
  organiserOpenings,
  planWall,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params, Point } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };
const [halfW, halfH] = [5.2 / 2, 15.2 / 2];

describe('Skådis', () => {
  it('its slots, their spacing and its board', () => {
    expect(SKADIS).toMatchObject({
      kind: 'skadis',
      boardMm: 4.8,
      pitchXMm: 40,
      pitchYMm: 20,
      rowShiftMm: 20,
      widthMm: 5.2,
      heightMm: 15.2,
    });
    expect(ORGANISERS.map((o) => o.kind)).toEqual(['skadis']);
    expect(FILL_KINDS).toContain('skadis');
    expect(SETTINGS.find((s) => s.field === 'fill')?.values).toContain('skadis');
  });

  it('one slot: upright, round at both ends, through the board and 1 mm past both faces', () => {
    const cut = SKADIS.cut(engine);
    const box = cut.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-2.6, -7.6, -1]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([2.6, 7.6, 5.8]);
    const stadium = 5.2 * 10 + Math.PI * 2.6 * 2.6;
    expect(cut.volume() / 6.8).toBeCloseTo(stadium, 0);
    // Round ends: the corner of the slot's box is solid, its end's middle is cut.
    expect(probe(cut, 2.5, 7.5, 2)).toBe(0);
    expect(probe(cut, 0, 7.5, 2)).toBeGreaterThan(0);
    cut.delete();
  });
});

describe('where the slots go', () => {
  const inside = (at: Point[], border: number) => {
    for (const [x, y] of at) {
      expect(x - halfW).toBeGreaterThanOrEqual(border - 1e-9);
      expect(x + halfW).toBeLessThanOrEqual(piece.widthMm - border + 1e-9);
      expect(y - halfH).toBeGreaterThanOrEqual(border - 1e-9);
      expect(y + halfH).toBeLessThanOrEqual(piece.heightMm - border + 1e-9);
    }
  };

  it('whole slots inside the border, on the lattice centred on the wall', () => {
    const at = organiserOpenings(SKADIS, [100, 100], piece, 10);
    // Nine rows 20 mm apart: five of five slots, four of four shifted 20 mm.
    expect(at).toHaveLength(41);
    expect(at).toContainEqual([100, 100]);
    expect(at).toContainEqual([120, 120]);
    expect(at).toContainEqual([20, 20]);
    expect(at).not.toContainEqual([100, 120]);
    inside(at, 10);
  });

  it('a slot that would cross the border is left out, not cut short', () => {
    const at = organiserOpenings(SKADIS, [100, 100], piece, 18);
    inside(at, 18);
    expect(at.some(([x]) => x === 20)).toBe(false);
    expect(at.some(([, y]) => y === 20)).toBe(false);
    // Seven rows: three of three slots, four of four shifted.
    expect(at).toHaveLength(3 * 3 + 4 * 4);
  });

  it('a piece elsewhere on the wall keeps the wall’s lattice', () => {
    const right = { xMm: 206, yMm: 50, widthMm: 200, heightMm: 200 };
    const at = organiserOpenings(SKADIS, [206, 100], right, 10);
    expect(at.length).toBeGreaterThan(0);
    for (const [x, y] of at) {
      const row = (y + right.yMm - 100) / 20;
      expect(Number.isInteger(Math.round(row * 1e6) / 1e6)).toBe(true);
      const shift = Math.abs(Math.round(row)) % 2 === 1 ? 20 : 0;
      expect((((x + right.xMm - 206 - shift) % 40) + 40) % 40).toBeCloseTo(0, 6);
    }
  });

  it('clear of the zone round a port, and of the one round a cutout', () => {
    const port = organiserOpenings(SKADIS, [100, 100], piece, 10, { xMm: 100, yMm: 100, radiusMm: 30 });
    expect(port.length).toBeLessThan(41);
    for (const [x, y] of port) {
      const [dx, dy] = [Math.max(Math.abs(x - 100) - halfW, 0), Math.max(Math.abs(y - 100) - halfH, 0)];
      expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(30 - 1e-9);
    }
    const cutout = organiserOpenings(SKADIS, [100, 100], piece, 10, { xMm: 100, yMm: 100, widthMm: 60, heightMm: 40 });
    expect(cutout.length).toBeLessThan(41);
    for (const [x, y] of cutout) {
      expect(Math.abs(x - 100) >= halfW + 30 - 1e-9 || Math.abs(y - 100) >= halfH + 20 - 1e-9).toBe(true);
    }
  });
});

describe('a piece with a Skådis board', () => {
  const plan = layoutGrid({
    widthMm: 200,
    heightMm: 200,
    maxPieceWidthMm: 200,
    maxPieceHeightMm: 200,
    minPieceMm: 34,
    width: { mode: 'equal' },
    height: { mode: 'equal' },
  });
  const slot = SKADIS.cut(engine);
  const slotArea = slot.volume() / 6.8;
  slot.delete();
  const build = (thicknessMm: number) => {
    const built = buildPiecesWith(
      engine,
      plan,
      thicknessMm,
      [],
      { organiser: SKADIS, borderMm: 10 },
      undefined,
      undefined,
      () => false,
    );
    const [only] = built;
    if (only === undefined || built.length !== 1) throw new Error('expected one piece');
    return only.solid;
  };

  it('raised to the board inside its border, every slot cut through it', () => {
    const solid = build(3);
    try {
      expect(solid.boundingBox().max[2]).toBeCloseTo(4.8, 6);
      expect(solid.volume()).toBeCloseTo(200 * 200 * 3 + 180 * 180 * 1.8 - 41 * slotArea * 4.8, 0);
      expect(solid.genus()).toBe(41);
      expect(probe(solid, 5, 60, 4)).toBe(0); // the border stays as thick as the piece, for the strips
      expect(probe(solid, 12, 60, 4)).toBeGreaterThan(0); // the board, raised inside it
      expect(probe(solid, 100, 100, 1)).toBe(0); // a slot, through the piece too
      expect(probe(solid, 100, 100, 4)).toBe(0);
    } finally {
      solid.delete();
    }
  });

  it('as thick as the board, not raised', () => {
    const solid = build(4.8);
    try {
      expect(solid.boundingBox().max[2]).toBeCloseTo(4.8, 6);
      expect(solid.volume()).toBeCloseTo(200 * 200 * 4.8 - 41 * slotArea * 4.8, 0);
      expect(solid.genus()).toBe(41);
    } finally {
      solid.delete();
    }
  });

  it('given by the fill, for the wall and for a piece of its own', () => {
    expect(fillChoice({ ...EXAMPLE_PARAMS.fill, kind: 'skadis' }, DEFAULT_JOINT)).toEqual({
      organiser: SKADIS,
      borderMm: DEFAULT_JOINT.slotMm + 2,
    });
    expect(fillChoice(EXAMPLE_PARAMS.fill, DEFAULT_JOINT)).toBeUndefined();
    const own = read({ pieceFills: '1,1=skadis', pins: 'no' });
    const { pieces } = buildExport(engine, own);
    const at = (column: number, row: number) => pieces.find((p) => p.cell.column === column && p.cell.row === row);
    const top = (exported: (typeof pieces)[number] | undefined) =>
      Math.max(...(exported?.mesh.positions ?? []).filter((_, i) => i % 3 === 2));
    expect(top(at(0, 0))).toBeCloseTo(4.8, 4); // the board
    expect(top(at(1, 0))).toBeCloseTo(own.thicknessMm, 4); // sealed, as thick as the pieces
    // Every slot's walls: many more triangles than a sealed piece's rounded corners and chamfer.
    expect(at(0, 0)?.mesh.triangles.length ?? 0).toBeGreaterThan(5 * (at(1, 0)?.mesh.triangles.length ?? 0));
  });
});

describe('the setting', () => {
  const thick =
    'Skådis accessories fit a board 4.8 mm thick: make the pieces at most 4.8 mm thick, or choose another fill.';

  it('a fill for the wall or for a piece; the board no thinner than the pieces', () => {
    expect(read({ fill: 'skadis' }).fill.kind).toBe('skadis');
    expect(read({ fill: 'skadis', thicknessMm: '4.8' }).thicknessMm).toBe(4.8);
    expect(errors({ fill: 'skadis', thicknessMm: '5' })).toEqual({ fill: thick });
    expect(read({ pieceFills: '1,1=skadis' }).pieceFills).toEqual([{ column: 1, row: 1, kind: 'skadis' }]);
    expect(errors({ pieceFills: '1,1=skadis', thicknessMm: '5' })).toEqual({ pieceFills: thick });
  });

  it('cut through, with no style of its own', () => {
    expect(errors({ pieceFills: '1,1=skadis:through' })).toEqual({
      pieceFills:
        'Piece fill 1: write each as column,row=fill, then optionally :style, as 2,1=sealed or 2,1=grid:through.',
    });
  });

  it('refused for the whole wall with pieces cut from sheet, and with a double wall', () => {
    expect(errors({ fill: 'skadis', pieceSource: 'sheet' })).toEqual({
      pieceSource:
        'A Skådis pegboard for the whole wall is printed into every piece, so none would be cut: choose a sealed ' +
        'fill, or give single pieces the board.',
    });
    expect(errors({ fill: 'skadis', wall: 'double', thicknessMm: '4.8' }).wall).toBeDefined();
  });
});

describe('the plan', () => {
  it('the board, its slots and how far it stands up; air passes through', () => {
    const p = read({ fill: 'skadis' });
    expect(describePlan(planWall(p), p).fill).toBe(
      'Fill: a Skådis pegboard: upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every other row ' +
        'shifted 20 mm, in a board 4.8 mm thick, raised 1.8 mm on the room side inside each piece’s border; cut ' +
        'through: air passes through the wall.',
    );
    const flush = read({ fill: 'skadis', thicknessMm: '4.8' });
    expect(describePlan(planWall(flush), flush).fill).toBe(
      'Fill: a Skådis pegboard: upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every other row ' +
        'shifted 20 mm, in a board 4.8 mm thick; cut through: air passes through the wall.',
    );
    const own = read({ pieceFills: '2,1=skadis' });
    expect(describePlan(planWall(own), own).pieceFills).toEqual([
      'Column 2, row 1: a Skådis pegboard: upright slots 5.2 × 15.2 mm, 40 mm apart in rows 20 mm apart, every ' +
        'other row shifted 20 mm, in a board 4.8 mm thick, raised 1.8 mm on the room side inside each piece’s ' +
        'border; cut through: air passes through the wall.',
    ]);
  });
});
