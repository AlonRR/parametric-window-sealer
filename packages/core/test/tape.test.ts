// The tape seal (backlog item seal-tape, #15). A seal choice that starts at none (Q122); foam
// tape from four sourced sizes, starting at 9 × 4 mm (Q121), in a groove 1 mm deep and the
// tape's width plus 0.5 mm wide (Q120, Q124), squeezed to half its thickness (Q125). It goes
// on the edge strips' outer face (Q119), keeping 2 mm over its groove (Q126); under Advanced
// on their sides, replacing the clearance (Q127), and inside the hose port's collar, whose
// wall grows behind it (Q129). One tape for every place (Q130).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLAR,
  DEFAULT_JOINT,
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  EXAMPLE_TRACK,
  NO_SEAL,
  PORT_SEGMENTS,
  SETTINGS,
  TAPE_GROOVE_PLAY_MM,
  TAPE_GROOVE_WALL_MM,
  TAPE_SIZES,
  WINDOW_PRESETS,
  describePlan,
  edgeProfile,
  edgeShapes,
  edgeStripSolid,
  edgeTapeSolid,
  loadEngine,
  makeFiles,
  panelSpan,
  partName,
  planEdges,
  planWall,
  portPanel,
  portPieceMm,
  portTapeSolid,
  readParams,
  readSettings,
  tapeFit,
  tapedCollar,
  toFormValues,
} from '../src/index.js';
import type { EdgeName, EdgeParams, EdgeStripPlacement, FormValues, SealParams, TapeParams } from '../src/index.js';

const tape = (over: Partial<TapeParams> = {}): SealParams => ({ kind: 'tape', tape: { ...DEFAULT_TAPE, ...over } });
const slider: EdgeParams = { window: 'slider', roles: WINDOW_PRESETS.slider, track: EXAMPLE_TRACK };
const deep = (depthMm: number): EdgeParams => ({
  ...slider,
  track: { ...EXAMPLE_TRACK, depthMm: { top: depthMm, bottom: depthMm, left: depthMm, right: depthMm } },
});
const on = (strips: EdgeStripPlacement[], edge: EdgeName) => strips.filter((s) => s.edge === edge);

function tableRows(): { widthMm: number; thicknessMm: number }[] {
  const md = readFileSync(new URL('../../../docs/tape-sizes.md', import.meta.url), 'utf8');
  const section = md.split('## Listed sizes')[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .filter((line) => /^\| [0-9]/.test(line))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .map((cells) => ({ widthMm: Number(cells[1]), thicknessMm: Number(cells[2]) }));
}

describe('the sizes and the starting values (Q121, Q122, Q124, Q125, Q130)', () => {
  it('lists the four sizes in docs/tape-sizes.md, row for row, 9 × 4 mm first', () => {
    expect(TAPE_SIZES).toEqual(tableRows());
    expect(TAPE_SIZES).toEqual([
      { widthMm: 9, thicknessMm: 4 },
      { widthMm: 9.5, thicknessMm: 4.8 },
      { widthMm: 9, thicknessMm: 6 },
      { widthMm: 9.5, thicknessMm: 6.4 },
    ]);
  });

  it('starts at no seal; the tape at 9 × 4 mm, a 1 mm groove, squeezed to 50 %, on the outer face only', () => {
    expect(EXAMPLE_PARAMS.seal).toEqual(NO_SEAL);
    expect(NO_SEAL.kind).toBe('none');
    expect(DEFAULT_TAPE).toEqual({
      widthMm: 9,
      thicknessMm: 4,
      grooveMm: 1,
      squeezePct: 50,
      sides: false,
      port: false,
      joints: false, // for the printed TPU seal (#22)
    });
    expect(TAPE_GROOVE_PLAY_MM).toBe(0.5);
  });

  it('tapeFit: a 9.5 mm groove, and the tape squeezed to 2 mm stands 1 mm out of it', () => {
    expect(tapeFit(NO_SEAL)).toBeUndefined();
    expect(tapeFit(tape())).toEqual({
      widthMm: 9,
      grooveWidthMm: 9.5,
      grooveDepthMm: 1,
      standOutMm: 1,
      sides: false,
      port: false,
    });
    expect(tapeFit(tape({ thicknessMm: 6.4, squeezePct: 50, grooveMm: 1 }))?.standOutMm).toBeCloseTo(2.2, 9);
  });
});

describe('edgeProfile with tape on the outer face (Q119, Q125, Q126)', () => {
  const fit = tapeFit(tape());

  it('in a 10 mm track: the strip keeps 2 mm over its groove, 11 mm, and the tape adds 1 mm', () => {
    // Without tape: 10 mm tall, the panel 6.5 mm in. The groove and the tape take 2 mm of that.
    expect(edgeProfile('left', slider, DEFAULT_JOINT, fit)).toEqual({
      widthMm: 14,
      heightMm: 12,
      reachMm: 4.5,
      tape: { standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1 } },
    });
  });

  it('in a 20 mm track: the strip is 1 mm shorter and the panel stays where it is', () => {
    const plain = edgeProfile('left', deep(20), DEFAULT_JOINT);
    const taped = edgeProfile('left', deep(20), DEFAULT_JOINT, fit);
    expect([plain.heightMm, plain.reachMm]).toEqual([20, 6.5]);
    expect([taped.heightMm, taped.reachMm]).toEqual([20, 6.5]);
    expect(taped.heightMm - (taped.tape?.standOutMm ?? 0)).toBe(19);
  });

  it('at the sash: the strip grows by the groove and the wall is smaller by the squeezed tape', () => {
    expect(edgeProfile('right', slider, DEFAULT_JOINT, fit)).toMatchObject({
      widthMm: 15,
      heightMm: 12,
      reachMm: -5.5,
    });
  });

  it('the span: 599 × 1009 mm for the example 600 × 1000 mm opening, against 603 × 1013 mm bare', () => {
    expect(panelSpan(600, 1000, slider, DEFAULT_JOINT)).toEqual({ widthMm: 603, heightMm: 1013 });
    expect(panelSpan(600, 1000, slider, DEFAULT_JOINT, fit)).toEqual({ widthMm: 599, heightMm: 1009 });
  });
});

