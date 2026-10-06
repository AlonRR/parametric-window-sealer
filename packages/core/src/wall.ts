// The library's main call (backlog item api-library, #45): the page's parameters in, the
// plan and the files out (Q80), in Node.js or a browser (Q81). MPL-2.0 like the rest of the
// code (Q36); the files it makes belong to whoever makes them.

import { edgeShapes } from './edge.js';
import { edgeStripSolid } from './edge-geometry.js';
import { loadEngine } from './engine.js';
import type { Engine } from './engine.js';
import { MEDIA_TYPES, checkChoice, meshOf, packageDownload, partName, pieceFileName, wallLabel } from './export.js';
import type { AnyPartShape, DownloadChoice, DownloadFile, ExportPart, ExportPiece } from './export.js';
import { partShapes } from './joint.js';
import { crossSolid, stripSolid } from './joint-geometry.js';
import type { GridLayout } from './layout.js';
import { buildPieces } from './panel-geometry.js';
import { describePlan, planParts, planWall, readParams, toFormValues } from './params.js';
import { tapeFit, tapedCollar } from './tape.js';
import { fillPattern } from './fill.js';
import { fillFor } from './piece-fill.js';
import { gasketShapes, gasketSolid, sleeveShapes, sleeveSolid, tpuJoint } from './tpu.js';
import { frameShapes, frameSolid, linedRim } from './cutout.js';
import type { FieldErrors, Params, PlanText } from './params.js';

// Every part beside the pieces, one shape with a count for identical ones (Q58): the joint
// strips and cross pieces, in TPU if chosen (C34), the edge strips, and with the TPU seal its
// gaskets, the sleeves for the hose ports (#22) and the frames for the cutouts (#23; C43). The
// download and the dry run both list these.
export function wallPartShapes(params: Params, plan: GridLayout = planWall(params)): AnyPartShape[] {
  const { joints, edges } = planParts(params, plan);
  const fit = tapeFit(params.seal);
  const tpu = params.seal.kind === 'tpu' && fit !== undefined ? fit : undefined;
  const inTpu = tpu !== undefined && params.seal.tape.joints;
  return [
    ...partShapes(joints, params.joint).map((s) => (inTpu ? { ...s, tpu: true as const } : s)),
    ...edgeShapes(edges),
    ...(tpu === undefined ? [] : gasketShapes(edges, tpu, params.seal.tape.thicknessMm)),
    ...(tpu === undefined ? [] : sleeveShapes(params.ports, tapedCollar(params.collar, tpu), tpu)),
    ...(tpu === undefined ? [] : frameShapes(params.cutouts, linedRim(params.rim, tpu), tpu)),
  ];
}

// Every piece in its cell, and one strip, cross piece or edge strip per shape, lying as it
// prints (Q53, Q58).
export function buildExport(engine: Engine, params: Params): { pieces: ExportPiece[]; parts: ExportPart[] } {
  const plan = planWall(params);
  // Each piece's own fill, or the wall's (#21).
  const pattern = (cell: { column: number; row: number }) =>
    fillPattern(fillFor(params, cell.column + 1, cell.row + 1), params.joint);
  const built = buildPieces(
    engine,
    plan,
    params.thicknessMm,
    params.ports,
    params.collar,
    tapeFit(params.seal),
    pattern,
    params.cutouts,
    params.rim,
  );
  let pieces: ExportPiece[];
  try {
    pieces = built.map((b, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      return {
        cell,
        mesh: meshOf(b.solid),
        ...(b.hoseMm === undefined ? {} : { hoseMm: b.hoseMm }),
        ...(b.cutout === undefined ? {} : { cutout: b.cutout }),
      };
    });
  } finally {
    for (const b of built) b.solid.delete();
  }
  const { joint, thicknessMm } = params;
  const fit = tapeFit(params.seal);
  const solidOf = (shape: AnyPartShape) => {
    const own = shape.kind !== 'edge' && 'tpu' in shape && shape.tpu === true ? tpuJoint(joint) : joint;
    switch (shape.kind) {
      case 'edge':
        return edgeStripSolid(engine, shape.lengthMm, shape, joint, thicknessMm, 'print');
      case 'strip':
        return stripSolid(engine, shape.lengthMm, own, thicknessMm, 'print');
      case 'cross':
        return crossSolid(engine, own, thicknessMm, 'print');
      case 'gasket':
        if (fit === undefined) throw new Error('A gasket without a seal');
        return gasketSolid(engine, shape.lengthMm, fit, shape.heightMm);
      case 'sleeve':
        return sleeveSolid(engine, shape);
      case 'frame':
        return frameSolid(engine, shape);
      default: {
        const unknown: never = shape;
        throw new Error(`No part of kind ${(unknown as AnyPartShape).kind}`);
      }
    }
  };
  const parts = wallPartShapes(params, plan).map((shape) => {
    const solid = solidOf(shape);
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
export async function makeWall(params: Params, choice: DownloadChoice, options: MakeWallOptions = {}): Promise<Wall> {
  const errors = validateParams(params);
  if (Object.keys(errors).length > 0) throw new ParamsError(errors);
  const engine = options.engine ?? (await loadEngine(options.wasmUrl));
  const plan = planWall(params);
  return { plan, summary: describePlan(plan, params), files: makeFiles(engine, params, choice) };
}

export interface PlannedFile {
  name: string;
  type: string;
}

// The names and types makeFiles would write, found without building anything, so without
// the engine: what a dry run lists (Q89). Refuses what makeWall refuses.
export function planFiles(params: Params, choice: DownloadChoice): PlannedFile[] {
  const errors = validateParams(params);
  if (Object.keys(errors).length > 0) throw new ParamsError(errors);
  checkChoice(choice);
  const label = wallLabel(params.openingWidthMm, params.openingHeightMm);
  if (choice.packaging === 'single') return [{ name: `${label}.3mf`, type: MEDIA_TYPES['3mf'] }];
  if (choice.packaging === 'zip') return [{ name: `${label}-${choice.format}.zip`, type: MEDIA_TYPES.zip }];
  const plan = planWall(params);
  const type = MEDIA_TYPES[choice.format];
  return [
    ...plan.pieces.map((cell) => {
      const port = params.ports.find((p) => p.column === cell.column + 1 && p.row === cell.row + 1);
      const cut = params.cutouts.find((c) => c.column === cell.column + 1 && c.row === cell.row + 1);
      const cutout = cut === undefined ? undefined : { widthMm: cut.widthMm, heightMm: cut.heightMm };
      return { name: pieceFileName(cell, choice.format, port?.hoseMm, cutout), type };
    }),
    ...wallPartShapes(params, plan).map((shape) => ({
      name: `${partName(shape)}.${choice.format}`,
      type,
    })),
  ];
}
