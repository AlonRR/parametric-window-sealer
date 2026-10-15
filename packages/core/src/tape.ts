// The tape seal (backlog item seal-tape, #15; the owner's decisions Q119 to Q132).
//
// Self-adhesive foam tape, one size for every place (Q130), from four sizes on the makers' own
// listings or the user's own (Q121; docs/tape-sizes.md has the sources). It sits in a groove
// the tape's width plus 0.5 mm wide and 1 mm deep (Q120, Q124), and the panels leave it the room
// it takes squeezed to half its thickness (Q125). It always goes on the edge strips' outer face
// (Q119); under Advanced also on their sides (Q127) and inside the hose port's collar (Q129).
// The joints between pieces are left to the printed TPU seal (Q128).
//
// The printed TPU seal (seal-tpu, #22) takes the tape's place and its sizes (C31, C35): its
// gaskets sit in the same grooves and the panels leave them the same room. Its own parts are in
// tpu.ts.
//
// The shapes are in edge.ts, edge-geometry.ts and panel-geometry.ts; this file holds the rules.
import type { CollarParams } from './port.js';
import { foldedFinsMm } from './tpu.js';

export interface TapeParams {
  widthMm: number;
  thicknessMm: number;
  grooveMm: number; // how deep its groove is; 0 for a flat face
  squeezePct: number; // its thickness, squeezed, as the panels leave it room for
  sides: boolean; // also on the sides of the edge strips in a track (Q127)
  port: boolean; // also inside each hose port's collar (Q129)
  joints: boolean; // with printed TPU, the joint strips and cross pieces in TPU too (C34)
}

export type SealKind = 'none' | 'tape' | 'tpu';

// Foam tape, or gaskets printed in TPU to the tape's size (C35). The tape's settings are kept
// with no seal too, so turning it on starts where it was left.
export interface SealParams {
  kind: SealKind;
  tape: TapeParams;
}

export const TAPE_SIZES: readonly { widthMm: number; thicknessMm: number }[] = [
  { widthMm: 9, thicknessMm: 4 },
  { widthMm: 9.5, thicknessMm: 4.8 },
  { widthMm: 9, thicknessMm: 6 },
  { widthMm: 9.5, thicknessMm: 6.4 },
];

export const DEFAULT_TAPE: TapeParams = {
  widthMm: 9,
  thicknessMm: 4,
  grooveMm: 1,
  squeezePct: 50,
  sides: false,
  port: false,
  joints: false,
};

export const NO_SEAL: SealParams = { kind: 'none', tape: DEFAULT_TAPE };

// The groove is this much wider than the tape (Q124), so a 9 mm and a 9.5 mm tape both fit.
export const TAPE_GROOVE_PLAY_MM = 0.5;

// The thinnest wall beside a groove: two lines from a 0.4 mm nozzle (Q131).
export const TAPE_GROOVE_WALL_MM = 0.8;

// What the shapes need to know of the tape.
export interface TapeFit {
  widthMm: number;
  grooveWidthMm: number;
  grooveDepthMm: number;
  standOutMm: number; // squeezed, how far it stands out of its groove: the room left for it
  sides: boolean;
  port: boolean;
}

// The same for the tape and for the TPU gaskets that take its place (C31).
// With printed TPU, the groove is at least deep enough for the gasket's fins to fold flat inside it
// (tpu-fin-seals, #115).
export function tapeFit(seal: SealParams): TapeFit | undefined {
  if (seal.kind === 'none') return undefined;
  const t = seal.tape;
  const depth = seal.kind === 'tpu' ? Math.max(t.grooveMm, foldedFinsMm(t)) : t.grooveMm;
  return {
    widthMm: t.widthMm,
    grooveWidthMm: t.widthMm + TAPE_GROOVE_PLAY_MM,
    grooveDepthMm: depth,
    standOutMm: Math.round(((t.thicknessMm * t.squeezePct) / 100 - depth) * 1e6) / 1e6,
    sides: t.sides,
    port: t.port,
  };
}

// The collar with tape inside it (Q129): the tape takes the clearance round the hose, and the
// wall grows by the groove so as much stays behind it.
export function tapedCollar(collar: CollarParams, fit: TapeFit | undefined): CollarParams {
  if (fit === undefined || !fit.port) return collar;
  return { ...collar, clearanceMm: fit.standOutMm, wallMm: collar.wallMm + fit.grooveDepthMm };
}
