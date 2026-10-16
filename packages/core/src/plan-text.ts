// The plan in words, as the page, the command and the MCP server show it. Each line of the plan
// is one key of PlanText; the page shows each in the element marked with that key (data-plan).
import { EDGES, edgeShapes, panelSpan } from './edge.js';
import { PIN_MM, jointWidthMm, minPieceMm, partShapes, pinLengthMm } from './joint.js';
import { describeDovetails } from './dovetail.js';
import { describeSliders } from './slider.js';
import { describeFlanges } from './flange.js';
import { COUPON_SECTIONS, couponGrips } from './coupon.js';
import { describeSheet } from './sheet.js';
import { describeMaterial, materialWarnings } from './material.js';
import { describeRail, planRail } from './rail.js';
import { describeRain } from './rain.js';
import { describeStop } from './stop.js';
import { describeDouble } from './double.js';
import { describeFrame } from './frame.js';
import { describeShutter } from './shutter.js';
import { describeRoof } from './roof.js';
import { PIVOT_WEDGE_WORDS, describePivot, pivotRoofLines, pivotWall, pivotWedge } from './pivot.js';
import { describeNotches } from './notch.js';
import { describePrinting } from './piece-print.js';
import { describeStiffeners } from './stiffener.js';
import { patternBorderMm } from './pattern.js';
import type { JointParams, JointPlan } from './joint.js';
import type { Axis, GridLayout, Leftover } from './layout.js';
import { tapeFit } from './tape.js';
import { fillWords } from './fill.js';
import { fillFor } from './piece-fill.js';
import { pieceLimit, planParts } from './plan.js';
import {
  APPLIANCE_MODEL,
  CUSTOM_PIECE,
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
import { requireWedgeSetup, sashForm, sashPartNames } from './wedge-window.js';
import { WEDGE_WORDS } from './wedge.js';
import type { WedgeWords } from './wedge.js';
import { describeWedge, wedgeGasketRuns } from './wedge-print.js';

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
  model: string[]; // the imported model of the appliance, if there is one (#35)
  customPiece: string[]; // a whole piece of your own, if there is one (#41)
  units: string[]; // one line for each edge against a window AC (#24)
  seal: string;
  fill: string;
  pieceFills: string[]; // one line for each piece with a fill of its own (#21)
  sheet: string[]; // with pieces cut from sheet (#112): what to cut, what to print, the pins to drill
  material: string; // what the parts are printed in, and in sun how hot it gets (#113)
  rail: string[]; // the filler between the sashes, if there is one (#116)
  rain: string[]; // the weep holes, and keeping a window AC's tilt (#117)
  stop: string[]; // the sash stop, if there is one (#118)
  double: string[]; // a double wall's skins, and what it gains (#119)
  frame: string[]; // what holds a wall pressed into a frame with no track (#120)
  shutter: string[]; // how a wall behind a roller shutter sits in its rails, and the shutter on it (#158)
  roof: string[]; // a roof window's wall on its slope: its weight's pull, the test, the rain (#160)
  notches: string[]; // notches along an edge for the window's hardware (#161)
  wedge: string[]; // a tilted sash's wedge, in place of a wall (#159), or above a pivot window's (#162)
  pivot: string[]; // where a pivot window's wall and wedge go, and its hinges (#162)
  printing: string; // what is done against warping, and brim advice for the material (#122)
  stiffeners: string[]; // the aluminium angle to buy, where it goes, and its clips (#111)
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

// A piece of the wedge's shorter than the joints need, as a wall's are said.
const small = (what: string) => (w: { index: number; lengthMm: number; minPieceMm: number }) =>
  `${what} piece ${w.index + 1} is ${mm(w.lengthMm)} mm long, under the ${mm(w.minPieceMm)} mm the joints need.`;

// A tilted or turned sash's plan (sash-wedge, #159): the wedge's, in the places a wall's lines go;
// the grid's widths and heights have none.
function describeSashWedge(params: Params, own?: WedgeWords): PlanText {
  const { wedge, port, profile, panelMm } = requireWedgeSetup(params);
  const words = own ?? WEDGE_WORDS[wedge.form];
  const gapMm = wedge.form === 'tilt' ? params.tilt.gapMm : params.turn.gapMm;
  const names = sashPartNames(params);
  const count = (pick: (name: string) => boolean) => names.filter((p) => pick(p.name)).reduce((n, p) => n + p.count, 0);
  const { side, top } = wedge;
  return {
    headline: `A wedge for ${words.sash}: ${wedgeParts(params)} to print.`,
    columns: '',
    rows: '',
    span: `For a ${mm(params.openingWidthMm)} × ${mm(params.openingHeightMm)} mm opening, the sash ${mm(gapMm)} mm in at the ${words.edge}.`,
    joints: `Joints: ${2 * side.chain.jointsMm.length + top.chain.jointsMm.length} joint strips.`,
    edges: `Edges: ${count((name) => name.startsWith('wedge-leg-') || name.startsWith(`wedge-${words.stems.strip}-edge-`))} edge strips and 2 corner pieces.`,
    warnings: [
      ...side.chain.warnings.map(small('A triangle’s')),
      ...top.chain.warnings.map(small(`The ${words.strip}’s`)),
      ...materialWarnings(params.material, params.ports.length > 0),
    ],
    leftovers: [],
    ports: [],
    cutouts: [],
    fans: [],
    clamps: [],
    inserts: [],
    model: [],
    customPiece: [],
    units: [],
    seal: '',
    fill: '',
    pieceFills: [],
    sheet: [],
    material: describeMaterial(params.material),
    rail: [],
    rain: [],
    stop: [],
    double: [],
    frame: [],
    shutter: [],
    roof: [],
    notches: [],
    pivot: [],
    wedge: describeWedge(
      wedge,
      port,
      wedgeGasketRuns(wedge, profile, panelMm),
      params.seal.kind === 'tpu' ? 'tpu' : 'tape',
      words,
    ),
    printing: describePrinting(params.material.kind),
    stiffeners: [],
  };
}

// What a wedge has to print, in words.
function wedgeParts(params: Params): string {
  const names = sashPartNames(params);
  const count = (gasket: boolean) =>
    names.filter((p) => p.name.startsWith('gasket-') === gasket).reduce((n, p) => n + p.count, 0);
  const gaskets = count(true);
  return gaskets > 0 ? `${count(false)} parts and ${gaskets} TPU gaskets` : `${count(false)} parts`;
}

// A pivot window's plan (pivot-window, #162): its wall's below the pivot, the wedge's above it in
// its own lines, and the pivot's.
function describePivotPlan(plan: GridLayout, params: Params): PlanText {
  const wall = describePlan(plan, pivotWall(params));
  const wedge = describeSashWedge(pivotWedge(params), PIVOT_WEDGE_WORDS);
  return {
    ...wall,
    headline: `${wall.headline}, below the pivot; above it, a wedge of ${wedgeParts(pivotWedge(params))}`,
    span: spanLine(pivotWall(params), 'opening below the pivot'),
    warnings: [...wall.warnings, ...wedge.warnings.filter((w) => !wall.warnings.includes(w))],
    roof: pivotRoofLines(params),
    wedge: wedge.wedge,
    pivot: describePivot(params),
  };
}

function spanLine(params: Params, where = 'opening'): string {
  const { openingWidthMm: w, openingHeightMm: h, edges, joint, seal } = params;
  const span = panelSpan(w, h, edges, joint, tapeFit(seal));
  return `Pieces and joints: ${mm(span.widthMm)} × ${mm(span.heightMm)} mm, for a ${mm(w)} × ${mm(h)} mm ${where}.`;
}

export function describePlan(plan: GridLayout, params: Params): PlanText {
  if (sashForm(params.edges.window) !== undefined) return describeSashWedge(params);
  if (params.edges.window === 'pivot') return describePivotPlan(plan, params);
  const count = plan.pieces.length;
  const max = pieceLimit(params);
  const parts = planParts(params, plan);
  const shapes = edgeShapes(parts.edges).length;
  return {
    headline: `${count} ${count === 1 ? 'piece' : 'pieces'}: ${plan.columns.length} across, ${plan.rows.length} up, ${mm(params.thicknessMm)} mm thick`,
    columns: `Widths: ${plan.columns.map(mm).join(', ')} mm`,
    rows: `Heights: ${plan.rows.map(mm).join(', ')} mm`,
    span: spanLine(params),
    joints:
      params.joint.style === 'dovetails'
        ? describeDovetails(plan, params.joint)
        : params.joint.style === 'rails'
          ? describeSliders(parts.sliders, params.joint)
          : params.joint.style === 'bolts'
            ? describeFlanges(parts.flanges)
            : describeJoints(parts.joints, params.joint, params.thicknessMm, params.coupon),
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
    model: APPLIANCE_MODEL.describe(fittingSource(params)),
    customPiece: CUSTOM_PIECE.describe(fittingSource(params)),
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
    rain: describeRain(params),
    stop: describeStop(params),
    double: describeDouble({
      wall: params.wall,
      thicknessMm: params.thicknessMm,
      borderMm: patternBorderMm(params.joint),
      cutFromSheet: params.sheet.source === 'sheet',
    }),
    frame: describeFrame(params),
    shutter: describeShutter(params),
    roof: describeRoof(params),
    notches: describeNotches(params.notches, { edges: params.edges, joint: params.joint, tape: tapeFit(params.seal) }),
    pivot: [],
    wedge: [],
    printing: describePrinting(params.material.kind),
    stiffeners: describeStiffeners(params),
  };
}
