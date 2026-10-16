// The window-sealer command (backlog item api-cli, #46), run in an empty folder each time.
// Each block is one of the owner's decisions, Q85 to Q90.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, WINDOW_PRESETS, makeWall, planFiles } from 'parametric-window-sealer';
import { SETTING_FLAGS } from '../src/flags.js';
import { run } from '../src/run.js';

async function cli(
  args: string[],
  cwd = mkdtempSync(join(tmpdir(), 'window-sealer-')),
  files: Record<string, string | Uint8Array> = {},
) {
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
    expect(r.out).toContain('Wrote 22 files to window-sealer-600x1000/'); // with the stiffeners' clips (#111)
    expect(r.out).toContain('  cross-18x18-print-8.stl');
    expect(r.out).toContain('  stiffener-clip-print-4.stl');
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
    expect(result.files).toHaveLength(22);
    // The library's own file: a corner piece with its pins' slots (#110), more than a plain block's 684 bytes.
    const wall = await makeWall(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' });
    const bytes = wall.files[0]?.bytes.length ?? 0;
    expect(bytes).toBeGreaterThan(684);
    expect(result.files[0]).toEqual({ name: 'piece-c1-r1-197.7x198.6.stl', type: 'model/stl', bytes });
  });

  it('--json: errors as JSON too, naming the flag and the setting', async () => {
    const r = await cli(['--height', '1000', '--slide', '8', '--json']);
    expect(r.code).toBe(2);
    const result = json(r.out);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual({
      flag: '--width',
      setting: 'openingWidthMm',
      message: expect.stringMatching(/^Required:/),
    });
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
    expect(readdirSync(folder)).toHaveLength(22 + 1);
  });
});

