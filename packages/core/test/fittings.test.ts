// The fittings (fitting-registry, #97): every listed kind keeps the same rules, and a kind
// declared in this file alone is placed, checked, built and named by the code every kind uses.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  FITTINGS,
  buildPiecesWith,
  fillPattern,
  fittingSource,
  loadEngine,
  meshOf,
  packageDownload,
  partName,
  placeFittings,
  placedFittings,
  plainPanel,
  planWall,
  tapeFit,
} from '../src/index.js';
import type { FittingDefinition, InPiece, Params, SealParams } from '../src/index.js';

const engine = await loadEngine();

// A wall of pieces up to 300 mm, with a port, a cutout and a fan.
const params: Params = {
  ...EXAMPLE_PARAMS,
  openingWidthMm: 1200,
  openingHeightMm: 900,
  printer: { kind: 'custom', widthMm: 300, heightMm: 300 },
  ports: [{ hoseMm: 150, column: 3, row: 1 }],
  cutouts: [{ widthMm: 120, heightMm: 80, column: 1, row: 2 }],
  fans: [{ sizeMm: 120, column: 1, row: 4 }],
};
const plan = planWall(params);
const SEALS: Record<string, SealParams> = {
  none: { kind: 'none', tape: DEFAULT_TAPE },
  tape: { kind: 'tape', tape: DEFAULT_TAPE },
  'tape in the ports': { kind: 'tape', tape: { ...DEFAULT_TAPE, port: true } },
  tpu: { kind: 'tpu', tape: { ...DEFAULT_TAPE, port: true } },
};
const sizeOf = (f: InPiece) => {
  const cell = plan.pieces.find((p) => p.column === f.column - 1 && p.row === f.row - 1);
  if (cell === undefined) throw new Error(`no piece at column ${f.column}, row ${f.row}`);
  return { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm: params.thicknessMm };
};

