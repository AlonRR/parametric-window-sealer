// The window-sealer command (backlog item api-cli, #46; the owner's decisions Q83 to Q90).
// run() takes the arguments and where to print, and returns the exit status, so the tests
// call it directly; cli.ts connects it to the process.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  EXAMPLE_PARAMS,
  checkChoice,
  describePlan,
  makeWall,
  planFiles,
  planWall,
  toFormValues,
  wallLabel,
} from 'parametric-window-sealer';
import type { DownloadChoice, Format, Packaging, PlanText } from 'parametric-window-sealer';
import { SETTING_FLAGS } from './flags.js';
import { readParamsFile, settingsFrom } from './settings.js';
import type { FromFile, Problem } from './settings.js';

export interface Io {
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
}

const DONE = 0;
const COULD_NOT_WRITE = 1;
const WRONG_USE = 2;

const FORMATS: readonly Format[] = ['stl', '3mf'];
const PACKAGINGS: readonly Packaging[] = ['separate', 'zip', 'single'];

// The statement in the README and on the page (Q36), word for word.
const OUTPUT_STATEMENT =
  'The STL and other files this tool generates, and anything you print from them, are yours ' +
  'to use, change, share or sell for any purpose, with no conditions from this project.';

const OUTPUT_OPTIONS = [
  { flag: 'format', value: '<stl|3mf>', help: 'File format. (stl)' },
  { flag: 'packaging', value: '<separate|zip|single>', help: 'One file per shape, one ZIP, or one 3MF holding every copy. (separate)' },
  { flag: 'out', value: '<folder>', help: 'Where to write. (window-sealer-<width>x<height>)' },
  { flag: 'force', value: '', help: 'Write into a folder that exists, replacing the files it writes.' },
  { flag: 'dry-run', value: '', help: 'Print the plan and the files it would write; write nothing.' },
  { flag: 'json', value: '', help: 'Print JSON, for scripts and LLM agents.' },
  { flag: 'params', value: '<file.json>', help: "Settings in the library's own shape; flags override them." },
  { flag: 'help', value: '', help: 'This text.' },
  { flag: 'version', value: '', help: 'The version.' },
];

function version(): string {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
  return pkg.version;
}

const WIDTH = 120;

// Greedy word wrap: lines of at most `width` characters, unless one word is longer.
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line === '' ? word : `${line} ${word}`;
  }
  return [...lines, line];
}

function help(): string {
  const starting = toFormValues(EXAMPLE_PARAMS);
  const rows: [string, string][] = [
    ...OUTPUT_OPTIONS.map((o): [string, string] => [`--${o.flag}${o.value ? ` ${o.value}` : ''}`, o.help]),
  ];
  const settings: [string, string][] = SETTING_FLAGS.map((f) => {
    // A long list of choices (the printers) is named after the hint, so the table stays narrow.
    const long = (f.values?.length ?? 0) > 8;
    const unit = f.field.endsWith('Pct') ? '<%>' : '<mm>'; // a percentage, such as the tape's squeeze
    const value = f.list ? '<mm[@column,row]>' : f.values === undefined ? unit : long ? '<id>' : `<${f.values.join('|')}>`;
    const start = f.flag === 'width' || f.flag === 'height' ? '' : starting[f.field];
    const help = f.list
      ? `${f.help} Give --${f.flag} again for each port.`
      : long
        ? `${f.help} One of: ${f.values?.join(', ')}.`
        : f.help;
    return [`--${f.flag} ${value}`, start ? `${help} (${start})` : help];
  });
  const pad = Math.max(...[...rows, ...settings].map(([left]) => left.length)) + 2;
  const table = (list: [string, string][]) =>
    list.flatMap(([left, right]) =>
      wrap(right, WIDTH - 2 - pad).map((line, i) => `  ${(i === 0 ? left : '').padEnd(pad)}${line}`),
    );
  return [
    'Usage: window-sealer --width <mm> --height <mm> [options]',
    '       window-sealer --params <file.json> [options]',
    '',
    'Plans the 3D-printable panels that close off the part of a window left open around a',
    'window air conditioner, fan or hose, and writes the files to print. Lengths are in mm.',
    '',
    'Options:',
    ...table(rows),
    '',
    'Settings, as on the page, with the value each starts at:',
    ...table(settings),
    '',
    'Exit status: 0 done, 1 could not write, 2 wrong options or settings.',
    '',
    ...wrap(OUTPUT_STATEMENT, 90),
  ].join('\n');
}

function summaryLines(summary: PlanText): string[] {
  const lines = [summary.headline, summary.columns, summary.rows, summary.span, summary.joints, summary.edges];
  lines.push(...summary.ports, summary.seal, summary.fill);
  for (const warning of summary.warnings) lines.push(`Warning: ${warning}`);
  for (const leftover of summary.leftovers) {
    lines.push(leftover.message, `  Change it with --${leftover.axis}-leftover:`);
    const pad = Math.max(...leftover.options.map((o) => o.value.length)) + 2;
    for (const o of leftover.options) {
      const note = o.value === leftover.used ? ' (in use)' : o.possible ? '' : ' (not possible)';
      lines.push(`    ${o.value.padEnd(pad)}${o.label}${note}`);
    }
  }
  return lines;
}

