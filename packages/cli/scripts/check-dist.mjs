// What a user gets (backlog item api-cli, #46): the README's own steps, followed literally.
// Both packages are packed and installed into an empty project outside the repository, and
// the command is run from there, so it uses the built library, not the workspace's source.
// Run after building both packages: `npm run test:dist`. Prints its denominator.
import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
check('holds dist/cli.js', files.includes('dist/cli.js'));
check('holds the README', files.includes('README.md'));
check('holds no source or tests', !files.some((f) => f.startsWith('src/') || f.startsWith('test/')));
check('its command is window-sealer, at dist/cli.js (Q84)', pkg.bin?.['window-sealer'] === './dist/cli.js');
check(
  'which starts as a Node script',
  readFileSync(join(here, 'dist/cli.js'), 'utf8').startsWith('#!/usr/bin/env node\n'),
);

console.log("installed as the README's steps say, into an empty project:");
const readme = readFileSync(join(here, 'README.md'), 'utf8');
const project = mkdtempSync(join(tmpdir(), 'window-sealer-user-'));
const work = mkdtempSync(join(tmpdir(), 'window-sealer-run-'));
try {
  const steps =
    readme
      .split('## Getting it')[1]
      ?.match(/```bash\n([\s\S]*?)```/)?.[1]
      .trim()
      .split('\n') ?? [];
  const packStep = steps.find((s) => s.startsWith('npm pack '));
  const installStep = steps.find((s) => s.startsWith('npm install '));
  check('the README packs and installs both packages', packStep !== undefined && installStep !== undefined);
  // The build is CI's step before this; the packing and installing are run as written,
  // the install from npm's cache where it can (CI's `npm ci` has just filled it).
  const packed = JSON.parse(
    execFileSync('npm', [...packStep.split(' ').slice(1), '--json', '--pack-destination', project], {
      cwd: repo,
    }).toString(),
  );
  const tarballs = packed.map((p) => p.filename).sort();
  const named = installStep
    .split(' ')
    .slice(2)
    .map((t) => t.replace('./', ''))
    .sort();
  check(`the tarballs are the ones it names (${named.join(', ')})`, JSON.stringify(tarballs) === JSON.stringify(named));
  writeFileSync(join(project, 'package.json'), '{ "private": true }\n');
  execFileSync('npm', ['install', ...installStep.split(' ').slice(2), '--prefer-offline', '--no-audit', '--no-fund'], {
    cwd: project,
    stdio: 'ignore',
  });
  const library = join(project, 'node_modules', 'parametric-window-sealer');
  check('the library is a copy from its tarball, not a link to the workspace', !lstatSync(library).isSymbolicLink());
  const bin = join(project, 'node_modules', '.bin', 'window-sealer');
  const sealer = (args, cwd = work) => spawnSync(bin, args, { cwd, encoding: 'utf8' });
  check('window-sealer --version', sealer(['--version']).stdout.trim() === pkg.version);

  console.log("the README's commands, each in an empty folder:");
  const commands = [...readme.matchAll(/```bash\n([\s\S]*?)```/g)]
    .flatMap((m) => m[1].split('\n'))
    .filter((line) => line.startsWith('window-sealer '));
  check(`there are some (${commands.length})`, commands.length >= 4);
  for (const command of commands) {
    const folder = mkdtempSync(join(work, 'c-'));
    const r = sealer(command.split(' ').slice(1), folder);
    check(`${command}: exit ${r.status}`, r.status === 0);
  }

  console.log("the README's sample output, line by line:");
  const sample =
    readme
      .match(/```text\n([\s\S]*?)```/)?.[1]
      .split('\n')
      .filter((l) => l !== '' && l.trim() !== '...') ?? [];
  const first = sealer(['--width', '600', '--height', '1000']);
  const printed = first.stdout.split('\n');
  check(`${sample.length} sample lines, all printed`, sample.length > 10 && sample.every((l) => printed.includes(l)));
  check('and the 22 files written', readdirSync(join(work, 'window-sealer-600x1000')).length === 22);

  console.log('exit status:');
  check('1 when the folder exists (Q88)', sealer(['--width', '600', '--height', '1000']).status === 1);
  check('2 without the opening (Q85)', sealer([]).status === 2);
  const json = JSON.parse(sealer(['--width', '600', '--height', '1000', '--dry-run', '--json']).stdout);
  check('--json --dry-run: 22 files, nothing written (Q87, Q89)', json.ok && json.dryRun && json.files.length === 22);
} catch (error) {
  check(`the install and the runs (${error.message.split('\n')[0]})`, false);
} finally {
  rmSync(project, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (pass + fail === 0) {
  console.error('no checks ran -- that is a failure, not a pass');
  process.exit(1);
}
process.exit(fail === 0 ? 0 : 1);