describe('--dry-run (Q89)', () => {
  it('lists the files it would write and writes nothing', async () => {
    const r = await cli([...OPENING, '--dry-run']);
    expect(r.code).toBe(0);
    expect(LISTED(r.cwd)).toEqual([]);
    expect(r.out).toContain('15 pieces: 3 across, 5 up, 3 mm thick');
    expect(r.out).toContain('Would write 22 files to window-sealer-600x1000/');
    for (const f of planFiles(EXAMPLE_PARAMS, { format: 'stl', packaging: 'separate' })) {
      expect(r.out).toContain(`  ${f.name}`);
    }
  });

  it('--pieces sheet, or a sheet size alone: the pieces to cut are listed, not written (#112)', async () => {
    for (const flags of [
      ['--pieces', 'sheet'],
      ['--sheet-width', '1000'],
    ]) {
      const r = await cli([...OPENING, ...flags, '--dry-run']);
      expect(r.code, flags.join(' ')).toBe(0);
      expect(r.out).toContain('1 piece: 1 across, 1 up, 3 mm thick');
      expect(r.out).toContain('Cut from 3 mm sheet: 1 piece of 603 × 1013 mm.');
      expect(r.out).not.toContain('piece-c1-r1');
    }
  });

  it("prints the plan's lines in the library's order", async () => {
    const every = ['--port', '150@1,1', '--cutout', '120x80@3,1', '--seal', 'tape', '--fill', 'grid'];
    const r = await cli([...OPENING, ...every, '--piece-fill', '2,2=sealed', '--bottom-edge', 'unit', '--dry-run']);
    expect(r.code).toBe(0);
    expect(
      r.out
        .split('\n')
        .slice(0, 12)
        .map((line) => line.split(':')[0]),
    ).toEqual([
      '15 pieces',
      'Widths',
      'Heights',
      'Pieces and joints',
      'Joints',
      'Edges',
      'Hose port',
      'Cutout',
      'Window AC',
      'Seal',
      'Fill',
      'Column 2, row 2',
    ]);
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
    // Wherever its lines break: the flag column is as wide as the longest flag.
    expect(r.out.replace(/\s+/g, ' ')).toMatch(
      /--window <slider\|hung\|frame\|shutter\|tilt\|turn\|roof> .*?as the page does\. \(slider\)/,
    );
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
    expect((await params(['--params', 'w.json'], { 'w.json': file })).ports).toEqual([
      { hoseMm: 130, column: 1, row: 5 },
    ]);
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

describe('a printer from the list (printer-presets #13; Q115 to Q117)', () => {
  const params = async (args: string[]) =>
    json((await cli([...args, '--dry-run', '--json'])).out).params as typeof EXAMPLE_PARAMS;

  it('--printer-model alone makes the printer a listed one; --bed-margin changes the margin', async () => {
    const p = await params([...OPENING, '--printer-model', 'prusa-mk4s', '--bed-margin', '15']);
    expect(p.printer).toEqual({ kind: 'model', id: 'prusa-mk4s' });
    expect(p.bedMarginMm).toBe(15);
  });

  it('plans with the bed less the margin: 3 across, 5 up on a Prusa MK4S', async () => {
    const r = await cli([...OPENING, '--printer-model', 'prusa-mk4s', '--dry-run']);
    expect(r.out).toContain('15 pieces: 3 across, 5 up, 3 mm thick');
  });

  it('refuses a printer not on the list, naming the flag', async () => {
    const r = await cli([...OPENING, '--printer-model', 'no-such-printer']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--printer-model: Choose one of the listed options.');
  });

  it('--help lists the printers by id', async () => {
    const r = await cli(['--help']);
    expect(r.out).toMatch(/--printer-model <id> +Your printer, from the list/);
    expect(r.out.replace(/\s+/g, ' ')).toContain('prusa-mk4s, prusa-mini-plus');
  });
});

describe('measured cutouts (measured-cutout #23; C40 to C47: --cutout, repeatable)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('--cutout 120x80 puts one in the bottom row’s middle piece, and says so', async () => {
    const r = await cli([...OPENING, '--cutout', '120x80', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Cutout: a 120 × 80 mm appliance, in column 2, row 1, through a 122 × 82 mm opening in a 15 mm rim.',
    );
    expect(r.out).toContain('  piece-c2-r1-197.7x198.6-cutout-120x80.stl');
  });

  it('--cutout 120x80@3,1 names the piece; given again, it adds one; the rim has flags too', async () => {
    const p = await params([...OPENING, '--cutout', '120x80@3,1', '--cutout', '60x60@1,5', '--rim-depth', '20']);
    expect(p.cutouts).toEqual([
      { widthMm: 120, heightMm: 80, column: 3, row: 1 },
      { widthMm: 60, heightMm: 60, column: 1, row: 5 },
    ]);
    expect(p.rim).toEqual({ depthMm: 20, wallMm: 2.4, clearanceMm: 1 });
  });

  it('refuses a cutout in a port’s piece, or one it cannot read', async () => {
    const both = await cli([...OPENING, '--port', '150', '--cutout', '120x80']);
    expect(both.code).toBe(2);
    expect(both.err).toContain('--cutout: Cutout 1 and port 1 are both in column 2, row 1; give each its own piece.');
    const bad = await cli([...OPENING, '--cutout', '120']);
    expect(bad.err).toContain('--cutout: Cutout 1: write each as the appliance’s measured width x height in mm');
  });

  it('--help shows the form and that it repeats', async () => {
    const r = await cli(['--help']);
    expect(r.out.replace(/\s+/g, ' ')).toContain('--cutout <width>x<height>[@column,row]');
    expect(r.out.replace(/\s+/g, ' ')).toContain('Give --cutout again for each cutout.');
  });
});

describe('fans (fan-mount #28: --fan, repeatable)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('--fan 120 puts one in the bottom row’s middle piece, and says so', async () => {
    const r = await cli([...OPENING, '--fan', '120', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Fan: a 120 mm fan, in column 2, row 1: a 116 mm opening, and four 4.5 mm screw holes 105 mm apart.',
    );
    expect(r.out).toContain('  piece-c2-r1-197.7x198.6-fan-120.stl');
  });

  it('--fan 140@3,1 names the piece; given again, it adds one', async () => {
    const p = await params([...OPENING, '--fan', '140@3,1', '--fan', '80@1,5']);
    expect(p.fans).toEqual([
      { sizeMm: 140, column: 3, row: 1 },
      { sizeMm: 80, column: 1, row: 5 },
    ]);
  });

  it('refuses a fan in a port’s piece, or a size not on the list', async () => {
    const both = await cli([...OPENING, '--port', '150', '--fan', '120']);
    expect(both.code).toBe(2);
    expect(both.err).toContain('--fan: Fan 1 and port 1 are both in column 2, row 1; give each its own piece.');
    const unlisted = await cli([...OPENING, '--fan', '100']);
    expect(unlisted.err).toContain(
      '--fan: Fan 1: 100 mm is not a listed fan size; the sizes are 80, 92, 120 and 140 mm.',
    );
  });

  it('--help shows the form and that it repeats', async () => {
    const r = await cli(['--help']);
    expect(r.out.replace(/\s+/g, ' ')).toContain('--fan <mm[@column,row]>');
    expect(r.out.replace(/\s+/g, ' ')).toContain('Give --fan again for each fan.');
  });
});

describe('sliding inserts (sliding-insert #38: --insert, repeatable)', () => {
  const WIDE = ['--width', '1200', '--height', '900', '--printer-width', '300', '--printer-height', '300'];

  it('--insert 120x80 puts one in its piece, says so, and lists its shutters', async () => {
    const r = await cli([...WIDE, '--insert', '120x80', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Sliding insert: a 120 × 80 mm appliance, in column 2, row 1, through a 140 × 82 mm opening',
    );
    expect(r.out).toMatch(/ {2}piece-c2-r1-[0-9.x]+-insert-120x80\.stl/);
    expect(r.out).toContain('  shutter-32x89.4-print-2.stl');
  });

  it('--insert-travel and --insert-clearance set the shutters', async () => {
    const r = await cli([
      ...WIDE,
      '--insert',
      '120x80',
      '--insert-travel',
      '10',
      '--insert-clearance',
      '0.5',
      '--dry-run',
      '--json',
    ]);
    expect(json(r.out).params.insert).toEqual({ travelMm: 10, clearanceMm: 0.5 });
  });

  it('refuses one too big for its piece, naming the flag', async () => {
    const r = await cli([...OPENING, '--insert', '160x120']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--insert: Insert 1: a 160 × 120 mm appliance in a sliding insert needs a piece at least');
  });

  it('--help shows the form and that it repeats', async () => {
    const r = await cli(['--help']);
    expect(r.out.replace(/\s+/g, ' ')).toContain('--insert <width>x<height>[@column,row]');
    expect(r.out.replace(/\s+/g, ' ')).toContain('Give --insert again for each insert.');
  });
});

describe('clamps (clamps #32: --clamp, repeatable)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('--clamp 120x80 puts one in the bottom row’s middle piece, says so, and lists its jaws', async () => {
    const r = await cli([...OPENING, '--clamp', '120x80', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Clamp: a 120 × 80 mm appliance, in column 2, row 1, through a 130 × 90 mm opening; four jaws grip anything ' +
        'from 110 × 70 to 130 × 90 mm, each on two M4 bolts at least 12 mm long, with nuts and washers.',
    );
    expect(r.out).toContain('  piece-c2-r1-197.7x198.6-clamp-120x80.stl');
    expect(r.out).toContain('  jaw-138x21.3x15-print-2.stl');
    expect(r.out).toContain('  jaw-69x21.3x15-print-2.stl');
  });

  it('--clamp 90x60@3,1 names the piece; given again, it adds one; the jaws have flags too', async () => {
    const p = await params([...OPENING, '--clamp', '90x60@3,1', '--clamp', '120x80', '--clamp-travel', '8']);
    expect(p.clamps).toEqual([
      { widthMm: 90, heightMm: 60, column: 3, row: 1 },
      { widthMm: 120, heightMm: 80, column: 2, row: 1 },
    ]);
    expect(p.clamp).toEqual({ travelMm: 8, depthMm: 15 });
  });

  it('refuses a clamp in a port’s piece, or one it cannot read', async () => {
    const both = await cli([...OPENING, '--port', '150', '--clamp', '120x80']);
    expect(both.code).toBe(2);
    expect(both.err).toContain('--clamp: Clamp 1 and port 1 are both in column 2, row 1; give each its own piece.');
    const bad = await cli([...OPENING, '--clamp', '120']);
    expect(bad.err).toContain('--clamp: Clamp 1: write each as the appliance’s measured width x height in mm');
  });

  it('--help shows the form and that it repeats', async () => {
    const r = await cli(['--help']);
    expect(r.out.replace(/\s+/g, ' ')).toContain('--clamp <width>x<height>[@column,row]');
    expect(r.out.replace(/\s+/g, ' ')).toContain('Give --clamp again for each clamp.');
  });
});

describe('a model of the appliance (mesh-appliance #35: --model-file <file>)', () => {
  // A binary STL box 120 mm across (x), 50 mm deep (y) and 80 mm high (z).
  const box = (x: number, y: number, z: number): Uint8Array => {
    const corners = [
      [0, 0, 0],
      [x, 0, 0],
      [x, y, 0],
      [0, y, 0],
      [0, 0, z],
      [x, 0, z],
      [x, y, z],
      [0, y, z],
    ];
    const faces = [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ];
    const bytes = new Uint8Array(84 + 50 * faces.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, faces.length, true);
    for (const [f, face] of faces.entries()) {
      for (const [k, c] of face.entries()) {
        for (const [a, v] of (corners[c] ?? []).entries()) view.setFloat32(84 + 50 * f + 12 + 12 * k + 4 * a, v, true);
      }
    }
    return bytes;
  };
  const AC = { 'ac.stl': box(120, 50, 80) };

  it('--model-file reads the file and cuts the wall round it in the starting piece, saying so', async () => {
    const r = await cli([...OPENING, '--model-file', 'ac.stl', '--dry-run'], undefined, AC);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Model: the appliance in the STL file, 120 × 80 mm seen from its front, in column 2, row 1, through an ' +
        'opening 1 mm clear of its outline, in a 15 mm rim.',
    );
    expect(r.out).toContain('  piece-c2-r1-197.7x198.6-model-120x80.stl');
  });

  it('--model-view turns it; --model-column and --model-row place it; the file is kept in the settings', async () => {
    const r = await cli(
      [...OPENING, '--model-file', 'ac.stl', '--model-view', 'right', '--model-column', '1', '--model-row', '2'],
      undefined,
      AC,
    );
    expect(r.code).toBe(0);
    const out = await cli(
      [
        ...OPENING,
        '--model-file',
        'ac.stl',
        '--model-view',
        'right',
        '--model-column',
        '1',
        '--model-row',
        '2',
        '--dry-run',
        '--json',
      ],
      undefined,
      AC,
    );
    const { params, summary } = json(out.out);
    expect(params.model).toEqual({
      file: Buffer.from(AC['ac.stl']).toString('base64'),
      view: 'right',
      column: 1,
      row: 2,
    });
    expect(summary.model).toEqual([expect.stringContaining('50 × 80 mm seen from its right side, in column 1, row 2')]);
    const written = LISTED(join(r.cwd, 'window-sealer-600x1000')).filter((n) => n.includes('-model-'));
    expect(written).toEqual([expect.stringMatching(/^piece-c1-r2-.*-model-50x80\.stl$/)]);
  });

  it('refuses a file it cannot read, one that is not a mesh, or one too big for its piece, naming the flag', async () => {
    const missing = await cli([...OPENING, '--model-file', 'nowhere.stl', '--dry-run']);
    expect(missing.code).toBe(2);
    expect(missing.err).toMatch(/^--model-file: cannot read nowhere\.stl: /);
    const text = await cli([...OPENING, '--model-file', 'notes.txt', '--dry-run'], undefined, { 'notes.txt': 'notes' });
    expect(text.code).toBe(2);
    expect(text.err).toContain('--model-file: The file is not a mesh: choose an STL, OBJ or 3MF file.');
    const wide = await cli([...OPENING, '--model-file', 'wide.stl', '--dry-run'], undefined, {
      'wide.stl': box(300, 50, 80),
    });
    expect(wide.code).toBe(2);
    expect(wide.err).toContain(
      '--model-file: The model’s outline, 300 × 80 mm seen from the room, needs a piece at least',
    );
  });

  it('--help names the file and the piece, and does not print a starting file', async () => {
    const r = await cli(['--help']);
    const help = r.out.replace(/\s+/g, ' ');
    expect(help).toContain('--model-file <file.stl|.obj|.3mf>');
    expect(help).toContain('--model-view <front|back|left|right|top|bottom>');
    expect(help).toContain('--model-column <n>');
    expect(help).toContain('--model-row <n>');
  });
});

