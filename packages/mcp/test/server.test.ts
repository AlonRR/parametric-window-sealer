// The MCP server (backlog item api-mcp-local, #47; the owner's decisions Q91 to Q100), driven
// through the SDK's own client over an in-memory link, as an agent would drive it.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { unzipSync } from 'fflate';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, SETTINGS, WINDOW_PRESETS, makeWall, planFiles } from 'parametric-window-sealer';
import { createServer } from '../src/server.js';

const OPENING = { openingWidthMm: 600, openingHeightMm: 1000 };

// A tool's answer, as the spec defines it (the client's type also allows a legacy form).
interface ToolAnswer {
  content: { type: string; text?: string; resource?: { uri: string; mimeType: string; blob: string } }[];
  structuredContent?: Record<string, any>;
  isError?: boolean;
}
const TOOLS = [
  'window_sealer_list_settings',
  'window_sealer_check_settings',
  'window_sealer_plan_wall',
  'window_sealer_make_files',
];

async function connect(outRoot = mkdtempSync(join(tmpdir(), 'window-sealer-mcp-'))) {
  const server = createServer({ outRoot });
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) =>
    answer(await client.callTool({ name, arguments: args }));
  return { client, call, outRoot };
}

const listed = (folder: string) => readdirSync(folder).sort();

function answer(result: unknown) {
  const r = result as ToolAnswer;
  const text = r.content.find((c) => c.type === 'text')?.text ?? '';
  return { ...r, text, data: r.structuredContent ?? {} };
}

describe('the server', () => {
  it('offers the four tools (Q92), each saying what it changes', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(TOOLS);
    const hints = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    for (const name of TOOLS.slice(0, 3))
      expect(hints[name]).toMatchObject({ readOnlyHint: true, openWorldHint: false });
    expect(hints['window_sealer_make_files']).toMatchObject({ readOnlyHint: false, openWorldHint: false });
  });

  it('describes every setting in its input schema, in the library’s shape (Q99)', async () => {
    const { client } = await connect();
    const plan = (await client.listTools()).tools.find((t) => t.name === 'window_sealer_plan_wall');
    if (!plan) throw new Error('window_sealer_plan_wall expected');
    const settings = (plan.inputSchema.properties as Record<string, any>)['settings'];
    for (const s of SETTINGS) {
      const node = s.path.split('.').reduce((at: any, key: string) => at?.properties?.[key], settings);
      expect(node, s.path).toBeDefined();
      expect(node.description).toBe(s.help);
      if (s.onOff)
        expect(node.type).toBe('boolean'); // a place for the tape: true or false
      else if (s.text || s.binary)
        expect(node.type).toBe('string'); // the SVG tile's drawing; a model's file in base64
      else if (s.whole)
        expect(node).toMatchObject({ type: 'integer', minimum: 0 }); // the model's column and row
      else if (s.values) expect(node.enum).toEqual([...s.values]);
    }
    expect(settings.required).toEqual(['openingWidthMm', 'openingHeightMm']);
  });

  it('tells an agent how to use it', async () => {
    const { client } = await connect();
    expect(client.getInstructions()).toContain('window_sealer_list_settings');
    expect(client.getServerVersion()?.name).toBe('window-sealer');
  });
});

describe('window_sealer_list_settings', () => {
  it('every setting with its meaning, starting value and choices', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_list_settings');
    expect(r.isError).toBeFalsy();
    const settings = r.data['settings'] as { path: string; help: string; startsAt: unknown; choices?: string[] }[];
    expect(settings.map((s) => s.path)).toEqual(SETTINGS.map((s) => s.path));
    expect(settings.find((s) => s.path === 'seal.tape.sides')).toMatchObject({
      startsAt: false,
      choices: [false, true],
    });
    expect(settings.find((s) => s.path === 'seal.kind')).toMatchObject({
      startsAt: 'none',
      choices: ['none', 'tape', 'tpu'],
    });
    expect(settings.find((s) => s.path === 'joint.slotMm')).toEqual({
      path: 'joint.slotMm',
      help: 'How deep a piece can go into a strip.',
      startsAt: 8,
    });
    expect(settings.find((s) => s.path === 'edges.window')).toMatchObject({
      startsAt: 'slider',
      choices: ['slider', 'hung', 'frame'],
    });
    expect(settings.find((s) => s.path === 'openingWidthMm')?.startsAt).toBeNull();
    expect(JSON.parse(r.text)).toEqual(r.data);
  });
});

