// The plan in words, as the page, the command and the MCP server show it. Each line of the plan
// is one key of PlanText; the page shows each in the element marked with that key (data-plan).
import { EDGES, edgeShapes, panelSpan } from './edge.js';
import { jointWidthMm, minPieceMm, partShapes } from './joint.js';
import type { JointParams, JointPlan } from './joint.js';
import type { Axis, GridLayout, Leftover } from './layout.js';
import { linedRim, rimInnerMm } from './cutout.js';
import { collarInnerMm } from './port.js';
import { tapeFit, tapedCollar } from './tape.js';
import { fillWords } from './fill.js';
import { fillFor } from './piece-fill.js';
import { pieceLimit, planParts } from './plan.js';
import type { WallParts } from './plan.js';
import type { Params } from './params.js';
import { listed, mm, plural, sum } from './words.js';

export interface LeftoverText {
  axis: Axis;
  message: string;
  used: Leftover;
  options: { value: Leftover; label: string; possible: boolean }[];
}

export interface PlanText {
  headline: string;
  columns: string;
  rows: string;
  span: string;
  joints: string;
  edges: string;
  warnings: string[];
  leftovers: LeftoverText[];
  ports: string[]; // one line for each hose port
  cutouts: string[]; // one line for each measured cutout (#23)
  units: string[]; // one line for each edge against a window AC (#24)
  seal: string;
  fill: string;
  pieceFills: string[]; // one line for each piece with a fill of its own (#21)
}

function describeLeftover(note: GridLayout['leftovers'][number], maxPieceMm: number, joint: JointParams): LeftoverText {
  const label = note.axis === 'width' ? 'Width' : 'Height';
  const full = plural(note.fullPieces, `full ${mm(maxPieceMm)} mm piece`, `full ${mm(maxPieceMm)} mm pieces`);
  const verb = note.fullPieces === 1 ? 'leaves' : 'leave';
  const spread = note.options.spread;
  const each = note.fullPieces > 1 ? note.leftoverMm / (note.fullPieces - 1) : 0;
  let spreadLabel: string;
  if (spread.possible) {
    spreadLabel = `Spread the pieces ${mm(each)} mm further apart at each joint (they can spread up to ${mm(joint.slideMm)} mm)`;
  } else if (note.fullPieces === 1) {
    spreadLabel = 'Spread the pieces: there is no joint to spread';
  } else {
    spreadLabel = `Spread the pieces: each joint would spread ${mm(each)} mm, more than the ${mm(joint.slideMm)} mm it can`;
  }
  const equal = note.options.equal.pieces;
  const shorten = note.options.shorten;
  return {
    axis: note.axis,
    message: `${label}: ${full} ${verb} ${mm(note.leftoverMm)} mm, too little for another joint and a filler.`,
    used: note.used,
    options: [
      { value: 'spread', label: spreadLabel, possible: spread.possible },
      {
        value: 'equal',
        label: `Equal pieces: ${equal.length} of ${mm(equal[0] ?? 0)} mm`,
        possible: note.options.equal.possible,
      },
      {
        value: 'shorten',
        label: shorten.possible
          ? `Shorten one full piece: ${listed(shorten.pieces)} mm`
          : `Shorten one full piece: no room for a filler of the ${mm(minPieceMm(joint))} mm the joints need`,
        possible: shorten.possible,
      },
    ],
  };
}

function describeJoints(joints: JointPlan, joint: JointParams): string {
  if (joints.strips.length === 0 && joints.crosses.length === 0) {
    return 'No joints: the wall is one piece.';
  }
  const lengths = partShapes(joints, joint).filter((s) => s.kind === 'strip').length;
  const crosses =
    joints.crosses.length > 0 ? `, and ${plural(joints.crosses.length, 'cross piece', 'cross pieces')}` : '';
  return `Joints: ${plural(joints.strips.length, 'strip', 'strips')} in ${plural(lengths, 'length', 'lengths')}${crosses}; each joint ${mm(jointWidthMm(joint))} mm wide.`;
}

