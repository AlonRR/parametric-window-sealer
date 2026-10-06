// The wall's plan from the parameters: the pieces' grid, and the strips that join and edge them.
// The preview, the download and the plan's text all start here, so they cannot disagree.
import { jointStripInsetMm, panelSpan, planEdges } from './edge.js';
import type { EdgeStripPlacement } from './edge.js';
import { jointWidthMm, minPieceMm, planJoints } from './joint.js';
import type { JointPlan } from './joint.js';
import { layoutGrid } from './layout.js';
import type { GridLayout } from './layout.js';
import { maxPieceSize } from './printer.js';
import type { PieceSize } from './printer.js';
import { tapeFit } from './tape.js';
import type { Params } from './params.js';

function layoutFor(p: Params, max: PieceSize): GridLayout {
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tapeFit(p.seal));
  return layoutGrid({
    widthMm: span.widthMm,
    heightMm: span.heightMm,
    maxPieceWidthMm: max.widthMm,
    maxPieceHeightMm: max.heightMm,
    minPieceMm: minPieceMm(p.joint), // Q76
    jointMm: jointWidthMm(p.joint),
    jointSpreadMm: p.joint.slideMm, // each piece moves half of it, from the middle (Q56)
    width: p.width,
    height: p.height,
  });
}

// The largest piece the plan uses. A listed printer's bed is turned where that needs fewer
// pieces, as a piece can be turned on the bed; on a tie it stays as listed (Q116).
export function pieceLimit(p: Params): PieceSize {
  const asListed = maxPieceSize(p.printer, p.bedMarginMm);
  if (p.printer.kind !== 'model' || asListed.widthMm === asListed.heightMm) return asListed;
  const turned = { widthMm: asListed.heightMm, heightMm: asListed.widthMm };
  return layoutFor(p, turned).pieces.length < layoutFor(p, asListed).pieces.length ? turned : asListed;
}

export function planWall(p: Params): GridLayout {
  return layoutFor(p, pieceLimit(p));
}

export interface WallParts {
  plan: GridLayout;
  joints: JointPlan;
  edges: EdgeStripPlacement[];
}

// Everything the wall is made of, in the pieces' frame: the plan, the joint strips and
// cross pieces, and the edge strips.
export function planParts(p: Params, plan: GridLayout = planWall(p)): WallParts {
  const max = pieceLimit(p);
  const tape = tapeFit(p.seal);
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tape);
  return {
    plan,
    joints: planJoints(plan, p.joint, jointStripInsetMm(p.joint)),
    // A strip can be turned on the bed, so the longer side of the largest piece limits it.
    edges: planEdges(span.widthMm, span.heightMm, p.edges, p.joint, Math.max(max.widthMm, max.heightMm), tape),
  };
}
