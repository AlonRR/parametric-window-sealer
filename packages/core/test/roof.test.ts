// A wall in a roof window (sloped-frame, #160; docs/roof.md): a top-hung roof window opened out
// leaves its frame clear from inside, as a frame with no track does, but on a slope most of the
// wall's weight pulls it out of the frame into the room, held only by its gaskets' grip. The window
// type asks for the roof's pitch; the plan says what share of the weight pulls, and what to test the
// hold against.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  describePlan,
  planFiles,
  planWall,
  pullShare,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

const ROOF = {
  openingWidthMm: 800,
  openingHeightMm: 1200,
  edges: { window: 'roof' },
  roof: { pitchDeg: 30 },
  seal: { kind: 'tpu' },
  ports: [],
};
const ok = (input: unknown): Params => {
  const r = readSettings(input, {});
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok(ROOF);
const FORM = toFormValues(PARAMS);
const errors = (overrides: FormValues) => {
  const r = readParams({ ...FORM, ...overrides });
  return r.ok ? {} : r.errors;
};
const roofLines = (p: Params) => describePlan(planWall(p), p).roof;

describe('the roof window as a window type', () => {
  it('a frame with no track all round, and the roof’s pitch a setting of its own', () => {
    expect(WINDOW_PRESETS.roof).toEqual({ top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' });
    expect(SETTINGS.find((s) => s.field === 'window')?.values).toContain('roof');
    expect(SETTINGS.find((s) => s.field === 'roofPitchDeg')?.path).toBe('roof.pitchDeg');
    expect(PARAMS.edges.roles).toEqual(WINDOW_PRESETS.roof);
    expect(PARAMS.roof).toEqual({ pitchDeg: 30 });
    expect(EXAMPLE_PARAMS.roof).toEqual({ pitchDeg: 35 });
  });

  it('the pitch read back as the form writes it, only for a roof window, and from 15 to 90°', () => {
    const back = readParams(FORM);
    expect(back.ok && back.params.roof).toEqual({ pitchDeg: 30 });
    expect(readParams({ ...toFormValues(EXAMPLE_PARAMS), roofPitchDeg: 'steep' }).ok).toBe(true);
    const range = 'A roof window lies at 15 to 90° from level: give its pitch in degrees.';
    for (const pitch of ['14', '91', 'steep', '']) {
      expect(errors({ roofPitchDeg: pitch }), pitch).toEqual({ roofPitchDeg: range });
    }
    for (const pitch of ['15', '90']) expect(errors({ roofPitchDeg: pitch }), pitch).toEqual({});
  });

  it('held by its gaskets’ squeeze: a printed TPU seal', () => {
    expect(errors({ seal: 'tape' })).toHaveProperty('seal');
  });

  it('the same parts as a frame with no track: only the plan says more', () => {
    const frame = { ...PARAMS, edges: { ...PARAMS.edges, window: 'frame' as const } };
    const choice = { format: 'stl', packaging: 'separate' } as const;
    expect(planFiles(PARAMS, choice)).toEqual(planFiles(frame, choice));
    expect(roofLines(frame)).toEqual([]);
    expect(roofLines(EXAMPLE_PARAMS)).toEqual([]);
  });
});

describe('the hold on a slope', () => {
  it('the share of the weight across the window pulls it out: all of it level, none upright', () => {
    expect(pullShare(0)).toBeCloseTo(1, 12);
    expect(pullShare(30)).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(pullShare(60)).toBeCloseTo(0.5, 12);
    expect(pullShare(90)).toBeCloseTo(0, 12);
  });

  it('the plan gives the share, the test at twice it, the strap and the rain', () => {
    const text = roofLines(PARAMS);
    expect(text).toHaveLength(2);
    expect(text[0]).toBe(
      'On a roof at 30°, 87% of the wall’s weight pulls it out of the frame into the room, held only by its ' +
        'gaskets’ grip. Weigh its parts before you fit it; then push its middle from the room side with a ' +
        'scale held flat, up to 1.7 times their weight: it must not move. Until it has, and over a bed or a ' +
        'seat, hold it up with a strap across its room face.',
    );
    expect(text[1]).toMatch(/^Rain on the wall runs down its slope to its bottom edge/);
    expect(roofLines(ok({ ...ROOF, roof: { pitchDeg: 60 } }))[0]).toMatch(/50% of the wall’s weight.*up to 1\.0 times/);
    expect(roofLines(ok({ ...ROOF, roof: { pitchDeg: 15 } }))[0]).toMatch(/97% of the wall’s weight.*up to 1\.9 times/);
  });

  it('upright, nothing pulls it out; a hose port adds the hose’s weight', () => {
    expect(roofLines(ok({ ...ROOF, roof: { pitchDeg: 90 } }))[0]).toBe(
      'At 90°, the wall stands upright: its weight rests on its bottom edge.',
    );
    expect(roofLines(ok({ ...ROOF, ports: [{ hoseMm: 150 }] }))).toContain(
      'Hang the hose from a hook above the window, so its weight does not pull on the wall.',
    );
  });
});
