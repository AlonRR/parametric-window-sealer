// Every kind of fitting (fitting-registry, #97), in the order they are listed: their parts, their
// shares of the seal, their seals in the preview. Keep it the order readParams places them in,
// where a kind placed later may not share a piece with one placed before. A new kind is a file
// beside these, its FittingDefinition here, its fittings and settings in FittingSource, its
// placement when the settings are read, and its key in the plan (docs/extending.md, "A new
// fitting").
import { tapeFit } from '../tape.js';
import type { SealParams } from '../tape.js';
import type { FittingDefinition, FittingSource, PlacedFitting } from './define.js';
import { HOSE_PORT } from './hose-port.js';
import { MEASURED_CUTOUT } from './measured-cutout.js';

export * from './define.js';
export * from './place.js';
export * from './hose-port.js';
export * from './measured-cutout.js';

export const FITTINGS: readonly FittingDefinition[] = [HOSE_PORT, MEASURED_CUTOUT];

// The fittings' source in a wall's parameters.
export const fittingSource = (
  params: Omit<FittingSource, 'tape' | 'sealKind'> & { seal: SealParams },
): FittingSource => ({
  ports: params.ports,
  cutouts: params.cutouts,
  collar: params.collar,
  rim: params.rim,
  tape: tapeFit(params.seal),
  sealKind: params.seal.kind,
});

// Every fitting of every kind, each in its piece.
export const placedFittings = (
  source: FittingSource,
  fittings: readonly FittingDefinition[] = FITTINGS,
): PlacedFitting[] => fittings.flatMap((f) => f.placed(source));

// The fitting in a piece, by column and row from 1, if it has one.
export const fittingIn = (placed: readonly PlacedFitting[], column: number, row: number): PlacedFitting | undefined =>
  placed.find((p) => p.column === column && p.row === row);
