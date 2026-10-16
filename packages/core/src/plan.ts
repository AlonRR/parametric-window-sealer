// The wall's plan from the parameters: the pieces' grid, and the strips that join and edge them.
// The preview, the download and the plan's text all start here, so they cannot disagree.
import { jointStripInsetMm, panelSpan, planEdges } from './edge.js';
import type { EdgeStripPlacement } from './edge.js';
import { jointWidthMm, minPieceMm, planJoints } from './joint.js';
import { DOVETAIL } from './dovetail.js';
import { planSliders } from './slider.js';
import type { SliderPlacement } from './slider.js';
import { planFlanges } from './flange.js';
import type { FlangePlacement } from './flange.js';
import { anyPrinted } from './sheet.js';
import type { JointPlan } from './joint.js';
import { layoutGrid } from './layout.js';
import type { GridLayout } from './layout.js';
import { notchGaps } from './notch.js';
import { maxPieceSize } from './printer.js';
import type { PieceSize } from './printer.js';
import { tapeFit } from './tape.js';
import type { Params } from './params.js';
import { pivotWall } from './pivot.js';

// Puzzle dovetails (#29) reach this far beyond a piece's cell on its right and upper edges, so the
// cells are planned that much smaller than the printer makes.
export const tabRoomMm = (p: Params): number => (p.joint.style === 'dovetails' ? DOVETAIL.depthMm : 0);

function layoutFor(p: Params, max: PieceSize): GridLayout {
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tapeFit(p.seal));
  const room = tabRoomMm(p);
  return layoutGrid({
    widthMm: span.widthMm,
    heightMm: span.heightMm,
    maxPieceWidthMm: max.widthMm - room,
    maxPieceHeightMm: max.heightMm - room,
    minPieceMm: minPieceMm(p.joint), // Q76
    jointMm: jointWidthMm(p.joint),
    // each piece moves half of it, from the middle; pieces without strips do not move
    jointSpreadMm: p.joint.style === 'strips' ? p.joint.slideMm : 0,
    width: p.width,
    height: p.height,
  });
}

// A size turned where that needs fewer pieces, as a piece can be turned on a bed or a sheet; on a
// tie it stays as given, so the plan does not change without a gain.
function turnedIfFewer(p: Params, asGiven: PieceSize): PieceSize {
  if (asGiven.widthMm === asGiven.heightMm) return asGiven;
  const turned = { widthMm: asGiven.heightMm, heightMm: asGiven.widthMm };
  return layoutFor(p, turned).pieces.length < layoutFor(p, asGiven).pieces.length ? turned : asGiven;
}

// The largest piece the printer makes. A listed printer's bed is turned where that needs fewer
// pieces, as a piece can be turned on the bed.
export function printLimit(p: Params): PieceSize {
  const asListed = maxPieceSize(p.printer, p.bedMarginMm);
  return p.printer.kind === 'model' ? turnedIfFewer(p, asListed) : asListed;
}

// The largest piece the plan uses: the printer's, or with the pieces cut from sheet and none of
// them printed, the sheet's, turned as a printer's bed is (sheet-pieces, #112).
export function pieceLimit(p: Params): PieceSize {
  if (anyPrinted(p)) return printLimit(p);
  return turnedIfFewer(p, { widthMm: p.sheet.widthMm, heightMm: p.sheet.heightMm });
}

// The longest strip the printer makes: a strip can be turned on the bed, so the longer side of its
// largest piece.
export function longestStripMm(p: Params): number {
  const max = maxPieceSize(p.printer, p.bedMarginMm);
  return Math.max(max.widthMm, max.heightMm);
}

export function planWall(p: Params): GridLayout {
  // A pivot window's grid is its wall's, below the pivot (#162).
  const wall = pivotWall(p);
  return layoutFor(wall, pieceLimit(wall));
}

export interface WallParts {
  plan: GridLayout;
  joints: JointPlan;
  edges: EdgeStripPlacement[];
  sliders: SliderPlacement[]; // on sliding dovetail rails (#30)
  flanges: FlangePlacement[]; // bolted flanges (#31)
}

// Everything the wall is made of, in the pieces' frame: the plan, the joint strips and
// cross pieces, and the edge strips, each strip no longer than the printer makes.
export function planParts(p: Params, plan: GridLayout = planWall(p)): WallParts {
  const longest = longestStripMm(p);
  const tape = tapeFit(p.seal);
  const span = panelSpan(p.openingWidthMm, p.openingHeightMm, p.edges, p.joint, tape);
  return {
    plan,
    joints: planJoints(plan, p.joint, jointStripInsetMm(p.joint), longest),
    sliders: planSliders(plan, p.joint, jointStripInsetMm(p.joint), longest),
    flanges: planFlanges(plan, p.joint, jointStripInsetMm(p.joint)),
    edges: planEdges(
      span.widthMm,
      span.heightMm,
      p.edges,
      p.joint,
      longest,
      tape,
      notchGaps(p.notches, { edges: p.edges, joint: p.joint, tape }),
    ),
  };
}