describe('edgeProfile with tape on the sides as well (Q127)', () => {
  const fit = tapeFit(tape({ sides: true }));

  it('the tape replaces the clearance: 13 mm in a 15 mm track, not 14', () => {
    expect(edgeProfile('left', slider, DEFAULT_JOINT, fit).widthMm).toBe(13);
  });

  it('its groove centred on the part of the side inside the track', () => {
    // A 20 mm track: the strip's 19 mm are all inside, so the 9.5 mm groove runs 4.75 to 14.25 mm.
    expect(edgeProfile('left', deep(20), DEFAULT_JOINT, fit).tape?.groove.side).toEqual({
      fromMm: 4.75,
      toMm: 14.25,
      trackMm: 20,
    });
    // A 10 mm track: 9 mm of the 11 mm strip are inside, too little to centre it on, so it
    // starts at the outer face.
    expect(edgeProfile('left', slider, DEFAULT_JOINT, fit).tape?.groove.side).toEqual({
      fromMm: 0,
      toMm: 9.5,
      trackMm: 10,
    });
  });

  it('only in a track: the sash edge has no sides to seal', () => {
    const sash = edgeProfile('right', slider, DEFAULT_JOINT, fit);
    expect(sash.widthMm).toBe(15);
    expect(sash.tape?.groove.side).toBeUndefined();
  });
});

