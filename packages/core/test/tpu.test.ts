// The printed TPU seal (backlog item seal-tpu, #22; Q6, Q17, Q122, Q128). Chosen without asking
// (Q144; docs/choices.md): "Printed TPU" beside none and foam tape, a gasket in the tape's groove
// with the tape's outline, so the panels leave it the same room (C31); a base in the groove with
// two thin fins leaning outwards, printed standing on its base (C32); a TPU sleeve in a hose
// port's collar groove, 0.5 mm a side smaller than the hose (C33); under Advanced the joint
// strips and cross pieces in TPU, their slots 0.2 mm narrower than the panel (C34); the tape's
// size settings for the gasket (C35); TPU parts named `-tpu` (C37); TPU joints refused with
// foam tape (C38).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLAR,
  DEFAULT_JOINT,
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  PORT_SEGMENTS,
  SETTINGS,
  TPU_FIN_LEAN_DEG,
  TPU_FIN_MM,
  TPU_GRIP_MM,
  TPU_JOINT_FIT_MM,
  describePlan,
  edgeShapes,
  gasketShapes,
  gasketSolid,
  buildExport,
  loadEngine,
  partName,
  planFiles,
  planParts,
  planWall,
  readParams,
  readSettings,
  sleeveShapes,
  sleeveSolid,
  tapeFit,
  tapedCollar,
  toFormValues,
  tpuJoint,
} from '../src/index.js';
import type { FormValues, Params, SealParams, TapeParams } from '../src/index.js';

const tpu = (over: Partial<TapeParams> = {}): SealParams => ({ kind: 'tpu', tape: { ...DEFAULT_TAPE, ...over } });

describe('the rules', () => {
  it('a seal of printed TPU fits as the tape does (C31)', () => {
    expect(tapeFit(tpu())).toEqual(tapeFit({ kind: 'tape', tape: DEFAULT_TAPE }));
    expect(TPU_FIN_MM).toBe(0.8);
    expect(TPU_FIN_LEAN_DEG).toBe(20);
    expect(TPU_GRIP_MM).toBe(0.5);
    expect(TPU_JOINT_FIT_MM).toBe(-0.1);
    expect(tpuJoint(DEFAULT_JOINT)).toEqual({ ...DEFAULT_JOINT, fitMm: -0.1 });
  });
});

describe('the gasket (C32)', () => {
  it('a base filling the 9.5 × 1 mm groove and two 0.8 mm fins up to 4 mm, leaning out 20°', async () => {
    const engine = await loadEngine();
    const fit = tapeFit(tpu());
    if (!fit) throw new Error('fit expected');
    const g = gasketSolid(engine, 100, fit, 4);
    const lean = 3 * Math.tan((20 * Math.PI) / 180);
    expect(g.volume()).toBeCloseTo(100 * (9.5 * 1 + 2 * 0.8 * 3), 6);
    const b = g.boundingBox();
    const box = [...Array.from(b.min), ...Array.from(b.max)];
    expect(box[0]).toBeCloseTo(0, 6);
    expect(box[1]).toBeCloseTo(-lean, 6);
    expect(box[2]).toBeCloseTo(0, 6); // standing on its base
    expect(box[3]).toBeCloseTo(100, 6);
    expect(box[4]).toBeCloseTo(9.5 + lean, 6);
    expect(box[5]).toBeCloseTo(4, 6);
    g.delete();
  });

  it('one along each edge strip; with the sides, two more on each strip in a track', () => {
    const p: Params = { ...EXAMPLE_PARAMS, seal: tpu() };
    const fit = tapeFit(p.seal);
    if (!fit) throw new Error('fit expected');
    const { edges } = planParts(p);
    const strips = edgeShapes(edges);
    const gaskets = gasketShapes(edges, fit, 4);
    expect(gaskets.reduce((n, g) => n + g.count, 0)).toBe(strips.reduce((n, s) => n + s.count, 0));
    for (const g of gaskets) expect(partName(g)).toMatch(/^gasket-[0-9.]+x9\.5x4-tpu-print-[0-9]+$/);
    const sides: Params = { ...p, seal: tpu({ sides: true }) };
    const sideFit = tapeFit(sides.seal);
    if (!sideFit) throw new Error('fit expected');
    const sideEdges = planParts(sides).edges;
    const inTrack = sideEdges.filter((s) => sides.edges.roles[s.edge] === 'track').length;
    const all = gasketShapes(sideEdges, sideFit, 4).reduce((n, g) => n + g.count, 0);
    expect(all).toBe(sideEdges.length + 2 * inTrack);
  });
});

