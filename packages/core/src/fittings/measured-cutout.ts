// The measured cutout as a fitting (measured-cutout, #23; fitting-registry, #97): an opening for an
// appliance measured by the user, inside one piece with a rim on the room side (C40 to C42), lined
// with the seal whenever there is one (C43). Its sizes, list and check are in cutout.ts.
import type { Manifold } from 'manifold-3d';
import {
  checkCutout,
  cutoutTag,
  frameShapes,
  frameSolid,
  linedRim,
  rectangularRing,
  rimInnerMm,
  rimOuterMm,
} from '../cutout.js';
import type { CutoutSetting, Rectangle, RimParams } from '../cutout.js';
import type { Engine } from '../engine.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { plainPanel } from '../panel.js';
import type { PanelSize } from '../panel.js';
import type { TapeFit } from '../tape.js';
import { partName } from '../export.js';
import { mm, sum } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

// The piece with a measured cutout (measured-cutout, #23): the rim's inside right through the
// panel, centred, and the rim standing on its room side (C41, C42). With a seal (C43), a groove
// for it runs round the rim's inside, centred on its depth; the rim given is already lined
// (linedRim).
export function cutoutPanel(
  engine: Engine,
  size: PanelSize,
  cutout: Rectangle,
  rim: RimParams,
  groove?: { widthMm: number; depthMm: number },
): Manifold {
  if (groove !== undefined && (groove.widthMm > rim.depthMm || groove.depthMm >= rim.wallMm)) {
    throw new RangeError(`A ${groove.widthMm} × ${groove.depthMm} mm groove does not fit the rim`);
  }
  const inner = rimInnerMm(cutout, rim);
  const outer = rimOuterMm(cutout, rim);
  const { Manifold } = engine;
  const [x, y] = [size.widthMm / 2, size.heightMm / 2];
  const t = size.thicknessMm;
  const parts: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    parts.push(m);
    return m;
  };
  try {
    const panel = keep(plainPanel(engine, size));
    const hole = keep(Manifold.cube([inner.widthMm, inner.heightMm, t + 2], true).translate([x, y, t / 2]));
    let ring = keep(rectangularRing(engine, outer, inner, rim.depthMm));
    if (groove !== undefined && groove.depthMm > 0) {
      const floor = { widthMm: inner.widthMm + 2 * groove.depthMm, heightMm: inner.heightMm + 2 * groove.depthMm };
      const cutter = keep(Manifold.cube([floor.widthMm, floor.heightMm, groove.widthMm], true));
      ring = keep(ring.subtract(keep(cutter.translate([0, 0, rim.depthMm / 2]))));
    }
    return keep(panel.subtract(hole)).add(keep(ring.translate([x, y, t])));
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The seal lining a cutout's rim, for the preview only, as the tape in a collar is: a ring from
// the appliance out to the groove's floor, as tall as the tape is wide, centred on the rim's
// depth. The rim given is the lined one.
export function cutoutTapeSolid(
  engine: Engine,
  size: PanelSize,
  cutout: Rectangle,
  rim: RimParams,
  tape: TapeFit,
): Manifold {
  const inner = rimInnerMm(cutout, rim);
  const floor = { widthMm: inner.widthMm + 2 * tape.grooveDepthMm, heightMm: inner.heightMm + 2 * tape.grooveDepthMm };
  const ring = rectangularRing(engine, floor, cutout, tape.widthMm);
  const z = size.thicknessMm + (rim.depthMm - tape.widthMm) / 2;
  const solid = ring.translate([size.widthMm / 2, size.heightMm / 2, z]);
  ring.delete();
  return solid;
}

// A cutout in its piece: the piece holds its rim clear of the strips (C40, as Q108).
export function cutoutProblem(
  plan: GridLayout,
  cutout: CutoutSetting & InPiece,
  rim: RimParams,
  fit: TapeFit | undefined,
  joint: JointParams,
): string | undefined {
  const room = checkCutout(
    plan,
    { ...cutout, column: cutout.column - 1, row: cutout.row - 1 },
    linedRim(rim, fit),
    joint,
  );
  return room.ok ? undefined : room.message;
}

export const MEASURED_CUTOUT: FittingDefinition = {
  kind: 'cutout',
  placed: ({ cutouts, rim, tape }) => {
    const lined = linedRim(rim, tape);
    const seam = tape === undefined ? undefined : { widthMm: tape.grooveWidthMm, depthMm: tape.grooveDepthMm };
    return cutouts.map((c) => {
      const cutout = { widthMm: c.widthMm, heightMm: c.heightMm };
      return {
        kind: 'cutout',
        column: c.column,
        row: c.row,
        tag: cutoutTag(cutout),
        marks: { cutout },
        solid: (engine: Engine, size: PanelSize) => cutoutPanel(engine, size, cutout, lined, seam),
        // A pattern stays its border clear of the rim (as Q137).
        keepOut: (size: PanelSize, borderMm: number) => {
          const around = rimOuterMm(cutout, lined);
          return {
            xMm: size.widthMm / 2,
            yMm: size.heightMm / 2,
            widthMm: around.widthMm + 2 * borderMm,
            heightMm: around.heightMm + 2 * borderMm,
          };
        },
        lining: (engine: Engine, size: PanelSize) =>
          tape === undefined ? undefined : cutoutTapeSolid(engine, size, cutout, lined, tape),
      };
    });
  },
  // A TPU frame for each size of cutout, with the TPU seal (C43).
  parts: ({ cutouts, rim }, tpu) =>
    frameShapes(cutouts, linedRim(rim, tpu), tpu).map((shape) => ({
      shape,
      name: partName(shape),
      solid: (engine) => frameSolid(engine, shape),
    })),
  // Each cutout: the appliance, where, the opening and its rim, and what lines it (C43).
  describe: ({ cutouts, rim, tape, sealKind }) => {
    const lined = linedRim(rim, tape);
    const lining = { none: '', tape: ', lined with the foam tape', tpu: ', lined with a TPU frame' }[sealKind];
    return cutouts.map((c) => {
      const opening = rimInnerMm(c, lined);
      return (
        `Cutout: a ${mm(c.widthMm)} × ${mm(c.heightMm)} mm appliance, in column ${c.column}, row ${c.row}, through a ` +
        `${mm(opening.widthMm)} × ${mm(opening.heightMm)} mm opening in a ${mm(lined.depthMm)} mm rim${lining}.`
      );
    });
  },
  // Every cutout's rim is lined (C43): the tape round its groove, or a TPU frame in it.
  lining: ({ cutouts, rim, tape }) => {
    if (tape === undefined || cutouts.length === 0) return undefined;
    const lined = linedRim(rim, tape);
    const each = cutouts.length === 1 ? 'the cutout’s rim' : 'each cutout’s rim';
    return {
      tapeMm: sum(
        cutouts.map((c) => {
          const floor = rimInnerMm(c, lined);
          return 2 * (floor.widthMm + floor.heightMm) + 8 * tape.grooveDepthMm;
        }),
      ),
      tape: `round ${each}`,
      tpu: `a frame inside ${each}`,
    };
  },
};
