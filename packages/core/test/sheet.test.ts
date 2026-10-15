// Pieces cut from sheet (sheet-pieces, #112), from the design review against published work: the
// pieces cut by hand from polycarbonate, acrylic, foam board or corrugated plastic, the strips,
// cross pieces, edge strips and fittings printed. The strips' slots already follow the panel's
// thickness, so the sheet's thickness is the panel thickness. Cut pieces can be as large as the
// sheet, and the strips along them are split to fit the printer.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHEET,
  EXAMPLE_PARAMS,
  buildExport,
  describePlan,
  loadEngine,
  pieceLimit,
  planFiles,
  planParts,
  planPins,
  planWall,
  readParams,
  readSettings,
  slotPins,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });
const ok = (over: FormValues): Params => {
  const r = read(over);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const names = (p: Params) => planFiles(p, { format: 'stl', packaging: 'separate' }).map((f) => f.name);

describe('the starting values', () => {
  it('print every piece; cutting from sheet takes a sheet 1000 × 2000 mm', () => {
    expect(DEFAULT_SHEET).toEqual({ source: 'printed', widthMm: 1000, heightMm: 2000 });
    expect(EXAMPLE_PARAMS.sheet).toEqual(DEFAULT_SHEET);
    expect([example.pieceSource, example.sheetWidthMm, example.sheetHeightMm]).toEqual(['printed', '1000', '2000']);
  });
});

describe('the plan with pieces cut from sheet', () => {
  it('cuts a piece as large as the sheet: the example wall is one piece, with no joints', () => {
    const p = ok({ pieceSource: 'sheet' });
    expect(pieceLimit(p)).toEqual({ widthMm: 1000, heightMm: 2000 });
    const plan = planWall(p);
    expect(plan.pieces.map((c) => [c.widthMm, c.heightMm])).toEqual([[603, 1013]]);
    const text = describePlan(plan, p);
    expect(text.headline).toBe('1 piece: 1 across, 1 up, 3 mm thick');
    expect(text.joints).toBe('No joints: the wall is one piece.');
    expect(text.sheet).toEqual(['Cut from 3 mm sheet: 1 piece of 603 × 1013 mm.']);
  });

  it('turns the sheet where that needs fewer pieces, as a printer’s bed', () => {
    const p = ok({ pieceSource: 'sheet', openingWidthMm: '1900', openingHeightMm: '900' });
    expect(pieceLimit(p)).toEqual({ widthMm: 2000, heightMm: 1000 });
    expect(planWall(p).pieces).toHaveLength(1);
  });

  it('splits a strip longer than the printer can make into the fewest equal segments, butted end to end', () => {
    // 1503 × 1013 mm of pieces and joints: two pieces 749 mm wide, one joint between them. Its strip
    // runs from 8 mm above the bottom edge strip to 8 mm below the top one, 997 mm, in five.
    const p = ok({ pieceSource: 'sheet', openingWidthMm: '1500' });
    const { plan, joints, edges } = planParts(p);
    expect(plan.pieces.map((c) => [c.widthMm, c.heightMm])).toEqual([
      [749, 1013],
      [749, 1013],
    ]);
    expect(joints.strips.map((s) => [s.axis, s.yMm, s.lengthMm])).toEqual([
      ['vertical', 8, 199.4],
      ['vertical', 8 + 199.4, 199.4],
      ['vertical', 8 + 2 * 199.4, 199.4],
      ['vertical', 8 + 3 * 199.4, 199.4],
      ['vertical', 8 + 4 * 199.4, 199.4],
    ]);
    // Every strip and edge strip still fits the printer's 200 mm.
    expect(Math.max(...joints.strips.map((s) => s.lengthMm), ...edges.map((e) => e.lengthMm))).toBeLessThanOrEqual(200);
    expect(describePlan(plan, p).joints).toBe(
      'Joints: 5 strips in 1 length; each joint 5 mm wide. Pins: 10, each 6.6 mm of 1.75 mm filament, two ' +
        'through the middle of each strip.',
    );
  });

  it('keeps every piece to the printer’s size when one must be printed: a fitting, or a pattern of its own', () => {
    for (const over of [{ ports: '150' }, { pieceFills: '2,1=grid' }]) {
      const p = ok({ pieceSource: 'sheet', ...over });
      expect(pieceLimit(p), JSON.stringify(over)).toEqual({ widthMm: 200, heightMm: 200 });
      expect(planWall(p).pieces).toHaveLength(15);
    }
  });

  it('refuses a pattern for the whole wall, which would leave nothing to cut', () => {
    const r = read({ pieceSource: 'sheet', fill: 'grid' });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) {
      expect(r.errors.pieceSource).toBe(
        'A pattern for the whole wall is printed into every piece, so none would be cut: choose a sealed ' +
          'fill, or give single pieces a pattern of their own.',
      );
    }
    expect(read({ pieceSource: 'printed', fill: 'grid' }).ok).toBe(true);
  });
});

