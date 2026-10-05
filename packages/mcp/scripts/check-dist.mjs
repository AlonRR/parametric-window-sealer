// What a user gets (backlog item api-mcp-local, #47): the README's own steps, followed
// literally. Both packages are packed and installed with -g, into a temporary prefix, and the
// server is started from the README's own agent configuration, through the SDK's stdio client,
// as an agent's app would start it. HOME is a temporary folder, so the README's
// ~/window-sealer lands there. Run after building both packages. Prints its denominator.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(here, '..', '..');
let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};

console.log('the package as published:');
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: here }).toString());
const files = pack[0].files.map((f) => f.path);
check('holds dist/cli.js and the README', files.includes('dist/cli.js') && files.includes('README.md'));
check('holds no source or tests', !files.some((f) => f.startsWith('src/') || f.startsWith('test/')));
check('its command is window-sealer-mcp (Q91)', pkg.bin?.['window-sealer-mcp'] === './dist/cli.js');
check('which starts as a Node script', readFileSync(join(here, 'dist/cli.js'), 'utf8').startsWith('#!/usr/bin/env node\n'));

console.log("installed as the README's steps say:");
const readme = readFileSync(join(here, 'README.md'), 'utf8');
const prefix = mkdtempSync(join(tmpdir(), 'window-sealer-mcp-global-'));
const home = mkdtempSync(join(tmpdir(), 'window-sealer-mcp-home-'));
let client;
try {
  const steps = readme.split('## Getting it')[1]?.match(/```bash\n([\s\S]*?)```/)?.[1].trim().split('\n') ?? [];
  const packStep = steps.find((s) => s.startsWith('npm pack '));
  const installStep = steps.find((s) => s.startsWith('npm install -g '));
  check('the README packs both packages and installs them with -g', packStep !== undefined && installStep !== undefined);
  const packed = JSON.parse(
    execFileSync('npm', [...packStep.split(' ').slice(1), '--json', '--pack-destination', prefix], { cwd: repo }).toString(),
  );
  const tarballs = installStep.split(' ').slice(3);
  check(
    `the tarballs are the ones it names (${tarballs.join(', ')})`,
    JSON.stringify(packed.map((p) => `./${p.filename}`).sort()) === JSON.stringify([...tarballs].sort()),
  );
  // -g with --prefix: a global install that stays in the temporary folder. The install comes
  // from npm's cache where it can (CI's `npm ci` has just filled it).
  execFileSync('npm', ['install', '-g', '--prefix', prefix, ...tarballs, '--prefer-offline', '--no-audit', '--no-fund'], {
    cwd: prefix,
    stdio: 'ignore',
  });
  const bin = join(prefix, 'bin');
  const library = join(prefix, 'lib', 'node_modules', 'parametric-window-sealer');
  check('the library is a copy from its tarball, not a link to the workspace', !lstatSync(library).isSymbolicLink());
  const env = { PATH: `${bin}${delimiter}${process.env.PATH}`, HOME: home };
  const run = (args) => spawnSync('window-sealer-mcp', args, { env, encoding: 'utf8' });
  check('window-sealer-mcp --version', run(['--version']).stdout.trim() === pkg.version);
  check('window-sealer-mcp --help', run(['--help']).status === 0);
  check('a wrong option exits 2', run(['--outroot', 'x']).status === 2);

  // stdout carries only the protocol: a stray line there breaks an agent's app, even where
  // the SDK's own client skips it. One handshake, read raw.
  const raw = spawn('window-sealer-mcp', ['--out-root', join(home, 'raw')], { env, stdio: ['pipe', 'pipe', 'ignore'] });
  let out = '';
  const answered = new Promise((resolve) => {
    const timer = setTimeout(resolve, 15000);
    raw.stdout.on('data', (chunk) => {
      out += chunk;
      if (out.includes('"id":1')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  const hello = { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'check-dist', version: '0' } };
  raw.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: hello })}\n`);
  await answered;
  raw.kill();
  const lines = out.split('\n').filter((line) => line !== '');
  const protocolOnly = lines.length > 0 && lines.every((line) => {
    try {
      return JSON.parse(line).jsonrpc === '2.0';
    } catch {
      return false;
    }
  });
  check(`stdout holds only JSON-RPC messages (${lines.length} line${lines.length === 1 ? '' : 's'})`, protocolOnly);

  console.log("started from the README's agent configuration, over stdio:");
  const config = JSON.parse(readme.match(/```json\n([\s\S]*?)```/)?.[1] ?? '{}');
  const server = config.mcpServers?.['window-sealer'];
  check(`the configuration: ${server?.command} ${server?.args?.join(' ')}`, server?.command === 'window-sealer-mcp');
  client = new Client({ name: 'check-dist', version: pkg.version });
  await client.connect(new StdioClientTransport({ command: server.command, args: server.args, env, stderr: 'ignore' }));
  check('it answers, as window-sealer', client.getServerVersion()?.name === 'window-sealer');
  const { tools } = await client.listTools();
  check(`its four tools (${tools.length})`, tools.length === 4);
  const settings = JSON.parse(readme.match(/```json\n([\s\S]*?)```/g)?.[1]?.slice(8, -3) ?? '{}').settings;
  check("the README's example settings", settings?.openingWidthMm === 812.5);
  const text = (r) => r.content.find((c) => c.type === 'text')?.text ?? '';
  const plan = await client.callTool({ name: 'window_sealer_plan_wall', arguments: { settings } });
  check(`window_sealer_plan_wall: ${plan.structuredContent?.summary?.headline}`, !plan.isError && plan.structuredContent?.files?.length > 0);
  const made = await client.callTool({ name: 'window_sealer_make_files', arguments: { settings } });
  const folder = join(home, 'window-sealer', 'window-sealer-812.5x455');
  const written = existsSync(folder) ? readdirSync(folder).length : 0;
  check(
    `window_sealer_make_files: ${written} files under ~/window-sealer/window-sealer-812.5x455`,
    !made.isError && written === plan.structuredContent?.files?.length,
  );
  const reply = await client.callTool({
    name: 'window_sealer_make_files',
    arguments: { settings, format: '3mf', packaging: 'single', delivery: 'reply' },
  });
  const blob = reply.content.find((c) => c.type === 'resource')?.resource?.blob ?? '';
  check(`delivery reply: one 3MF of ${Buffer.from(blob, 'base64').length} bytes`, !reply.isError && blob.length > 1000);
  const again = await client.callTool({ name: 'window_sealer_make_files', arguments: { settings } });
  check('an existing folder needs overwrite', again.isError === true && text(again).includes('overwrite'));
} catch (error) {
  check(`the install and the calls (${error.message.split('\n')[0]})`, false);
} finally {
  await client?.close();
  rmSync(prefix, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (pass + fail === 0) {
  console.error('no checks ran -- that is a failure, not a pass');
  process.exit(1);
}
process.exit(fail === 0 ? 0 : 1);