describe('the sleeve round a hose port (C33)', () => {
  it('in the collar’s groove, 0.5 mm a side smaller than the hose, as tall as the tape is wide', async () => {
    const engine = await loadEngine();
    const fit = tapeFit(tpu({ port: true }));
    if (!fit) throw new Error('fit expected');
    const collar = tapedCollar(DEFAULT_COLLAR, fit);
    const [s] = sleeveShapes([{ hoseMm: 150, column: 2, row: 1 }], collar, fit);
    expect(s).toEqual({ kind: 'sleeve', hoseMm: 150, outerMm: 154, innerMm: 149, heightMm: 9, count: 1 });
    expect(partName(s ?? ({} as never))).toBe('sleeve-150-tpu-print-1');
    const solid = sleeveSolid(engine, s ?? ({} as never));
    const area = (r: number) => (PORT_SEGMENTS / 2) * r * r * Math.sin((2 * Math.PI) / PORT_SEGMENTS);
    expect(solid.volume()).toBeCloseTo((area(77) - area(74.5)) * 9, 3);
    solid.delete();
    expect(sleeveShapes([], collar, fit)).toEqual([]);
  });
});

describe('the form', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('printed TPU, with joints of TPU under Advanced, and back through the form (C34)', () => {
    expect(example.tpuJoints).toBe('no');
    const r = read({ seal: 'tpu', tpuJoints: 'yes' });
    expect(r).toMatchObject({ ok: true, params: { seal: { kind: 'tpu', tape: { joints: true } } } });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
  });

  it('refuses TPU joints with foam tape, which does not fit a joint (C38, Q128)', () => {
    expect(read({ seal: 'tape', tpuJoints: 'yes' })).toMatchObject({
      ok: false,
      errors: { tpuJoints: 'Tape does not fit a joint: choose printed TPU for the joints.' },
    });
  });

  it('refuses a gasket with no room for its fins (C32)', () => {
    expect(read({ seal: 'tpu', tapeThicknessMm: '1' })).toMatchObject({
      ok: false,
      errors: { tapeThicknessMm: 'Make it more than 1 mm: the gasket’s fins stand on its 1 mm base.' },
    });
    expect(read({ seal: 'tpu', tapeThicknessMm: '1.1', tapeSqueezePct: '100' }).ok).toBe(true);
    expect(read({ seal: 'tpu', tapeGrooveMm: '0', tapeThicknessMm: '0.8' })).toMatchObject({
      ok: false,
      errors: { tapeThicknessMm: 'Make it more than 0.8 mm: the gasket’s fins stand on its 0.8 mm base.' },
    });
    expect(read({ seal: 'tpu', tapeWidthMm: '1.1' })).toMatchObject({
      ok: false,
      errors: { tapeWidthMm: 'Make it more than 1.1 mm: the gasket’s base holds two 0.8 mm fins.' },
    });
    expect(read({ seal: 'tpu', tapeWidthMm: '1.2' }).ok).toBe(true);
    // Foam tape has no fins: the same sizes are its own business.
    expect(read({ seal: 'tape', tapeWidthMm: '1.1' }).ok).toBe(true);
  });

  it('TPU joints given without a seal mean the TPU seal (C39); other tape settings, tape', () => {
    const opening = { openingWidthMm: 600, openingHeightMm: 1000 };
    expect(readSettings({ ...opening, seal: { tape: { joints: true } } })).toMatchObject({
      ok: true,
      params: { seal: { kind: 'tpu', tape: { joints: true } } },
    });
    expect(readSettings({ ...opening, seal: { tape: { joints: false } } })).toMatchObject({
      ok: true,
      params: { seal: { kind: 'tape' } },
    });
    expect(readSettings(opening, { tpuJoints: 'yes' })).toMatchObject({ ok: true, params: { seal: { kind: 'tpu' } } });
    expect(readSettings(opening, { tapePort: 'yes' })).toMatchObject({ ok: true, params: { seal: { kind: 'tape' } } });
  });

  it('lists the TPU among the seals, and its joints as a setting', () => {
    expect(SETTINGS.find((s) => s.field === 'seal')?.values).toEqual(['none', 'tape', 'tpu']);
    expect(SETTINGS.find((s) => s.field === 'tpuJoints')).toMatchObject({ path: 'seal.tape.joints', onOff: true });
  });
});

