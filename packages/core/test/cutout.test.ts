// The measured cutout (backlog item measured-cutout, #23; Q16). Chosen without asking (Q144;
// docs/choices.md): a cutout inside one piece, as the hose port is (C40), a rectangle the
// appliance's measured size passing right through (C41), a rim round it on the room side (C42),
// lined with the wall's seal when it has one (C43), written as the ports are (C44), named by its
// size (C46), and starting in the port's starting piece (C47).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOINT,
  DEFAULT_RIM,
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  SETTINGS,
  buildPieces,
  cutoutPanel,
  cutoutPieceMm,
  describePlan,
  fillPattern,
  formatCutouts,
  frameShapes,
  frameSolid,
  linedRim,
  loadEngine,
  parseCutouts,
  partName,
  pieceOpenings,
  planFiles,
  planWall,
  readParams,
  rimInnerMm,
  rimOuterMm,
  tapeFit,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params, SealParams } from '../src/index.js';

const BOX = { widthMm: 120, heightMm: 80 };
const tape: SealParams = { kind: 'tape', tape: DEFAULT_TAPE };
const tpu: SealParams = { kind: 'tpu', tape: DEFAULT_TAPE };

describe('the rules', () => {
  it('none to start with; a rim 15 mm deep, a 2.4 mm wall and 1 mm clearance (C42)', () => {
    expect(EXAMPLE_PARAMS.cutouts).toEqual([]);
    expect(EXAMPLE_PARAMS.rim).toEqual(DEFAULT_RIM);
    expect(DEFAULT_RIM).toEqual({ depthMm: 15, wallMm: 2.4, clearanceMm: 1 });
    expect(rimInnerMm(BOX, DEFAULT_RIM)).toEqual({ widthMm: 122, heightMm: 82 });
    expect(rimOuterMm(BOX, DEFAULT_RIM)).toEqual({ widthMm: 126.8, heightMm: 86.8 });
    // Clear of the strips as a port is: the slot depth and 2 mm more each side (Q108).
    expect(cutoutPieceMm(BOX, DEFAULT_RIM, DEFAULT_JOINT)).toEqual({ widthMm: 146.8, heightMm: 106.8 });
  });

  it('lined with the seal: it takes the clearance, and the wall grows by its groove (C43)', () => {
    expect(linedRim(DEFAULT_RIM, undefined)).toEqual(DEFAULT_RIM);
    expect(linedRim(DEFAULT_RIM, tapeFit(tape))).toEqual({ depthMm: 15, wallMm: 3.4, clearanceMm: 1 });
    expect(linedRim(DEFAULT_RIM, tapeFit(tpu))).toEqual(linedRim(DEFAULT_RIM, tapeFit(tape)));
  });

  it('written as the appliance’s width x height, then optionally @column,row (C44)', () => {
    expect(parseCutouts('120x80 95.5x60@1,2')).toEqual({
      ok: true,
      cutouts: [
        { widthMm: 120, heightMm: 80 },
        { widthMm: 95.5, heightMm: 60, column: 1, row: 2 },
      ],
    });
    expect(parseCutouts('  ')).toEqual({ ok: true, cutouts: [] });
    for (const wrong of ['120', '120x', 'x80', '120x80@2', '120x80@0,1', '0x80', '120 x 80'.replace(/ /g, '')]) {
      if (wrong === '120x80') continue;
      expect(parseCutouts(wrong)).toEqual({
        ok: false,
        message:
          'Cutout 1: write each as the appliance’s measured width x height in mm, then optionally @column,row, ' +
          'as 120x80 or 120x80@2,1.',
      });
    }
    expect(formatCutouts([BOX, { widthMm: 95.5, heightMm: 60, column: 1, row: 2 }])).toBe('120x80 95.5x60@1,2');
  });
});