describe('the files', () => {
  it('leave out the pieces to cut, and keep the edge strips', () => {
    const files = names(ok({ pieceSource: 'sheet' }));
    expect(files.filter((n) => n.startsWith('piece-'))).toEqual([]);
    expect(files.filter((n) => n.startsWith('edge-'))).toHaveLength(3);
    expect(names(EXAMPLE_PARAMS).filter((n) => n.startsWith('piece-'))).toHaveLength(15); // printed (control)
  });

  it('keep a piece that must be printed, and the plan says which and why', () => {
    const p = ok({ pieceSource: 'sheet', ports: '150' });
    expect(names(p).filter((n) => n.startsWith('piece-'))).toEqual(['piece-c2-r1-197.7x198.6-port-150.stl']);
    expect(describePlan(planWall(p), p).sheet).toEqual([
      'Cut from 3 mm sheet: 14 pieces of 197.7 × 198.6 mm.',
      'Print the piece in column 2, row 1, for its hose port; as a piece is printed, every piece keeps to the ' +
        'printer’s size.',
      'With the pieces in place, drill each pin’s hole through the cut pieces, through the strip’s hole.',
    ]);
    // The download builds only the printed piece.
    const engine = loadEngine();
    return engine.then((e) => {
      const { pieces } = buildExport(e, p);
      expect(pieces.map((x) => [x.cell.column, x.cell.row])).toEqual([[1, 0]]);
    });
  });

  it('cut a slot for a pin only in a printed piece; the cut ones are drilled', () => {
    const p = ok({ pieceSource: 'sheet', ports: '150' });
    const { plan, joints } = planParts(p);
    const pins = planPins(joints, p.joint);
    const port = plan.pieces.find((c) => c.column === 1 && c.row === 0);
    if (port === undefined) throw new Error('no piece');
    const slotted = slotPins(p, plan, pins);
    // The port's piece, bottom middle of the 3 × 5 wall, shares its left, right and top edges.
    expect(slotted).toHaveLength(3);
    for (const pin of slotted) {
      expect(pin.xMm > port.xMm && pin.xMm < port.xMm + port.widthMm).toBe(true);
      expect(pin.yMm > port.yMm && pin.yMm < port.yMm + port.heightMm).toBe(true);
    }
    expect(slotPins(EXAMPLE_PARAMS, planWall(EXAMPLE_PARAMS), pins)).toEqual(pins); // printed: all (control)
  });

  it('say nothing of a sheet while every piece is printed', () => {
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).sheet).toEqual([]);
  });
});

describe('the settings', () => {
  it('read the sheet’s size only when cutting from sheet, and read back what they write', () => {
    expect(read({ sheetWidthMm: 'x' }).ok).toBe(true);
    expect(read({ pieceSource: 'sheet', sheetWidthMm: 'x' })).toMatchObject({
      ok: false,
      errors: { sheetWidthMm: expect.any(String) },
    });
    expect(read({ pieceSource: 'glass' })).toMatchObject({ ok: false, errors: { pieceSource: expect.any(String) } });
    const r = read({ pieceSource: 'sheet', sheetWidthMm: '1220', sheetHeightMm: '2440', thicknessMm: '4' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.sheet).toEqual({ source: 'sheet', widthMm: 1220, heightMm: 2440 });
      expect(readParams(toFormValues(r.params))).toEqual(r);
    }
  });

  it('take a sheet size given alone to mean cutting from sheet, as a printer size means a custom printer', () => {
    const opening = { openingWidthMm: 600, openingHeightMm: 1000 };
    const given = readSettings({ ...opening, sheet: { widthMm: 1220 } });
    expect(given.ok && given.params.sheet).toEqual({ source: 'sheet', widthMm: 1220, heightMm: 2000 });
    const flag = readSettings(opening, { sheetHeightMm: '2440' });
    expect(flag.ok && flag.params.sheet).toEqual({ source: 'sheet', widthMm: 1000, heightMm: 2440 });
    const printed = readSettings(opening);
    expect(printed.ok && printed.params.sheet.source).toBe('printed'); // control
  });
});