describe('every kind of fitting', () => {
  it('is tried on a wall four pieces across and four high', () => {
    expect([plan.columns.length, plan.rows.length]).toEqual([4, 4]);
  });

  it('has a kind of its own', () => {
    const kinds = FITTINGS.map((f) => f.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toEqual(['port', 'cutout', 'fan']);
  });

  for (const [seal, sealParams] of Object.entries(SEALS)) {
    const source = fittingSource({ ...params, seal: sealParams });
    for (const kind of FITTINGS) {
      describe(`${kind.kind}, seal ${seal}`, () => {
        const placed = kind.placed(source);

        it('places each where it was given, tagged with its kind in the file name', () => {
          expect(placed.length).toBeGreaterThan(0);
          for (const f of placed) {
            expect(f.kind).toBe(kind.kind);
            expect(f.tag).toMatch(new RegExp(`^-${kind.kind}-[0-9.x]+$`));
          }
        });

        it('passes through its piece, inside the piece’s outline, with its keep-out round it', () => {
          for (const f of placed) {
            const size = sizeOf(f);
            const solid = f.solid(engine, size);
            try {
              expect(solid.genus()).toBeGreaterThanOrEqual(1);
              const { min, max } = solid.boundingBox();
              expect(min[0]).toBeGreaterThanOrEqual(-1e-9);
              expect(min[1]).toBeGreaterThanOrEqual(-1e-9);
              expect(max[0]).toBeLessThanOrEqual(size.widthMm + 1e-9);
              expect(max[1]).toBeLessThanOrEqual(size.heightMm + 1e-9);
              const keepOut = f.keepOut(size, 10);
              expect([keepOut.xMm, keepOut.yMm]).toEqual([size.widthMm / 2, size.heightMm / 2]);
            } finally {
              solid.delete();
            }
          }
        });

        it('has one line in the plan for each, naming its piece', () => {
          const lines = kind.describe(source);
          expect(lines).toHaveLength(placed.length);
          placed.forEach((f, i) => expect(lines[i]).toContain(`in column ${f.column}, row ${f.row}`));
        });

        it('has a seal in the preview exactly when the plan gives it a share of the seal', () => {
          const share = kind.lining(source);
          for (const f of placed) {
            const lining = f.lining(engine, sizeOf(f));
            expect(lining !== undefined, f.tag).toBe(share !== undefined);
            if (lining) {
              expect(lining.volume()).toBeGreaterThan(0);
              lining.delete();
            }
          }
          if (share) {
            expect(share.tapeMm).toBeGreaterThan(0);
            expect(share.tape).not.toBe('');
            expect(share.tpu).not.toBe('');
          }
        });
      });
    }
  }

  const tpuSeal: SealParams = { kind: 'tpu', tape: { ...DEFAULT_TAPE, port: true } };
  it('with the TPU seal, prints a sleeve for the hose port and a frame for the cutout, and nothing for the fan', () => {
    const tpu = tapeFit(tpuSeal);
    if (tpu === undefined) throw new Error('no fit for the TPU seal');
    const source = fittingSource({ ...params, seal: tpuSeal });
    const names = Object.fromEntries(FITTINGS.map((k) => [k.kind, k.parts(source, tpu).map((p) => p.name)]));
    expect(names).toEqual({
      port: [expect.stringMatching(/^sleeve-150-tpu-print-1$/)],
      cutout: [expect.stringMatching(/^frame-120x80-tpu-print-1$/)],
      fan: [],
    });
  });
  for (const kind of FITTINGS) {
    // A kind need print nothing (a fan is screwed straight on); what one prints is held to this.
    it(`${kind.kind}: with the TPU seal, makes each part it prints and names it as the download does`, () => {
      const tpu = tapeFit(tpuSeal);
      if (tpu === undefined) throw new Error('no fit for the TPU seal');
      const parts = kind.parts(fittingSource({ ...params, seal: tpuSeal }), tpu);
      expect(new Set(parts.map((p) => p.name)).size).toBe(parts.length);
      for (const part of parts) {
        expect(part.name).toBe(partName(part.shape));
        const solid = part.solid(engine);
        expect(solid.volume()).toBeGreaterThan(0);
        solid.delete();
      }
    });
  }
});

// A kind declared here alone: a square hole through the panel, 40 mm a side.
interface Square {
  sideMm: number;
  column?: number;
  row?: number;
}
const square = (given: readonly (Square & InPiece)[]): FittingDefinition => ({
  kind: 'square',
  placed: () =>
    given.map((s) => ({
      kind: 'square',
      column: s.column,
      row: s.row,
      tag: `-square-${s.sideMm}`,
      marks: {},
      solid: (e, size) => {
        const panel = plainPanel(e, size);
        const hole = e.Manifold.cube([s.sideMm, s.sideMm, 3 * size.thicknessMm], true).translate([
          size.widthMm / 2,
          size.heightMm / 2,
          0,
        ]);
        try {
          return panel.subtract(hole);
        } finally {
          panel.delete();
          hole.delete();
        }
      },
      keepOut: (size, borderMm) => ({
        xMm: size.widthMm / 2,
        yMm: size.heightMm / 2,
        widthMm: s.sideMm + 2 * borderMm,
        heightMm: s.sideMm + 2 * borderMm,
      }),
      lining: () => undefined,
    })),
  parts: () => [],
  lining: () => undefined,
  describe: () => given.map((s) => `Square: ${s.sideMm} mm, in column ${s.column}, row ${s.row}.`),
});

describe('a new kind of fitting, declared in this test alone', () => {
  const placing = (given: Square[]) =>
    placeFittings(
      plan,
      {
        label: 'Square',
        plural: 'Squares',
        given,
        check: (s) => (s.sideMm < 280 ? undefined : `a ${s.sideMm} mm square does not fit its piece.`),
      },
      [
        { label: 'Port', placed: params.ports },
        { label: 'Cutout', placed: params.cutouts },
      ],
    );

  it('is placed in the given piece, or the bottom row’s middle one', () => {
    expect(placing([{ sideMm: 40, column: 4, row: 3 }, { sideMm: 40 }])).toEqual({
      ok: true,
      placed: [
        { sideMm: 40, column: 4, row: 3 },
        { sideMm: 40, column: 2, row: 1 },
      ],
    });
  });

  it('is checked by its own rule, and kept out of the pieces the kinds before it hold', () => {
    expect(placing([{ sideMm: 300, column: 4, row: 3 }])).toEqual({
      ok: false,
      problem: 'Square 1: a 300 mm square does not fit its piece.',
    });
    expect(placing([{ sideMm: 40, column: 1, row: 2 }])).toEqual({
      ok: false,
      problem: 'Square 1 and cutout 1 are both in column 1, row 2; give each its own piece.',
    });
    expect(
      placing([
        { sideMm: 40, column: 3, row: 3 },
        { sideMm: 50, column: 3, row: 3 },
      ]),
    ).toEqual({
      ok: false,
      problem: 'Squares 1 and 2 are both in column 3, row 3; give each its own piece.',
    });
  });

  const result = placing([{ sideMm: 40, column: 4, row: 3 }]);
  if (!result.ok) throw new Error(result.problem);
  const fittings = placedFittings(fittingSource(params), [...FITTINGS, square(result.placed)]);

  it('is built into its piece beside the listed kinds, the pattern kept clear of it', () => {
    const pattern = fillPattern({ ...params.fill, kind: 'grid', style: 'through' }, params.joint);
    if (pattern === undefined) throw new Error('no pattern');
    const built = buildPiecesWith(engine, plan, params.thicknessMm, fittings, pattern);
    try {
      const at = (column: number, row: number) => built.find((b) => b.column === column - 1 && b.row === row - 1);
      expect(at(3, 1)?.hoseMm).toBe(150);
      expect(at(1, 2)?.cutout).toEqual({ widthMm: 120, heightMm: 80 });
      const piece = at(4, 3);
      if (piece === undefined) throw new Error('no piece at column 4, row 3');
      expect(piece.tag).toBe('-square-40');
      // Within the keep-out, only the square's own hole: the pattern cuts nothing there.
      const size = sizeOf({ column: 4, row: 3 });
      const zone = 40 + 2 * pattern.borderMm;
      const box = engine.Manifold.cube([zone, zone, 3 * size.thicknessMm], true).translate([
        size.widthMm / 2,
        size.heightMm / 2,
        0,
      ]);
      const inZone = piece.solid.intersect(box);
      expect(inZone.volume()).toBeCloseTo((zone * zone - 40 * 40) * size.thicknessMm, 3);
      // And outside it the pattern does cut: the piece is lighter than a panel with the hole alone.
      const holeOnly = square(result.placed).placed(fittingSource(params))[0]?.solid(engine, size);
      expect(piece.solid.volume()).toBeLessThan(holeOnly?.volume() ?? 0);
      for (const m of [box, inZone, holeOnly]) m?.delete();
    } finally {
      for (const b of built) b.solid.delete();
    }
  });

  it('names its piece’s file with its tag', () => {
    const built = buildPiecesWith(engine, plan, params.thicknessMm, fittings);
    try {
      const pieces = built.map((b, i) => {
        const cell = plan.pieces[i];
        if (cell === undefined) throw new Error('the plan and the built pieces differ');
        return { cell, mesh: meshOf(b.solid), ...(b.tag === undefined ? {} : { tag: b.tag }) };
      });
      const names = packageDownload(pieces, [], { format: 'stl', packaging: 'separate' }, 1200, 900).map((f) => f.name);
      expect(names.filter((n) => n.includes('-square-'))).toEqual([
        expect.stringMatching(/^piece-c4-r3-.+-square-40\.stl$/),
      ]);
      expect(names.filter((n) => n.includes('-port-150'))).toHaveLength(1);
      expect(names.filter((n) => n.includes('-cutout-120x80'))).toHaveLength(1);
    } finally {
      for (const b of built) b.solid.delete();
    }
  });
});
