// A plain sealed piece (Q8): a solid block, lying as it is printed: width along X, height along Y,
// thickness along Z, starting at the origin. Every piece starts here; a fitting (fittings/) and a
// pattern (pattern.ts) cut into it.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';

export interface PanelSize {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number of mm, got ${value}`);
  }
}

export function plainPanel(engine: Engine, size: PanelSize): Manifold {
  requirePositive('widthMm', size.widthMm);
  requirePositive('heightMm', size.heightMm);
  requirePositive('thicknessMm', size.thicknessMm);
  return engine.Manifold.cube([size.widthMm, size.heightMm, size.thicknessMm]);
}
