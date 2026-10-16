// A louvre window (louvre-frame, #163; docs/louvre.md): glass blades in clips, turned together by a
// handle. The lowest blades come out of their clips and the wall goes in their place: standing on
// the sill, its sides pressed against the clips of the blades taken out, and its top edge under the
// lowest blade left, which closes onto its gasket as onto the window's own weatherstrip.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  WINDOW_PRESETS,
  describePlan,
  planFiles,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';
import type { Params } from '../src/index.js';

// Four blades out at the 140 mm pitch of 152 mm clips.
const LOUVRE = {
  openingWidthMm: 600,
  openingHeightMm: 560,
  edges: { window: 'louvre' },
  seal: { kind: 'tpu' },
  ports: [],
};
const ok = (input: unknown): Params => {
  const r = readSettings(input, {});
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const PARAMS = ok(LOUVRE);

describe('the louvre window as a window type', () => {
  it('stands on the sill, its sides against the clips, its top under the lowest blade left', () => {
    expect(WINDOW_PRESETS.louvre).toEqual({ top: 'sash', bottom: 'sill', left: 'frame', right: 'frame' });
    expect(SETTINGS.find((s) => s.field === 'window')?.values).toContain('louvre');
    expect(PARAMS.edges.roles).toEqual(WINDOW_PRESETS.louvre);
    const back = readParams(toFormValues(PARAMS));
    expect(back.ok && back.params.edges.window).toBe('louvre');
  });

  it('needs the printed TPU seal, whose squeeze against the clips holds its sides', () => {
    const r = readParams({ ...toFormValues(PARAMS), seal: 'tape' });
    expect(r.ok ? {} : r.errors).toHaveProperty('seal');
  });

  it('is a wall as any other: its pieces, its fittings and its files', () => {
    const port = ok({ ...LOUVRE, ports: [{ hoseMm: 150 }] });
    expect(port.ports).toHaveLength(1);
    const names = planFiles(port, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(names.filter((n) => n.endsWith('-port-150.stl'))).toHaveLength(1);
  });
});

describe('a louvre window’s plan', () => {
  it('says which blades come out, where the wall goes, and to keep the louvres closed while it is in', () => {
    const lines = describePlan(planWall(PARAMS), PARAMS).louvre;
    expect(lines).toEqual([
      'A louvre window: take the lowest blades out of their clips, as many as the wall needs, and keep them ' +
        'safe; the wall stands on the sill in their place, its sides pressed against the clips of the blades ' +
        'taken out.',
      'Close the louvres with the handle: the lowest blade left closes onto the wall’s top gasket, as onto the ' +
        'window’s own weatherstrip. Do not open them while the wall is in: the clips at its sides turn with them.',
    ]);
  });

  it('with its top edge changed, says nothing of the blade closing onto it', () => {
    const unit = ok({ ...LOUVRE, edges: { window: 'louvre', roles: { top: 'frame' } } });
    expect(describePlan(planWall(unit), unit).louvre).toHaveLength(1);
  });

  it('says nothing for another window type', () => {
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).louvre).toEqual([]);
  });
});
