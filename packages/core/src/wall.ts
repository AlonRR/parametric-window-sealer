// The library's main call (backlog item api-library, #45): the page's parameters in, the
// plan and the files out (Q80), in Node.js or a browser (Q81). MPL-2.0 like the rest of the
// code (Q36); the files it makes belong to whoever makes them.

import { edgeShapes } from './edge.js';
import { edgeStripSolid } from './edge-geometry.js';
import { loadEngine } from './engine.js';
import type { Engine } from './engine.js';
import { meshOf, packageDownload, partName } from './export.js';
import type { DownloadChoice, DownloadFile, ExportPart, ExportPiece } from './export.js';
import { partShapes } from './joint.js';
import { crossSolid, stripSolid } from './joint-geometry.js';
import type { GridLayout } from './layout.js';
import { buildPieces } from './panel-geometry.js';
import { describePlan, planParts, planWall, readParams, toFormValues } from './params.js';
import type { FieldErrors, Params, PlanText } from './params.js';

// Every piece in its cell, and one strip, cross piece or edge strip per shape, lying as it
// prints (Q53, Q58).
export function buildExport(
  engine: Engine,
  params: Params,
): { pieces: ExportPiece[]; parts: ExportPart[] } {
  const plan = planWall(params);
  const built = buildPieces(engine, plan, params.thicknessMm);
  let pieces: ExportPiece[];
  try {
    pieces = built.map((b, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      return { cell, mesh: meshOf(b.solid) };
    });
  } finally {
    for (const b of built) b.solid.delete();
  }
  const { joint, thicknessMm } = params;
  const { joints, edges } = planParts(params, plan);
  const shapes = [...partShapes(joints, joint), ...edgeShapes(edges)];
  const parts = shapes.map((shape) => {
    const solid =
      shape.kind === 'edge'
        ? edgeStripSolid(engine, shape.lengthMm, shape, joint, thicknessMm, 'print')
        : shape.kind === 'strip'
          ? stripSolid(engine, shape.lengthMm, joint, thicknessMm, 'print')
          : crossSolid(engine, joint, thicknessMm, 'print');
    try {
      return { name: partName(shape), mesh: meshOf(solid), count: shape.count };
    } finally {
      solid.delete();
    }
  });
  return { pieces, parts };
}

export function makeFiles(engine: Engine, params: Params, choice: DownloadChoice): DownloadFile[] {
  const { pieces, parts } = buildExport(engine, params);
  return packageDownload(pieces, parts, choice, params.openingWidthMm, params.openingHeightMm);
}

// The page's own checks, for parameters given as numbers: each value is read back as the
// form reads it, so the library refuses exactly what the page marks, field by field.
export function validateParams(params: Params): FieldErrors {
  const read = readParams(toFormValues(params));
  return read.ok ? {} : read.errors;
}

export class ParamsError extends RangeError {
  readonly errors: FieldErrors;

  constructor(errors: FieldErrors) {
    const list = Object.entries(errors).map(([field, message]) => `${field}: ${message}`);
    super(`The parameters cannot be used. ${list.join(' ')}`);
    this.name = 'ParamsError';
    this.errors = errors;
  }
}

export interface Wall {
  plan: GridLayout; // the pieces and their places
  summary: PlanText; // the page's description of the plan, warnings included
  files: DownloadFile[]; // what the page's download would save
}

export interface MakeWallOptions {
  engine?: Engine; // an engine already started; otherwise one is started and kept
  wasmUrl?: string; // in a browser, where the engine's manifold.wasm is served from
}

// The choice of format and packaging is required, as in the page's dialog (Q47).
export async function makeWall(
  params: Params,
  choice: DownloadChoice,
  options: MakeWallOptions = {},
): Promise<Wall> {
  const errors = validateParams(params);
  if (Object.keys(errors).length > 0) throw new ParamsError(errors);
  const engine = options.engine ?? (await loadEngine(options.wasmUrl));
  const plan = planWall(params);
  return { plan, summary: describePlan(plan, params), files: makeFiles(engine, params, choice) };
}
