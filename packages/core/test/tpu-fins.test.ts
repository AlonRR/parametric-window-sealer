// Seals that bend rather than squash (tpu-fin-seals, #115), from the design review against published
// work. The printed TPU gasket's fins fold into a groove deep enough to take them, so the strip's
// face bears on the frame before the fins are crushed: a hard stop. The plan names TPU 85A, which
// recovers better than 95A, and closed-cell foam for the tape.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  TPU_FIN_MM,
  describePlan,
  foldedFinsMm,
  gasketSolid,
  loadEngine,
  planWall,
  readParams,
  tapeFit,
  toFormValues,
} from '../src/index.js';
import type { FormValues, SealParams } from '../src/index.js';

const engine = await loadEngine();
const tpu: SealParams = { kind: 'tpu', tape: DEFAULT_TAPE };
const tape: SealParams = { kind: 'tape', tape: DEFAULT_TAPE };
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues) => readParams({ ...example, ...over });

const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the groove for a TPU gasket', () => {
  it('is deep enough for its base and a fin folded flat on it: 1.6 mm, the tape’s staying 1 mm', () => {
    expect(TPU_FIN_MM).toBe(0.8);
    const fit = tapeFit(tpu);
    expect(fit?.grooveDepthMm).toBe(1.6);
    // Squeezed to half its 4 mm, the gasket stands 0.4 mm out of the groove, where the panels leave room.
    expect(fit?.standOutMm).toBeCloseTo(0.4, 9);
    expect(tapeFit(tape)).toMatchObject({ grooveDepthMm: 1, standOutMm: 1 }); // tape as before (control)
  });

  it('takes two fins folded on each other where they would overlap, from a gasket over 4.75 mm tall', () => {
    expect(foldedFinsMm({ ...DEFAULT_TAPE, thicknessMm: 4 })).toBe(1.6);
    expect(foldedFinsMm({ ...DEFAULT_TAPE, thicknessMm: 6 })).toBe(2.4);
    expect(tapeFit({ kind: 'tpu', tape: { ...DEFAULT_TAPE, thicknessMm: 6 } })?.grooveDepthMm).toBe(2.4);
  });

  it('keeps a deeper groove the user asks for', () => {
    expect(tapeFit({ kind: 'tpu', tape: { ...DEFAULT_TAPE, grooveMm: 2 } })?.grooveDepthMm).toBe(2);
  });
});

describe('the gasket', () => {
  it('stands on a 0.8 mm base across the groove, its two fins leaning in 20°, so they fold inside it', () => {
    const fit = tapeFit(tpu);
    if (fit === undefined) throw new Error('no fit');
    const solid = gasketSolid(engine, 50, fit, 4);
    try {
      const { min, max } = solid.boundingBox();
      // Along x, across the 9.5 mm groove along y, up along z: nothing past the groove's sides.
      expect([min[1], max[1], min[2], max[2]].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 9.5, 0, 4]);
      expect(probe(solid, 25, 4.75, 0.4)).toBeGreaterThan(0); // the base, across
      expect(probe(solid, 25, 4.75, 1.2)).toBe(0); // above it, between the fins
      // Each fin leans in by (4 − 0.8) × tan 20° = 1.16 mm at the top.
      const lean = 3.2 * Math.tan((20 * Math.PI) / 180);
      expect(probe(solid, 25, 0.4, 1)).toBeGreaterThan(0); // its foot, at the groove's side
      expect(probe(solid, 25, 0.2, 3.9)).toBe(0); // leaning away from the side at the top
      expect(probe(solid, 25, lean + 0.4, 3.9)).toBeGreaterThan(0);
      expect(probe(solid, 25, 9.5 - lean - 0.4, 3.9)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });
});

describe('the plan', () => {
  const sealLine = (over: FormValues) => {
    const r = read(over);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return describePlan(planWall(r.params), r.params).seal;
  };

  it('names TPU 85A for the printed seal, and closed-cell foam for the tape', () => {
    expect(sealLine({ seal: 'tpu' })).toBe(
      'Seal: printed TPU, 85A for the best recovery, 9.5 × 4 mm gaskets along the edge strips’ outer faces: ' +
        '3.2 m in all.',
    );
    expect(sealLine({ seal: 'tape' })).toBe(
      'Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces: 3.2 m in all.',
    );
  });

  it('refuses a TPU gasket squeezed into its groove, where the hard stop would leave it no room', () => {
    const r = read({ seal: 'tpu', tapeSqueezePct: '35' });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) {
      expect(r.errors.tapeSqueezePct).toBe(
        'Squeezed to 1.4 mm, the tape would sit inside its 1.6 mm groove; squeeze it less or make the groove ' +
          'shallower.',
      );
    }
  });
});