describe('planEdges with tape', () => {
  const fit = tapeFit(tape());
  const strips = planEdges(599, 1009, slider, DEFAULT_JOINT, 200, fit);

  it('each strip is 11 mm tall and sits 1 mm off the track floor or the sash, the tape between', () => {
    for (const s of strips) {
      expect(s.heightMm).toBe(11);
      expect(s.tape).toEqual({ standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1 } });
    }
    // The outer faces of the bare profile are at -5.5 mm (left, bottom), 604.5 and 1014.5 mm.
    for (const s of on(strips, 'bottom')) expect(s.yMm).toBe(-4.5);
    for (const s of on(strips, 'left')) expect(s.xMm).toBe(-4.5);
    for (const s of on(strips, 'top')) expect(s.yMm).toBe(1002.5);
    for (const s of on(strips, 'right')) expect(s.xMm).toBe(592.5);
  });

  it('the strips through the corners still reach the track floor and the sash: 610 mm across', () => {
    expect(on(strips, 'bottom').reduce((n, s) => n + s.lengthMm, 0)).toBeCloseTo(610, 9);
    expect(on(strips, 'left').reduce((n, s) => n + s.lengthMm, 0)).toBeCloseTo(996, 9);
  });

  it('edgeShapes keeps the groove; with side grooves the track depth is in the file name', () => {
    const sides = tapeFit(tape({ sides: true }));
    const mixed: EdgeParams = {
      ...slider,
      track: { ...EXAMPLE_TRACK, depthMm: { top: 11, bottom: 12, left: 10, right: 10 } },
    };
    const span = panelSpan(600, 1000, mixed, DEFAULT_JOINT, sides);
    const shapes = edgeShapes(planEdges(span.widthMm, span.heightMm, mixed, DEFAULT_JOINT, 200, sides));
    const names = shapes.map(partName);
    expect(new Set(names).size).toBe(names.length);
    // Top and bottom are the same size, 11 mm tall, but their side grooves differ by the depth.
    const across = shapes.filter((s) => s.heightMm === 11 && s.widthMm === 13);
    expect(across.map((s) => s.groove?.side?.trackMm)).toEqual(expect.arrayContaining([11, 12]));
    expect(names.some((n) => /^edge-[0-9.]+x13x11-track-12-print-[0-9]+$/.test(n))).toBe(true);
    // Without side grooves the names stay as they were.
    const plain = edgeShapes(planEdges(599, 1009, slider, DEFAULT_JOINT, 200, fit)).map(partName);
    for (const n of plain) expect(n).toMatch(/^edge-[0-9.]+x1[45]x11-print-[0-9]+$/);
  });
});

describe('edgeStripSolid with grooves', () => {
  const L = 100;
  const T = 3;
  const SLOT = (T + 0.4) * 8;

  it('the outer face loses a 9.5 × 1 mm groove under the slot', async () => {
    const engine = await loadEngine();
    const profile = { widthMm: 14, heightMm: 11, tape: { standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1 } } };
    const s = edgeStripSolid(engine, L, profile, DEFAULT_JOINT, T, 'bottom');
    expect(s.volume()).toBeCloseTo(L * (14 * 11 - SLOT - 9.5 * 1), 6);
    // Along the bottom edge the outer face is y = 0; the groove is centred on the panel's mid-plane.
    const groove = engine.Manifold.cube([L, 1, 9.5]).translate([0, 0, 1.5 - 4.75]);
    const inGroove = s.intersect(groove);
    expect(inGroove.volume()).toBeCloseTo(0, 6);
    for (const m of [inGroove, groove, s]) m.delete();
  });

  it('with side grooves too: 1 mm deep, along each side where the profile says', async () => {
    const engine = await loadEngine();
    const profile = {
      widthMm: 13,
      heightMm: 19,
      tape: { standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1, side: { fromMm: 4.75, toMm: 14.25, trackMm: 20 } } },
    };
    const s = edgeStripSolid(engine, L, profile, DEFAULT_JOINT, T, 'print');
    expect(s.volume()).toBeCloseTo(L * (13 * 19 - SLOT - 9.5 - 2 * 9.5), 6);
    expect(s.genus()).toBe(0);
    s.delete();
  });

  it('refuses a groove that leaves the walls beside it under 0.8 mm (Q131)', async () => {
    const engine = await loadEngine();
    const profile = { widthMm: 10.6, heightMm: 11, tape: { standOutMm: 2.2, groove: { widthMm: 10, depthMm: 1 } } };
    expect(() => edgeStripSolid(engine, L, profile, DEFAULT_JOINT, T, 'print')).toThrow(RangeError);
  });
});

