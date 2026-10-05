// The settings as an input schema, in the library's own shape (Q99), built from the library's
// SETTINGS so the server describes each one in the page's words and cannot miss one. Every
// setting may be left out and then starts where the page starts, except the opening.
import { SETTINGS } from 'parametric-window-sealer';
import * as z from 'zod';

const REQUIRED = new Set(['openingWidthMm', 'openingHeightMm']);

const GROUPS: Record<string, string> = {
  printer: 'The largest piece the printer can make. A width or height alone makes it custom.',
  width: 'How the width is divided into pieces.',
  height: 'How the height is divided into pieces.',
  joint: 'The strips that join the pieces, in mm. Starting values; a test print confirms them.',
  edges: 'The window and its four edges.',
  collar: "The hose port's collar, in mm. Starting values; a test print confirms them.",
  seal: 'The seal: none, or foam tape. Tape settings without a kind mean tape.',
  'seal.tape': 'The foam tape: its size and groove in mm, how far it is squeezed in %, and where else it goes.',
  fill: "The panel fill: sealed, or a pattern, in relief or cut through. A pattern's settings without a kind mean that pattern.",
  'fill.grid': "The grid's square openings and the bars between them, in mm.",
  'fill.hexagon': "The honeycomb's hexagonal openings, across the flats, and the bars between them, in mm.",
  'fill.brick': "The bricks' openings, width and height, and the bars between them, in mm.",
  'edges.roles': 'What each edge meets. Setting the window type presets all four.',
  'edges.track': "The window's tracks, in mm.",
  'edges.track.depthMm': 'How deep each track is.',
};

type Tree = { [key: string]: Tree | z.ZodType };

// A port (Q114): the hose end's outside diameter, and its piece counted from 1 at the bottom
// left seen from the room; without a piece, the first goes in the starting one (Q105).
const PORT = z.strictObject({
  hoseMm: z.number().describe("The hose end's outside diameter in mm; 150 and 130 are common."),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

function leaf(help: string, values: readonly string[] | undefined, required: boolean, list = false, onOff = false): z.ZodType {
  const base = list
    ? z.array(PORT)
    : onOff
      ? z.boolean()
      : values === undefined
        ? z.number()
        : z.enum(values as [string, ...string[]]);
  const described = base.describe(help);
  return required ? described : described.optional();
}

function toSchema(tree: Tree, path: string): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, node] of Object.entries(tree)) {
    const at = path === '' ? key : `${path}.${key}`;
    shape[key] = node instanceof z.ZodType ? node : toSchema(node, at).describe(GROUPS[at] ?? at).optional();
  }
  return z.strictObject(shape);
}

export function settingsSchema(): z.ZodObject {
  const tree: Tree = {};
  for (const s of SETTINGS) {
    const keys = s.path.split('.');
    let at = tree;
    for (const key of keys.slice(0, -1)) at = (at[key] ??= {}) as Tree;
    at[keys.at(-1) as string] = leaf(s.help, s.values, REQUIRED.has(s.path), s.list === true, s.onOff === true);
  }
  return toSchema(tree, '').describe(
    "The window's settings in the library's shape; every length in mm. Only the opening is required; " +
      'anything left out starts where the page starts. The settings a tool returns can be passed back as they are.',
  );
}
