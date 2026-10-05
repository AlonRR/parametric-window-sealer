#!/usr/bin/env node
// window-sealer-mcp: the server over stdio (Q98). stdout carries the protocol, so anything
// else goes to stderr.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readOptions } from './options.js';
import { createServer } from './server.js';

const options = readOptions(process.argv.slice(2), process.cwd());
if ('print' in options) {
  process.stdout.write(`${options.print}\n`);
} else if ('error' in options) {
  process.stderr.write(`${options.error}\n`);
  process.exitCode = 2;
} else {
  const { outRoot } = options.run;
  await createServer(options.run).connect(new StdioServerTransport());
  process.stderr.write(
    `window-sealer-mcp: ${outRoot === undefined ? 'no --out-root, so files come only in the reply' : `writing under ${outRoot}`}\n`,
  );
}