describe('a 3D tile of your own (mesh-tiles #40: --mesh-tile <file>)', () => {
  // A binary STL box 28 × 28 × 6 mm, lying flat as a tile is drawn to print.
  const tile = (): Uint8Array => {
    const corners = [0, 0, 0, 28, 0, 0, 28, 28, 0, 0, 28, 0, 0, 0, 6, 28, 0, 6, 28, 28, 6, 0, 28, 6];
    const faces = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
    ];
    const bytes = new Uint8Array(84 + 50 * 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, 12, true);
    faces.forEach((c, i) => {
      for (let a = 0; a < 3; a++) {
        view.setFloat32(84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a, corners[3 * c + a] ?? 0, true);
      }
    });
    return bytes;
  };

  it('--mesh-tile reads the file and means the tile; --mesh-tile-view turns it', async () => {
    const r = await cli([...OPENING, '--mesh-tile', 'tile.stl', '--dry-run', '--json'], undefined, {
      'tile.stl': tile(),
    });
    expect(r.code).toBe(0);
    const out = json(r.out);
    expect(out.params.fill).toMatchObject({ kind: 'mesh', mesh: { view: 'top' } });
    expect(out.summary.fill).toBe(
      'Fill: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 6 mm deep, set side by ' +
        'side in whole cells inside each piece’s border, standing 3 mm proud on the room side.',
    );
    const front = await cli(
      [...OPENING, '--mesh-tile', 'tile.stl', '--mesh-tile-view', 'front', '--dry-run', '--json'],
      undefined,
      {
        'tile.stl': tile(),
      },
    );
    expect(json(front.out).summary.fill).toContain('each 28 × 6 mm seen from its front and 28 mm deep');
  });

  it('refuses --fill mesh without a file, naming the flag', async () => {
    const r = await cli([...OPENING, '--fill', 'mesh', '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--mesh-tile: Choose the tile’s file.');
  });
});

