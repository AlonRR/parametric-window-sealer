// An organiser board: a board a wall-organiser system's own accessories hang on, declared once
// (docs/organisers.md). Its openings sit on a lattice across the whole wall, as a pattern's tiles
// do, and go through the board; the board is raised on the room side, inside each piece's border,
// to the thickness the accessories fit. organisers/index.ts lists them.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';

export interface OrganiserDefinition<K extends string = string> {
  kind: K; // in the library's shape: fill.kind
  name: string; // in the page's lists: "Skådis pegboard"
  words: string; // in a sentence: "a Skådis pegboard"
  accessories: string; // whose accessories it takes, in a message: "Skådis accessories"
  boardMm: number; // the board's thickness its accessories fit
  pitchXMm: number; // the lattice: an opening every pitchXMm along a row,
  pitchYMm: number; // rows pitchYMm apart,
  rowShiftMm: number; // every other row shifted this far
  widthMm: number; // one opening at its widest, across and up: it is cut only where all of it fits
  heightMm: number;
  // One opening's cut, centred on x = y = 0, through a board boardMm thick lying on z = 0 with its
  // room face at z = boardMm, reaching 1 mm past both faces. The caller frees it.
  cut(engine: Engine): Manifold;
  describe: string; // its openings and their spacing, in the plan
}

// Keeps the kind exact, so the type checker knows each organiser's kind.
export const defineOrganiser = <const K extends string>(organiser: OrganiserDefinition<K>): OrganiserDefinition<K> =>
  organiser;