// The tape (Q119, Q127, Q129): its size, where it goes, and how much the wall takes, along each
// edge strip, twice more along those in a track for the sides, and round each collar's groove.
// Printed TPU (#22): the gaskets' size and length in the same places, a sleeve in each collar,
// and whether the joints are TPU too.
function describeSeal(params: Params, parts: WallParts): string {
  const fit = tapeFit(params.seal);
  if (fit === undefined) return 'Seal: none.';
  const { tape } = params.seal;
  const outer = sum(parts.edges.map((s) => s.lengthMm));
  const sides = fit.sides
    ? 2 * sum(parts.edges.filter((s) => params.edges.roles[s.edge] === 'track').map((s) => s.lengthMm))
    : 0;
  const ports = fit.port ? params.ports : [];
  const collar = tapedCollar(params.collar, fit);
  const faces = fit.sides ? 'outer faces and sides' : 'outer faces';
  const each = ports.length === 1 ? 'the hose port’s collar' : 'each hose port’s collar';
  // Every cutout's rim is lined (C43).
  const cutouts = params.cutouts;
  const eachRim = cutouts.length === 1 ? 'the cutout’s rim' : 'each cutout’s rim';
  if (params.seal.kind === 'tpu') {
    const metres = Math.round((outer + sides) / 100) / 10;
    const gaskets = `${mm(fit.grooveWidthMm)} × ${mm(tape.thicknessMm)} mm gaskets along the edge strips’ ${faces}: ${metres} m in all`;
    const also = [
      ...(ports.length === 0 ? [] : [`a sleeve inside ${each}`]),
      ...(cutouts.length === 0 ? [] : [`a frame inside ${eachRim}`]),
      ...(tape.joints ? ['the joint strips and cross pieces in TPU'] : []),
    ];
    const list = [gaskets, ...also];
    const last = list.length > 1 ? `, and ${list.pop() ?? ''}` : '';
    return `Seal: printed TPU, ${list.join(', ')}${last}.`;
  }
  const round = sum(ports.map((p) => Math.PI * (collarInnerMm(p.hoseMm, collar) + 2 * fit.grooveDepthMm)));
  const rim = linedRim(params.rim, fit);
  const rims = sum(
    cutouts.map((c) => {
      const floor = rimInnerMm(c, rim);
      return 2 * (floor.widthMm + floor.heightMm) + 8 * fit.grooveDepthMm;
    }),
  );
  const places = [
    ...(ports.length === 0 ? [] : [`inside ${each}`]),
    ...(cutouts.length === 0 ? [] : [`round ${eachRim}`]),
  ];
  const inPorts = places.length === 0 ? '' : `, and ${places.join(' and ')}`;
  const metres = Math.round((outer + sides + round + rims) / 100) / 10;
  return `Seal: ${mm(tape.widthMm)} × ${mm(tape.thicknessMm)} mm foam tape along the edge strips’ ${faces}${inPorts}: ${metres} m in all.`;
}

// Each cutout: the appliance, where, the opening and its rim, and what lines it (C43).
function describeCutouts(params: Params): string[] {
  const rim = linedRim(params.rim, tapeFit(params.seal));
  const lining = { none: '', tape: ', lined with the foam tape', tpu: ', lined with a TPU frame' }[params.seal.kind];
  return params.cutouts.map((c) => {
    const opening = rimInnerMm(c, rim);
    return (
      `Cutout: a ${mm(c.widthMm)} × ${mm(c.heightMm)} mm appliance, in column ${c.column}, row ${c.row}, through a ` +
      `${mm(opening.widthMm)} × ${mm(opening.heightMm)} mm opening in a ${mm(rim.depthMm)} mm rim${lining}.`
    );
  });
}

export function describePlan(plan: GridLayout, params: Params): PlanText {
  const count = plan.pieces.length;
  const max = pieceLimit(params);
  const parts = planParts(params, plan);
  const span = panelSpan(
    params.openingWidthMm,
    params.openingHeightMm,
    params.edges,
    params.joint,
    tapeFit(params.seal),
  );
  const shapes = edgeShapes(parts.edges).length;
  return {
    headline: `${count} ${count === 1 ? 'piece' : 'pieces'}: ${plan.columns.length} across, ${plan.rows.length} up, ${mm(params.thicknessMm)} mm thick`,
    columns: `Widths: ${plan.columns.map(mm).join(', ')} mm`,
    rows: `Heights: ${plan.rows.map(mm).join(', ')} mm`,
    span: `Pieces and joints: ${mm(span.widthMm)} × ${mm(span.heightMm)} mm, for a ${mm(params.openingWidthMm)} × ${mm(params.openingHeightMm)} mm opening.`,
    joints: describeJoints(parts.joints, params.joint),
    edges: `Edges: ${plural(parts.edges.length, 'edge strip', 'edge strips')} in ${plural(shapes, 'shape', 'shapes')}.`,
    warnings: plan.warnings.map((w) => {
      const [where, dimension] = w.axis === 'width' ? ['Column', 'wide'] : ['Row', 'high'];
      return `${where} ${w.index + 1} is ${mm(w.lengthMm)} mm ${dimension}, under the ${mm(w.minPieceMm)} mm the joints need.`;
    }),
    leftovers: plan.leftovers.map((note) =>
      describeLeftover(note, note.axis === 'width' ? max.widthMm : max.heightMm, params.joint),
    ),
    ports: params.ports.map((p) => `Hose port: a ${mm(p.hoseMm)} mm hose end, in column ${p.column}, row ${p.row}.`),
    cutouts: describeCutouts(params),
    units: EDGES.filter((e) => params.edges.roles[e] === 'unit').map(
      (e) =>
        `Window AC: the ${e} edge ${e === 'bottom' ? 'stands on the unit’s top' : e === 'top' ? 'meets the unit’s underside' : 'meets the unit’s side'}.`,
    ),
    seal: describeSeal(params, parts),
    fill: `Fill: ${fillWords(params.fill, params.thicknessMm)}`,
    pieceFills: params.pieceFills.map(
      (f) => `Column ${f.column}, row ${f.row}: ${fillWords(fillFor(params, f.column, f.row), params.thicknessMm)}`,
    ),
  };
}