describe('window_sealer_check_settings', () => {
  it('the complete settings when they are good', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_check_settings', { settings: { ...OPENING, edges: { window: 'hung' } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['ok']).toBe(true);
    expect(r.data['settings'].edges.roles).toEqual(WINDOW_PRESETS.hung);
  });

  it('the page’s message for each setting that is wrong', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_check_settings', { settings: { ...OPENING, joint: { slideMm: 8 } } });
    expect(r.isError).toBeFalsy();
    expect(r.data).toEqual({
      ok: false,
      problems: [
        { path: 'joint.slideMm', message: 'Make it less than the slot depth, so a piece always stays in its slot.' },
      ],
    });
  });
});

describe('window_sealer_plan_wall', () => {
  it('the page’s summary, the plan and the files it would make; nothing written', async () => {
    const { call, outRoot } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: OPENING });
    expect(r.isError).toBeFalsy();
    expect(r.data['summary'].headline).toBe('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(r.data['plan'].pieces).toHaveLength(15);
    expect(r.data['settings']).toEqual(EXAMPLE_PARAMS);
    expect(r.data['files']).toEqual(planFiles(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' }));
    expect(listed(outRoot)).toEqual([]);
  });

  it('tape in the library’s shape: a place is true or false, and tape settings alone mean tape (Q122, Q127)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, seal: { tape: { sides: true } } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].seal).toEqual({
      kind: 'tape',
      tape: { widthMm: 9, thicknessMm: 4, grooveMm: 1, squeezePct: 50, sides: true, port: false, joints: false },
    });
    expect(r.data['summary'].seal).toBe(
      'Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces and sides: 7.6 m in all.',
    );
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names.some((n) => /^edge-[0-9.]+x13x11-track-10-print-[0-9]+\.stl$/.test(n))).toBe(true);
    const yes = await call('window_sealer_plan_wall', { settings: { ...OPENING, seal: { tape: { sides: 'yes' } } } });
    expect(yes.isError).toBe(true);
  });

  it('printed TPU in the library’s shape: joints in TPU alone mean the TPU seal (C39), its parts named -tpu', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, seal: { tape: { joints: true } } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].seal).toMatchObject({ kind: 'tpu', tape: { joints: true } });
    expect(r.data['summary'].seal).toBe(
      'Seal: printed TPU, 85A for the best recovery, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all, and the joint strips and cross pieces in TPU.',
    );
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names.some((n) => /^gasket-[0-9.]+x9\.5x4-tpu-print-[0-9]+\.stl$/.test(n))).toBe(true);
    expect(names.some((n) => /^cross-18x18-tpu-print-[0-9]+\.stl$/.test(n))).toBe(true);
    const tape = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, seal: { kind: 'tape', tape: { joints: true } } },
    });
    expect(tape.isError).toBe(true);
    expect(tape.text).toContain('- seal.tape.joints: Tape does not fit a joint: choose printed TPU for the joints.');
  });

  it('measured cutouts in the library’s shape, lined with the seal, a TPU frame among the files (C43, C44)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, cutouts: [{ widthMm: 120, heightMm: 80 }], seal: { kind: 'tpu' } },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].cutouts).toEqual([{ widthMm: 120, heightMm: 80, column: 2, row: 1 }]);
    expect(r.data['summary'].cutouts).toEqual([
      'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 120.8 × 80.8 mm opening in a 15 mm rim, lined with a TPU frame.',
    ]);
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names).toContain('frame-120x80-tpu-print-1.stl');
    const half = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, cutouts: [{ widthMm: 120, heightMm: 80, column: 2 }] },
    });
    expect(half.isError).toBe(true);
    expect(half.text).toContain('cutouts.0 needs both column and row, or neither');
  });

  it('fans from the list in the library’s shape, with their line and their piece’s file (#28)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, fans: [{ sizeMm: 120 }] } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].fans).toEqual([{ sizeMm: 120, column: 2, row: 1 }]);
    expect(r.data['summary'].fans).toEqual([
      'Fan: a 120 mm fan, in column 2, row 1: a 116 mm opening, and four 4.5 mm screw holes 105 mm apart.',
    ]);
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names).toContain('piece-c2-r1-197.7x198.6-fan-120.stl');
    const unlisted = await call('window_sealer_plan_wall', { settings: { ...OPENING, fans: [{ sizeMm: 100 }] } });
    expect(unlisted.isError).toBe(true);
    expect(unlisted.text).toContain('100 mm is not a listed fan size; the sizes are 80, 92, 120 and 140 mm.');
  });

  it('sliding inserts in the library’s shape, with their line and shutters (#38)', async () => {
    const { call } = await connect();
    const big = { openingWidthMm: 1200, openingHeightMm: 900, printer: { widthMm: 300, heightMm: 300 } };
    const r = await call('window_sealer_plan_wall', {
      settings: { ...big, inserts: [{ widthMm: 120, heightMm: 80 }] },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].inserts).toEqual([{ widthMm: 120, heightMm: 80, column: 2, row: 1 }]);
    expect(r.data['summary'].inserts[0]).toMatch(/^Sliding insert: a 120 × 80 mm appliance, in column 2, row 1/);
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names).toContain('shutter-32x89.4-print-2.stl');
  });

  it('clamps in the library’s shape, with their line and their jaws among the files (#32)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, clamps: [{ widthMm: 120, heightMm: 80 }], clamp: { travelMm: 8 } },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].clamps).toEqual([{ widthMm: 120, heightMm: 80, column: 2, row: 1 }]);
    expect(r.data['settings'].clamp).toEqual({ travelMm: 8, depthMm: 15 });
    expect(r.data['summary'].clamps).toEqual([
      'Clamp: a 120 × 80 mm appliance, in column 2, row 1, through a 128 × 88 mm opening; four jaws grip anything ' +
        'from 112 × 72 to 128 × 88 mm, each on two M4 bolts at least 12 mm long, with nuts and washers.',
    ]);
    const names = (r.data['files'] as { name: string }[]).map((f) => f.name);
    expect(names).toContain('piece-c2-r1-197.7x198.6-clamp-120x80.stl');
    expect(names.filter((n) => n.startsWith('jaw-'))).toHaveLength(2);
  });

  it('a window AC as an edge role, and the summary’s line for it (C49, C52)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { openingWidthMm: 600, openingHeightMm: 400, edges: { roles: { bottom: 'unit' } } },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].edges.roles.bottom).toBe('unit');
    expect(r.data['summary'].units).toEqual(['Window AC: the bottom edge stands on the unit’s top.']);
  });

  it('a grid fill in the library’s shape: grid settings alone mean the grid, in relief to start with (Q141, Q142)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, fill: { grid: { barMm: 2 } } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].fill).toMatchObject({
      kind: 'grid',
      style: 'relief',
      reliefPct: 50,
      grid: { openingMm: 15, barMm: 2 },
    });
    expect(r.data['summary'].fill).toBe(
      'Fill: a grid of 15 mm square openings and 2 mm bars, cut 1.5 mm into the room side.',
    );
    const thin = await call('window_sealer_plan_wall', { settings: { ...OPENING, fill: { grid: { barMm: 0.5 } } } });
    expect(thin.isError).toBe(true);
    expect(thin.text).toContain('- fill.grid.barMm: Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.');
  });

  it('a hexagon fill: its settings alone mean the hexagon (C15)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, fill: { hexagon: { openingMm: 10 }, style: 'through' } },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].fill).toMatchObject({
      kind: 'hexagon',
      style: 'through',
      hexagon: { openingMm: 10, barMm: 3 },
    });
    expect(r.data['summary'].fill).toBe(
      'Fill: a honeycomb of hexagonal openings 10 mm across the flats and 3 mm bars, cut through: air passes through the wall.',
    );
  });

  it('a brick fill: its settings alone mean the bricks (C20)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, fill: { brick: { heightMm: 10 } } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].fill).toMatchObject({ kind: 'brick', brick: { widthMm: 30, heightMm: 10, barMm: 3 } });
    expect(r.data['summary'].fill).toBe(
      'Fill: bricks of 30 × 10 mm openings and 3 mm bars, cut 1.5 mm into the room side.',
    );
  });

  it('a diamond fill: its settings alone mean the diamonds (C24)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, fill: { diamond: { barMm: 2 } } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['summary'].fill).toBe(
      'Fill: diamonds 20 mm wide and 30 mm tall and 2 mm bars, cut 1.5 mm into the room side.',
    );
  });

  it('an SVG tile: the drawing as text, given alone meaning the tile (#27)', async () => {
    const { call } = await connect();
    const drawing =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
      '<rect width="10" height="10"/><rect x="12" width="5" height="5"/></svg>';
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, fill: { drawing, svg: { widthMm: 30 } } },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].fill).toMatchObject({ kind: 'svg', drawing });
    expect(r.data['summary'].fill).toBe('Fill: an SVG tile 30 × 30 mm with 2 openings, cut 1.5 mm into the room side.');
    const page = await call('window_sealer_plan_wall', { settings: { ...OPENING, fill: { drawing: '<html/>' } } });
    expect(page.isError).toBe(true);
    expect(page.text).toContain('The file is not an SVG drawing: it has no svg element at its root.');
  });

  it('a model of the appliance: its file in base64, cut round in its piece (#35)', async () => {
    const { call } = await connect();
    // A binary STL box 120 mm across, 50 mm deep and 80 mm high.
    const corners = [
      [0, 0, 0],
      [120, 0, 0],
      [120, 50, 0],
      [0, 50, 0],
      [0, 0, 80],
      [120, 0, 80],
      [120, 50, 80],
      [0, 50, 80],
    ];
    const faces = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
    ];
    const bytes = Buffer.alloc(84 + 50 * 12);
    bytes.writeUInt32LE(12, 80);
    faces.forEach((c, i) => {
      for (const [a, v] of (corners[c] ?? []).entries()) {
        bytes.writeFloatLE(v, 84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a);
      }
    });
    const file = bytes.toString('base64');
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, model: { file, view: 'top' } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].model).toEqual({ file, view: 'top', column: 2, row: 1 });
    expect(r.data['summary'].model).toEqual([
      'Model: the appliance in the STL file, 120 × 50 mm seen from its top, in column 2, row 1, through an opening ' +
        '1 mm clear of its outline, in a 15 mm rim.',
    ]);
    const bad = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, model: { file: 'bm90IGEgbWVzaA==' } },
    });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain('The file is not a mesh: choose an STL, OBJ or 3MF file.');
  });

  it('pieces with fills of their own (#21)', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, fill: { kind: 'grid' }, pieceFills: [{ column: 2, row: 1, kind: 'sealed' }] },
    });
    expect(r.isError).toBeFalsy();
    expect(r.data['summary'].pieceFills).toEqual(['Column 2, row 1: sealed.']);
  });

  it('settings the page refuses are an error with the page’s message for each', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, thicknessMm: 0, joint: { slideMm: 8 } },
    });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('- thicknessMm: Enter a size in mm, greater than 0.');
    expect(r.text).toContain('- joint.slideMm: Make it less than the slot depth, so a piece always stays in its slot.');
  });

  it('a choice that is not listed is refused by the schema, which lists the choices', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, width: { mode: 'grid' } } });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('mode');
    expect(r.text).toContain('full-plus-filler');
  });

  it('the opening is required, and unknown settings are refused (Q99)', async () => {
    const { call } = await connect();
    const missing = await call('window_sealer_plan_wall', { settings: { openingWidthMm: 600 } });
    expect(missing.isError).toBe(true);
    expect(missing.text).toContain('openingHeightMm');
    const unknown = await call('window_sealer_plan_wall', { settings: { ...OPENING, colour: 'red' } });
    expect(unknown.isError).toBe(true);
    expect(unknown.text).toContain('colour');
  });
});