describe('the hose port with tape inside its collar (Q129)', () => {
  const fit = tapeFit(tape({ port: true }));

  it('the tape replaces the clearance and the wall grows by the groove: a 178.8 mm piece for 150 mm', () => {
    expect(tapedCollar(DEFAULT_COLLAR, fit)).toEqual({ ...DEFAULT_COLLAR, clearanceMm: 1, wallMm: 3.4 });
    expect(tapedCollar(DEFAULT_COLLAR, tapeFit(tape()))).toEqual(DEFAULT_COLLAR);
    expect(tapedCollar(DEFAULT_COLLAR, undefined)).toEqual(DEFAULT_COLLAR);
    expect(portPieceMm(150, DEFAULT_COLLAR, DEFAULT_JOINT)).toBeCloseTo(175.8, 9);
    expect(portPieceMm(150, tapedCollar(DEFAULT_COLLAR, fit), DEFAULT_JOINT)).toBeCloseTo(178.8, 9);
  });

  it('the collar loses a ring 1 mm deep and 9.5 mm tall, centred on its depth', async () => {
    const engine = await loadEngine();
    const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };
    const collar = tapedCollar(DEFAULT_COLLAR, fit);
    const bare = portPanel(engine, size, 150, collar);
    const grooved = portPanel(engine, size, 150, collar, { widthMm: 9.5, depthMm: 1 });
    // The polygon's area, as Manifold draws a circle with PORT_SEGMENTS sides.
    const area = (r: number) => (PORT_SEGMENTS / 2) * r * r * Math.sin((2 * Math.PI) / PORT_SEGMENTS);
    expect(bare.volume() - grooved.volume()).toBeCloseTo((area(76 + 1) - area(76)) * 9.5, 3);
    expect(grooved.genus()).toBe(1);
    const box = grooved.boundingBox();
    expect(box.max[2]).toBeCloseTo(23, 9);
    bare.delete();
    grooved.delete();
  });
});

describe('the form (Q122, Q124 to Q127, Q129)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('starts at none, the tape fields at their starting values', () => {
    expect(example).toMatchObject({
      seal: 'none',
      tapeWidthMm: '9',
      tapeThicknessMm: '4',
      tapeGrooveMm: '1',
      tapeSqueezePct: '50',
      tapeSides: 'no',
      tapePort: 'no',
    });
  });

  it('tape, and back through the form', () => {
    const r = read({ seal: 'tape', tapeWidthMm: '9.5', tapeThicknessMm: '4.8', tapeSides: 'yes' });
    expect(r).toMatchObject({
      ok: true,
      params: { seal: { kind: 'tape', tape: { ...DEFAULT_TAPE, widthMm: 9.5, thicknessMm: 4.8, sides: true } } },
    });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('with no seal, tape fields that are not filled in are no problem', () => {
    expect(read({ tapeWidthMm: '', tapeSqueezePct: 'x' })).toMatchObject({ ok: true, params: { seal: NO_SEAL } });
  });

  it('a groove of 0 is a flat face; a squeeze outside 0 to 100 % is refused', () => {
    expect(read({ seal: 'tape', tapeGrooveMm: '0' })).toMatchObject({ ok: true });
    for (const pct of ['0', '120', '-5']) {
      expect(read({ seal: 'tape', tapeSqueezePct: pct })).toMatchObject({
        ok: false,
        errors: { tapeSqueezePct: 'Enter a percentage greater than 0, up to 100.' },
      });
    }
  });

  it('refuses tape squeezed into its own groove', () => {
    expect(read({ seal: 'tape', tapeSqueezePct: '25' })).toMatchObject({
      ok: false,
      errors: {
        tapeSqueezePct:
          'Squeezed to 1 mm, the tape would sit inside its 1 mm groove; squeeze it less or make the groove shallower.',
      },
    });
  });

  it('refuses side tape in a track shallower than the tape is wide (Q127)', () => {
    expect(read({ seal: 'tape', tapeSides: 'yes', leftDepthMm: '8' })).toMatchObject({
      ok: false,
      errors: {
        tapeSides:
          'The left track is 8 mm deep, less than the 9 mm tape is wide, so the tape cannot go on the edge strips’ sides.',
      },
    });
    // The right edge is at the sash: its depth is not read.
    expect(read({ seal: 'tape', tapeSides: 'yes', rightDepthMm: '8' })).toMatchObject({ ok: true });
  });

  it('refuses a tape that leaves walls under 0.8 mm beside its groove (Q131)', () => {
    expect(TAPE_GROOVE_WALL_MM).toBe(0.8);
    // On the sides of a 15 mm track: 9.5 × 4.8 mm leaves 1.1 mm walls; 9 × 6 mm 0.75 mm, as
    // the strip is 15 − 2 × 2 = 11 mm and the groove 9.5 mm; 9.5 × 6.4 mm 0.3 mm.
    const sides = { seal: 'tape', tapeSides: 'yes' };
    expect(read({ ...sides, tapeWidthMm: '9.5', tapeThicknessMm: '4.8' })).toMatchObject({ ok: true });
    for (const [w, t, left] of [
      ['9', '6', '0.75'],
      ['9.5', '6.4', '0.3'],
    ]) {
      expect(read({ ...sides, tapeWidthMm: w, tapeThicknessMm: t })).toMatchObject({
        ok: false,
        errors: {
          tapeWidthMm: `Leaves walls of ${left} mm beside the tape’s groove in the edge strips, under the 0.8 mm they need; choose a narrower tape.`,
        },
      });
    }
    // Without side tape the strip is 14 mm, and 9.5 × 6.4 mm leaves 2 mm.
    expect(read({ seal: 'tape', tapeWidthMm: '9.5', tapeThicknessMm: '6.4' })).toMatchObject({ ok: true });
  });

  it('with tape round the port: the collar must hold the groove, and the piece is bigger', () => {
    const port = { seal: 'tape', tapePort: 'yes', ports: '150' };
    expect(read({ ...port, collarDepthMm: '8' })).toMatchObject({
      ok: false,
      errors: { collarDepthMm: 'Make it at least 9.5 mm, so the tape’s groove fits inside the collar.' },
    });
    // One 177 × 177 mm piece: room for the bare collar's 175.8 mm, not the taped one's 178.8.
    const one = {
      openingWidthMm: '178',
      openingHeightMm: '168',
      printer: 'custom',
      customWidthMm: '177',
      customHeightMm: '177',
      seal: 'tape',
      ports: '150',
    };
    expect(read(one)).toMatchObject({ ok: true });
    expect(read({ ...one, tapePort: 'yes' })).toMatchObject({
      ok: false,
      errors: {
        ports:
          'Port 1: A 150 mm hose port needs a piece at least 178.8 × 178.8 mm; column 1, row 1 is 177 × 177 mm. ' +
          'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
      },
    });
  });
});

