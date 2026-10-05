// The round hose port (backlog item hose-port, #12; the owner's decisions Q102 to Q111): a
// push-fit collar on the room side of one piece, its stop lip the panel itself.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLAR,
  buildPieces,
  makeWall,
  plainPanel,
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  PORT_SEGMENTS,
  checkPort,
  collarInnerMm,
  collarOuterMm,
  defaultPortPiece,
  loadEngine,
  planWall,
  portHoleMm,
  portPanel,
  portPieceMm,
} from '../src/index.js';

const engine = await loadEngine();

// The area of the regular polygon the engine draws for a circle of radius r: the volumes
// below are worked out from it by hand, not read back from the engine.
const polygon = (r: number, n = PORT_SEGMENTS) => (n / 2) * r * r * Math.sin((2 * Math.PI) / n);

describe('the collar’s sizes (Q107), for a 150 mm hose', () => {
  it('starts at 20 mm deep, a 2.4 mm wall, 0.5 mm clearance per side and a 5 mm lip', () => {
    expect(DEFAULT_COLLAR).toEqual({ depthMm: 20, wallMm: 2.4, clearanceMm: 0.5, lipMm: 5 });
  });

  it('151 mm inside, 155.8 outside, a 141 mm hole through the panel', () => {
    expect(collarInnerMm(150, DEFAULT_COLLAR)).toBeCloseTo(151, 9);
    expect(collarOuterMm(150, DEFAULT_COLLAR)).toBeCloseTo(155.8, 9);
    expect(portHoleMm(150, DEFAULT_COLLAR)).toBeCloseTo(141, 9);
  });

  it('needs a piece 175.8 mm each way: clear of the 8 mm slot and 2 mm more on each side (Q108)', () => {
    expect(portPieceMm(150, DEFAULT_COLLAR, DEFAULT_JOINT)).toBeCloseTo(155.8 + 2 * (8 + 2), 9);
    expect(portPieceMm(150, DEFAULT_COLLAR, { ...DEFAULT_JOINT, slotMm: 10 })).toBeCloseTo(155.8 + 2 * (10 + 2), 9);
  });
});

describe('portPanel: the piece with the port', () => {
  const size = { widthMm: 200, heightMm: 190, thicknessMm: 3 };
  const solid = portPanel(engine, size, 150, DEFAULT_COLLAR);

  it('has the volume worked out by hand: the panel, less the hole, plus the collar', () => {
    const panel = 200 * 190 * 3;
    const hole = polygon(141 / 2) * 3;
    const collar = (polygon(155.8 / 2) - polygon(151 / 2)) * 20;
    expect(solid.volume()).toBeCloseTo(panel - hole + collar, 1);
  });

  it('is one solid with one hole through it', () => {
    expect(solid.genus()).toBe(1);
    expect(solid.numVert()).toBeGreaterThan(0);
  });

  it('lies as it prints: the panel flat from 0 to 3 mm, the collar standing up on the room side (Q106)', () => {
    const box = solid.boundingBox();
    expect(box.min).toEqual([0, 0, 0]);
    expect(box.max[0]).toBeCloseTo(200, 6);
    expect(box.max[1]).toBeCloseTo(190, 6);
    expect(box.max[2]).toBeCloseTo(3 + 20, 6);
  });

  it('centres the collar in the piece', () => {
    const top = solid.trimByPlane([0, 0, 1], 3.5); // only the collar is above the panel
    const box = top.boundingBox();
    expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(100, 6);
    expect((box.min[1] + box.max[1]) / 2).toBeCloseTo(95, 6);
    expect(box.max[0] - box.min[0]).toBeCloseTo(155.8, 1);
    top.delete();
  });

  it('refuses a lip that closes the hole: 9 mm + 2 × 0.5 − 2 × 5 = 0', () => {
    expect(() => portPanel(engine, size, 9, DEFAULT_COLLAR)).toThrow(RangeError);
    const small = portPanel(engine, size, 9.5, DEFAULT_COLLAR); // a 0.5 mm hole: still a hole
    expect(small.genus()).toBe(1);
    small.delete();
  });
});

