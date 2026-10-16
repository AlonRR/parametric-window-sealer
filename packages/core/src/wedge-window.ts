// A tilted or turned sash's wedge from the wall's settings (sash-wedge, #159; docs/wedge.md).
// Choosing the window type, the opening is the frame's, W wide and H tall, and the gap at the sash's
// free edge is the one setting of its own: at the top for a tilted sash, at the latch side for a
// turned one. The joint, the panels' thickness, the seal, the hose port and the printer are the
// wall's. Its edges are all pressed against the frame or the sash, as a wall's in a frame with no
// track, so their profile is a frame edge's, held by its printed TPU gasket.
//
// A turned sash's wedge is the tilted one turned on its side, its strip up the latch side, H long,
// and its triangles at the head and the sill, W long: it is built from the opening turned, and is
// the same either way the sash is hinged.
//
// What a wall has and the wedge has no place for is refused where it is set (refuseForWedge); a
// wall's weep holes, stiffeners and test coupon, and a round port's lock rings, caps and screens,
// are left out, as the page hides them.
import { edgeProfile } from './edge.js';
import type { EdgeName, EdgeParams } from './edge.js';
import type { Engine } from './engine.js';
import { MEDIA_TYPES, checkChoice, meshOf, packageDownload, wallLabel } from './export.js';
import type { DownloadChoice, DownloadFile, ExportPart } from './export.js';
import type { FormReader } from './form-reader.js';
import { jointWidthMm, minPieceMm } from './joint.js';
import type { JointParams } from './joint.js';
import type { FieldName, Params } from './params.js';
import { pieceLimit } from './plan.js';
import { tapeFit } from './tape.js';
import { wedgeCorner } from './wedge-geometry.js';
import { flatPort } from './wedge-port.js';
import type { FlatPort } from './wedge-port.js';
import { wedgePartNames, wedgePrintParts } from './wedge-print.js';
import type { WedgeGasket } from './wedge-print.js';
import { WEDGE_WORDS, sashWedge, sashWedgeProblem } from './wedge.js';
import type { SashForm, SashWedge } from './wedge.js';
import { capitalised, mm } from './words.js';

export interface TiltParams {
  gapMm: number; // at the top, from the frame to the tilted sash
}

export interface TurnParams {
  gapMm: number; // at the latch side, from the frame to the turned sash
}

// The middle of the 100 to 160 mm the survey found tilt stays leave (docs/research/window-types.md).
export const EXAMPLE_TILT: TiltParams = { gapMm: 130 };

// A turned sash opens as far as the user holds it: as far as gives a 150 mm hose its own area.
export const EXAMPLE_TURN: TurnParams = { gapMm: 150 };

// The form of wedge a window type takes, if it takes one.
export function sashForm(window: string): SashForm | undefined {
  return window === 'tilt' || window === 'turn' ? window : undefined;
}

const GAP_FIELD: Record<SashForm, FieldName> = { tilt: 'tiltGapMm', turn: 'turnGapMm' };

export interface WedgeSetup {
  wedge: SashWedge;
  profile: ReturnType<typeof edgeProfile>;
  joint: JointParams;
  panelMm: number;
  maxPieceMm: number;
  port?: FlatPort;
  gasket?: WedgeGasket;
}