describe('a whole piece of your own (mesh-custom-piece #41: --custom-piece <file>)', () => {
  // A binary STL plate 250 mm square and 5 mm deep, lying flat as a piece is drawn to print.
  const plateStl = (): Uint8Array => {
    const [x, y, z] = [250, 250, 5];
    const corners = [0, 0, 0, x, 0, 0, x, y, 0, 0, y, 0, 0, 0, z, x, 0, z, x, y, z, 0, y, z];
    const faces = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
    ];
    const bytes = new Uint8Array(84 + 50 * 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, 12, true);
    faces.forEach((c, i) => {
      for (let a = 0; a < 3; a++) {
        view.setFloat32(84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a, corners[3 * c + a] ?? 0, true);
      }
    });
    return bytes;
  };

  it('--custom-piece reads the file into its piece; --custom-piece-column and -row place it', async () => {
    const r = await cli(
      [...OPENING, '--custom-piece', 'piece.stl', '--custom-piece-column', '1', '--custom-piece-row', '3', '--dry-run'],
      undefined,
      { 'piece.stl': plateStl() },
    );
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Custom piece: the piece in column 1, row 3, from the STL file: 250 × 250 mm seen from its top and 5 mm deep, ' +
        'trimmed to fit inside a 10 mm frame as thick as the pieces, for the joints.',
    );
    expect(r.out).toContain('  piece-c1-r3-197.7x198.6-custom-250x250.stl');
  });

  it('refuses one seen too small from its side, naming the flag', async () => {
    const r = await cli(
      [...OPENING, '--custom-piece', 'piece.stl', '--custom-piece-view', 'front', '--dry-run'],
      undefined,
      {
        'piece.stl': plateStl(),
      },
    );
    expect(r.code).toBe(2);
    expect(r.err).toContain('--custom-piece: The custom piece is 250 × 5 mm seen from the room;');
  });
});

