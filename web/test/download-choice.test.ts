// The dialog's rules (download-zip, #7): which combinations exist (Q46), and reading back
// the remembered choice (Q47) from the user's own browser, where anything may be stored.
import { describe, expect, it } from 'vitest';
import { isValidChoice, readStoredChoice } from '../src/download-dialog';

describe('isValidChoice', () => {
  it.each([
    ['stl', 'separate', true],
    ['stl', 'zip', true],
    ['stl', 'single', false],
    ['3mf', 'separate', true],
    ['3mf', 'zip', true],
    ['3mf', 'single', true],
  ] as const)('%s as %s: %s', (format, packaging, valid) => {
    expect(isValidChoice({ format, packaging })).toBe(valid);
  });
});

describe('readStoredChoice', () => {
  it('reads back a valid stored choice', () => {
    expect(readStoredChoice('{"format":"3mf","packaging":"zip"}')).toEqual({
      format: '3mf',
      packaging: 'zip',
    });
  });

  it.each([
    ['nothing stored', null],
    ['not JSON', '3mf,zip'],
    ['an unknown format', '{"format":"obj","packaging":"zip"}'],
    ['an unknown packaging', '{"format":"stl","packaging":"tar"}'],
    ['an impossible combination', '{"format":"stl","packaging":"single"}'],
    ['the wrong shape', '["stl","zip"]'],
  ])('ignores %s', (_label, stored) => {
    expect(readStoredChoice(stored)).toBeNull();
  });
});
