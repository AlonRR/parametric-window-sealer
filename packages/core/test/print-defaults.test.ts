// Printing defaults against warping (print-defaults, #122), from the design review against published
// work: square corners lift first as a flat print cools, and the first layers spread at the bed's
// edge. Every printed piece gets rounded corners and a chamfer along its bed-side edge, hidden in the
// strips' slots, and the plan gives brim advice for the material.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  EXAMPLE_PARAMS,
  PIECE_CHAMFER_MM,
  PIECE_CORNER_MM,
  buildPiecesWith,
  describePlan,
  loadEngine,
  placedFittings,
  fittingSource,
  plainPanel,
  planWall,
  printReady,
  readParams,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const engine = await loadEngine();
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('a piece, ready to print', () => {
  const size = { widthMm: 150, heightMm: 120, thicknessMm: 3 };

  it('has its corners rounded 3 mm and its bed-side edge chamfered 1 mm, and nothing else changed', () => {
    expect([PIECE_CORNER_MM, PIECE_CHAMFER_MM]).toEqual([3, 1]);
    const plain = plainPanel(engine, size);
    const ready = printReady(engine, plainPanel(engine, size), size);
    try {
      expect(probe(ready, 0.5, 0.5, 2)).toBe(0); // the corner, outside the 3 mm round
      expect(probe(ready, 1.5, 1.5, 2)).toBeGreaterThan(0); // inside it
      expect(probe(ready, 149.5, 119.5, 2)).toBe(0); // and the far corner
      expect(probe(ready, 75, 0.2, 0.2)).toBe(0); // the chamfer, along the bed-side edge
      expect(probe(ready, 0.2, 60, 0.2)).toBe(0);
      expect(probe(ready, 75, 0.2, 1.5)).toBeGreaterThan(0); // above it, the edge square
      expect(probe(ready, 75, 1.5, 0.2)).toBeGreaterThan(0); // and in from it
      expect(probe(ready, 75, 0.2, 2.9)).toBeGreaterThan(0); // the room side's edge not chamfered
      const { min, max } = ready.boundingBox();
      expect([...min, ...max]).toEqual([0, 0, 0, 150, 120, 3]);
      // Four corners lose a square less a quarter circle, through the thickness, and the edge a
      // 1 mm triangle along it: a little less than that where the two meet.
      const lost = plain.volume() - ready.volume();
      const corners = 4 * (9 - (Math.PI * 9) / 4) * 3;
      expect(lost).toBeGreaterThan(corners);
      expect(lost).toBeLessThan(corners + 0.5 * 2 * (150 + 120));
    } finally {
      plain.delete();
      ready.delete();
    }
  });
});

describe('the wall’s pieces', () => {
  it('are all made ready to print, a hose port’s collar kept whole', () => {
    const p = read({ ports: '150@2,1' });
    const built = buildPiecesWith(engine, planWall(p), p.thicknessMm, placedFittings(fittingSource(p)));
    try {
      for (const b of built) {
        expect(probe(b.solid, 0.5, 0.5, 2)).toBe(0);
        expect(b.solid.boundingBox().min[2]).toBe(0);
      }
      const port = built.find((b) => b.column === 1 && b.row === 0);
      expect(port?.solid.boundingBox().max[2]).toBeGreaterThan(20); // its collar stands on the room side
    } finally {
      for (const b of built) b.solid.delete();
    }
  });
});

describe('a piece cut from sheet', () => {
  it('is cut square, so nothing is rounded or chamfered', () => {
    const p = read({});
    const built = buildPiecesWith(engine, planWall(p), 3, [], undefined, undefined, undefined, () => false);
    try {
      for (const b of built) expect(probe(b.solid, 0.5, 0.5, 0.5)).toBeGreaterThan(0);
    } finally {
      for (const b of built) b.solid.delete();
    }
  });
});

describe('the plan', () => {
  const line = (p: Params) => describePlan(planWall(p), p).printing;

  it('says what is done against warping, and when to use a brim in the material chosen', () => {
    expect(line(EXAMPLE_PARAMS)).toBe(
      'Printing: the pieces’ corners are rounded 3 mm and their bed-side edges chamfered 1 mm against warping. ' +
        'In PETG, add a 5 mm brim if the corners lift.',
    );
    expect(line(read({ material: 'asa' }))).toContain(
      'In ASA, add a 5 mm brim, and print in an enclosure or out of draughts: it warps as it cools.',
    );
    expect(line(read({ material: 'pla' }))).toContain('In PLA, a brim is seldom needed.');
  });
});