describe('an SVG tile (svg-tile #27: --svg-tile <file>)', () => {
  const SQUARES =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
    '<rect width="10" height="10"/><rect x="12" width="5" height="5"/></svg>';

  it('--svg-tile reads the file and means the tile; --svg-width sets its width', async () => {
    const r = await cli([...OPENING, '--svg-tile', 'tile.svg', '--svg-width', '30', '--dry-run', '--json'], undefined, {
      'tile.svg': SQUARES,
    });
    expect(r.code).toBe(0);
    const out = json(r.out);
    expect(out.params.fill).toMatchObject({ kind: 'svg', drawing: SQUARES, svg: { widthMm: 30 } });
    expect(out.summary.fill).toBe('Fill: an SVG tile 30 × 30 mm with 2 openings, cut 1.5 mm into the room side.');
  });

  it('refuses a file it cannot read, or one that is not a drawing, naming the flag', async () => {
    const missing = await cli([...OPENING, '--svg-tile', 'nowhere.svg', '--dry-run']);
    expect(missing.code).toBe(2);
    expect(missing.err).toMatch(/^--svg-tile: cannot read nowhere\.svg: /);
    const page = await cli([...OPENING, '--svg-tile', 'page.html', '--dry-run'], undefined, {
      'page.html': '<html><body/></html>',
    });
    expect(page.code).toBe(2);
    expect(page.err).toContain('--svg-tile: The file is not an SVG drawing: it has no svg element at its root.');
  });

  it('--help names a file, and does not print the starting drawing', async () => {
    const r = await cli(['--help']);
    const help = r.out.replace(/\s+/g, ' ');
    expect(help).toContain('--svg-tile <file.svg>');
    expect(help).not.toContain('<circle');
  });
});

