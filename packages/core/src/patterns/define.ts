// A pattern for the panel fill, declared once (fill-registry, #96): its name, its sizes as each
// part of the project shows them, its tile and its words in the plan. The settings list, the
// command's flags, the MCP server's schema, the page's controls and the plan all come from these
// declarations; patterns/index.ts lists them.
import type { PatternTile } from '../pattern.js';

export interface PatternSize<F extends string = string, S extends string = string> {
  key: S; // its name in the library's shape: fill.<kind>.<key>
  field: F; // the page's field, and the name of its control
  flag: string; // the command's flag, without the dashes
  label: string; // its label on the page
  note?: string; // the page's note under it
  help: string; // the settings list's help, which the command and the MCP server show
  start: number; // its starting value, in mm
  bar?: true; // the solid between openings, at least MIN_BAR_MM; otherwise a size above zero
}

// A pattern's sizes, by name.
export type SizeOf<S extends string> = (key: S) => number;

export interface PatternDefinition<K extends string = string, F extends string = string, S extends string = string> {
  kind: K; // in the library's shape: fill.kind
  name: string; // in the page's lists: "Grid"
  words: string; // among the patterns in a sentence: "a grid"
  group: string; // the MCP server's description of fill.<kind>
  sizes: readonly PatternSize<F, S>[];
  tile(size: SizeOf<S>): PatternTile;
  describe(size: SizeOf<S>): string; // in the plan: "a grid of 15 mm square openings and 3 mm bars"
}

// Keeps every name exact, so the type checker knows each pattern's kind, fields and sizes.
export function definePattern<const K extends string, const F extends string, const S extends string>(
  pattern: PatternDefinition<K, F, S>,
): PatternDefinition<K, F, S> {
  return pattern;
}
