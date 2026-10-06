// Small facts the command reports: its version, and what went wrong in words.
import { readFileSync } from 'node:fs';

// What went wrong: an Error's message, or the thing thrown itself.
export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// The version in this package's package.json.
export function version(): string {
  const pkg: unknown = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return typeof pkg === 'object' && pkg !== null && 'version' in pkg && typeof pkg.version === 'string'
    ? pkg.version
    : 'unknown';
}
