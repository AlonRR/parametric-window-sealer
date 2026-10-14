// Every pattern the library declares (fill-registry, #96) is held to the same rules, so a new one
// is checked the moment it is added to PATTERNS: its fields and flags are its own, its sizes are
// settings with their help, they are read and checked as the page reads them, it has a tile from
// its starting sizes, and the plan names it with its sizes.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  FIELD_NAMES,
  FILL_KINDS,
  MIN_BAR_MM,
  PATTERNS,
  PATTERN_FIELDS,
  SEALED,
  SETTINGS,
  describePlan,
  fillPattern,
  planWall,
  readParams,
  readSettings,
  toFormValues,
} from '../src/index.js';

const start = toFormValues(EXAMPLE_PARAMS);
const read = (over: Record<string, string>) => readParams({ ...start, ...over });

describe('the patterns', () => {
  it('each has a kind, fields and flags of its own', () => {
    const kinds = PATTERNS.map((p) => p.kind);
    const fields = PATTERNS.flatMap((p) => p.sizes.map((s) => s.field));
    const flags = PATTERNS.flatMap((p) => p.sizes.map((s) => s.flag));
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(new Set(fields).size).toBe(fields.length);
    expect(new Set(flags).size).toBe(flags.length);
    expect(FILL_KINDS).toEqual(['sealed', ...kinds]);
    expect(PATTERN_FIELDS).toEqual(fields);
    for (const field of fields) expect(FIELD_NAMES).toContain(field);
  });

  it.each(PATTERNS.map((p) => [p.kind, p] as const))('%s: its sizes are settings, with its help', (kind, p) => {
    for (const s of p.sizes) {
      expect(SETTINGS).toContainEqual({ field: s.field, path: `fill.${kind}.${s.key}`, help: s.help });
      expect(start[s.field]).toBe(String(s.start));
    }
    expect(SETTINGS.find((s) => s.field === 'fill')?.help).toContain(p.words);
  });

  it.each(PATTERNS.map((p) => [p.kind, p] as const))('%s: starts as declared, with a tile', (kind, p) => {
    for (const s of p.sizes) expect(Object.entries(SEALED[kind])).toContainEqual([s.key, s.start]);
    const pattern = fillPattern({ ...SEALED, kind }, EXAMPLE_PARAMS.joint);
    expect(pattern?.tile.pitchXMm).toBeGreaterThan(0);
    expect(pattern?.tile.pitchYMm).toBeGreaterThan(0);
    expect(pattern?.tile.openings.length).toBeGreaterThan(0);
    // Its bar size's start; the SVG tile has none, its bars being what the drawing leaves.
    const bar = p.sizes.find((s) => s.bar === true);
    expect(pattern?.tile.barMm).toBe(bar?.start ?? MIN_BAR_MM);
  });

  it.each(PATTERNS.map((p) => [p.kind, p] as const))('%s: its sizes are read, checked and named', (kind, p) => {
    const r = read({ fill: kind, ...Object.fromEntries(p.sizes.map((s) => [s.field, String(s.start + 1)])) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const s of p.sizes) expect(Object.entries(r.params.fill[kind])).toContainEqual([s.key, s.start + 1]);
    const words = describePlan(planWall(r.params), r.params).fill;
    for (const s of p.sizes) expect(words).toMatch(new RegExp(`\\b${s.start + 1}\\b`));

    for (const s of p.sizes) {
      const wrong = read({ fill: kind, [s.field]: s.bar ? String(MIN_BAR_MM / 2) : '0' });
      expect(wrong).toMatchObject({ ok: false });
      if (!wrong.ok) expect(Object.keys(wrong.errors)).toEqual([s.field]);
      // A pattern not in use keeps a size that does not fit, as the page does (C15).
      expect(read({ [s.field]: '0' }).ok).toBe(true);
    }
  });

  it.each(PATTERNS.map((p) => [p.kind, p] as const))('%s: its sizes given alone mean it', (kind, p) => {
    const first = p.sizes[0];
    if (first === undefined) throw new Error(`${kind} has no sizes`);
    const given = readSettings({ ...EXAMPLE_PARAMS, fill: { [kind]: { [first.key]: first.start } } });
    expect(given).toMatchObject({ ok: true, params: { fill: { kind } } });
    expect(readSettings(EXAMPLE_PARAMS, { [first.field]: String(first.start) })).toMatchObject({
      ok: true,
      params: { fill: { kind } },
    });
  });
});