describe('the plan text', () => {
  const params = (seal: SealParams, ports = EXAMPLE_PARAMS.ports) => ({ ...EXAMPLE_PARAMS, seal, ports });
  const line = (p: ReturnType<typeof params>) => describePlan(planWall(p), p).seal;

  it('says when there is no seal', () => {
    expect(line(params(NO_SEAL))).toBe('Seal: none.');
  });

  it('names the tape, where it goes and how much: 3.2 m along the example slider', () => {
    // 610 + 610 + 996 + 996 mm of edge strip.
    expect(line(params(tape()))).toBe(
      'Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces: 3.2 m in all.',
    );
  });

  it('with the sides, twice the strips in a track more: 7.6 m', () => {
    expect(line(params(tape({ sides: true })))).toBe(
      'Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces and sides: 7.6 m in all.',
    );
  });

  it('with the port, round the inside of its collar', () => {
    const p = params(tape({ port: true }), [{ hoseMm: 150, column: 2, row: 1 }]);
    expect(line(p)).toBe(
      'Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces, and inside the hose port’s collar: 3.7 m in all.',
    );
  });
});

describe('settings in the library’s shape', () => {
  it('lists every tape setting, the places as yes or no', () => {
    const paths = SETTINGS.filter((s) => s.path.startsWith('seal')).map((s) => [
      s.path,
      s.values ?? null,
      s.onOff ?? false,
    ]);
    expect(paths).toEqual([
      ['seal.kind', ['none', 'tape', 'tpu'], false],
      ['seal.tape.widthMm', null, false],
      ['seal.tape.thicknessMm', null, false],
      ['seal.tape.grooveMm', null, false],
      ['seal.tape.squeezePct', null, false],
      ['seal.tape.sides', ['no', 'yes'], true],
      ['seal.tape.port', ['no', 'yes'], true],
      ['seal.tape.joints', ['no', 'yes'], true],
    ]);
  });

  it('tape settings without a kind mean tape, as a printer size means a custom printer', () => {
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 1000, seal: { tape: { sides: true } } });
    expect(r).toMatchObject({ ok: true, params: { seal: { kind: 'tape', tape: { ...DEFAULT_TAPE, sides: true } } } });
    expect(
      readSettings({ openingWidthMm: 600, openingHeightMm: 1000, seal: { kind: 'none', tape: { widthMm: 12 } } }),
    ).toMatchObject({
      ok: true,
      params: { seal: { kind: 'none' } },
    });
  });

  it('a place is true or false', () => {
    expect(readSettings({ openingWidthMm: 600, openingHeightMm: 1000, seal: { tape: { sides: 'yes' } } })).toEqual({
      ok: false,
      problems: [{ kind: 'shape', path: 'seal.tape.sides', message: 'seal.tape.sides should be true or false' }],
    });
  });
});

