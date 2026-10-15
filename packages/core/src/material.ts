// Material advice by place (material-advice, #113). The user chooses the material; the plan names
// it and warns where the wall will come near the temperature at which it gave. The figures are from
// the design review (docs/research/design-review.md, "Heat" and "UV"): a loaded oven test, the sun's
// heating of light and dark surfaces, and an exhaust hose's air.
import { mm } from './words.js';

export type MaterialKind = 'pla' | 'petg' | 'asa';
export type Colour = 'light' | 'dark';
export const MATERIAL_KINDS: readonly MaterialKind[] = ['petg', 'asa', 'pla'];
export const COLOURS: readonly Colour[] = ['light', 'dark'];

export interface MaterialParams {
  kind: MaterialKind;
  colour: Colour;
  sun: boolean; // the wall's outside face gets direct sun
}

// PETG to start with, in a light colour: it holds up in a summer window where PLA does not.
export const DEFAULT_MATERIAL: MaterialParams = { kind: 'petg', colour: 'light', sun: false };

// Where each gave under load in an oven, in °C.
export const GIVES_AT_C: Record<MaterialKind, number> = { pla: 60, petg: 80, asa: 110 };

// The sun heats a surface this much above the air, by its colour; the air on a summer day; the
// exhaust a portable AC's hose carries.
export const SUN_RISE_C: Record<Colour, number> = { light: 20, dark: 44 };
export const SUMMER_AIR_C = 30;
export const EXHAUST_C = 50;

// Printed parts creep under a constant load below the temperature they give at, so the plan warns
// this far short of it.
export const MARGIN_C = 10;

const NAMES: Record<MaterialKind, string> = { pla: 'PLA', petg: 'PETG', asa: 'ASA' };

// The hottest the wall gets, and why: in sun, or beside a hose; nothing if neither.
export function hottestC(m: MaterialParams, hose: boolean): { c: number; why: 'sun' | 'hose' } | undefined {
  const sun = m.sun ? SUMMER_AIR_C + SUN_RISE_C[m.colour] : undefined;
  const exhaust = hose ? EXHAUST_C : undefined;
  if (sun !== undefined && (exhaust === undefined || sun >= exhaust)) return { c: sun, why: 'sun' };
  if (exhaust !== undefined) return { c: exhaust, why: 'hose' };
  return undefined;
}

// The plan's line: the material, how hot the sun makes it, and in sun, ASA over PETG.
export function describeMaterial(m: MaterialParams): string {
  const words = [`Material: ${NAMES[m.kind]} in a ${m.colour} colour.`];
  if (m.sun) {
    words.push(
      `In sun at ${SUMMER_AIR_C} °C its outside face reaches about ${mm(SUMMER_AIR_C + SUN_RISE_C[m.colour])} °C.`,
    );
    if (m.kind === 'petg') {
      words.push('ASA lasts better in sun: PETG lost 36 % of its strength after 24 hours of UV-B in one test.');
    }
  }
  return words.join(' ');
}

// The warning where the wall comes within the margin of where its material gave.
export function materialWarnings(m: MaterialParams, hose: boolean): string[] {
  const hot = hottestC(m, hose);
  const limit = GIVES_AT_C[m.kind];
  if (hot === undefined || hot.c < limit - MARGIN_C) return [];
  const where = hot.why === 'sun' ? 'in sun' : 'beside the hose';
  const reaches = `${where} the wall reaches about ${mm(hot.c)} °C`;
  if (m.kind === 'pla') {
    return [
      `PLA gave at ${limit} °C in a loaded oven test, and creeps under load below that; ${reaches}. ` +
        'Print it in PETG or ASA; PLA is for test fits.',
    ];
  }
  const instead = m.kind === 'petg' && m.colour === 'dark' ? 'in a light colour, or in ASA' : 'in a light colour';
  return [`${NAMES[m.kind]} gave at ${limit} °C in a loaded oven test; ${reaches}. Print it ${instead}.`];
}
