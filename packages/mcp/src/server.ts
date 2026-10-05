// The MCP server (backlog item api-mcp-local, #47; the owner's decisions Q91 to Q100): four
// tools on the library, for an LLM agent on the user's own machine.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  EXAMPLE_PARAMS,
  SETTINGS,
  checkChoice,
  describePlan,
  makeWall,
  planFiles,
  planWall,
  readSettings,
  settingAt,
  wallLabel,
} from 'parametric-window-sealer';
import type { DownloadChoice, Params, SettingProblem } from 'parametric-window-sealer';
import * as z from 'zod';
import { settingsSchema } from './schema.js';

export interface ServerOptions {
  outRoot?: string; // absolute; the only folder the server writes under (Q94). None: files only in the reply (Q96)
}

const INSTRUCTIONS = [
  'Plans and makes 3D-printable panels that close off the part of a window left open around a window',
  'air conditioner, fan or hose. Every length is in mm.',
  'Start with window_sealer_list_settings to see what can be set and what to ask the user: the',
  "opening's width and height, as the user measures the opening they can see, are required.",
  'window_sealer_plan_wall shows the plan and the files without making them; window_sealer_make_files',
  'makes them. The settings a tool returns can be passed to the next as they are.',
].join(' ');

const FOLDER_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function version(): string {
  return (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version;
}

type Content =
  | { type: 'text'; text: string }
  | { type: 'resource'; resource: { uri: string; mimeType: string; blob: string } };

interface Result {
  [key: string]: unknown;
  content: Content[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const json = (data: Record<string, unknown>, extra: Content[] = []): Result => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }, ...extra],
  structuredContent: data,
});

const failure = (lines: string[]): Result => ({ isError: true, content: [{ type: 'text', text: lines.join('\n') }] });

const problemLine = (p: SettingProblem): string => (p.path === '' ? p.message : `${p.path}: ${p.message}`);

// The settings, checked by the page's rules, or the error the agent should see.
function settingsOf(input: unknown): { params: Params } | { error: Result } {
  const read = readSettings(input);
  if (read.ok) return { params: read.params };
  return { error: failure(['The settings cannot be used:', ...read.problems.map((p) => `- ${problemLine(p)}`)]) };
}

function choiceOf(
  format: 'stl' | '3mf' | undefined,
  packaging: DownloadChoice['packaging'] | undefined,
): { choice: DownloadChoice } | { error: Result } {
  const choice: DownloadChoice = { format: format ?? 'stl', packaging: packaging ?? 'separate' };
  try {
    checkChoice(choice);
    return { choice };
  } catch (error) {
    return { error: failure([(error as Error).message]) };
  }
}

const SETTINGS_INPUT = settingsSchema();
const FORMAT = z.enum(['stl', '3mf']).optional().describe('File format. Starts at stl.');
const PACKAGING = z
  .enum(['separate', 'zip', 'single'])
  .optional()
  .describe('One file per panel and per strip, cross or edge shape; those in one ZIP; or one 3MF holding every copy. Starts at separate.');

