// What npm users would get (backlog item api-library, #45): the built package, loaded the
// way Node loads it, through its package.json "exports", with no TypeScript and no alias.
// Run after `npm run build`: `npm run test:dist`. Prints its denominator.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};

console.log('the package as published:');
const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: here }).toString());
const files = pack[0].files.map((f) => f.path);
check('holds dist/index.js', files.includes('dist/index.js'));
check('holds dist/index.d.ts', files.includes('dist/index.d.ts'));
check('holds the README', files.includes('README.md'));
check('holds no source or tests', !files.some((f) => f.startsWith('src/') || f.startsWith('test/')));

console.log('loaded by name, as a user would:');
const api = await import('parametric-window-sealer');
check(
  'resolves to the built dist, not the source',
  import.meta.resolve('parametric-window-sealer').endsWith('/dist/index.js'),
);
check('exports makeWall', typeof api.makeWall === 'function');
const wall = await api.makeWall(api.EXAMPLE_PARAMS, { format: '3mf', packaging: 'single' });
check('makes the example wall: 15 pieces', wall.plan.pieces.length === 15);
check('and its one 3MF file', wall.files.length === 1 && wall.files[0].name === 'window-sealer-600x1000.3mf');
const model = strFromU8(unzipSync(wall.files[0].bytes)['3D/3dModel.model'] ?? new Uint8Array());
check(
  'holding every copy: 15 panels, 22 strips, 8 crosses, 18 edges, 4 stiffener clips',
  [...model.matchAll(/<item /g)].length === 67,
);

console.log("the README's promises:");
const readme = readFileSync(join(here, 'README.md'), 'utf8');
const underneath = readme.split('### The steps underneath')[1]?.split('\n## ')[0] ?? '';
const named = [...underneath.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map((m) => m[1]);
check(`names at least ten exported steps (${named.length} named)`, named.length >= 10);
for (const name of named) check(`exports ${name}`, name in api);

// The usage example, run as a file beside this script so it imports the package by name,
// from an empty folder so the files it writes can be counted.
const example = readme.match(/```js\n([\s\S]*?)```/)?.[1];
check('has a usage example', example !== undefined);
if (example !== undefined) {
  const script = join(here, 'scripts', '.readme-example.mjs');
  const out = mkdtempSync(join(tmpdir(), 'readme-example-'));
  try {
    writeFileSync(script, example);
    const printed = execFileSync('node', [script], { cwd: out }).toString().trim();
    check(`the example runs and prints the headline (${printed})`, /^\d+ pieces: /.test(printed));
    check('and writes its file', readdirSync(out).length === 1);
  } catch (error) {
    check(`the example runs (${error.message.split('\n')[0]})`, false);
  } finally {
    rmSync(script, { force: true });
    rmSync(out, { recursive: true, force: true });
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (pass + fail === 0) {
  console.error('no checks ran -- that is a failure, not a pass');
  process.exit(1);
}
process.exit(fail === 0 ? 0 : 1);
