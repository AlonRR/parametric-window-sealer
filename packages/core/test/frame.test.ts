// Windows without a track (compression-edge, #120), from the design review against published work:
// Indow's inserts hold in a frame by a compression tube round the edge, made slightly oversize, and
// for tilt-and-turn windows only fabric kits are sold. Here an edge pressed into a frame is shaped as
// one against a sash, a flat face with the seal on it, and its printed TPU gasket, squeezed as the
// wall goes in, is what holds it.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  defaultUnitPlace,
  describePlan,
  edgeProfile,
  panelSpan,
  planWall,
  readParams,
  tapeFit,
  toFormValues,
} from '../src/index.js';
import type { EdgeParams, FormValues, Params } from '../src/index.js';

const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};
const frame = { window: 'frame', topEdge: 'frame', bottomEdge: 'frame', leftEdge: 'frame', rightEdge: 'frame' };

describe('the role and the window', () => {
  it('a window type with all four edges pressed into a frame, offered as the page offers it', () => {
    expect(WINDOW_PRESETS.frame).toEqual({ top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' });
    expect(SETTINGS.find((s) => s.field === 'window')?.values).toEqual([
      'slider',
      'hung',
      'frame',
      'shutter',
      'tilt',
      'turn',
    ]);
    expect(SETTINGS.find((s) => s.field === 'topEdge')?.values).toEqual(['track', 'sash', 'sill', 'unit', 'frame']);
    expect(defaultUnitPlace('frame')).toBe('below'); // a window AC on the sill, the wall above it
  });

  it('needs the printed TPU seal, whose squeeze holds it', () => {
    expect(read({ ...frame, seal: 'tpu' }).edges.roles).toEqual(WINDOW_PRESETS.frame);
    const message =
      'An edge pressed into a frame is held by the squeeze of its printed TPU gasket: choose printed TPU as the seal.';
    expect(errors({ ...frame, seal: 'tape' }).seal).toBe(message);
    expect(errors({ ...frame, seal: 'none' }).seal).toBe(message);
    expect(errors({ ...frame, bottomEdge: 'sill', seal: 'tape' }).seal).toBe(message); // any edge in a frame
    expect(
      errors({ ...frame, bottomEdge: 'sill', topEdge: 'sash', leftEdge: 'sash', rightEdge: 'sash' }).seal,
    ).toBeUndefined();
  });
});

describe('the shape', () => {
  it('an edge in a frame is shaped as one against a sash, so the wall is sized as for one', () => {
    const tpu = tapeFit(read({ ...frame, seal: 'tpu' }).seal);
    const edges = (role: 'frame' | 'sash'): EdgeParams => ({
      ...EXAMPLE_PARAMS.edges,
      roles: { top: role, bottom: role, left: role, right: role },
    });
    for (const e of ['top', 'left'] as const) {
      expect(edgeProfile(e, edges('frame'), DEFAULT_JOINT, tpu)).toEqual(
        edgeProfile(e, edges('sash'), DEFAULT_JOINT, tpu),
      );
    }
    expect(panelSpan(600, 1000, edges('frame'), DEFAULT_JOINT, tpu)).toEqual(
      panelSpan(600, 1000, edges('sash'), DEFAULT_JOINT, tpu),
    );
  });
});

describe('the plan', () => {
  const line = (p: Params) => describePlan(planWall(p), p).frame;

  it('says what holds it and how to fit it, naming the edges in a frame', () => {
    expect(line(read({ ...frame, seal: 'tpu' }))).toEqual([
      'In a frame: the TPU gaskets on the top, bottom, left and right edges stand 2.4 mm out of their grooves ' +
        'and are squeezed to 0.4 mm as the wall goes in. Their squeeze is all that holds it: push it in square ' +
        'from the room side, and check it holds before letting go.',
    ]);
    expect(line(read({ ...frame, bottomEdge: 'sill', seal: 'tpu' }))[0]).toContain(
      'the TPU gaskets on the top, left and right edges',
    );
    expect(line(EXAMPLE_PARAMS)).toEqual([]);
  });
});