export function createServer(options: ServerOptions): McpServer {
  const server = new McpServer({ name: 'window-sealer', version: version() }, { instructions: INSTRUCTIONS });
  const { outRoot } = options;

  server.registerTool(
    'window_sealer_list_settings',
    {
      title: 'List the settings',
      description:
        'Every setting: where it goes in the settings object, what it means, the value it starts at, and its choices. ' +
        "The opening has no starting value: ask the user for the width and height of the opening they can see, in mm.",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    () => {
      const settings = SETTINGS.map((s) => {
        const start = s.path.startsWith('opening') ? null : (settingAt(EXAMPLE_PARAMS, s.path) ?? null);
        // A place for the tape is true or false in the library's shape, not the page's yes or no.
        const choices = s.onOff ? [false, true] : s.values ? [...s.values] : undefined;
        return { path: s.path, help: s.help, startsAt: start, ...(choices ? { choices } : {}) };
      });
      return json({ settings });
    },
  );

  server.registerTool(
    'window_sealer_check_settings',
    {
      title: 'Check settings',
      description:
        "Checks settings by the page's rules. Returns ok and the complete settings, or the page's message for each one that is wrong.",
      inputSchema: { settings: SETTINGS_INPUT },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ settings }) => {
      const read = readSettings(settings);
      if (read.ok) return json({ ok: true, settings: read.params });
      return json({ ok: false, problems: read.problems.map((p) => ({ path: p.path, message: p.message })) });
    },
  );

  server.registerTool(
    'window_sealer_plan_wall',
    {
      title: 'Plan a wall',
      description:
        "Plans the wall without making anything: the page's summary (pieces, sizes, joints, edges, warnings, and the choices " +
        'when full pieces leave too little room), the plan, the complete settings and the files it would make.',
      inputSchema: { settings: SETTINGS_INPUT, format: FORMAT, packaging: PACKAGING },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ settings, format, packaging }) => {
      const read = settingsOf(settings);
      if ('error' in read) return read.error;
      const picked = choiceOf(format, packaging);
      if ('error' in picked) return picked.error;
      const plan = planWall(read.params);
      return json({
        settings: read.params,
        summary: describePlan(plan, read.params),
        plan,
        files: planFiles(read.params, picked.choice),
      });
    },
  );

  server.registerTool(
    'window_sealer_make_files',
    {
      title: 'Make the files',
      description:
        'Makes the files to print. delivery chooses how they come: written to a folder on the user’s machine (the paths are ' +
        'returned), in this reply (base64), or both. ' +
        (outRoot === undefined
          ? 'This server was started without a folder, so files come only in the reply.'
          : `Folders are made under ${outRoot}; files are written there unless delivery says otherwise.`),
      inputSchema: {
        settings: SETTINGS_INPUT,
        format: FORMAT,
        packaging: PACKAGING,
        delivery: z
          .enum(['folder', 'reply', 'both'])
          .optional()
          .describe(outRoot === undefined ? 'Only reply works on this server. Starts at reply.' : 'Starts at folder.'),
        folder: z
          .string()
          .optional()
          .describe(
            'A plain name for the folder, such as kitchen: letters, digits, dot, dash and underscore, no path. ' +
              'Starts at the wall’s name, as window-sealer-600x1000.',
          ),
        overwrite: z
          .boolean()
          .optional()
          .describe('Write into a folder that already exists, replacing the files it makes and leaving any others.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ settings, format, packaging, delivery, folder, overwrite }) => {
      const read = settingsOf(settings);
      if ('error' in read) return read.error;
      const picked = choiceOf(format, packaging);
      if ('error' in picked) return picked.error;
      const how = delivery ?? (outRoot === undefined ? 'reply' : 'folder');
      const name = folder ?? wallLabel(read.params.openingWidthMm, read.params.openingHeightMm);
      if (!FOLDER_NAME.test(name)) {
        return failure([`folder must be a plain name such as kitchen (letters, digits, dot, dash, underscore), not ${JSON.stringify(name)}.`]);
      }
      const toFolder = how === 'folder' || how === 'both';
      if (toFolder && outRoot === undefined) {
        return failure([
          'This server was started without a folder to write to.',
          'Ask for delivery "reply", or have the user add --out-root <folder> to the server’s command.',
        ]);
      }
      const dir = outRoot === undefined ? undefined : join(outRoot, name);
      if (toFolder && dir !== undefined && existsSync(dir) && overwrite !== true) {
        return failure([
          `${dir} already exists.`,
          'Pass overwrite: true to replace the files this makes there, or give another folder name.',
        ]);
      }

      const wall = await makeWall(read.params, picked.choice);
      if (toFolder && dir !== undefined) {
        try {
          await mkdir(dir, { recursive: true });
          for (const f of wall.files) await writeFile(join(dir, f.name), f.bytes);
        } catch (error) {
          return failure([`Could not write to ${dir}: ${(error as Error).message}`]);
        }
      }
      const files = wall.files.map((f) => ({
        name: f.name,
        type: f.type,
        bytes: f.bytes.length,
        ...(toFolder && dir !== undefined ? { path: join(dir, f.name) } : {}),
      }));
      const resources: Content[] =
        how === 'folder'
          ? []
          : wall.files.map((f) => ({
              type: 'resource' as const,
              resource: {
                uri: `window-sealer:///${name}/${f.name}`,
                mimeType: f.type,
                blob: Buffer.from(f.bytes).toString('base64'),
              },
            }));
      return json(
        {
          settings: read.params,
          summary: wall.summary,
          ...(toFolder && dir !== undefined ? { folder: dir } : {}),
          files,
        },
        resources,
      );
    },
  );

  return server;
}
