// Notches along an edge for a window's hardware (edge-notches, #161; docs/frame.md): where a
// casement's crank, a friction stay's arms or a keep cross the frame, a measured notch is left in
// the wall's edge. The edge strip and its gasket stop either side of it, and the piece behind is cut
// where the notch reaches past the strip.
import { describe, expect, it } from 'vitest';
import {
  buildExport,
  describePlan,
  PIECE_CHAMFER_MM,
  edgeProfile,
  formatNotches,
  loadEngine,
  parseNotches,
  planFiles,
  planParts,
  planWall,
  readParams,
  readSettings,
  tapeFit,
  toFormValues,
} from '../src/index.js';
import type { FormValues, MeshData, Params } from '../src/index.js';

const engine = await loadEngine();
const FRAME = {
  openingWidthMm: 800,
  openingHeightMm: 1200,
  edges: { window: 'frame' },
  seal: { kind: 'tpu' },
  ports: [],
};
const NOTCH = { widthMm: 40, depthMm: 25, edge: 'bottom' as const, atMm: 300 };
const ok = (input: unknown): Params => {
  const r = readSettings(input, {});
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok({ ...FRAME, notches: [NOTCH] });
const PLAIN = ok(FRAME);
const errors = (overrides: FormValues, base: Params = PARAMS) => {
  const r = readParams({ ...toFormValues(base), ...overrides });
  return r.ok ? {} : r.errors;
};

// A closed mesh's volume, in mm³, from its triangles.
function volumeOf(m: MeshData): number {
  const at = (t: number, k: number) => m.positions[3 * (m.triangles[t] ?? 0) + k] ?? 0;
  let six = 0;
  for (let t = 0; t < m.triangles.length; t += 3) {
    const [ax, ay, az] = [at(t, 0), at(t, 1), at(t, 2)];
    const [bx, by, bz] = [at(t + 1, 0), at(t + 1, 1), at(t + 1, 2)];
    const [cx, cy, cz] = [at(t + 2, 0), at(t + 2, 1), at(t + 2, 2)];
    six += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return six / 6;
}

// Where the frame's face and the piece's edge lie: the piece stops this far short of the face.
const short = (p: Params) => -edgeProfile('bottom', p.edges, p.joint, tapeFit(p.seal)).reachMm;
// A notch's span along its edge, in the pieces' frame, its clearance included: measured from the
// left corner along the top and the bottom, from the bottom corner up the sides.
const span = (
  p: Params,
  at: number,
  width: number,
  edge: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
): [number, number] => {
  const start = edgeProfile(edge === 'top' || edge === 'bottom' ? 'left' : 'bottom', p.edges, p.joint, tapeFit(p.seal));
  return [at + start.reachMm - width / 2 - 1, at + start.reachMm + width / 2 + 1];
};
// The strips along an edge, each as its span along it.
const along = (p: Params, edge: string): [number, number][] =>
  planParts(p)
    .edges.filter((e) => e.edge === edge)
    .map((e): [number, number] =>
      edge === 'top' || edge === 'bottom' ? [e.xMm, e.xMm + e.lengthMm] : [e.yMm, e.yMm + e.lengthMm],
    );
const clear = (strips: [number, number][], [from, to]: [number, number]) =>
  strips.every(([a, b]) => b <= from + 1e-9 || a >= to - 1e-9);
const total = (strips: [number, number][]) => strips.reduce((n, [a, b]) => n + b - a, 0);

describe('the setting', () => {
  it('is written as width x depth @ edge, from mm, and read back as it is written', () => {
    expect(parseNotches('40x25@bottom,300 12.5x8@left,600')).toEqual({
      ok: true,
      notches: [NOTCH, { widthMm: 12.5, depthMm: 8, edge: 'left', atMm: 600 }],
    });
    expect(formatNotches([NOTCH])).toBe('40x25@bottom,300');
    expect(parseNotches('')).toEqual({ ok: true, notches: [] });
    for (const bad of ['40x25', '40x25@middle,300', '40x0@bottom,300', '40x25@bottom', 'x25@top,3']) {
      expect(parseNotches(bad), bad).toEqual({
        ok: false,
        message:
          'Notch 1: write each as its width x depth in mm, then @ its edge (top, bottom, left or right) and how ' +
          'far its middle is from the left or the bottom corner, as 40x25@bottom,300.',
      });
    }
  });

  it('places each in the edge piece it falls in, by column and row from 1', () => {
    const plan = planWall(PARAMS);
    const [from, to] = span(PARAMS, 300, 40);
    const piece = plan.pieces.find((c) => c.row === 0 && c.xMm <= from && c.xMm + c.widthMm >= to);
    expect(piece).toBeDefined();
    expect(PARAMS.notches).toEqual([{ ...NOTCH, column: (piece?.column ?? 0) + 1, row: 1 }]);
    expect(toFormValues(PARAMS).notches).toBe('40x25@bottom,300');
  });
});

describe('what a notch may not be', () => {
  it('on an edge not pressed into a frame', () => {
    const slider = ok({ ...FRAME, edges: { window: 'slider' }, seal: { kind: 'tape' } });
    expect(errors({ notches: '40x25@bottom,300' }, slider)).toEqual({
      notches: 'Notch 1 is in the bottom edge, which is in a track: a notch is for hardware crossing a frame edge.',
    });
  });

  it('across a joint between pieces, or too near a piece’s end for the edge strip to hold it', () => {
    const plan = planWall(PARAMS);
    const first = plan.pieces.find((c) => c.row === 0 && c.column === 0);
    const joint =
      (first?.widthMm ?? 0) + 2.5 - edgeProfile('left', PARAMS.edges, PARAMS.joint, tapeFit(PARAMS.seal)).reachMm;
    const message =
      'Notch 1 crosses a joint between pieces or the wall’s corner, or comes within 10 mm of one, where the edge ' +
      'strip must hold its piece: dividing the width as full pieces plus a filler moves the joints.';
    expect(errors({ notches: `40x25@bottom,${joint}` })).toEqual({ notches: message });
    expect(errors({ notches: '40x25@bottom,10' })).toEqual({ notches: message });
    expect(errors({ notches: '40x25@left,10' }).notches).toMatch(/dividing the height as full pieces/);
  });

  it('deeper than its piece leaves the joints room', () => {
    expect(errors({ notches: '40x190@bottom,300' }).notches).toMatch(
      /^Notch 1 cuts \d+(\.\d+)? mm into a \d+(\.\d+)? mm piece; it must leave at least 34 mm of it\.$/,
    );
  });

  it('in a piece with a fitting', () => {
    const plan = planWall(PARAMS);
    const column = PARAMS.notches[0]?.column ?? 0;
    expect(plan.pieces.some((c) => c.column === column - 1 && c.row === 0)).toBe(true);
    expect(errors({ ports: `150@${column},1` })).toEqual({
      ports: `Port 1 is in column ${column}, row 1, with notch 1: give it another piece.`,
    });
  });
});

describe('the edge strip, its gasket and the piece', () => {
  const [from, to] = span(PARAMS, 300, 40);

  it('the edge strip stops either side of the notch, its gaskets with it', () => {
    expect(clear(along(PARAMS, 'bottom'), [from, to])).toBe(true);
    expect(clear(along(PLAIN, 'bottom'), [from, to])).toBe(false);
    expect(total(along(PLAIN, 'bottom')) - total(along(PARAMS, 'bottom'))).toBeCloseTo(to - from, 9);
    const gaskets = (p: Params) =>
      planFiles(p, { format: 'stl', packaging: 'separate' }).filter((f) => f.name.startsWith('gasket-'));
    expect(gaskets(PARAMS)).not.toEqual(gaskets(PLAIN));
  });

  it('the piece is cut where the notch reaches past the strip, and its file says so', () => {
    const cut = 25 + 1 - short(PARAMS);
    const column = PARAMS.notches[0]?.column ?? 0;
    const name = `piece-c${column}-r1-`;
    const notched = buildExport(engine, PARAMS).pieces.find((p) => p.cell.column === column - 1 && p.cell.row === 0);
    const plain = buildExport(engine, PLAIN).pieces.find((p) => p.cell.column === column - 1 && p.cell.row === 0);
    if (notched === undefined || plain === undefined) throw new Error('no piece');
    // The box the notch takes, less the bed-side chamfer the plain piece already lacks along it.
    const chamfer = PIECE_CHAMFER_MM ** 2 / 2;
    expect(volumeOf(plain.mesh) - volumeOf(notched.mesh)).toBeCloseTo(
      (to - from) * (cut * PARAMS.thicknessMm - chamfer),
      3,
    );
    const files = planFiles(PARAMS, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(files.filter((f) => f.startsWith(name))).toEqual([expect.stringMatching(/-notch-40x25\.stl$/)]);
  });

  it('a notch no deeper than the strip leaves the piece whole', () => {
    const shallow = ok({ ...FRAME, notches: [{ ...NOTCH, depthMm: 4 }] });
    expect(4 + 1).toBeLessThan(short(shallow));
    const column = shallow.notches[0]?.column ?? 0;
    const piece = (p: Params) =>
      buildExport(engine, p).pieces.find((x) => x.cell.column === column - 1 && x.cell.row === 0);
    expect(
      volumeOf(piece(shallow)?.mesh ?? { positions: new Float32Array(), triangles: new Uint32Array() }),
    ).toBeCloseTo(volumeOf(piece(PLAIN)?.mesh ?? { positions: new Float32Array(), triangles: new Uint32Array() }), 3);
    expect(clear(along(shallow, 'bottom'), span(shallow, 300, 40))).toBe(true);
  });

  it('every edge takes notches, each strip clear of its own', () => {
    // Each at the middle of the second piece along its edge, from the left or the bottom corner.
    const plan = planWall(PLAIN);
    const reach = (e: 'left' | 'bottom') => edgeProfile(e, PLAIN.edges, PLAIN.joint, tapeFit(PLAIN.seal)).reachMm;
    const second = plan.pieces.find((c) => c.column === 1 && c.row === 0);
    const up = plan.pieces.find((c) => c.column === 0 && c.row === 1);
    if (second === undefined || up === undefined) throw new Error('no second piece');
    const x = second.xMm + second.widthMm / 2 - reach('left');
    const y = up.yMm + up.heightMm / 2 - reach('bottom');
    const all = ok({
      ...FRAME,
      notches: [
        { widthMm: 30, depthMm: 20, edge: 'top', atMm: x },
        { widthMm: 30, depthMm: 20, edge: 'left', atMm: y },
        { widthMm: 30, depthMm: 20, edge: 'right', atMm: y },
      ],
    });
    expect(all.notches.map((n) => n.edge)).toEqual(['top', 'left', 'right']);
    for (const n of all.notches) {
      const where = span(all, n.atMm, n.widthMm, n.edge);
      expect(clear(along(all, n.edge), where), n.edge).toBe(true);
      expect(clear(along(PLAIN, n.edge), where), n.edge).toBe(false);
      expect(total(along(PLAIN, n.edge)) - total(along(all, n.edge)), n.edge).toBeCloseTo(32, 9);
    }
    expect(total(along(all, 'bottom'))).toBeCloseTo(total(along(PLAIN, 'bottom')), 9);
  });
});

describe('a notched piece among the rest', () => {
  const column = PARAMS.notches[0]?.column ?? 0;
  const named = (p: Params) =>
    planFiles(p, { format: 'stl', packaging: 'separate' })
      .map((f) => f.name)
      .filter((n) => n.startsWith('piece-'));

  it('is printed when the others are cut from sheet', () => {
    const sheet = ok({ ...FRAME, notches: [NOTCH], sheet: { source: 'sheet' } });
    expect(named(sheet)).toEqual([expect.stringMatching(new RegExp(`^piece-c${column}-r1-.*-notch-40x25\\.stl$`))]);
    expect(named(ok({ ...FRAME, sheet: { source: 'sheet' } }))).toEqual([]);
  });

  it('is sealed: the wall’s pattern leaves it whole, round its notch', () => {
    const piece = (p: Params) =>
      buildExport(engine, p).pieces.find((x) => x.cell.column === column - 1 && x.cell.row === 0)?.mesh;
    const grid = ok({ ...FRAME, notches: [NOTCH], fill: { kind: 'grid' } });
    const sealed = piece(PARAMS);
    const patterned = piece(grid);
    if (sealed === undefined || patterned === undefined) throw new Error('no piece');
    expect(volumeOf(patterned)).toBeCloseTo(volumeOf(sealed), 3);
    const other = (p: Params) =>
      buildExport(engine, p).pieces.find((x) => x.cell.column !== column - 1 && x.cell.row === 0)?.mesh;
    expect(volumeOf(other(grid) ?? sealed)).toBeLessThan(volumeOf(other(PARAMS) ?? sealed) - 1);
  });
});

describe('the plan', () => {
  it('says where each notch is, what it cuts, and to seal round the hardware', () => {
    const column = PARAMS.notches[0]?.column ?? 0;
    const cut = 25 + 1 - short(PARAMS);
    expect(describePlan(planWall(PARAMS), PARAMS).notches).toEqual([
      `Notch 1: 40 × 25 mm in the bottom edge, its middle 300 mm from the left corner, in column ${column}, ` +
        `row 1: the edge strip and its gasket stop either side of it, and the piece is cut ${Math.round(cut * 10) / 10} ` +
        'mm into and left sealed. Fit the hardware through it, then fill the gap round it with removable sealing ' +
        'putty or a strip of closed-cell foam.',
    ]);
    expect(describePlan(planWall(PLAIN), PLAIN).notches).toEqual([]);
  });
});