describe('the plan and the files', () => {
  it('the plan names the TPU parts', () => {
    const p: Params = {
      ...EXAMPLE_PARAMS,
      seal: tpu({ port: true, joints: true }),
      ports: [{ hoseMm: 150, column: 2, row: 1 }],
    };
    expect(describePlan(planWall(p), p).seal).toBe(
      'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all, a sleeve inside the hose port’s collar, and the joint strips and cross pieces in TPU.',
    );
  });

  it('a sleeve in each collar with two ports; no sleeve without the port, no TPU joints unless chosen', () => {
    const ports = [
      { hoseMm: 150, column: 1, row: 1 },
      { hoseMm: 150, column: 2, row: 1 },
    ];
    const two: Params = { ...EXAMPLE_PARAMS, seal: tpu({ port: true }), ports };
    expect(describePlan(planWall(two), two).seal).toBe(
      'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all, and a sleeve inside each hose port’s collar.',
    );
    const bare: Params = { ...two, seal: tpu() };
    expect(describePlan(planWall(bare), bare).seal).toBe(
      'Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all.',
    );
    const names = planFiles(two, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names).toContain('sleeve-150-tpu-print-2.stl');
    const noSleeve = planFiles(bare, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(noSleeve.filter((n) => n.startsWith('sleeve-'))).toEqual([]);
  });

  it('the download holds the gaskets, the sleeve and the TPU joints, named -tpu (C37)', () => {
    const p: Params = {
      ...EXAMPLE_PARAMS,
      seal: tpu({ port: true, joints: true }),
      ports: [{ hoseMm: 150, column: 2, row: 1 }],
    };
    const names = planFiles(p, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.startsWith('gasket-')).length).toBeGreaterThan(0);
    expect(names).toContain('sleeve-150-tpu-print-1.stl');
    for (const n of names.filter((x) => /^(strip|cross)-/.test(x))) expect(n).toMatch(/-tpu-print-[0-9]+\.stl$/);
    const bare = planFiles({ ...EXAMPLE_PARAMS, seal: tpu() }, { format: 'stl', packaging: 'separate' }).map(
      (f) => f.name,
    );
    for (const n of bare.filter((x) => /^(strip|cross)-/.test(x))) expect(n).not.toMatch(/-tpu-/);
    expect(bare.some((n) => n.startsWith('sleeve-'))).toBe(false);
  });

  it('builds them: the TPU strips 0.4 mm thinner across the panel, the gaskets and the sleeve as drawn', async () => {
    const engine = await loadEngine();
    const p: Params = {
      ...EXAMPLE_PARAMS,
      seal: tpu({ port: true, joints: true }),
      ports: [{ hoseMm: 150, column: 2, row: 1 }],
    };
    const across = (name: string, parts: { name: string; mesh: { positions: Float32Array } }[]) => {
      const part = parts.find((x) => x.name.startsWith(name));
      if (!part) throw new Error(`${name} expected`);
      const ys = Array.from(part.mesh.positions).filter((_, i) => i % 3 === 1);
      return Math.max(...ys) - Math.min(...ys);
    };
    const tpuParts = buildExport(engine, p).parts;
    const plaParts = buildExport(engine, { ...p, seal: tpu({ port: true }) }).parts;
    // Standing on its flanges, a strip's thickness through the wall lies along Y (Q53).
    expect(across('strip-', plaParts)).toBeCloseTo(3 + 2 * 0.2 + 2 * 1.6, 5);
    expect(across('strip-', tpuParts)).toBeCloseTo(3 - 2 * 0.1 + 2 * 1.6, 5);
    expect(across('cross-', tpuParts)).toBeCloseTo(3 - 2 * 0.1 + 2 * 1.6, 5);
    expect(across('gasket-', tpuParts)).toBeCloseTo(9.5 + 2 * 3 * Math.tan((20 * Math.PI) / 180), 5);
    expect(across('sleeve-', tpuParts)).toBeCloseTo(154, 3); // a corner on each axis: 128 sides
  });
});