describe('a window AC (window-ac #24; C49 to C53)', () => {
  it('--bottom-edge unit: the wall stands on the unit, and the summary says so', async () => {
    const r = await cli(['--width', '600', '--height', '400', '--bottom-edge', 'unit', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Window AC: the bottom edge stands on the unit’s top.');
  });

  it('--help lists the role among each edge’s choices', async () => {
    const r = await cli(['--help']);
    expect(r.out).toMatch(/--right-edge <track\|sash\|sill\|unit\|frame>/);
  });
});

describe('a tape seal (seal-tape #15; Q119 to Q132)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('without --seal there is none, and the summary says so (Q122)', async () => {
    const r = await cli([...OPENING, '--dry-run']);
    expect(r.out).toContain('Seal: none.');
  });

  it('--seal tape: the summary names the tape and how much of it', async () => {
    const r = await cli([...OPENING, '--seal', 'tape', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Seal: 9 × 4 mm closed-cell foam tape along the edge strips’ outer faces: 3.2 m in all.');
  });

  it('a tape flag without --seal means tape; with --tape-sides the strips are named by their track', async () => {
    expect((await params([...OPENING, '--tape-sides', 'yes'])).seal).toEqual({
      kind: 'tape',
      tape: { widthMm: 9, thicknessMm: 4, grooveMm: 1, squeezePct: 50, sides: true, port: false, joints: false },
    });
    const r = await cli([...OPENING, '--tape-sides', 'yes', '--dry-run']);
    expect(r.out).toMatch(/ {2}edge-[0-9.]+x13x11-track-10-print-[0-9]+\.stl/);
  });

  it('refuses side tape in a track shallower than the tape is wide, naming the flag', async () => {
    const r = await cli([...OPENING, '--tape-sides', 'yes', '--left-depth', '8']);
    expect(r.code).toBe(2);
    expect(r.err).toContain(
      '--tape-sides: The left track is 8 mm deep, less than the 9 mm tape is wide, so the tape cannot go on the edge strips’ sides.',
    );
  });
});

describe('the printed TPU seal (seal-tpu #22; C31 to C39)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('--seal tpu: the summary names the gaskets, and the dry run lists them', async () => {
    const r = await cli([...OPENING, '--seal', 'tpu', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Seal: printed TPU, 85A for the best recovery, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all.',
    );
    expect(r.out).toMatch(/ {2}gasket-[0-9.]+x9\.5x4-tpu-print-[0-9]+\.stl/);
  });

  it('--tpu-joints yes without --seal means the TPU seal, its strips and cross pieces named -tpu', async () => {
    expect((await params([...OPENING, '--tpu-joints', 'yes'])).seal).toMatchObject({
      kind: 'tpu',
      tape: { joints: true },
    });
    const r = await cli([...OPENING, '--tpu-joints', 'yes', '--dry-run']);
    expect(r.out).toMatch(/ {2}strip-[0-9.]+x18-tpu-print-[0-9]+\.stl/);
    expect(r.out).toMatch(/ {2}cross-18x18-tpu-print-[0-9]+\.stl/);
  });

  it('refuses TPU joints with foam tape, naming the flag', async () => {
    const r = await cli([...OPENING, '--seal', 'tape', '--tpu-joints', 'yes']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--tpu-joints: Tape does not fit a joint: choose printed TPU for the joints.');
  });
});

