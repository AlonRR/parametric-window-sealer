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
  'edges.roles': 'What each edge meets. Setting the window type presets all four.',
  'edges.track': "The window's tracks, in mm.",
  'edges.track.depthMm': 'How deep each track is.',
};

type Tree = { [key: string]: Tree | z.ZodType };

function leaf(help: string, values: readonly string[] | undefined, required: boolean): z.ZodType {
  const base = values === undefined ? z.number() : z.enum(values as [string, ...string[]]);
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
    at[keys.at(-1) as string] = leaf(s.help, s.values, REQUIRED.has(s.path));
  }
  return toSchema(tree, '').describe(
    "The window's settings in the library's shape; every length in mm. Only the opening is required; " +
      'anything left out starts where the page starts. The settings a tool returns can be passed back as they are.',
  );
}
