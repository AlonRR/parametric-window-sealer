// The window AC (backlog item window-ac, #24; Q15): the wall meets the unit's side or top. Chosen
// without asking (Q144; docs/choices.md): a fourth edge role, against the unit, shaped as at a sash
// or a sill, a flat face with the seal on it (C49); where the unit is, seen from the room, sets
// which edge meets it (C50), the opening being the area left open around the unit (C51); the
// command and the MCP server take it as an edge role (C52); below the wall in a slider, to its
// right in a hung window, to start with (C53).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAPE,
  EXAMPLE_PARAMS,
  SETTINGS,
  UNIT_PLACES,
  WINDOW_PRESETS,
  defaultUnitPlace,
  describePlan,
  planFiles,
  planParts,
  planWall,
  readParams,
  readSettings,
  toFormValues,
  unitRoles,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';

describe('the unit’s place sets the edge that meets it (C50, C53)', () => {
  it('below the wall, to its left or to its right, seen from the room', () => {
    expect(UNIT_PLACES).toEqual(['below', 'left', 'right']);
    expect(unitRoles('slider', 'below')).toEqual({ ...WINDOW_PRESETS.slider, bottom: 'unit' });
    expect(unitRoles('hung', 'right')).toEqual({ ...WINDOW_PRESETS.hung, right: 'unit' });
    expect(unitRoles('hung', 'left')).toEqual({ ...WINDOW_PRESETS.hung, left: 'unit' });
  });

  it('starts below the wall in a slider, and to its right in a hung window', () => {
    expect(defaultUnitPlace('slider')).toBe('below');
    expect(defaultUnitPlace('hung')).toBe('right');
  });
});

describe('an edge against the unit (C49)', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });
  const onUnit: Params = { ...EXAMPLE_PARAMS, edges: { ...EXAMPLE_PARAMS.edges, roles: unitRoles('slider', 'below') } };
  const onSill: Params = {
    ...EXAMPLE_PARAMS,
    edges: { ...EXAMPLE_PARAMS.edges, roles: { ...onUnit.edges.roles, bottom: 'sill' } },
  };

  it('is a role the form reads and writes back, and the settings list', () => {
    const r = read({ bottomEdge: 'unit' });
    expect(r).toMatchObject({ ok: true, params: { edges: { roles: { bottom: 'unit' } } } });
    if (r.ok) expect(readParams(toFormValues(r.params))).toEqual(r);
    for (const edge of ['top', 'bottom', 'left', 'right']) {
      expect(SETTINGS.find((s) => s.path === `edges.roles.${edge}`)?.values).toEqual([
        'track',
        'sash',
        'sill',
        'unit',
        'frame',
      ]); // a frame since #120
    }
  });

  it('is shaped as at a sill: the same span, the same strips, the same files', () => {
    expect(planWall(onUnit)).toEqual(planWall(onSill));
    expect(planParts(onUnit).edges).toEqual(planParts(onSill).edges);
    const choice = { format: 'stl', packaging: 'separate' } as const;
    expect(planFiles(onUnit, choice)).toEqual(planFiles(onSill, choice));
  });

  it('carries the seal on its outer face, as every edge does (Q119)', () => {
    const taped = (p: Params): Params => ({ ...p, seal: { kind: 'tape', tape: DEFAULT_TAPE } });
    const bottom = (p: Params) => planParts(taped(p)).edges.filter((e) => e.edge === 'bottom');
    expect(bottom(onUnit).length).toBeGreaterThan(0);
    expect(bottom(onUnit).every((e) => e.tape !== undefined)).toBe(true);
    expect(bottom(onUnit)).toEqual(bottom(onSill));
  });

  it('the plan says which edge meets the unit, its top or its side', () => {
    const lines = (p: Params) => describePlan(planWall(p), p).units;
    expect(lines(EXAMPLE_PARAMS)).toEqual([]);
    expect(lines(onUnit)).toEqual(['Window AC: the bottom edge stands on the unit’s top.']);
    const beside: Params = {
      ...EXAMPLE_PARAMS,
      edges: { ...EXAMPLE_PARAMS.edges, window: 'hung', roles: unitRoles('hung', 'right') },
    };
    expect(lines(beside)).toEqual(['Window AC: the right edge meets the unit’s side.']);
  });

  it('the command and the server take it as an edge role (C52)', () => {
    const r = readSettings({ openingWidthMm: 600, openingHeightMm: 400, edges: { roles: { bottom: 'unit' } } });
    expect(r).toMatchObject({ ok: true, params: { edges: { roles: { bottom: 'unit' } } } });
    const flags = readSettings({ openingWidthMm: 600, openingHeightMm: 400 }, { leftEdge: 'unit' });
    expect(flags).toMatchObject({ ok: true, params: { edges: { roles: { left: 'unit' } } } });
  });
});
