// Every pattern the panel fill offers (fill-registry, #96), in the order the page lists them. A
// new pattern is a file beside these, declared with definePattern, and one entry here; the
// settings, the command's flags, the MCP server's schema, the page's controls and the plan take it
// from here (docs/extending.md, "A new pattern").
import { BRICK } from './brick.js';
import type { PatternDefinition } from './define.js';
import { DIAMOND } from './diamond.js';
import { GRID } from './grid.js';
import { HEXAGON } from './hexagon.js';

export * from './define.js';
export * from './grid.js';
export * from './hexagon.js';
export * from './brick.js';
export * from './diamond.js';

export const PATTERNS = [GRID, HEXAGON, BRICK, DIAMOND] as const;

export type Pattern = (typeof PATTERNS)[number];
export type PatternKind = Pattern['kind'];
// One size of any pattern, with its exact field.
export type AnyPatternSize = Pattern['sizes'][number];
export type PatternField = AnyPatternSize['field'];

type SizesOf<P> = P extends PatternDefinition<string, string, infer S> ? Record<S, number> : never;

// Each pattern's sizes under its kind, as the library's shape holds them: { grid: { openingMm,
// barMm }, hexagon: { … }, … }.
export type PatternSizes = { [P in Pattern as P['kind']]: SizesOf<P> };

export const patternOf = (kind: string): Pattern | undefined => PATTERNS.find((p) => p.kind === kind);

const fields: PatternField[] = [];
for (const pattern of PATTERNS) for (const size of pattern.sizes) fields.push(size.field);

// Every pattern's fields, in order: each pattern's sizes in turn.
export const PATTERN_FIELDS: readonly PatternField[] = fields;

// Every pattern's sizes, each read by `read`, in the order of PATTERN_FIELDS.
export function patternSizes(read: (pattern: Pattern, size: AnyPatternSize) => number): PatternSizes {
  const sizes = PATTERNS.map((p) => [p.kind, Object.fromEntries(p.sizes.map((s) => [s.key, read(p, s)]))]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- built from every pattern's own kind and keys
  return Object.fromEntries(sizes) as PatternSizes;
}

// A pattern's sizes by name, for its tile and its words.
export function sizesOf(sizes: PatternSizes, kind: PatternKind): (key: string) => number {
  const values = new Map<string, number>(Object.entries(sizes[kind]));
  return (key) => {
    const value = values.get(key);
    if (value === undefined) throw new Error(`The ${kind} pattern has no size ${key}`);
    return value;
  };
}