const FRAME_ALL_ROUND = { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' } as const;

// The wedge the settings make, or what is wrong with them and where.
export function wedgeSetup(p: Params): WedgeSetup | { field: FieldName; problem: string } {
  const form = sashForm(p.edges.window);
  if (form === undefined) throw new RangeError(`A ${p.edges.window} window takes a wall, not a wedge.`);
  const words = WEDGE_WORDS[form];
  const fit = tapeFit(p.seal);
  const edges: EdgeParams = { window: 'frame', roles: FRAME_ALL_ROUND, track: p.edges.track };
  const profile = edgeProfile('left', edges, p.joint, fit);
  const limit = pieceLimit(p);
  const maxPieceMm = Math.min(limit.widthMm, limit.heightMm); // a part lies either way on the bed
  const corner = wedgeCorner(profile, p.joint, p.thicknessMm);
  // In the wedge's own frame: a turned sash's strip runs up the window's height.
  const size =
    form === 'tilt'
      ? { widthMm: p.openingWidthMm, heightMm: p.openingHeightMm, gapMm: p.tilt.gapMm }
      : { widthMm: p.openingHeightMm, heightMm: p.openingWidthMm, gapMm: p.turn.gapMm };
  const limits = {
    edgeStripMm: profile.heightMm,
    maxPieceMm,
    jointMm: jointWidthMm(p.joint),
    minPieceMm: minPieceMm(p.joint),
    corner,
  };
  const gap = sashWedgeProblem(size, limits, form);
  if (gap !== undefined) return { field: GAP_FIELD[form], problem: gap };
  if (!(size.widthMm > 2 * corner.reachMm)) {
    return {
      field: form === 'tilt' ? 'openingWidthMm' : 'openingHeightMm',
      problem: 'Too small for the wedge’s two corner pieces.',
    };
  }
  const wedge = sashWedge(size, limits, form);
  if (wedge.top.depthMm > maxPieceMm) {
    return {
      field: GAP_FIELD[form],
      problem:
        `${capitalised(words.gap)} is ${mm(size.gapMm)} mm: the corner pieces span it, and the printer makes ` +
        `pieces up to ${mm(maxPieceMm)} mm.`,
    };
  }
  const hose = p.ports[0];
  let port: FlatPort | undefined;
  if (hose !== undefined) {
    const made = flatPort(wedge, profile, p.joint, p.thicknessMm, maxPieceMm, hose.hoseMm, p.collar);
    if ('problem' in made) return { field: 'ports', problem: made.problem };
    port = made;
  }
  const gasket = p.seal.kind === 'tpu' && fit !== undefined ? { fit, heightMm: p.seal.tape.thicknessMm } : undefined;
  return {
    wedge,
    profile,
    joint: p.joint,
    panelMm: p.thicknessMm,
    maxPieceMm,
    ...(port === undefined ? {} : { port }),
    ...(gasket === undefined ? {} : { gasket }),
  };
}

// The wedge of settings already read as sound.
export function requireWedgeSetup(p: Params): WedgeSetup {
  const s = wedgeSetup(p);
  if ('problem' in s) throw new RangeError(`The settings cannot make a wedge: ${s.problem}`);
  return s;
}

// What a wall has and a sash's wedge has no place for, each refused where it is set.
export function refuseForWedge(
  r: FormReader,
  form: SashForm,
  p: {
    joint: JointParams;
    wall: string;
    pieceSource: string;
    fill: string;
    pieceFills: number;
    ports: number;
    cutouts: number;
    fans: number;
    clamps: number;
    inserts: number;
    model: boolean;
    customPiece: boolean;
    notches: number;
    roles: Record<EdgeName, string>;
  },
): void {
  const wedge = `${capitalised(WEDGE_WORDS[form].sash)}’s wedge`;
  const onlyAPort = `${wedge} has room for a hose port only.`;
  const noPattern = `${wedge} takes no pattern: its pieces are sealed.`;
  if (p.joint.style !== 'strips') r.fail('jointStyle', `${wedge} joins its pieces with strips.`);
  if (p.wall !== 'single') r.fail('wall', `${wedge} is a single skin.`);
  if (p.pieceSource !== 'printed') r.fail('pieceSource', `${wedge} is printed; none of it is cut from sheet.`);
  if (p.fill !== 'sealed') r.fail('fill', noPattern);
  if (p.pieceFills > 0) r.fail('pieceFills', noPattern);
  if (p.ports > 1) r.fail('ports', `${wedge} takes one hose port.`);
  if (p.cutouts > 0) r.fail('cutouts', onlyAPort);
  if (p.fans > 0) r.fail('fans', onlyAPort);
  if (p.clamps > 0) r.fail('clamps', onlyAPort);
  if (p.inserts > 0) r.fail('inserts', onlyAPort);
  if (p.model) r.fail('modelFile', onlyAPort);
  if (p.customPiece) r.fail('customPieceFile', onlyAPort);
  if (p.notches > 0)
    r.fail('notches', `${wedge} takes no notch: its edges are pressed against the frame and the sash.`);
  for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
    if (p.roles[edge] !== 'frame') {
      r.fail(
        `${edge}Edge`,
        `${wedge} is pressed against the frame and the sash all round: every edge is a frame edge.`,
      );
    }
  }
}

// The wedge's parts' names and counts, in the files' order, without building anything.
export function sashPartNames(p: Params): { name: string; count: number }[] {
  const s = requireWedgeSetup(p);
  return wedgePartNames(s.wedge, s.profile, s.joint, s.panelMm, s.maxPieceMm, s.port, s.gasket);
}

// The files a dry run lists for a sash's wedge, as the wall's are listed.
export function plannedWedgeFiles(p: Params, choice: DownloadChoice): { name: string; type: string }[] {
  checkChoice(choice);
  const label = wallLabel(p.openingWidthMm, p.openingHeightMm);
  if (choice.packaging === 'single') return [{ name: `${label}.3mf`, type: MEDIA_TYPES['3mf'] }];
  if (choice.packaging === 'zip') return [{ name: `${label}-${choice.format}.zip`, type: MEDIA_TYPES.zip }];
  return sashPartNames(p).map(({ name }) => ({ name: `${name}.${choice.format}`, type: MEDIA_TYPES[choice.format] }));
}

// The wedge's parts: each once, lying as it prints.
export function wedgeExportParts(engine: Engine, p: Params): ExportPart[] {
  const s = requireWedgeSetup(p);
  const made = wedgePrintParts(engine, s.wedge, s.profile, s.joint, s.panelMm, s.maxPieceMm, s.port, s.gasket);
  try {
    return made.map(({ name, solid, count }) => ({ name, mesh: meshOf(solid), count }));
  } finally {
    for (const { solid } of made) solid.delete();
  }
}

// The wedge's files, packed as chosen.
export function wedgeFiles(engine: Engine, p: Params, choice: DownloadChoice): DownloadFile[] {
  return packageDownload([], wedgeExportParts(engine, p), choice, p.openingWidthMm, p.openingHeightMm);
}
