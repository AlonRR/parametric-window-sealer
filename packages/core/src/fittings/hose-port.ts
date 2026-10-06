// The round hose port as a fitting (hose-port, #12; fitting-registry, #97): a push-fit collar on
// the room side of one piece (Q102, Q104, Q106), lined with the seal's tape or a TPU sleeve when
// the seal goes inside the collars (Q129, C33). Its sizes, list and check are in port.ts.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { plainPanel } from '../panel.js';
import type { PanelSize } from '../panel.js';
import { PORT_SEGMENTS, checkPort, collarInnerMm, collarOuterMm, portHoleMm, portTag } from '../port.js';
import type { CollarParams, PortSetting } from '../port.js';
import { tapedCollar } from '../tape.js';
import type { TapeFit } from '../tape.js';
import { sleeveShapes, sleeveSolid } from '../tpu.js';
import { partName } from '../export.js';
import { mm, sum } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

// The piece with a hose port (hose-port, #12): the panel with a hole, and the collar standing
// on its room side (Q106), centred. The hole is smaller than the collar's inside by the lip,
// so the hose end stops on the panel and the piece prints flat with no supports. With tape
// inside the collar (seal-tape, #15; Q129), a groove for it runs round the collar's inside,
// centred on its depth; the collar given is already the taped one (tapedCollar).
export function portPanel(
  engine: Engine,
  size: PanelSize,
  hoseMm: number,
  collar: CollarParams,
  groove?: { widthMm: number; depthMm: number },
): Manifold {
  const hole = portHoleMm(hoseMm, collar);
  if (!(hole > 0)) {
    throw new RangeError(`The lip (${collar.lipMm} mm) closes a ${hoseMm} mm hose's port; make it smaller`);
  }
  if (groove !== undefined && (groove.widthMm > collar.depthMm || groove.depthMm >= collar.wallMm)) {
    throw new RangeError(`A ${groove.widthMm} × ${groove.depthMm} mm groove does not fit the collar`);
  }
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
    const cut = keep(Manifold.cylinder(t + 2, hole / 2, -1, PORT_SEGMENTS).translate([x, y, -1]));
    const outer = keep(Manifold.cylinder(collar.depthMm, collarOuterMm(hoseMm, collar) / 2, -1, PORT_SEGMENTS));
    const inner = collarInnerMm(hoseMm, collar);
    const inside = keep(Manifold.cylinder(collar.depthMm + 2, inner / 2, -1, PORT_SEGMENTS));
    let ring = keep(outer.subtract(keep(inside.translate([0, 0, -1]))));
    if (groove !== undefined && groove.depthMm > 0) {
      const cutter = keep(Manifold.cylinder(groove.widthMm, inner / 2 + groove.depthMm, -1, PORT_SEGMENTS));
      ring = keep(ring.subtract(keep(cutter.translate([0, 0, (collar.depthMm - groove.widthMm) / 2]))));
    }
    return keep(panel.subtract(cut)).add(keep(ring.translate([x, y, t])));
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The squeezed tape inside a port's collar, for the preview only (Q132): a ring from the hose
// out to its groove's floor, as tall as the tape is wide, centred on the collar's depth. The
// collar given is the taped one.
export function portTapeSolid(
  engine: Engine,
  size: PanelSize,
  hoseMm: number,
  collar: CollarParams,
  tape: TapeFit,
): Manifold {
  const { Manifold } = engine;
  const outer = Manifold.cylinder(
    tape.widthMm,
    collarInnerMm(hoseMm, collar) / 2 + tape.grooveDepthMm,
    -1,
    PORT_SEGMENTS,
  );
  const inner = Manifold.cylinder(tape.widthMm + 2, hoseMm / 2, -1, PORT_SEGMENTS);
  const moved = inner.translate([0, 0, -1]);
  const ring = outer.subtract(moved);
  const z = size.thicknessMm + (collar.depthMm - tape.widthMm) / 2;
  const solid = ring.translate([size.widthMm / 2, size.heightMm / 2, z]);
  for (const m of [outer, inner, moved, ring]) m.delete();
  return solid;
}

// A port in its piece: its lip leaves a hole, and the piece holds it clear of the strips (Q108).
export function portProblem(
  plan: GridLayout,
  port: PortSetting & InPiece,
  collar: CollarParams,
  fit: TapeFit | undefined,
  joint: JointParams,
): string | undefined {
  const taped = tapedCollar(collar, fit); // with tape inside, Q129
  if (!(portHoleMm(port.hoseMm, taped) > 0)) {
    return `the ${mm(collar.lipMm)} mm lip would close a ${mm(port.hoseMm)} mm hose’s port; make the lip smaller.`;
  }
  const room = checkPort(plan, { hoseMm: port.hoseMm, column: port.column - 1, row: port.row - 1 }, taped, joint);
  return room.ok ? undefined : room.message;
}

export const HOSE_PORT: FittingDefinition = {
  kind: 'port',
  placed: ({ ports, collar, tape }) => {
    const taped = tapedCollar(collar, tape);
    const groove = tape?.port === true ? { widthMm: tape.grooveWidthMm, depthMm: tape.grooveDepthMm } : undefined;
    return ports.map((port) => ({
      kind: 'port',
      column: port.column,
      row: port.row,
      tag: portTag(port.hoseMm),
      marks: { hoseMm: port.hoseMm },
      solid: (engine, size) => portPanel(engine, size, port.hoseMm, taped, groove),
      // A pattern stays its border clear of the collar (Q137).
      keepOut: (size, borderMm) => ({
        xMm: size.widthMm / 2,
        yMm: size.heightMm / 2,
        radiusMm: collarOuterMm(port.hoseMm, taped) / 2 + borderMm,
      }),
      lining: (engine, size) =>
        tape?.port === true ? portTapeSolid(engine, size, port.hoseMm, taped, tape) : undefined,
    }));
  },
  // A TPU sleeve for each size of hose, with the TPU seal (C33).
  parts: ({ ports, collar }, tpu) =>
    sleeveShapes(ports, tapedCollar(collar, tpu), tpu).map((shape) => ({
      shape,
      name: partName(shape),
      solid: (engine) => sleeveSolid(engine, shape),
    })),
  describe: ({ ports }) =>
    ports.map((p) => `Hose port: a ${mm(p.hoseMm)} mm hose end, in column ${p.column}, row ${p.row}.`),
  // The tape round each collar's groove, or a TPU sleeve in it, when the seal goes in the collars.
  lining: ({ ports, collar, tape }) => {
    if (tape?.port !== true || ports.length === 0) return undefined;
    const taped = tapedCollar(collar, tape);
    const each = ports.length === 1 ? 'the hose port’s collar' : 'each hose port’s collar';
    return {
      tapeMm: sum(ports.map((p) => Math.PI * (collarInnerMm(p.hoseMm, taped) + 2 * tape.grooveDepthMm))),
      tape: `inside ${each}`,
      tpu: `a sleeve inside ${each}`,
    };
  },
};