describe('window_sealer_make_files', () => {
  it('by default, separate STL files written to a folder named after the wall (Q95, Q100)', async () => {
    const { call, outRoot } = await connect();
    const r = await call('window_sealer_make_files', { settings: OPENING });
    expect(r.isError).toBeFalsy();
    const folder = join(outRoot, 'window-sealer-600x1000');
    expect(r.data['folder']).toBe(folder);
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' });
    expect(listed(folder)).toEqual(wall.files.map((f) => f.name).sort());
    for (const f of wall.files) expect(readFileSync(join(folder, f.name))).toEqual(Buffer.from(f.bytes));
    expect(r.data['files'][0]).toEqual({
      name: 'piece-c1-r1-197.7x198.6.stl',
      type: 'model/stl',
      bytes: wall.files[0]?.bytes.length, // with its pins' slots (#110)
      path: join(folder, 'piece-c1-r1-197.7x198.6.stl'),
    });
    expect(r.content.some((c) => c.type === 'resource')).toBe(false);
  });

  it('in the reply instead, when the agent asks (Q93): nothing written', async () => {
    const { call, outRoot } = await connect();
    const r = await call('window_sealer_make_files', {
      settings: OPENING,
      format: '3mf',
      packaging: 'single',
      delivery: 'reply',
    });
    expect(r.isError).toBeFalsy();
    expect(listed(outRoot)).toEqual([]);
    const wall = await makeWall(EXAMPLE_PARAMS, { format: '3mf', packaging: 'single' });
    const resources = r.content.filter((c) => c.type === 'resource') as {
      resource: { uri: string; mimeType: string; blob: string };
    }[];
    expect(resources).toHaveLength(1);
    expect(resources[0]?.resource.uri).toBe('window-sealer:///window-sealer-600x1000/window-sealer-600x1000.3mf');
    expect(resources[0]?.resource.mimeType).toBe('model/3mf');
    // A 3MF is a ZIP, and each entry carries the time it was made, so two made a second apart
    // differ in their bytes: compare what is inside.
    const inside = (bytes: Uint8Array) => unzipSync(bytes);
    expect(inside(Buffer.from(resources[0]?.resource.blob ?? '', 'base64'))).toEqual(
      inside(wall.files[0]?.bytes ?? new Uint8Array()),
    );
    expect(r.data['folder']).toBeUndefined();
  });

  it('or both', async () => {
    const { call, outRoot } = await connect();
    const r = await call('window_sealer_make_files', { settings: OPENING, packaging: 'zip', delivery: 'both' });
    expect(listed(join(outRoot, 'window-sealer-600x1000'))).toEqual(['window-sealer-600x1000-stl.zip']);
    expect(r.content.filter((c) => c.type === 'resource')).toHaveLength(1);
  });

  it('a plain folder name the agent gives, never a path out of the folder (Q100)', async () => {
    const { call, outRoot } = await connect();
    const r = await call('window_sealer_make_files', { settings: OPENING, packaging: 'zip', folder: 'kitchen' });
    expect(r.isError).toBeFalsy();
    expect(listed(join(outRoot, 'kitchen'))).toEqual(['window-sealer-600x1000-stl.zip']);
    for (const folder of ['../outside', 'a/b', '..', '.hidden', '/tmp/x', '']) {
      const bad = await call('window_sealer_make_files', { settings: OPENING, folder });
      expect(bad.isError, folder).toBe(true);
    }
    expect(listed(outRoot)).toEqual(['kitchen']);
  });

  it('an existing folder is kept unless overwrite, which replaces only its own files (Q94)', async () => {
    const { call, outRoot } = await connect();
    await call('window_sealer_make_files', { settings: OPENING });
    const folder = join(outRoot, 'window-sealer-600x1000');
    writeFileSync(join(folder, 'notes.txt'), 'mine');
    writeFileSync(join(folder, 'cross-18x18-print-8.stl'), 'stale');
    const again = await call('window_sealer_make_files', { settings: OPENING });
    expect(again.isError).toBe(true);
    expect(again.text).toContain('already exists');
    expect(again.text).toContain('overwrite');
    expect(readFileSync(join(folder, 'cross-18x18-print-8.stl'), 'utf8')).toBe('stale');
    const forced = await call('window_sealer_make_files', { settings: OPENING, overwrite: true });
    expect(forced.isError).toBeFalsy();
    expect(readFileSync(join(folder, 'notes.txt'), 'utf8')).toBe('mine');
    expect(readFileSync(join(folder, 'cross-18x18-print-8.stl'), 'utf8')).not.toBe('stale');
  });

  it('refuses one STL file, which holds a single object', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_make_files', { settings: OPENING, packaging: 'single' });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('Only 3MF holds every piece in one file');
  });

  it('takes the settings another tool returned', async () => {
    const { call, outRoot } = await connect();
    const planned = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, edges: { window: 'hung' }, thicknessMm: 4 },
    });
    const made = await call('window_sealer_make_files', { settings: planned.data['settings'], packaging: 'zip' });
    expect(made.isError).toBeFalsy();
    expect(made.data['settings']).toEqual(planned.data['settings']);
    expect(listed(join(outRoot, 'window-sealer-600x1000'))).toEqual(['window-sealer-600x1000-stl.zip']);
  });
});