describe('the files', () => {
  it('a taped wall makes its files, the edge strips grooved', async () => {
    const engine = await loadEngine();
    const files = makeFiles(
      engine,
      { ...EXAMPLE_PARAMS, seal: tape({ sides: true }) },
      { format: 'stl', packaging: 'separate' },
    );
    const edges = files.filter((f) => f.name.startsWith('edge-'));
    expect(edges.length).toBeGreaterThan(0);
    for (const f of edges) expect(f.name).toMatch(/-track-10-print-|x15x11-print-/);
  });
});

describe('the tape as solids, for the preview (Q132)', () => {
  const STRIP = { widthMm: 14, heightMm: 11, tape: { standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1 } } };
  const bounds = (m: { boundingBox(): { min: ArrayLike<number>; max: ArrayLike<number> } }) => {
    const b = m.boundingBox();
    return [...Array.from(b.min), ...Array.from(b.max)].map((x) => Math.round(x * 1e6) / 1e6);
  };

  it('along the outer face: the tape’s width, from its groove’s floor to its squeezed face, clear of the strip', async () => {
    const engine = await loadEngine();
    const tapeSolid = edgeTapeSolid(engine, 100, STRIP, 3, 'bottom');
    expect(tapeSolid.volume()).toBeCloseTo(100 * 9 * 2, 6);
    expect(bounds(tapeSolid)).toEqual([0, -1, 1.5 - 4.5, 100, 1, 1.5 + 4.5]);
    const strip = edgeStripSolid(engine, 100, STRIP, DEFAULT_JOINT, 3, 'bottom');
    const both = strip.intersect(tapeSolid);
    expect(both.volume()).toBeCloseTo(0, 6);
    for (const m of [both, strip, tapeSolid]) m.delete();
  });

  it('on the sides too, each in its groove; along the top edge it lies above the strip', async () => {
    const engine = await loadEngine();
    const sides = {
      widthMm: 13,
      heightMm: 19,
      tape: { standOutMm: 1, groove: { widthMm: 9.5, depthMm: 1, side: { fromMm: 4.75, toMm: 14.25, trackMm: 20 } } },
    };
    const tapeSolid = edgeTapeSolid(engine, 100, sides, 3, 'top');
    expect(tapeSolid.volume()).toBeCloseTo(3 * 100 * 9 * 2, 6);
    // Along the top edge the outer face is y = 19, the tape out to 20; the sides' tape 1 mm
    // beyond the strip's 13 mm, centred on the panel.
    expect(bounds(tapeSolid)).toEqual([0, 5, 1.5 - 6.5 - 1, 100, 20, 1.5 + 6.5 + 1]);
    const strip = edgeStripSolid(engine, 100, sides, DEFAULT_JOINT, 3, 'top');
    const both = strip.intersect(tapeSolid);
    expect(both.volume()).toBeCloseTo(0, 6);
    for (const m of [both, strip, tapeSolid]) m.delete();
  });

  it('inside the collar: from the hose to its groove’s floor, as tall as the tape is wide', async () => {
    const engine = await loadEngine();
    const fit = tapeFit(tape({ port: true }));
    if (fit === undefined) throw new Error('tape expected');
    const size = { widthMm: 200, heightMm: 200, thicknessMm: 3 };
    const collar = tapedCollar(DEFAULT_COLLAR, fit);
    const ring = portTapeSolid(engine, size, 150, collar, fit);
    const area = (r: number) => (PORT_SEGMENTS / 2) * r * r * Math.sin((2 * Math.PI) / PORT_SEGMENTS);
    expect(ring.volume()).toBeCloseTo((area(77) - area(75)) * 9, 3);
    const box = bounds(ring);
    expect([box[2], box[5]]).toEqual([3 + 10 - 4.5, 3 + 10 + 4.5]);
    const piece = portPanel(engine, size, 150, collar, { widthMm: 9.5, depthMm: 1 });
    const both = piece.intersect(ring);
    expect(both.volume()).toBeCloseTo(0, 3);
    for (const m of [both, piece, ring]) m.delete();
  });
});