describe('where the port starts (Q105, Q110)', () => {
  const columns = (n: number) => planWall({ ...EXAMPLE_PARAMS, openingWidthMm: n * 190, openingHeightMm: 500 });

  it('the bottom row’s middle piece, or the one left of centre', () => {
    expect(planWall(EXAMPLE_PARAMS).columns).toHaveLength(3);
    expect(defaultPortPiece(planWall(EXAMPLE_PARAMS))).toEqual({ column: 1, row: 0 });
    expect(columns(4).columns).toHaveLength(4);
    expect(defaultPortPiece(columns(4))).toEqual({ column: 1, row: 0 });
    expect(columns(1).columns).toHaveLength(1);
    expect(defaultPortPiece(columns(1))).toEqual({ column: 0, row: 0 });
  });
});

describe('checkPort (Q108)', () => {
  const plan = planWall(EXAMPLE_PARAMS); // pieces 197.7 × 198.6 mm

  it('a port that fits its piece', () => {
    expect(checkPort(plan, { hoseMm: 150, column: 1, row: 0 }, DEFAULT_COLLAR, DEFAULT_JOINT)).toEqual({ ok: true });
  });

  it('a piece too small: what the port needs, what the piece is, and what gets there', () => {
    const narrow = planWall({ ...EXAMPLE_PARAMS, openingWidthMm: 405 }); // three pieces of 132.7 mm
    const result = checkPort(narrow, { hoseMm: 150, column: 1, row: 0 }, DEFAULT_COLLAR, DEFAULT_JOINT);
    expect(result).toEqual({
      ok: false,
      message:
        'A 150 mm hose port needs a piece at least 175.8 × 175.8 mm; column 2, row 1 is 132.7 × 198.6 mm. ' +
        'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.',
    });
  });

  it('a piece that is not there', () => {
    const result = checkPort(plan, { hoseMm: 150, column: 3, row: 0 }, DEFAULT_COLLAR, DEFAULT_JOINT);
    expect(result).toEqual({ ok: false, message: 'There is no column 4, row 1: the wall has 3 columns and 5 rows.' });
  });
});

describe('the wall with ports', () => {
  const params = {
    ...EXAMPLE_PARAMS,
    ports: [
      { hoseMm: 150, column: 2, row: 1 },
      { hoseMm: 130, column: 1, row: 4 },
    ],
  };
  const plan = planWall(params);

  it('builds each port’s piece with its port, and every other piece plain', () => {
    const built = buildPieces(engine, plan, 3, params.ports, DEFAULT_COLLAR);
    try {
      for (const b of built) {
        const cell = plan.pieces.find((p) => p.column === b.column && p.row === b.row);
        if (cell === undefined) throw new Error('a piece not in the plan');
        const port = params.ports.find((p) => p.column === b.column + 1 && p.row === b.row + 1);
        const size = { widthMm: cell.widthMm, heightMm: cell.heightMm, thicknessMm: 3 };
        const expected = port ? portPanel(engine, size, port.hoseMm, DEFAULT_COLLAR) : plainPanel(engine, size);
        expect(b.hoseMm, `c${b.column + 1} r${b.row + 1}`).toBe(port?.hoseMm);
        expect(b.solid.volume()).toBeCloseTo(expected.volume(), 3);
        expect(b.solid.genus()).toBe(port ? 1 : 0);
        expect(b.solid.boundingBox().max[2]).toBeCloseTo(port ? 23 : 3, 6);
        expected.delete();
      }
    } finally {
      for (const b of built) b.solid.delete();
    }
  });

  it('names each port’s file with its hose size', async () => {
    const wall = await makeWall(params, { format: 'stl', packaging: 'separate' });
    const names = wall.files.map((f) => f.name);
    expect(names).toContain('piece-c2-r1-197.7x198.6-port-150.stl');
    expect(names).toContain('piece-c1-r4-197.7x198.6-port-130.stl');
    expect(names).toContain('piece-c3-r1-197.7x198.6.stl');
    expect(names.filter((n) => n.includes('-port-'))).toHaveLength(2);
  });

  it('says what it makes', async () => {
    const wall = await makeWall(params, { format: '3mf', packaging: 'single' });
    expect(wall.summary.ports).toEqual([
      'Hose port: a 150 mm hose end, in column 2, row 1.',
      'Hose port: a 130 mm hose end, in column 1, row 4.',
    ]);
  });
});
