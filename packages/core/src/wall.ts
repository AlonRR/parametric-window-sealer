// The library's main call (backlog item api-library, #45): the page's parameters in, the
// plan and the files out (Q80), in Node.js or a browser (Q81). MPL-2.0 like the rest of the
// code (Q36); the files it makes belong to whoever makes them.

import { edgeShapes } from './edge.js';
import { edgeStripSolid } from './edge-geometry.js';
import { loadEngine } from './engine.js';
import type { Engine } from './engine.js';
import { MEDIA_TYPES, checkChoice, meshOf, packageDownload, partName, taggedFileName, wallLabel } from './export.js';
import type { AnyPartShape, DownloadChoice, DownloadFile, ExportPart, ExportPiece, WallPartShape } from './export.js';
import { partShapes, planPins } from './joint.js';
import { planDovetails } from './dovetail.js';
import { sliderShapes, sliderSolid } from './slider.js';
import { couponShape, couponSolid } from './coupon.js';
import { planRail, railGasketLengths, railShapes, railSolid } from './rail.js';
import { planStop, stopShapes, stopSolid } from './stop.js';
import { clipShapes, clipSolid, planStiffeners } from './stiffener.js';
import { isCut, slotPins } from './sheet.js';
import { crossSolid, stripSolid } from './joint-geometry.js';
import type { GridLayout } from './layout.js';
import { buildPiecesWith } from './panel-geometry.js';
import { FITTINGS, fittingIn, fittingSource, placedFittings } from './fittings/index.js';
import type { FittingPart } from './fittings/index.js';
import { readParams, toFormValues } from './params.js';
import { longestStripMm, planParts, planWall } from './plan.js';
import { describePlan } from './plan-text.js';
import { tapeFit } from './tape.js';
import { fillPattern } from './fill.js';
import { patternBorderMm } from './pattern.js';
import { fillFor } from './piece-fill.js';
import { gasketShapes, gasketSolid, tpuJoint } from './tpu.js';
import type { FieldErrors, Params } from './params.js';
import type { PlanText } from './plan-text.js';

// Every part beside the pieces, one shape with a count for identical ones so a file is printed as
// many times as its name says, with its name and its solid lying as it prints: the joint strips and
// cross pieces, in TPU if chosen, the edge strips, with the TPU seal its gaskets, and each fitting's
// parts: with the TPU seal the sleeves for the hose ports (#22) and the frames for the cutouts (#23),
// always the clamps' jaws (#32), the filler between the sashes if there is one, with printed TPU its
// gaskets (#116), the sash stop if there is one (#118), and if asked for, the joint's test coupon (#110).
function wallParts(params: Params, plan: GridLayout): FittingPart[] {
  const { joints, edges, sliders } = planParts(params, plan);
  const { joint, thicknessMm } = params;
  const fit = tapeFit(params.seal);
  const tpu = params.seal.kind === 'tpu' && fit !== undefined ? fit : undefined;
  const inTpu = tpu !== undefined && params.seal.tape.joints;
  const rail = planRail(params);
  const railGaskets = railGasketLengths(rail, longestStripMm(params));
  const own: WallPartShape[] = [
    ...partShapes(joints, joint).map((s) => (inTpu ? { ...s, tpu: true as const } : s)),
    ...sliderShapes(sliders, joint),
    ...edgeShapes(edges),
    ...(tpu === undefined ? [] : gasketShapes(edges, tpu, params.seal.tape.thicknessMm, railGaskets)),
    ...(rail === undefined ? [] : railShapes(rail)),
    ...stopShapesFor(params),
    ...clipShapes(planStiffeners(params)),
    ...(params.coupon ? [couponShape(joint)] : []),
  ];
  const solidOf = (engine: Engine, shape: WallPartShape) => {
    const strip = shape.kind !== 'edge' && 'tpu' in shape && shape.tpu === true ? tpuJoint(joint) : joint;
    switch (shape.kind) {
      case 'edge':
        return edgeStripSolid(engine, shape.lengthMm, shape, joint, thicknessMm, 'print', params.rain);
      case 'strip':
        return stripSolid(engine, shape.lengthMm, strip, thicknessMm, 'print', params.rain);
      case 'cross':
        return crossSolid(engine, strip, thicknessMm, 'print');
      case 'gasket':
        if (fit === undefined) throw new Error('A gasket without a seal');
        return gasketSolid(engine, shape.lengthMm, fit, shape.heightMm);
      case 'coupon':
        return couponSolid(engine, shape, joint, thicknessMm);
      case 'rail':
        return railSolid(engine, shape);
      case 'stop':
        return stopSolid(engine, shape);
      case 'clip':
        return clipSolid(engine, joint);
      case 'slider':
        return sliderSolid(engine, shape.lengthMm, joint);
      default: {
        const unknown: never = shape;
        throw new Error(`No part of kind ${(unknown as WallPartShape).kind}`);
      }
    }
  };
  const source = fittingSource(params);
  return [
    ...own.map((shape) => ({ shape, name: partName(shape), solid: (engine: Engine) => solidOf(engine, shape) })),
    ...FITTINGS.flatMap((f) => f.parts(source, tpu)),
  ];
}

