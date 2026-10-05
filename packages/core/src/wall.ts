// The files for a wall (backlog item api-library, #45): every piece, strip, cross piece and
// edge strip, built and written in the chosen format. MPL-2.0 like the rest of the code
// (Q36); the files it makes belong to whoever makes them.

import { edgeShapes } from './edge.js';
import { edgeStripSolid } from './edge-geometry.js';
import type { Engine } from './engine.js';
import { meshOf, packageDownload, partName } from './export.js';
import type { DownloadChoice, DownloadFile, ExportPart, ExportPiece } from './export.js';
import { partShapes } from './joint.js';
import { crossSolid, stripSolid } from './joint-geometry.js';
import { buildPieces } from './panel-geometry.js';
import { planParts, planWall } from './params.js';
import type { Params } from './params.js';

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
