// The MCP server (backlog item api-mcp-local, #47; the owner's decisions Q91 to Q100), driven
// through the SDK's own client over an in-memory link, as an agent would drive it.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
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
  const call = async (name: string, args: Record<string, unknown> = {}) => answer(await client.callTool({ name, arguments: args }));
  return { client, call, outRoot };
}

const listed = (folder: string) => readdirSync(folder).sort();

function answer(result: unknown) {
  const r = result as ToolAnswer;
  const text = r.content.find((c) => c.type === 'text')?.text ?? '';
  return { ...r, text, data: (r.structuredContent ?? {}) as Record<string, any> };
}

describe('the server', () => {
  it('offers the four tools (Q92), each saying what it changes', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(TOOLS);
    const hints = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    for (const name of TOOLS.slice(0, 3)) expect(hints[name]).toMatchObject({ readOnlyHint: true, openWorldHint: false });
    expect(hints['window_sealer_make_files']).toMatchObject({ readOnlyHint: false, openWorldHint: false });
  });

  it('describes every setting in its input schema, in the library’s shape (Q99)', async () => {
    const { client } = await connect();
    const plan = (await client.listTools()).tools.find((t) => t.name === 'window_sealer_plan_wall');
    const settings = (plan?.inputSchema.properties as Record<string, any>)['settings'];
    for (const s of SETTINGS) {
      const node = s.path.split('.').reduce((at: any, key: string) => at?.properties?.[key], settings);
      expect(node, s.path).toBeDefined();
      expect(node.description).toBe(s.help);
      if (s.values) expect(node.enum).toEqual([...s.values]);
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
    expect(settings.find((s) => s.path === 'joint.slotMm')).toEqual({
      path: 'joint.slotMm',
      help: 'How deep a piece can go into a strip.',
      startsAt: 8,
    });
    expect(settings.find((s) => s.path === 'edges.window')).toMatchObject({ startsAt: 'slider', choices: ['slider', 'hung'] });
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
      problems: [{ path: 'joint.slideMm', message: 'Make it less than the slot depth, so a piece always stays in its slot.' }],
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

  it('settings the page refuses are an error with the page’s message for each', async () => {
    const { call } = await connect();
    const r = await call('window_sealer_plan_wall', { settings: { ...OPENING, thicknessMm: 0, joint: { slideMm: 8 } } });
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
      bytes: 684,
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
    const resources = r.content.filter((c) => c.type === 'resource') as { resource: { uri: string; mimeType: string; blob: string } }[];
    expect(resources).toHaveLength(1);
    expect(resources[0]?.resource.uri).toBe('window-sealer:///window-sealer-600x1000/window-sealer-600x1000.3mf');
    expect(resources[0]?.resource.mimeType).toBe('model/3mf');
    expect(Buffer.from(resources[0]?.resource.blob ?? '', 'base64')).toEqual(Buffer.from(wall.files[0]?.bytes ?? []));
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
    const planned = await call('window_sealer_plan_wall', { settings: { ...OPENING, edges: { window: 'hung' }, thicknessMm: 4 } });
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
    call: async (name: string, args: Record<string, unknown>) => answer(await client.callTool({ name, arguments: args })),
  };
}