describe('started without --out-root (Q96)', () => {
  it('files come in the reply when the agent does not choose', async () => {
    const { call } = await connectWithout();
    const r = await call('window_sealer_make_files', { settings: OPENING, packaging: 'zip' });
    expect(r.isError).toBeFalsy();
    expect(r.content.filter((c) => c.type === 'resource')).toHaveLength(1);
  });

  it('a request to write to a folder is refused, saying to add --out-root', async () => {
    const server = await connectWithout();
    for (const delivery of ['folder', 'both']) {
      const r = await server.call('window_sealer_make_files', { settings: OPENING, delivery });
      expect(r.isError).toBe(true);
      expect(r.text).toContain('--out-root');
    }
  });
});

async function connectWithout() {
  const server = createServer({});
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return {
    call: async (name: string, args: Record<string, unknown>) =>
      answer(await client.callTool({ name, arguments: args })),
  };
}

describe('hose ports (hose-port #12; Q114: ports as a list)', () => {
  it('the schema describes ports as a list of hose sizes and pieces', async () => {
    const { client } = await connect();
    const plan = (await client.listTools()).tools.find((t) => t.name === 'window_sealer_plan_wall');
    if (!plan) throw new Error('window_sealer_plan_wall expected');
    const ports = (plan.inputSchema.properties as Record<string, any>)['settings'].properties.ports;
    expect(ports.type).toBe('array');
    expect(Object.keys(ports.items.properties)).toEqual(['hoseMm', 'column', 'row']);
    expect(ports.items.required).toEqual(['hoseMm']);
    expect(ports.items.properties.column.type).toBe('integer');
  });

  it('plans and makes a wall with a port, the port in its own file', async () => {
    const { call, outRoot } = await connect();
    const settings = { ...OPENING, ports: [{ hoseMm: 150 }] };
    const planned = await call('window_sealer_plan_wall', { settings });
    expect(planned.isError).toBeFalsy();
    expect(planned.data['summary'].ports).toEqual([
      'Hose port: a 150 mm hose end, in column 2, row 1. A cap closes the port when the AC is off.',
    ]);
    expect(planned.data['settings'].ports).toEqual([{ hoseMm: 150, column: 2, row: 1 }]);
    const made = await call('window_sealer_make_files', { settings: planned.data['settings'] });
    expect(made.isError).toBeFalsy();
    expect(listed(join(outRoot, 'window-sealer-600x1000'))).toContain('piece-c2-r1-197.7x198.6-port-150.stl');
  });

  it('a port the page would refuse is an error with the page’s message', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', {
      settings: { ...OPENING, ports: [{ hoseMm: 150, column: 4, row: 1 }] },
    });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('- ports: Port 1: There is no column 4, row 1: the wall has 3 columns and 5 rows.');
  });
});

describe('a printer from the list (printer-presets #13)', () => {
  it('the schema lists the 29 printers; a wall plans on one, by id alone', async () => {
    const { client, call } = await connect();
    const plan = (await client.listTools()).tools.find((t) => t.name === 'window_sealer_plan_wall');
    if (!plan) throw new Error('window_sealer_plan_wall expected');
    const printer = (plan.inputSchema.properties as Record<string, any>)['settings'].properties.printer;
    expect(printer.properties.id.enum).toHaveLength(29);
    expect(printer.properties.kind.enum).toEqual(['default', 'custom', 'model']);
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, printer: { id: 'bambu-lab-a1-mini' } } });
    expect(r.isError).toBeFalsy();
    expect(r.data['settings'].printer).toEqual({ kind: 'model', id: 'bambu-lab-a1-mini' });
    // 170 mm pieces, 5 mm joints, a 603 × 1013 mm span: 4 across (4 × 170 + 3 × 5 = 695 ≥ 603;
    // 3 reach 520) and 6 up (6 × 170 + 5 × 5 = 1045 ≥ 1013; 5 reach 870).
    expect(r.data['summary'].headline).toBe('24 pieces: 4 across, 6 up, 3 mm thick');
  });
});