describe('the panel fill (pattern-grid #16; Q139 to Q143)', () => {
  const params = async (args: string[]) => {
    const r = await cli([...args, '--dry-run', '--json']);
    return json(r.out).params as typeof EXAMPLE_PARAMS;
  };

  it('sealed to start with, and the summary says so (Q141)', async () => {
    const r = await cli([...OPENING, '--dry-run']);
    expect(r.out).toContain('Fill: sealed.');
  });

  it('--fill grid: in relief to start with; --fill-style through cuts it through (Q142)', async () => {
    const r = await cli([...OPENING, '--fill', 'grid', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Fill: a grid of 15 mm square openings and 3 mm bars, cut 1.5 mm into the room side.');
    const through = await cli([...OPENING, '--fill', 'grid', '--fill-style', 'through', '--dry-run']);
    expect(through.out).toContain('cut through: air passes through the wall.');
  });

  it('a --grid-* flag without --fill means the grid; a bar under 0.8 mm is refused (Q140, Q143)', async () => {
    expect((await params([...OPENING, '--grid-opening', '12', '--grid-bar', '2'])).fill).toMatchObject({
      kind: 'grid',
      style: 'relief',
      reliefPct: 50,
      grid: { openingMm: 12, barMm: 2 },
    });
    const thin = await cli([...OPENING, '--grid-bar', '0.5']);
    expect(thin.code).toBe(2);
    expect(thin.err).toContain('--grid-bar: Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.');
  });

  it('--help shows a percentage as <%>, not <mm>', async () => {
    const r = await cli(['--help']);
    expect(r.out).toMatch(/--relief-depth <%> +/);
    expect(r.out).toMatch(/--tape-squeeze <%> +/);
    expect(r.out).toMatch(/--grid-bar <mm> +/);
  });
});

describe('the hexagon pattern (pattern-hexagon #17; C13 to C16)', () => {
  it('--fill hexagon: a honeycomb, in relief to start with', async () => {
    const r = await cli([...OPENING, '--fill', 'hexagon', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(
      'Fill: a honeycomb of hexagonal openings 15 mm across the flats and 3 mm bars, cut 1.5 mm into the room side.',
    );
  });

  it('a --hex-* flag without --fill means the hexagon; its bar is no thinner than 0.8 mm', async () => {
    const r = await cli([...OPENING, '--hex-opening', '10', '--dry-run', '--json']);
    expect(json(r.out).params.fill).toMatchObject({ kind: 'hexagon', hexagon: { openingMm: 10, barMm: 3 } });
    const thin = await cli([...OPENING, '--hex-bar', '0.5']);
    expect(thin.code).toBe(2);
    expect(thin.err).toContain('--hex-bar: Make it at least 0.8 mm: two lines from a 0.4 mm nozzle.');
  });
});

describe('the brick pattern (pattern-brick #18; C18 to C21)', () => {
  it('--fill brick: a running bond, in relief to start with', async () => {
    const r = await cli([...OPENING, '--fill', 'brick', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Fill: bricks of 30 × 12 mm openings and 3 mm bars, cut 1.5 mm into the room side.');
  });

  it('a --brick-* flag without --fill means the bricks', async () => {
    const r = await cli([...OPENING, '--brick-width', '40', '--dry-run', '--json']);
    expect(json(r.out).params.fill).toMatchObject({ kind: 'brick', brick: { widthMm: 40, heightMm: 12, barMm: 3 } });
  });
});

describe('the diamond pattern (pattern-diamond #19; C22 to C25)', () => {
  it('--fill diamond, and a --diamond-* flag alone means the diamonds', async () => {
    const r = await cli([...OPENING, '--fill', 'diamond', '--dry-run']);
    expect(r.out).toContain('Fill: diamonds 20 mm wide and 30 mm tall and 3 mm bars, cut 1.5 mm into the room side.');
    const alone = await cli([...OPENING, '--diamond-height', '20', '--dry-run', '--json']);
    expect(json(alone.out).params.fill).toMatchObject({
      kind: 'diamond',
      diamond: { widthMm: 20, heightMm: 20, barMm: 3 },
    });
  });
});

describe('per-piece fills (params-advanced #21; C26 to C28)', () => {
  it('--piece-fill gives a piece its own fill; given again, another', async () => {
    const r = await cli([
      ...OPENING,
      '--fill',
      'grid',
      '--piece-fill',
      '2,1=sealed',
      '--piece-fill',
      '3,1=diamond:through',
      '--dry-run',
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Column 2, row 1: sealed.');
    expect(r.out).toContain(
      'Column 3, row 1: diamonds 20 mm wide and 30 mm tall and 3 mm bars, cut through: air passes through the wall.',
    );
  });

  it('refuses a piece the wall does not have, naming the flag; --help shows the form', async () => {
    const r = await cli([...OPENING, '--piece-fill', '4,1=grid']);
    expect(r.code).toBe(2);
    expect(r.err).toContain(
      '--piece-fill: Piece fill 1: there is no column 4, row 1: the wall has 3 columns and 5 rows.',
    );
    const help = await cli(['--help']);
    expect(help.out).toMatch(/--piece-fill <column,row=fill\[:style\]> +/);
    expect(help.out.replace(/\s+/g, ' ')).toContain('Give --piece-fill again for each piece.');
  });
});

describe('Multiboard, built but not offered for now (organiser-multiboard, #36)', () => {
  it('--help leaves it out of --fill’s choices and words', async () => {
    const help = await cli(['--help']);
    expect(help.out).not.toMatch(/multiboard/i);
    expect(help.out.replace(/\s+/g, ' ')).toContain('a Honeycomb Storage Wall board');
  });

  it('--fill multiboard still plans the board, and a piece can have it', async () => {
    const r = await cli([...OPENING, '--fill', 'multiboard', '--piece-fill', '2,1=sealed', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Fill: a Multiboard board: octagonal holes 23.4 mm across');
    const own = await cli([...OPENING, '--piece-fill', '2,1=multiboard', '--dry-run']);
    expect(own.code).toBe(0);
    expect(own.out).toContain('Column 2, row 1: a Multiboard board:');
  });
});

describe('behind a roller shutter (shutter-rails, #158)', () => {
  it('--window shutter sets the guide rail’s sizes, and the plan says how the wall sits in them', async () => {
    const r = await cli([...OPENING, '--window', 'shutter', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out.replace(/\s+/g, ' ')).toContain(
      'Behind a roller shutter: the side strips are 8 mm thick, to pass the guide rails’ brushes or seals, and ' +
        'sit 20 mm into the rails.',
    );
    const deeper = await cli([...OPENING, '--window', 'shutter', '--left-depth', '25', '--dry-run']);
    expect(deeper.out).toContain('sit 25 and 20 mm into the rails');
  });

  it('--help offers it', async () => {
    const help = await cli(['--help']);
    expect(help.out.replace(/\s+/g, ' ')).toMatch(/--window <slider\|hung\|frame\|shutter\|tilt\|turn\|roof> /);
  });
});

describe('a tilted sash (sash-wedge, #159)', () => {
  const TILTED = ['--width', '800', '--height', '1200', '--window', 'tilt', '--tilt-gap', '150', '--seal', 'tpu'];

  it('--window tilt with the gap at the top plans a wedge, and lists its parts’ files', async () => {
    const r = await cli([...TILTED, '--port', '150', '--dry-run']);
    expect(r.code).toBe(0);
    const out = r.out.replace(/\s+/g, ' ');
    expect(out).toContain('A wedge for a tilted sash: 59 parts and 32 TPU gaskets to print.');
    expect(out).toContain('The sash leans 7.2° in.');
    expect(out).toContain('wedge-corner-print-2.stl');
    expect(out).toContain('wedge-top-2-of-4-port-150-print-1.stl');
  });

  it('refuses what a wall has and the wedge has no place for, with the flag', async () => {
    const r = await cli([...TILTED, '--fan', '120', '--dry-run']);
    expect(r.code).not.toBe(0);
    expect(r.err.replace(/\s+/g, ' ')).toContain('A tilted sash’s wedge has room for a hose port only.');
  });

  it('--help offers the gap', async () => {
    const help = await cli(['--help']);
    expect(help.out.replace(/\s+/g, ' ')).toMatch(/--tilt-gap <mm> For a tilted sash: the gap at the top/);
  });
});

describe('a turned sash (sash-wedge, #159)', () => {
  const TURNED = ['--width', '800', '--height', '1200', '--window', 'turn', '--turn-gap', '150', '--seal', 'tpu'];

  it('--window turn with the gap at the latch side plans the wedge turned on its side', async () => {
    const r = await cli([...TURNED, '--port', '150', '--dry-run']);
    expect(r.code).toBe(0);
    const out = r.out.replace(/\s+/g, ' ');
    expect(out).toContain('A wedge for a turned sash: 55 parts and 28 TPU gaskets to print.');
    expect(out).toContain('The sash turns 10.8° in.');
    expect(out).toMatch(/wedge-latch-\d-of-6-port-150-print-1\.stl/);
    expect(out).toContain('wedge-triangle-1-of-4-print-2.stl');
  });

  it('refuses what a wall has and the wedge has no place for, in the turned sash’s words', async () => {
    const r = await cli([...TURNED, '--fan', '120', '--dry-run']);
    expect(r.code).not.toBe(0);
    expect(r.err.replace(/\s+/g, ' ')).toContain('A turned sash’s wedge has room for a hose port only.');
  });

  it('--help offers the gap', async () => {
    const help = await cli(['--help']);
    expect(help.out.replace(/\s+/g, ' ')).toMatch(/--turn-gap <mm> For a turned sash: the gap at the latch side/);
  });
});

describe('a roof window (sloped-frame, #160)', () => {
  const ROOF = ['--width', '800', '--height', '1200', '--window', 'roof', '--roof-pitch', '30', '--seal', 'tpu'];

  it('--window roof with its pitch plans a wall in the frame, and says what pulls it out', async () => {
    const r = await cli([...ROOF, '--dry-run']);
    expect(r.code).toBe(0);
    const out = r.out.replace(/\s+/g, ' ');
    expect(out).toContain('On a roof at 30°, 87% of the wall’s weight pulls it out of the frame into the room');
    expect(out).toContain('up to 1.7 times their weight');
  });

  it('refuses a pitch a roof window does not have', async () => {
    const r = await cli([...ROOF.slice(0, -4), '--roof-pitch', '10', '--seal', 'tpu', '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err.replace(/\s+/g, ' ')).toContain(
      'A roof window lies at 15 to 90° from level: give its pitch in degrees.',
    );
  });

  it('--help offers the pitch', async () => {
    const help = await cli(['--help']);
    expect(help.out.replace(/\s+/g, ' ')).toMatch(
      /--roof-pitch <deg> For a roof window: the roof's pitch, in degrees from level, 15 to 90\. \(35\)/,
    );
  });
});

describe('notches for the hardware (edge-notches, #161)', () => {
  const FRAME = ['--width', '800', '--height', '1200', '--window', 'frame', '--seal', 'tpu'];

  it('--notch leaves a notch in a frame edge, and tags its piece’s file', async () => {
    const r = await cli([...FRAME, '--notch', '40x25@bottom,300', '--dry-run']);
    expect(r.code).toBe(0);
    const out = r.out.replace(/\s+/g, ' ');
    expect(out).toMatch(
      /Notch 1: 40 × 25 mm in the bottom edge, its middle 300 mm from the left corner, in column \d, row 1/,
    );
    expect(out).toMatch(/piece-c\d-r1-[\d.]+x[\d.]+-notch-40x25\.stl/);
  });

  it('refuses a notch in an edge that is not in a frame', async () => {
    const r = await cli(['--width', '800', '--height', '1200', '--notch', '40x25@bottom,300', '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err.replace(/\s+/g, ' ')).toContain(
      'Notch 1 is in the bottom edge, which is in a track: a notch is for hardware crossing a frame edge.',
    );
  });

  it('--help offers it', async () => {
    const help = await cli(['--help']);
    expect(help.out.replace(/\s+/g, ' ')).toMatch(
      /--notch <width>x<depth>@edge,mm Notches along an edge for the window's hardware/,
    );
  });
});
