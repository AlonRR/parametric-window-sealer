// The plan in words, as the page, the command and the MCP server show it. Each line of the plan
// is one key of PlanText; the page shows each in the element marked with that key (data-plan).
import { EDGES, edgeShapes, panelSpan } from './edge.js';
import { PIN_MM, jointWidthMm, minPieceMm, partShapes, pinLengthMm } from './joint.js';
import { COUPON_SECTIONS, couponGrips } from './coupon.js';
import { describeSheet } from './sheet.js';
import { describeMaterial, materialWarnings } from './material.js';
import { describeRail, planRail } from './rail.js';
import type { JointParams, JointPlan } from './joint.js';
import type { Axis, GridLayout, Leftover } from './layout.js';
import { tapeFit } from './tape.js';
import { fillWords } from './fill.js';
import { fillFor } from './piece-fill.js';
import { pieceLimit, planParts } from './plan.js';
import {
  SLIDING_INSERT,
  CLAMPS,
  FAN_MOUNT,
  FITTINGS,
  HOSE_PORT,
  MEASURED_CUTOUT,
  fittingSource,
} from './fittings/index.js';
import type { WallParts } from './plan.js';
import type { Params } from './params.js';
import { hundredth, listed, mm, plural, sum } from './words.js';

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
  fans: string[]; // one line for each fan (#28)
  clamps: string[]; // one line for each clamp (#32)
  inserts: string[]; // one line for each sliding insert (#38)
  units: string[]; // one line for each edge against a window AC (#24)
  seal: string;
  fill: string;
  pieceFills: string[]; // one line for each piece with a fill of its own (#21)
  sheet: string[]; // with pieces cut from sheet (#112): what to cut, what to print, the pins to drill
  material: string; // what the parts are printed in, and in sun how hot it gets (#113)
  rail: string[]; // the filler between the sashes, if there is one (#116)
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

// The joints, the pins to cut for them (joint-lock, #110), and the test coupon if asked for.
function describeJoints(joints: JointPlan, joint: JointParams, thicknessMm: number, coupon: boolean): string {
  const grips = couponGrips(joint.gripMm).map(hundredth);
  const last = grips.pop() ?? '';
  const test = coupon
    ? ` Test coupon: ${COUPON_SECTIONS} sections, marked with 1 to ${COUPON_SECTIONS} notches, gripping by ` +
      `${grips.join(', ')} and ${last} mm.`
    : '';
  if (joints.strips.length === 0 && joints.crosses.length === 0) {
    return `No joints: the wall is one piece.${test}`;
  }
  const lengths = partShapes(joints, joint).filter((s) => s.kind === 'strip').length;
  const crosses =
    joints.crosses.length > 0 ? `, and ${plural(joints.crosses.length, 'cross piece', 'cross pieces')}` : '';
  const pins =
    joint.pins && joints.strips.length > 0
      ? ` Pins: ${2 * joints.strips.length}, each ${mm(pinLengthMm(joint, thicknessMm))} mm of ` +
        `${hundredth(PIN_MM)} mm filament, two through the middle of each strip.`
      : '';
  return `Joints: ${plural(joints.strips.length, 'strip', 'strips')} in ${plural(lengths, 'length', 'lengths')}${crosses}; each joint ${mm(jointWidthMm(joint))} mm wide.${pins}${test}`;
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
  const faces = fit.sides ? 'outer faces and sides' : 'outer faces';
  // Each kind of fitting's share: the tape inside each port's collar (Q129) and round each
  // cutout's rim (C43), or what is printed in TPU there.
  const source = fittingSource(params);
  const linings = FITTINGS.flatMap((f) => f.lining(source) ?? []);
  // Both faces of the filler between the sashes (#116).
  const railMm = 2 * (planRail(params)?.lengthMm ?? 0);
  const onRail = 'along both faces of the filler between the sashes';
  if (params.seal.kind === 'tpu') {
    const metres = Math.round((outer + sides) / 100) / 10;
    const gaskets = `${mm(fit.grooveWidthMm)} × ${mm(tape.thicknessMm)} mm gaskets along the edge strips’ ${faces}: ${metres} m in all`;
    const also = [
      ...(railMm > 0 ? [`${Math.round(railMm / 100) / 10} m more ${onRail}`] : []),
      ...linings.map((l) => l.tpu),
      ...(tape.joints ? ['the joint strips and cross pieces in TPU'] : []),
    ];
    const list = [gaskets, ...also];
    const last = list.length > 1 ? `, and ${list.pop() ?? ''}` : '';
    return `Seal: printed TPU, 85A for the best recovery, ${list.join(', ')}${last}.`;
  }
  const places = [...linings.map((l) => l.tape), ...(railMm > 0 ? [onRail] : [])];
  const inPorts = places.length === 0 ? '' : `, and ${places.join(' and ')}`;
  const metres = Math.round(linings.reduce((n, l) => n + l.tapeMm, outer + sides + railMm) / 100) / 10;
  return `Seal: ${mm(tape.widthMm)} × ${mm(tape.thicknessMm)} mm closed-cell foam tape along the edge strips’ ${faces}${inPorts}: ${metres} m in all.`;
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
    joints: describeJoints(parts.joints, params.joint, params.thicknessMm, params.coupon),
    edges: `Edges: ${plural(parts.edges.length, 'edge strip', 'edge strips')} in ${plural(shapes, 'shape', 'shapes')}.`,
    warnings: [
      ...plan.warnings.map((w) => {
        const [where, dimension] = w.axis === 'width' ? ['Column', 'wide'] : ['Row', 'high'];
        return `${where} ${w.index + 1} is ${mm(w.lengthMm)} mm ${dimension}, under the ${mm(w.minPieceMm)} mm the joints need.`;
      }),
      ...materialWarnings(params.material, params.ports.length > 0),
    ],
    leftovers: plan.leftovers.map((note) =>
      describeLeftover(note, note.axis === 'width' ? max.widthMm : max.heightMm, params.joint),
    ),
    ports: HOSE_PORT.describe(fittingSource(params)),
    cutouts: MEASURED_CUTOUT.describe(fittingSource(params)),
    fans: FAN_MOUNT.describe(fittingSource(params)),
    clamps: CLAMPS.describe(fittingSource(params)),
    inserts: SLIDING_INSERT.describe(fittingSource(params)),
    units: EDGES.filter((e) => params.edges.roles[e] === 'unit').map(
      (e) =>
        `Window AC: the ${e} edge ${e === 'bottom' ? 'stands on the unit’s top' : e === 'top' ? 'meets the unit’s underside' : 'meets the unit’s side'}.`,
    ),
    seal: describeSeal(params, parts),
    fill: `Fill: ${fillWords(params.fill, params.thicknessMm)}`,
    pieceFills: params.pieceFills.map(
      (f) => `Column ${f.column}, row ${f.row}: ${fillWords(fillFor(params, f.column, f.row), params.thicknessMm)}`,
    ),
    sheet: describeSheet(params, plan, params.joint.pins ? 2 * parts.joints.strips.length : 0),
    material: describeMaterial(params.material),
    rail: describeRail(params),
  };
}
