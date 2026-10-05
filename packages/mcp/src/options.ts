// The server's command line: where it may write (Q94), set once when it is added to an agent.
// Without --out-root it still runs, with files only in the reply (Q96).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { ServerOptions } from './server.js';

// Ends with the statement in the README and on the page (Q36), word for word.
const HELP = `Usage: window-sealer-mcp [--out-root <folder>]

A local MCP server for LLM agents, over stdio. It plans the 3D-printable panels that close off
the part of a window left open around a window air conditioner, fan or hose, and makes the
files to print. Your agent's app starts it; add it to the app's MCP servers, for example:

  {
    "mcpServers": {
      "window-sealer": {
        "command": "window-sealer-mcp",
        "args": ["--out-root", "~/window-sealer"]
      }
    }
  }

Options:
  --out-root <folder>   The only folder it writes under; each wall gets a folder inside it.
                        Without it, the files come only in the agent's reply.
  --help                This text.
  --version             The version.

The STL and other files this tool generates, and anything you print from them, are yours
to use, change, share or sell for any purpose, with no conditions from this project.`;

export type Options = { run: ServerOptions } | { print: string } | { error: string };

function version(): string {
  return (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version;
}

export function readOptions(args: string[], cwd: string): Options {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      strict: true,
      allowPositionals: false,
      options: { 'out-root': { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' } },
    }));
  } catch (error) {
    return { error: `window-sealer-mcp: ${(error as Error).message}\nRun window-sealer-mcp --help for the options.` };
  }
  if (values.help === true) return { print: HELP };
  if (values.version === true) return { print: version() };
  const given = values['out-root'];
  if (given === undefined) return { run: {} };
  const home = given === '~' || given.startsWith('~/') ? join(homedir(), given.slice(1)) : given;
  return { run: { outRoot: isAbsolute(home) ? home : resolve(cwd, home) } };
}