describe('the piece with a cutout (C41, C42)', () => {
  const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };

  it('the rim’s inside right through the panel, and the rim standing on its room side', async () => {
    const engine = await loadEngine();
    const solid = cutoutPanel(engine, size, BOX, DEFAULT_RIM);
    const rim = 126.8 * 86.8 - 122 * 82;
    expect(solid.volume()).toBeCloseTo(200 * 200 * 3 - 122 * 82 * 3 + rim * 15, 3);
    const b = solid.boundingBox();
    expect([...Array.from(b.min), ...Array.from(b.max)].map((v) => Math.round(v * 1e4) / 1e4)).toEqual([
      0, 0, 0, 200, 200, 18,
    ]);
    // Open where the appliance goes: nothing at the centre, through the panel and the rim.
    const probe = engine.Manifold.cube([1, 1, 30]).translate([99.5, 99.5, -5]);
    const left = solid.intersect(probe);
    expect(left.volume()).toBe(0);
    for (const m of [solid, probe, left]) m.delete();
  });

  it('with a seal, a groove round the rim’s inside, as wide as the tape’s, centred on its depth', async () => {
    const engine = await loadEngine();
    const fit = tapeFit(tape);
    if (!fit) throw new Error('fit expected');
    const rim = linedRim(DEFAULT_RIM, fit);
    const solid = cutoutPanel(engine, size, BOX, rim, { widthMm: 9.5, depthMm: 1 });
    const walls = 128.8 * 88.8 - 122 * 82;
    const groove = (124 * 84 - 122 * 82) * 9.5;
    expect(solid.volume()).toBeCloseTo(200 * 200 * 3 - 122 * 82 * 3 + walls * 15 - groove, 3);
    solid.delete();
    expect(() => cutoutPanel(engine, size, BOX, { ...rim, depthMm: 9 }, { widthMm: 9.5, depthMm: 1 })).toThrow(
      RangeError,
    );
  });

  it('buildPieces cuts it in its piece, and a pattern keeps clear of the rim and a border', async () => {
    const engine = await loadEngine();
    const p: Params = { ...EXAMPLE_PARAMS, cutouts: [{ ...BOX, column: 2, row: 1 }] };
    const plan = planWall(p);
    const built = buildPieces(engine, plan, 3, [], p.collar, undefined, undefined, p.cutouts, p.rim);
    const withCutout = built.filter((b) => b.cutout !== undefined);
    expect(withCutout.map((b) => [b.column, b.row, b.cutout])).toEqual([[1, 0, BOX]]);
    for (const b of built) b.solid.delete();
    // The keep-out is the rim's outside and the border, centred in the piece.
    const tile = {
      pitchXMm: 18,
      pitchYMm: 18,
      rowShiftMm: 0,
      barMm: 3,
      openings: [
        [
          [-7.5, -7.5],
          [7.5, -7.5],
          [7.5, 7.5],
          [-7.5, 7.5],
        ],
      ] as [number, number][][],
    };
    const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };
    const keepOut = { xMm: 100, yMm: 100, widthMm: 126.8 + 20, heightMm: 86.8 + 20 };
    const openings = pieceOpenings(engine, tile, [100, 100], piece, 10, keepOut);
    const zone = engine.CrossSection.square([keepOut.widthMm, keepOut.heightMm], true).translate([100, 100]);
    const overlap = openings.intersect(zone);
    expect(openings.area()).toBeGreaterThan(0);
    expect(overlap.area()).toBeCloseTo(0, 6);
    for (const cs of [openings, zone, overlap]) cs.delete();
  });

  it('a patterned piece stays solid round the rim, a border wide, and patterned beyond it', async () => {
    const engine = await loadEngine();
    const p: Params = { ...EXAMPLE_PARAMS, cutouts: [{ ...BOX, column: 2, row: 1 }] };
    const plan = planWall(p);
    const pattern = fillPattern({ ...p.fill, kind: 'grid', style: 'through' }, p.joint);
    const piece = (withPattern: boolean) => {
      const built = buildPieces(
        engine,
        plan,
        3,
        [],
        p.collar,
        undefined,
        withPattern ? pattern : undefined,
        p.cutouts,
        p.rim,
      );
      const mine = built.find((b) => b.cutout !== undefined);
      for (const b of built) if (b !== mine) b.solid.delete();
      if (!mine) throw new Error('the cutout’s piece expected');
      return mine.solid;
    };
    const [patterned, plain] = [piece(true), piece(false)];
    const cell = plan.pieces.find((c) => c.column === 1 && c.row === 0);
    if (!cell || !pattern) throw new Error('a piece and a pattern expected');
    const zone = engine.Manifold.cube([126.8 + 2 * pattern.borderMm, 86.8 + 2 * pattern.borderMm, 40], true).translate([
      cell.widthMm / 2,
      cell.heightMm / 2,
      10,
    ]);
    const [a, b] = [patterned.intersect(zone), plain.intersect(zone)];
    expect(a.volume()).toBeCloseTo(b.volume(), 3);
    expect(patterned.volume()).toBeLessThan(plain.volume() - 100);
    for (const m of [patterned, plain, zone, a, b]) m.delete();
  });
});

describe('the TPU frame (C43)', () => {
  it('in the rim’s groove, gripping the appliance 0.5 mm a side, as deep as the tape is wide', async () => {
    const engine = await loadEngine();
    const fit = tapeFit(tpu);
    if (!fit) throw new Error('fit expected');
    const rim = linedRim(DEFAULT_RIM, fit);
    const shapes = frameShapes([BOX, { ...BOX, column: 1, row: 1 }, { widthMm: 60, heightMm: 60 }], rim, fit);
    expect(shapes).toEqual([
      {
        kind: 'frame',
        widthMm: 120,
        heightMm: 80,
        outerWidthMm: 124,
        outerHeightMm: 84,
        innerWidthMm: 119,
        innerHeightMm: 79,
        depthMm: 9,
        count: 2,
      },
      {
        kind: 'frame',
        widthMm: 60,
        heightMm: 60,
        outerWidthMm: 64,
        outerHeightMm: 64,
        innerWidthMm: 59,
        innerHeightMm: 59,
        depthMm: 9,
        count: 1,
      },
    ]);
    const [first] = shapes;
    if (!first) throw new Error('a frame expected');
    expect(partName(first)).toBe('frame-120x80-tpu-print-2');
    const solid = frameSolid(engine, first);
    expect(solid.volume()).toBeCloseTo((124 * 84 - 119 * 79) * 9, 4);
    solid.delete();
  });
});

