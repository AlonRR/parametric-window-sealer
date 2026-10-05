// The server's own options (Q94, Q96): where it may write, given when it is added to an agent.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readOptions } from '../src/options.js';

const STATEMENT =
  'The STL and other files this tool generates, and anything you print from them, are yours to use, change, ' +
  'share or sell for any purpose, with no conditions from this project.';

describe('readOptions', () => {
  it('--out-root, made absolute from the folder it starts in', () => {
    expect(readOptions(['--out-root', 'prints'], '/work')).toEqual({ run: { outRoot: join('/work', 'prints') } });
    expect(readOptions(['--out-root=/data/prints'], '/work')).toEqual({ run: { outRoot: '/data/prints' } });
  });

  it('~ is the home folder, since an agent app starts the server without a shell', () => {
    expect(readOptions(['--out-root', '~/window-sealer'], '/work')).toEqual({
      run: { outRoot: join(homedir(), 'window-sealer') },
    });
  });

  it('without --out-root it still runs, with files only in the reply (Q96)', () => {
    expect(readOptions([], '/work')).toEqual({ run: {} });
  });

  it('refuses anything else, pointing at --help', () => {
    const r = readOptions(['--outroot', 'x'], '/work');
    expect(r).toHaveProperty('error');
    expect((r as { error: string }).error).toContain('--outroot');
    expect((r as { error: string }).error).toContain('window-sealer-mcp --help');
    expect(readOptions(['--out-root'], '/work')).toHaveProperty('error');
  });

  it('--help says how to add it, and that the files are the user’s (Q36)', () => {
    const r = readOptions(['--help'], '/work') as { print: string };
    expect(r.print).toContain('--out-root <folder>');
    expect(r.print).toContain('"command": "window-sealer-mcp"');
    expect(r.print.replace(/\s+/g, ' ')).toContain(STATEMENT);
  });

  it('--version', () => {
    expect(readOptions(['--version'], '/work')).toEqual({ print: '0.1.0' });
  });
});
