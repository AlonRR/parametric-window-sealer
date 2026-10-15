// The settings as an input schema, in the library's own shape (Q99), built from the library's
// SETTINGS so the server describes each one in the page's words and cannot miss one. Every
// setting may be left out and then starts where the page starts, except the opening.
import { FANS, FILL_KINDS, PATTERNS, PATTERN_STYLES, SETTINGS } from 'parametric-window-sealer';
import type { ListKind } from 'parametric-window-sealer';
import * as z from 'zod';

const REQUIRED = new Set(['openingWidthMm', 'openingHeightMm']);

const GROUPS: Record<string, string> = {
  printer: 'The largest piece the printer can make. A width or height alone makes it custom.',
  width: 'How the width is divided into pieces.',
  height: 'How the height is divided into pieces.',
  joint: 'The strips that join the pieces, in mm. Starting values; a test print confirms them.',
  edges: 'The window and its four edges.',
  collar: "The hose port's collar, in mm. Starting values; a test print confirms them.",
  rim: 'The rim round each measured cutout, in mm. Starting values; a test print confirms them.',
  insert: "The sliding inserts' shutters, in mm: how far each slides and the clearance above and below.",
  clamp: "The clamps' jaws, in mm: how far each slides and how far its lip stands out. A test print confirms them.",
  seal:
    'The seal: none, foam tape, or gaskets printed in TPU to the tape’s size. Tape settings without a kind mean tape; ' +
    'joints in TPU, the TPU seal.',
  'seal.tape':
    'The foam tape, or the TPU gaskets: its size and groove in mm, how far it is squeezed in %, where else it goes, ' +
    'and with TPU whether the joints are TPU too.',
  fill: "The panel fill: sealed, or a pattern, in relief or cut through. A pattern's settings without a kind mean that pattern.",
  // Each pattern describes its own sizes (packages/core/src/patterns/).
  ...Object.fromEntries(PATTERNS.map((p) => [`fill.${p.kind}`, p.group])),
  'edges.roles': 'What each edge meets. Setting the window type presets all four.',
  'edges.track': "The window's tracks, in mm.",
  'edges.track.depthMm': 'How deep each track is.',
};

type Tree = { [key: string]: Tree | z.ZodType };

// A list of choices as zod takes it: at least one.
function choices(values: readonly string[]) {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error('A choice needs at least one value');
  return z.enum([first, ...rest]);
}

// A port (Q114): the hose end's outside diameter, and its piece counted from 1 at the bottom
// left seen from the room; without a piece, the first goes in the starting one (Q105).
const PORT = z.strictObject({
  hoseMm: z.number().describe("The hose end's outside diameter in mm; 150 and 130 are common."),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

// A piece's own fill (#21; C26): its column and row from 1, its fill and optionally its style.
const PIECE_FILL = z.strictObject({
  column: z.number().int().min(1).describe('The column of the piece, from 1 at the left.'),
  row: z.number().int().min(1).describe('The row of the piece, from 1 at the bottom.'),
  kind: choices(FILL_KINDS).describe('Its fill: sealed, a pattern or an organiser board.'),
  style: choices(PATTERN_STYLES).optional().describe("A pattern's style; the wall's if left out. A board has none."),
});

// A measured cutout (#23; C44): the appliance's outside, seen from the room, and its piece as a
// port's; without a piece, the first goes in the starting one (C47).
const CUTOUT = z.strictObject({
  widthMm: z.number().describe("The appliance's measured outside width in mm, seen from the room."),
  heightMm: z.number().describe("The appliance's measured outside height in mm."),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

// A fan (#28): its size from the list, and its piece as a port's.
const FAN = z.strictObject({
  sizeMm: z
    .number()
    .describe(`The fan's size in mm, one of ${FANS.map((f) => f.sizeMm).join(', ')}: its square frame, each way.`),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

// An appliance held by clamps (#32): measured roughly, and its piece as a port's.
const CLAMP = z.strictObject({
  widthMm: z.number().describe("The appliance's outside width in mm, seen from the room, give or take the travel."),
  heightMm: z.number().describe("The appliance's outside height in mm, give or take the travel."),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

// An appliance in a sliding insert (#38): its size, and its piece as a port's.
const INSERT = z.strictObject({
  widthMm: z.number().describe("The appliance's outside width in mm, seen from the room, give or take the travel."),
  heightMm: z.number().describe("The appliance's outside height in mm."),
  column: z.number().int().min(1).optional().describe('The column of its piece, from 1 at the left.'),
  row: z.number().int().min(1).optional().describe('The row of its piece, from 1 at the bottom.'),
});

const ITEMS: Record<ListKind, z.ZodType> = {
  ports: PORT,
  pieceFills: PIECE_FILL,
  cutouts: CUTOUT,
  fans: FAN,
  clamps: CLAMP,
  inserts: INSERT,
};

function leaf(
  help: string,
  values: readonly string[] | undefined,
  required: boolean,
  list?: ListKind,
  onOff = false,
  text = false,
): z.ZodType {
  const base = list
    ? z.array(ITEMS[list])
    : onOff
      ? z.boolean()
      : text
        ? z.string() // the SVG tile's drawing: an SVG file's text
        : values === undefined
          ? z.number()
          : choices(values);
  const described = base.describe(help);
  return required ? described : described.optional();
}

function toSchema(tree: Tree, path: string): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, node] of Object.entries(tree)) {
    const at = path === '' ? key : `${path}.${key}`;
    shape[key] =
      node instanceof z.ZodType
        ? node
        : toSchema(node, at)
            .describe(GROUPS[at] ?? at)
            .optional();
  }
  return z.strictObject(shape);
}

export function settingsSchema(): z.ZodObject {
  const tree: Tree = {};
  for (const s of SETTINGS) {
    const keys = s.path.split('.');
    const last = keys.pop();
    if (last === undefined) continue;
    let at = tree;
    for (const key of keys) {
      const next = at[key] ?? {};
      if (next instanceof z.ZodType) throw new Error(`${s.path} sits inside the setting ${key}`);
      at = at[key] = next;
    }
    at[last] = leaf(s.help, s.values, REQUIRED.has(s.path), s.list, s.onOff === true, s.text === true);
  }
  return toSchema(tree, '').describe(
    "The window's settings in the library's shape; every length in mm. Only the opening is required; " +
      'anything left out starts where the page starts. The settings a tool returns can be passed back as they are.',
  );
}