describe('the form (C44, C47)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('reads the cutouts, placing one without a piece in the port’s starting piece, and back', () => {
    expect(example.cutouts).toBe('');
    const r = read({ cutouts: '120x80 60x60@3,4' });
    expect(r).toMatchObject({
      ok: true,
      params: {
        cutouts: [
          { ...BOX, column: 2, row: 1 },
          { widthMm: 60, heightMm: 60, column: 3, row: 4 },
        ],
      },
    });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses a cutout its piece cannot hold, saying what it needs', () => {
    const r = read({ cutouts: '180x80' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.cutouts).toMatch(
        /^Cutout 1: a 180 × 80 mm cutout needs a piece at least 206\.8 × 106\.8 mm; column 2, row 1 is [0-9.]+ × [0-9.]+ mm\. Full-size pieces plus a filler, or a larger printer size, make bigger pieces\.$/,
      );
    }
    expect(read({ cutouts: '120x80@9,1' })).toMatchObject({
      ok: false,
      errors: { cutouts: 'Cutout 1: there is no column 9, row 1: the wall has 3 columns and 5 rows.' },
    });
  });

  it('one cutout or port to a piece', () => {
    expect(read({ ports: '150@2,1', cutouts: '120x80@2,1' })).toMatchObject({
      ok: false,
      errors: { cutouts: 'Cutout 1 and port 1 are both in column 2, row 1; give each its own piece.' },
    });
    expect(read({ cutouts: '50x50@1,1 60x60@1,1' })).toMatchObject({
      ok: false,
      errors: { cutouts: 'Cutouts 1 and 2 are both in column 1, row 1; give each its own piece.' },
    });
  });

  it('a rim deep enough for the seal’s groove, and sizes it can use', () => {
    expect(read({ seal: 'tape', cutouts: '120x80', rimDepthMm: '9' })).toMatchObject({
      ok: false,
      errors: { rimDepthMm: 'Make it at least 9.5 mm, so the seal’s groove fits inside the rim.' },
    });
    expect(read({ cutouts: '120x80', rimDepthMm: '9' }).ok).toBe(true);
    expect(read({ rimWallMm: '0' })).toMatchObject({ ok: false, errors: { rimWallMm: expect.any(String) } });
    expect(read({ rimClearanceMm: '0' }).ok).toBe(true); // as the collar's, it may be zero
  });

  it('lists the cutouts and the rim as settings', () => {
    expect(SETTINGS.find((s) => s.field === 'cutouts')).toMatchObject({ path: 'cutouts', list: 'cutouts' });
    expect(SETTINGS.filter((s) => s.path.startsWith('rim.')).map((s) => s.path)).toEqual([
      'rim.depthMm',
      'rim.wallMm',
      'rim.clearanceMm',
    ]);
  });
});

describe('the plan and the files (C46)', () => {
  const at = (seal: SealParams = EXAMPLE_PARAMS.seal): Params => ({
    ...EXAMPLE_PARAMS,
    seal,
    cutouts: [{ ...BOX, column: 2, row: 1 }],
  });

  it('a line for each cutout, saying what lines it', () => {
    const line = (p: Params) => describePlan(planWall(p), p).cutouts;
    expect(line(at())).toEqual([
      'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 15 mm rim.',
    ]);
    expect(line(at(tape))).toEqual([
      'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 15 mm rim, lined with the foam tape.',
    ]);
    expect(line(at(tpu))).toEqual([
      'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 15 mm rim, lined with a TPU frame.',
    ]);
  });

  it('the seal’s line counts the tape round each rim, or the TPU frame', () => {
    const seal = (p: Params) => describePlan(planWall(p), p).seal;
    expect(seal(at(tape))).toBe(
      'Seal: 9 × 4 mm foam tape along the edge strips’ outer faces, and round the cutout’s rim: 3.6 m in all.',
    );
    expect(seal(at(tpu))).toBe(
      'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all, and a frame inside the cutout’s rim.',
    );
  });

  it('the piece is named by its cutout; with TPU, the frame is in the download', () => {
    const names = (p: Params) => planFiles(p, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names(at()).filter((n) => n.includes('-cutout-'))).toEqual([
      expect.stringMatching(/^piece-c2-r1-[0-9.]+x[0-9.]+-cutout-120x80\.stl$/),
    ]);
    expect(names(at()).some((n) => n.startsWith('frame-'))).toBe(false);
    expect(names(at(tape)).some((n) => n.startsWith('frame-'))).toBe(false);
    expect(names(at(tpu))).toContain('frame-120x80-tpu-print-1.stl');
  });
});
