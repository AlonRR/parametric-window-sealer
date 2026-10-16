// A tilted sash's wedge from the wall's settings (sash-wedge, #159; docs/wedge.md). Choosing the
// window type, the opening is the frame's, W wide and H tall, and the gap at the top is the one
// setting of its own; the joint, the panels' thickness, the seal, the hose port and the printer are
// the wall's. Its edges are all pressed against the frame or the sash, as a wall's in a frame with
// no track, so their profile is a frame edge's, held by its printed TPU gasket.
//
// What a wall has and the wedge has no place for is refused where it is set (refuseForTilt); a
// wall's weep holes, stiffeners and test coupon, and a round port's lock rings, caps and screens,
// are left out, as the page hides them.
import { edgeProfile } from './edge.js';
import type { EdgeName, EdgeParams } from './edge.js';
import type { Engine } from './engine.js';
import { MEDIA_TYPES, checkChoice, meshOf, packageDownload, wallLabel } from './export.js';
import type { DownloadChoice, DownloadFile } from './export.js';
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
import { tiltWedge, tiltWedgeProblem } from './wedge.js';
import type { TiltWedge } from './wedge.js';
import { mm } from './words.js';

export interface TiltParams {
  gapMm: number; // at the top, from the frame to the tilted sash
}

// The middle of the 100 to 160 mm the survey found tilt stays leave (docs/research/window-types.md).
export const EXAMPLE_TILT: TiltParams = { gapMm: 130 };

export interface TiltSetup {
  wedge: TiltWedge;
  profile: ReturnType<typeof edgeProfile>;
  joint: JointParams;
  panelMm: number;
  maxPieceMm: number;
  port?: FlatPort;
  gasket?: WedgeGasket;
}

const FRAME_ALL_ROUND = { top: 'frame', bottom: 'frame', left: 'frame', right: 'frame' } as const;

// The wedge the settings make, or what is wrong with them and where.
export function tiltSetup(p: Params): TiltSetup | { field: FieldName; problem: string } {
  const fit = tapeFit(p.seal);
  const edges: EdgeParams = { window: 'frame', roles: FRAME_ALL_ROUND, track: p.edges.track };
  const profile = edgeProfile('left', edges, p.joint, fit);
  const limit = pieceLimit(p);
  const maxPieceMm = Math.min(limit.widthMm, limit.heightMm); // a part lies either way on the bed
  const corner = wedgeCorner(profile, p.joint, p.thicknessMm);
  const size = { widthMm: p.openingWidthMm, heightMm: p.openingHeightMm, gapMm: p.tilt.gapMm };
  const limits = {
    edgeStripMm: profile.heightMm,
    maxPieceMm,
    jointMm: jointWidthMm(p.joint),
    minPieceMm: minPieceMm(p.joint),
    corner,
  };
  const gap = tiltWedgeProblem(size, limits);
  if (gap !== undefined) return { field: 'tiltGapMm', problem: gap };
  if (!(p.openingWidthMm > 2 * corner.reachMm)) {
    return { field: 'openingWidthMm', problem: 'Too small for the wedge’s two corner pieces.' };
  }
  const wedge = tiltWedge(size, limits);
  if (wedge.top.depthMm > maxPieceMm) {
    return {
      field: 'tiltGapMm',
      problem:
        `The gap at the top is ${mm(p.tilt.gapMm)} mm: the corner pieces span it, and the printer makes pieces ` +
        `up to ${mm(maxPieceMm)} mm.`,
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
export function requireTiltSetup(p: Params): TiltSetup {
  const s = tiltSetup(p);
  if ('problem' in s) throw new RangeError(`The settings cannot make a wedge: ${s.problem}`);
  return s;
}

const ONLY_A_PORT = 'A tilted sash’s wedge has room for a hose port only.';
const NO_PATTERN = 'A tilted sash’s wedge takes no pattern: its pieces are sealed.';

// What a wall has and a tilted sash's wedge has no place for, each refused where it is set.
export function refuseForTilt(
  r: FormReader,
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
    roles: Record<EdgeName, string>;
  },
): void {
  if (p.joint.style !== 'strips') r.fail('jointStyle', 'A tilted sash’s wedge joins its pieces with strips.');
  if (p.wall !== 'single') r.fail('wall', 'A tilted sash’s wedge is a single skin.');
  if (p.pieceSource !== 'printed') {
    r.fail('pieceSource', 'A tilted sash’s wedge is printed; none of it is cut from sheet.');
  }
  if (p.fill !== 'sealed') r.fail('fill', NO_PATTERN);
  if (p.pieceFills > 0) r.fail('pieceFills', NO_PATTERN);
  if (p.ports > 1) r.fail('ports', 'A tilted sash’s wedge takes one hose port.');
  if (p.cutouts > 0) r.fail('cutouts', ONLY_A_PORT);
  if (p.fans > 0) r.fail('fans', ONLY_A_PORT);
  if (p.clamps > 0) r.fail('clamps', ONLY_A_PORT);
  if (p.inserts > 0) r.fail('inserts', ONLY_A_PORT);
  if (p.model) r.fail('modelFile', ONLY_A_PORT);
  if (p.customPiece) r.fail('customPieceFile', ONLY_A_PORT);
  for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
    if (p.roles[edge] !== 'frame') {
      r.fail(
        `${edge}Edge`,
        'A tilted sash’s wedge is pressed against the frame and the sash all round: every edge is a frame edge.',
      );
    }
  }
}

// The wedge's parts' names and counts, in the files' order, without building anything.
export function tiltPartNames(p: Params): { name: string; count: number }[] {
  const s = requireTiltSetup(p);
  return wedgePartNames(s.wedge, s.profile, s.joint, s.panelMm, s.maxPieceMm, s.port, s.gasket);
}

// The files a dry run lists for a tilted sash, as the wall's are listed.
export function plannedTiltFiles(p: Params, choice: DownloadChoice): { name: string; type: string }[] {
  checkChoice(choice);
  const label = wallLabel(p.openingWidthMm, p.openingHeightMm);
  if (choice.packaging === 'single') return [{ name: `${label}.3mf`, type: MEDIA_TYPES['3mf'] }];
  if (choice.packaging === 'zip') return [{ name: `${label}-${choice.format}.zip`, type: MEDIA_TYPES.zip }];
  return tiltPartNames(p).map(({ name }) => ({ name: `${name}.${choice.format}`, type: MEDIA_TYPES[choice.format] }));
}

// The wedge's files: each part once, lying as it prints, packed as chosen.
export function tiltFiles(engine: Engine, p: Params, choice: DownloadChoice): DownloadFile[] {
  const s = requireTiltSetup(p);
  const made = wedgePrintParts(engine, s.wedge, s.profile, s.joint, s.panelMm, s.maxPieceMm, s.port, s.gasket);
  try {
    const parts = made.map(({ name, solid, count }) => ({ name, mesh: meshOf(solid), count }));
    return packageDownload([], parts, choice, p.openingWidthMm, p.openingHeightMm);
  } finally {
    for (const { solid } of made) solid.delete();
  }
}
