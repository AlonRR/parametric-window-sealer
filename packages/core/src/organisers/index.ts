// Every organiser board the panel fill offers, in the order the page lists them, after the patterns.
// A new organiser is a file beside these, declared with defineOrganiser, and one entry here; the
// settings, the command's --fill, the MCP server's schema, the page's fill list and the plan take
// it from here (docs/extending.md, "A new organiser").
import type { OrganiserDefinition } from './define.js';
import { SKADIS } from './skadis.js';

export * from './define.js';
export * from './skadis.js';

export const ORGANISERS = [SKADIS] as const;

export type Organiser = (typeof ORGANISERS)[number];
export type OrganiserKind = Organiser['kind'];

export const organiserOf = (kind: string): OrganiserDefinition | undefined => ORGANISERS.find((o) => o.kind === kind);
