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
  files: Record<string, string> = {},
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

describe('a window AC (window-ac #24; C49 to C53)', () => {
  it('--bottom-edge unit: the wall stands on the unit, and the summary says so', async () => {
    const r = await cli(['--width', '600', '--height', '400', '--bottom-edge', 'unit', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Window AC: the bottom edge stands on the unit’s top.');
  });

  it('--help lists the role among each edge’s choices', async () => {
    const r = await cli(['--help']);
    expect(r.out).toMatch(/--right-edge <track\|sash\|sill\|unit>/);
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
    expect(r.out).toContain('Seal: 9 × 4 mm foam tape along the edge strips’ outer faces: 3.2 m in all.');
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
    expect(r.out).toContain('Seal: printed TPU, 9.5 × 4 mm gaskets along the edge strips’ outer faces: 3.2 m in all.');
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
