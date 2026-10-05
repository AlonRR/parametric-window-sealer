// The window-sealer command (backlog item api-cli, #46), run in an empty folder each time.
// Each block is one of the owner's decisions, Q85 to Q90.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, WINDOW_PRESETS, makeWall, planFiles } from 'parametric-window-sealer';
import { SETTING_FLAGS } from '../src/flags.js';
import { run } from '../src/run.js';

async function cli(args: string[], cwd = mkdtempSync(join(tmpdir(), 'window-sealer-')), files: Record<string, string> = {}) {
  for (const [name, text] of Object.entries(files)) writeFileSync(join(cwd, name), text);
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, { cwd, out: (t) => out.push(t), err: (t) => err.push(t) });
  return { code, out: out.join('\n'), err: err.join('\n'), cwd };
}

const json = (text: string) => JSON.parse(text) as Record<string, any>;
const OPENING = ['--width', '600', '--height', '1000'];
const LISTED = (cwd: string) => readdirSync(cwd).sort();

describe('the opening is required (Q85)', () => {
  it('without it nothing is made, and both flags are named', async () => {
    const r = await cli([]);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--width: Required:');
    expect(r.err).toContain('--height: Required:');
    expect(LISTED(r.cwd)).toEqual([]);
  });

  it('a parameters file can give it instead', async () => {
    const file = JSON.stringify({ openingWidthMm: 600, openingHeightMm: 1000 });
    const r = await cli(['--params', 'w.json', '--dry-run'], undefined, { 'w.json': file });
    expect(r.code).toBe(0);
  });
});