export async function run(args: string[], io: Io): Promise<number> {
  const asJson = args.includes('--json');
  const fail = (code: number, problems: Problem[]): number => {
    if (asJson) io.out(JSON.stringify({ ok: false, errors: problems }, null, 2));
    else {
      for (const p of problems) io.err(p.flag === undefined ? p.message : `${p.flag}: ${p.message}`);
      if (code === WRONG_USE) io.err('Run window-sealer --help for the options.');
    }
    return code;
  };

  let parsed;
  try {
    parsed = parseArgs({
      args,
      strict: true,
      allowPositionals: false,
      options: {
        format: { type: 'string' },
        packaging: { type: 'string' },
        out: { type: 'string' },
        params: { type: 'string' },
        force: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean' },
        ...Object.fromEntries(SETTING_FLAGS.map((f) => [f.flag, { type: 'string' as const, multiple: f.list === true }])),
      },
    });
  } catch (error) {
    return fail(WRONG_USE, [{ message: `window-sealer: ${(error as Error).message}` }]);
  }
  const options = parsed.values as Record<string, string | string[] | boolean | undefined>;
  if (options['help'] === true) {
    io.out(help());
    return DONE;
  }
  if (options['version'] === true) {
    io.out(version());
    return DONE;
  }
  // A repeatable flag (--port) arrives as a list: its values joined as the form writes them.
  const text = (name: string): string | undefined => {
    const value = options[name];
    if (Array.isArray(value)) return value.join(' ');
    return typeof value === 'string' ? value : undefined;
  };

  const problems: Problem[] = [];
  const format = text('format') ?? 'stl';
  const packaging = text('packaging') ?? 'separate';
  if (!(FORMATS as readonly string[]).includes(format)) {
    problems.push({ flag: '--format', message: `Choose one of: ${FORMATS.join(', ')}` });
  }
  if (!(PACKAGINGS as readonly string[]).includes(packaging)) {
    problems.push({ flag: '--packaging', message: `Choose one of: ${PACKAGINGS.join(', ')}` });
  }

  let start: FromFile | undefined;
  const paramsFile = text('params');
  if (paramsFile !== undefined) {
    let fileText: string | undefined;
    try {
      fileText = readFileSync(resolve(io.cwd, paramsFile), 'utf8');
    } catch (error) {
      problems.push({ flag: '--params', message: `cannot read ${paramsFile}: ${(error as Error).message}` });
    }
    if (fileText !== undefined) {
      const read = readParamsFile(fileText, paramsFile);
      if ('problems' in read) problems.push(...read.problems);
      else start = read;
    }
  }
  if (problems.length > 0) return fail(WRONG_USE, problems);

  const flags = Object.fromEntries(SETTING_FLAGS.map((f) => [f.flag, text(f.flag)]));
  const settings = settingsFrom(start, flags);
  if ('problems' in settings) return fail(WRONG_USE, settings.problems);
  const { params } = settings;

  const choice = { format, packaging } as DownloadChoice;
  try {
    checkChoice(choice);
  } catch (error) {
    return fail(WRONG_USE, [{ flag: '--packaging', message: (error as Error).message }]);
  }

  const outDir = resolve(io.cwd, text('out') ?? wallLabel(params.openingWidthMm, params.openingHeightMm));
  const rel = relative(io.cwd, outDir);
  const shown = `${rel === '' ? '.' : rel.startsWith('..') || isAbsolute(rel) ? outDir : rel}/`;
  const exists = existsSync(outDir);
  const force = options['force'] === true;
  const plan = planWall(params);
  const summary = describePlan(plan, params);

  if (options['dry-run'] === true) {
    const files = planFiles(params, choice);
    if (asJson) {
      io.out(JSON.stringify({ ok: true, dryRun: true, params, summary, plan, out: shown, files }, null, 2));
      return DONE;
    }
    const lines = [...summaryLines(summary), '', `Would write ${files.length} ${files.length === 1 ? 'file' : 'files'} to ${shown}:`];
    lines.push(...files.map((f) => `  ${f.name}`));
    if (exists && !force) lines.push('', `${shown} already exists: writing needs --force, or another --out <folder>.`);
    io.out(lines.join('\n'));
    return DONE;
  }

  if (exists && !force) {
    return fail(COULD_NOT_WRITE, [{ message: `${shown} already exists; use --force to overwrite, or --out <folder>.` }]);
  }
  const wall = await makeWall(params, choice);
  try {
    await mkdir(outDir, { recursive: true });
    for (const f of wall.files) await writeFile(join(outDir, f.name), f.bytes);
  } catch (error) {
    return fail(COULD_NOT_WRITE, [{ message: `cannot write to ${shown}: ${(error as Error).message}` }]);
  }
  if (asJson) {
    const files = wall.files.map((f) => ({ name: f.name, type: f.type, bytes: f.bytes.length }));
    io.out(JSON.stringify({ ok: true, dryRun: false, params, summary, plan, out: shown, files }, null, 2));
    return DONE;
  }
  const count = wall.files.length;
  const lines = [...summaryLines(summary), '', `Wrote ${count} ${count === 1 ? 'file' : 'files'} to ${shown}:`];
  lines.push(...wall.files.map((f) => `  ${f.name}`));
  io.out(lines.join('\n'));
  return DONE;
}
