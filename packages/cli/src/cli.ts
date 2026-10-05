#!/usr/bin/env node
// The window-sealer command: run() with this process's arguments, folder and output.
import { run } from './run.js';

process.exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  out: (text) => process.stdout.write(`${text}\n`),
  err: (text) => process.stderr.write(`${text}\n`),
});
