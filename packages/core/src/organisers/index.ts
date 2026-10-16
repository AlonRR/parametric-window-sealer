// Every organiser board the panel fill offers, in the order the page lists them, after the patterns.
// A new organiser is a file beside these, declared with defineOrganiser, and one entry here; the
// settings, the command's --fill, the MCP server's schema, the page's fill list and the plan take
// it from here (docs/extending.md, "A new organiser"); a hidden one only by name.
import type { OrganiserDefinition } from './define.js';
import { HSW } from './hsw.js';
import { MULTIBOARD } from './multiboard.js';
import { OPENGRID } from './opengrid.js';
import { SKADIS } from './skadis.js';

export * from './define.js';
export * from './skadis.js';
export * from './opengrid.js';
export * from './hsw.js';
export * from './multiboard.js';

export const ORGANISERS = [SKADIS, OPENGRID, HSW, MULTIBOARD] as const;

export type Organiser = (typeof ORGANISERS)[number];
export type OrganiserKind = Organiser['kind'];

// The ones the page, the command's help and the MCP server's schema offer: all but the hidden.
export const OFFERED_ORGANISERS: readonly OrganiserDefinition[] = ORGANISERS.filter(
  (o: OrganiserDefinition) => o.hidden !== true,
);

export const organiserOf = (kind: string): OrganiserDefinition | undefined => ORGANISERS.find((o) => o.kind === kind);