function stopShapesFor(params: Params) {
  const plan = planStop(params);
  return plan === undefined ? [] : stopShapes(plan);
}

// The download and the dry run both list these.
export function wallPartShapes(params: Params, plan: GridLayout = planWall(params)): AnyPartShape[] {
  return wallParts(params, plan).map((p) => p.shape);
}

// Every printed piece in its cell, and one strip, cross piece or edge strip per shape, lying as it
// prints, its file printed as many times as its name says. Pieces cut from sheet (#112) are not in
// the download; the plan lists them.
export function buildExport(engine: Engine, params: Params): { pieces: ExportPiece[]; parts: ExportPart[] } {
  const plan = planWall(params);
  // Each piece's own fill, or the wall's (#21).
  const pattern = (cell: { column: number; row: number }) =>
    fillPattern(fillFor(params, cell.column + 1, cell.row + 1), params.joint);
  const fittings = placedFittings(fittingSource(params));
  const pins = {
    joint: params.joint,
    pins: slotPins(params, plan, planPins(planParts(params, plan).joints, params.joint)),
  };
  const hollow = params.wall === 'double' ? { borderMm: patternBorderMm(params.joint) } : undefined;
  const printed = (cell: { column: number; row: number }) => !isCut(params, cell);
  const dovetails =
    params.joint.style === 'dovetails' ? { joint: params.joint, tabs: planDovetails(plan, params.joint) } : undefined;
  const joinery = planParts(params, plan);
  const rails = params.joint.style === 'rails' ? { joint: params.joint, sliders: joinery.sliders } : undefined;
  const flanges = params.joint.style === 'bolts' ? { joint: params.joint, flanges: joinery.flanges } : undefined;
  const built = buildPiecesWith(
    engine,
    plan,
    params.thicknessMm,
    fittings,
    pattern,
    pins,
    hollow,
    printed,
    dovetails,
    rails,
    flanges,
  );
  let pieces: ExportPiece[];
  try {
    pieces = built.flatMap((b, i) => {
      const cell = plan.pieces[i];
      if (!cell) throw new Error('The plan and the built pieces differ');
      if (isCut(params, cell)) return [];
      return [
        {
          cell,
          mesh: meshOf(b.solid),
          ...(b.hoseMm === undefined ? {} : { hoseMm: b.hoseMm }),
          ...(b.cutout === undefined ? {} : { cutout: b.cutout }),
          ...(b.tag === undefined ? {} : { tag: b.tag }),
        },
      ];
    });
  } finally {
    for (const b of built) b.solid.delete();
  }
  const parts = wallParts(params, plan).map((part) => {
    const solid = part.solid(engine);
    try {
      return { name: part.name, mesh: meshOf(solid), count: part.shape.count };
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
  const fittings = placedFittings(fittingSource(params));
  return [
    ...plan.pieces
      .filter((cell) => !isCut(params, cell))
      .map((cell) => {
        const tag = fittingIn(fittings, cell.column + 1, cell.row + 1)?.tag;
        return { name: taggedFileName(cell, choice.format, tag), type };
      }),
    ...wallParts(params, plan).map((part) => ({ name: `${part.name}.${choice.format}`, type })),
  ];
}
