// The command's README is what an npm user reads (backlog item api-cli, #46). The files
// the command writes are the user's (Q36), in the same words as the repository's README and
// the page; and, like the repository's README, it ends with the disclosure line.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const OUTPUT_STATEMENT =
  'The STL and other files this tool generates, and anything you print from them, are yours ' +
  'to use, change, share or sell for any purpose, with no conditions from this project.';

const DISCLOSURE =
  '_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const flat = (text: string) => text.replace(/\s+/g, ' ');

describe("the package's README", () => {
  it("says the generated files are the user's, in the repository README's words (Q36)", () => {
    expect(flat(read('../../../README.md'))).toContain(OUTPUT_STATEMENT);
    expect(flat(read('../README.md'))).toContain(OUTPUT_STATEMENT);
  });

  it('ends with the disclosure line', () => {
    expect(read('../README.md').trimEnd().split('\n').at(-1)).toBe(DISCLOSURE);
  });
});