describe('by default: separate STL files in one folder named after the wall (Q86)', () => {
  it('writes the files the page would, byte for byte', async () => {
    const r = await cli(OPENING);
    expect(r.code).toBe(0);
    expect(LISTED(r.cwd)).toEqual(['window-sealer-600x1000']);
    const folder = join(r.cwd, 'window-sealer-600x1000');
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' });
    expect(LISTED(folder)).toEqual(wall.files.map((f) => f.name).sort());
    for (const f of wall.files) expect(readFileSync(join(folder, f.name))).toEqual(Buffer.from(f.bytes));
  });

  it('--format, --packaging and --out change that', async () => {
    const r = await cli([...OPENING, '--format', '3mf', '--packaging', 'single', '--out', 'prints/kitchen']);
    expect(r.code).toBe(0);
    expect(readdirSync(join(r.cwd, 'prints/kitchen'))).toEqual(['window-sealer-600x1000.3mf']);
  });

  it('refuses one STL file, which holds a single object', async () => {
    const r = await cli([...OPENING, '--packaging', 'single']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('Only 3MF holds every piece in one file');
    expect(LISTED(r.cwd)).toEqual([]);
  });

  it('refuses a format or packaging it does not know', async () => {
    expect((await cli([...OPENING, '--format', 'obj'])).err).toContain('--format: Choose one of: stl, 3mf');
    expect((await cli([...OPENING, '--packaging', 'tar'])).err).toContain(
      '--packaging: Choose one of: separate, zip, single',
    );
  });
});

describe('what it prints (Q87)', () => {
  it('the page’s summary and the files written', async () => {
    const r = await cli(OPENING);
    expect(r.out).toContain('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(r.out).toContain('Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide.');
    expect(r.out).toContain('Wrote 21 files to window-sealer-600x1000/');
    expect(r.out).toContain('  cross-18x18-print-8.stl');
  });

  it('a leftover note with its options and the flag that changes it', async () => {
    const r = await cli(['--width', '402.5', '--height', '1000', '--width-mode', 'full-plus-filler', '--dry-run']);
    expect(r.out).toContain('Width: 2 full 200 mm pieces leave 0.5 mm, too little for another joint and a filler.');
    expect(r.out).toMatch(/--width-leftover:\n.*spread .*\(in use\)\n.*equal .*\n.*shorten /);
  });

  it('--json: the parameters, the plan, the summary and the files, for scripts and agents', async () => {
    const r = await cli([...OPENING, '--json']);
    expect(r.code).toBe(0);
    const result = json(r.out);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.params).toEqual(EXAMPLE_PARAMS);
    expect(result.summary.headline).toBe('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(result.plan.pieces).toHaveLength(15);
    expect(result.out).toBe('window-sealer-600x1000/');
    expect(result.files).toHaveLength(21);
    expect(result.files[0]).toEqual({ name: 'piece-c1-r1-197.7x198.6.stl', type: 'model/stl', bytes: 684 });
  });

  it('--json: errors as JSON too, naming the flag and the setting', async () => {
    const r = await cli(['--height', '1000', '--slide', '8', '--json']);
    expect(r.code).toBe(2);
    const result = json(r.out);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual({ flag: '--width', setting: 'openingWidthMm', message: expect.stringMatching(/^Required:/) });
    expect(result.errors).toContainEqual({
      flag: '--slide',
      setting: 'joint.slideMm',
      message: 'Make it less than the slot depth, so a piece always stays in its slot.',
    });
  });

  it('its parameters can be saved and read back as a --params file', async () => {
    const first = json((await cli([...OPENING, '--window', 'hung', '--thickness', '4', '--dry-run', '--json'])).out);
    const again = await cli(['--params', 'saved.json', '--dry-run', '--json'], undefined, {
      'saved.json': JSON.stringify(first.params),
    });
    expect(json(again.out).params).toEqual(first.params);
  });
});

describe('an existing folder (Q88)', () => {
  it('stops unless --force, which replaces its own files and leaves the rest', async () => {
    const first = await cli(OPENING);
    const folder = join(first.cwd, 'window-sealer-600x1000');
    writeFileSync(join(folder, 'notes.txt'), 'mine');
    writeFileSync(join(folder, 'cross-18x18-print-8.stl'), 'stale');

    const again = await cli(OPENING, first.cwd);
    expect(again.code).toBe(1);
    expect(again.err).toContain('window-sealer-600x1000/ already exists; use --force to overwrite, or --out <folder>');
    expect(readFileSync(join(folder, 'cross-18x18-print-8.stl'), 'utf8')).toBe('stale');

    const forced = await cli([...OPENING, '--force'], first.cwd);
    expect(forced.code).toBe(0);
    expect(readFileSync(join(folder, 'notes.txt'), 'utf8')).toBe('mine');
    expect(readFileSync(join(folder, 'cross-18x18-print-8.stl'), 'utf8')).not.toBe('stale');
    expect(readdirSync(folder)).toHaveLength(21 + 1);
  });
});

describe('--dry-run (Q89)', () => {
  it('lists the files it would write and writes nothing', async () => {
    const r = await cli([...OPENING, '--dry-run']);
    expect(r.code).toBe(0);
    expect(LISTED(r.cwd)).toEqual([]);
    expect(r.out).toContain('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(r.out).toContain('Would write 21 files to window-sealer-600x1000/');
    for (const f of planFiles(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' })) {
      expect(r.out).toContain(`  ${f.name}`);
    }
  });

  it('says when the real run would need --force', async () => {
    const first = await cli(OPENING);
    const r = await cli([...OPENING, '--dry-run'], first.cwd);
    expect(r.code).toBe(0);
    expect(r.out).toContain('window-sealer-600x1000/ already exists: writing needs --force');
  });

  it('--json marks it and gives no sizes', async () => {
    const result = json((await cli([...OPENING, '--dry-run', '--json'])).out);
    expect(result.dryRun).toBe(true);
    expect(result.files[0]).toEqual({ name: 'piece-c1-r1-197.7x198.6.stl', type: 'model/stl' });
  });
});

describe('the settings as flags (Q90) and in a file (Q85)', () => {
  const params = async (args: string[], files: Record<string, string> = {}) => {
    const r = await cli([...args, '--dry-run', '--json'], undefined, files);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('a flag sets its setting; the rest start from the page’s starting values', async () => {
    const p = await params([...OPENING, '--slot', '9', '--track-width', '16', '--width-filler', 'split']);
    expect(p.joint).toEqual({ ...EXAMPLE_PARAMS.joint, slotMm: 9 });
    expect(p.edges.track.widthMm).toBe(16);
    expect(p.width.filler).toBe('split');
    expect(p.thicknessMm).toBe(EXAMPLE_PARAMS.thicknessMm);
  });

  it('flags override the file', async () => {
    const file = JSON.stringify({ openingWidthMm: 812.5, openingHeightMm: 455, thicknessMm: 4, joint: { fitMm: 0.3 } });
    const p = await params(['--params', 'w.json', '--thickness', '5'], { 'w.json': file });
    expect(p.openingWidthMm).toBe(812.5);
    expect(p.thicknessMm).toBe(5);
    expect(p.joint).toEqual({ ...EXAMPLE_PARAMS.joint, fitMm: 0.3 });
  });

  it('the window type presets the four edges, as on the page; an edge flag then changes one', async () => {
    expect((await params([...OPENING, '--window', 'hung'])).edges.roles).toEqual(WINDOW_PRESETS.hung);
    expect((await params([...OPENING, '--window', 'hung', '--top-edge', 'track'])).edges.roles).toEqual({
      ...WINDOW_PRESETS.hung,
      top: 'track',
    });
    const file = JSON.stringify({ ...EXAMPLE_PARAMS, edges: { window: 'hung', roles: { top: 'track' } } });
    expect((await params(['--params', 'w.json'], { 'w.json': file })).edges.roles).toEqual({
      ...WINDOW_PRESETS.hung,
      top: 'track',
    });
    expect((await params(['--params', 'w.json', '--window', 'slider'], { 'w.json': file })).edges.roles).toEqual(
      WINDOW_PRESETS.slider,
    );
  });

  it('a printer size makes the printer custom', async () => {
    const p = await params([...OPENING, '--printer-width', '250', '--printer-height', '210']);
    expect(p.printer).toEqual({ kind: 'custom', widthMm: 250, heightMm: 210 });
  });

  it('wrong settings are refused with the page’s message, naming the flag', async () => {
    const r = await cli([...OPENING, '--slide', '8', '--width-mode', 'grid', '--thickness', '3,5']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--slide: Make it less than the slot depth, so a piece always stays in its slot.');
    expect(r.err).toContain('--width-mode: Choose one of the listed options. (equal, full-plus-filler)');
    expect(r.err).toContain('--thickness: Enter a size in mm, greater than 0.');
    expect(LISTED(r.cwd)).toEqual([]);
  });

  it('a file with an unknown or mistyped setting is refused, naming where', async () => {
    const typo = JSON.stringify({ ...EXAMPLE_PARAMS, edges: { track: { widht: 15 } } });
    const r1 = await cli(['--params', 'w.json'], undefined, { 'w.json': typo });
    expect(r1.code).toBe(2);
    expect(r1.err).toContain('w.json: edges.track.widht is not a setting');
    const text = JSON.stringify({ ...EXAMPLE_PARAMS, thicknessMm: '3' });
    const r2 = await cli(['--params', 'w.json'], undefined, { 'w.json': text });
    expect(r2.err).toContain('w.json: thicknessMm should be a number');
  });

  it('a file that is not JSON, or not there, is refused', async () => {
    expect((await cli(['--params', 'w.json'], undefined, { 'w.json': '{ width: 600 }' })).err).toContain(
      'w.json is not valid JSON',
    );
    const missing = await cli(['--params', 'nowhere.json']);
    expect(missing.code).toBe(2);
    expect(missing.err).toContain('cannot read nowhere.json');
  });
});

describe('usage', () => {
  it('refuses an unknown flag or a stray word', async () => {
    const r1 = await cli([...OPENING, '--colour', 'red']);
    expect(r1.code).toBe(2);
    expect(r1.err).toContain('--colour');
    expect(r1.err).toContain('window-sealer --help');
    expect((await cli([...OPENING, 'now'])).code).toBe(2);
  });

  it('--help lists every setting flag with its starting value, and the exit codes', async () => {
    const r = await cli(['--help']);
    expect(r.code).toBe(0);
    for (const f of SETTING_FLAGS) expect(r.out).toContain(`--${f.flag} `);
    expect(r.out).toMatch(/--slot <mm> +How deep a piece can go into a strip\. \(8\)/);
    expect(r.out).toMatch(/--window <slider\|hung> +.*\(slider\)/);
    expect(r.out).toContain('Exit status: 0 done, 1 could not write, 2 wrong options or settings.');
  });

  it('--help says the files are the user’s (Q36)', async () => {
    const r = await cli(['--help']);
    expect(r.out.replace(/\s+/g, ' ')).toContain(
      'The STL and other files this tool generates, and anything you print from them, are yours to use, change, share or sell for any purpose, with no conditions from this project.',
    );
  });

  it('--version gives the package’s version', async () => {
    const r = await cli(['--version']);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(r.out).toBe(pkg.version);
  });
});

describe('hose ports (hose-port #12; Q114: --port, repeatable)', () => {
  const params = async (args: string[], files: Record<string, string> = {}) => {
    const r = await cli([...args, '--dry-run', '--json'], undefined, files);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('--port 150 puts one in the bottom row’s middle piece, and says so', async () => {
    const r = await cli([...OPENING, '--port', '150', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Hose port: a 150 mm hose end, in column 2, row 1.');
    expect(r.out).toContain('  piece-c2-r1-197.7x198.6-port-150.stl');
  });

  it('--port 150@3,1 names the piece; given again, it adds a port', async () => {
    expect((await params([...OPENING, '--port', '150@3,1', '--port', '130@1,5'])).ports).toEqual([
      { hoseMm: 150, column: 3, row: 1 },
      { hoseMm: 130, column: 1, row: 5 },
    ]);
  });

  it('flags replace the file’s ports, as any flag overrides the file', async () => {
    const file = JSON.stringify({ ...EXAMPLE_PARAMS, ports: [{ hoseMm: 130, column: 1, row: 5 }] });
    expect((await params(['--params', 'w.json'], { 'w.json': file })).ports).toEqual([{ hoseMm: 130, column: 1, row: 5 }]);
    expect((await params(['--params', 'w.json', '--port', '150'], { 'w.json': file })).ports).toEqual([
      { hoseMm: 150, column: 2, row: 1 },
    ]);
  });

  it('refuses two ports in one piece, or a --port it cannot read', async () => {
    const two = await cli([...OPENING, '--port', '150', '--port', '130@2,1']);
    expect(two.code).toBe(2);
    expect(two.err).toContain('--port: Ports 1 and 2 are both in column 2, row 1; give each its own piece.');
    const bad = await cli([...OPENING, '--port', '150@2']);
    expect(bad.err).toContain("--port: Port 1: write each as the hose end's outside diameter in mm");
  });

  it('the collar’s sizes have flags too (Q90, Q107)', async () => {
    const p = await params([...OPENING, '--port', '150', '--collar-depth', '25', '--collar-lip', '4']);
    expect(p.collar).toEqual({ depthMm: 25, wallMm: 2.4, clearanceMm: 0.5, lipMm: 4 });
  });

  it('--help shows --port’s form and that it repeats', async () => {
    const r = await cli(['--help']);
    expect(r.out).toMatch(/--port <mm\[@column,row\]> +Hose ports/);
    expect(r.out.replace(/\s+/g, ' ')).toContain('Give --port again for each port.');
  });
});
