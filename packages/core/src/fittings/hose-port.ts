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
import {
  RING_BOLT_MM,
  capShapes,
  capSolid,
  ringShapes,
  ringSolid,
  screenBars,
  socketEndMm,
  socketSlots,
  twistDepthMm,
} from '../socket.js';
import type { SocketParams } from '../socket.js';
import { partName } from '../export.js';
import { mm, sum } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

// The piece with a hose port (hose-port, #12): the panel with a hole, and the collar standing
// on its room side (Q106), centred. The hole is smaller than the collar's inside by the lip,
// so the hose end stops on the panel and the piece prints flat with no supports. With tape
// inside the collar (seal-tape, #15; Q129), a groove for it runs round the collar's inside,
// centred on its depth; the collar given is already the taped one (tapedCollar). With a twist-lock
// (hose-socket, #114) the collar has slots near its mouth and the groove sits below them, and hoseMm
// is what sits in the collar, the ring round the hose end; with a screen, bars fill the hole.
export function portPanel(
  engine: Engine,
  size: PanelSize,
  hoseMm: number,
  collar: CollarParams,
  groove?: { widthMm: number; depthMm: number },
  socket?: SocketParams,
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
      ring = keep(ring.subtract(keep(cutter.translate([0, 0, grooveFromMm(collar, groove.widthMm, socket)]))));
    }
    if (socket?.lock === 'twist') ring = keep(ring.subtract(keep(socketSlots(engine, hoseMm, collar))));
    let holed = keep(panel.subtract(cut));
    if (socket?.screen === true) holed = keep(holed.add(keep(keep(screenBars(engine, hole, t)).translate([x, y, 0]))));
    return holed.add(keep(ring.translate([x, y, t])));
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// Where a groove in the collar starts, up from its foot: centred on its depth, or with a twist-lock,
// 1 mm up, below the slots.
export const grooveFromMm = (collar: CollarParams, widthMm: number, socket?: SocketParams): number =>
  socket?.lock === 'twist' ? 1 : (collar.depthMm - widthMm) / 2;

// The squeezed tape inside a port's collar, for the preview only (Q132): a ring from the hose
// out to its groove's floor, as tall as the tape is wide, where the groove is. The collar given
// is the taped one.
export function portTapeSolid(
  engine: Engine,
  size: PanelSize,
  hoseMm: number,
  collar: CollarParams,
  tape: TapeFit,
  socket?: SocketParams,
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
  const z =
    size.thicknessMm + grooveFromMm(collar, tape.grooveWidthMm, socket) + (tape.grooveWidthMm - tape.widthMm) / 2;
  const solid = ring.translate([size.widthMm / 2, size.heightMm / 2, z]);
  for (const m of [outer, inner, moved, ring]) m.delete();
  return solid;
}

// A port in its piece: its lip leaves a hole, a twist-lock's slots fit its collar, and the piece holds
// it clear of the strips, so a strip's slot never runs into the collar.
export function portProblem(
  plan: GridLayout,
  port: PortSetting & InPiece,
  collar: CollarParams,
  fit: TapeFit | undefined,
  joint: JointParams,
  socket: SocketParams = { lock: 'push', cap: false, screen: false },
): string | undefined {
  const taped = tapedCollar(collar, fit); // with tape inside, Q129
  const end = socketEndMm(port.hoseMm, socket);
  if (!(portHoleMm(end, taped) > 0)) {
    return `the ${mm(collar.lipMm)} mm lip would close a ${mm(port.hoseMm)} mm hose’s port; make the lip smaller.`;
  }
  if (socket.lock === 'twist') {
    const taping = fit?.port === true;
    const needs = twistDepthMm(taping ? fit.grooveWidthMm : 0);
    if (collar.depthMm < needs - 1e-9) {
      const what = taping ? 'the tape’s groove and the twist-lock’s slots need' : 'the twist-lock’s slots need';
      return `${what} a collar at least ${mm(needs)} mm deep; make it deeper.`;
    }
  }
  const room = checkPort(plan, { hoseMm: end, column: port.column - 1, row: port.row - 1 }, taped, joint);
  return room.ok ? undefined : room.message;
}

export const HOSE_PORT: FittingDefinition = {
  kind: 'port',
  placed: ({ ports, collar, tape, socket }) => {
    const taped = tapedCollar(collar, tape);
    const groove = tape?.port === true ? { widthMm: tape.grooveWidthMm, depthMm: tape.grooveDepthMm } : undefined;
    return ports.map((port) => {
      const end = socketEndMm(port.hoseMm, socket);
      return {
        kind: 'port',
        column: port.column,
        row: port.row,
        tag: portTag(port.hoseMm),
        marks: { hoseMm: port.hoseMm },
        solid: (engine, size) => portPanel(engine, size, end, taped, groove, socket),
        // A pattern stays its border clear of the collar, so the collar stands on solid panel.
        keepOut: (size, borderMm) => ({
          xMm: size.widthMm / 2,
          yMm: size.heightMm / 2,
          radiusMm: collarOuterMm(end, taped) / 2 + borderMm,
        }),
        lining: (engine, size) =>
          tape?.port === true ? portTapeSolid(engine, size, end, taped, tape, socket) : undefined,
      };
    });
  },
  // A TPU sleeve for each size of hose, with the TPU seal, round the ring with a twist-lock; a ring for
  // each port with a twist-lock, and a cap for each if asked for.
  parts: ({ ports, collar, socket }, tpu) => {
    const taped = tapedCollar(collar, tpu);
    const ends = ports.map((p) => ({ ...p, hoseMm: socketEndMm(p.hoseMm, socket) }));
    return [
      ...(tpu === undefined ? [] : sleeveShapes(ends, taped, tpu)).map((shape) => ({
        shape,
        name: partName(shape),
        solid: (engine: Engine) => sleeveSolid(engine, shape),
      })),
      ...ringShapes(ports, socket).map((shape) => ({
        shape,
        name: partName(shape),
        solid: (engine: Engine) => ringSolid(engine, shape, taped),
      })),
      ...capShapes(ports, socket).map((shape) => ({
        shape,
        name: partName(shape),
        solid: (engine: Engine) => capSolid(engine, shape, taped),
      })),
    ];
  },
  describe: ({ ports, socket }) =>
    ports.map((p) => {
      const words = [`Hose port: a ${mm(p.hoseMm)} mm hose end, in column ${p.column}, row ${p.row}.`];
      if (socket.lock === 'twist') {
        words.push(
          `A printed ring clamps on the hose end with an M4 bolt at least ${RING_BOLT_MM} mm long, and twists into ` +
            'the collar, clockwise seen from the room.',
        );
      }
      if (socket.cap) words.push('A cap closes the port when the AC is off.');
      if (socket.screen) words.push('A screen fills its hole.');
      return words.join(' ');
    }),
  // The tape round each collar's groove, or a TPU sleeve in it, when the seal goes in the collars.
  lining: ({ ports, collar, tape, socket }) => {
    if (tape?.port !== true || ports.length === 0) return undefined;
    const taped = tapedCollar(collar, tape);
    const each = ports.length === 1 ? 'the hose port’s collar' : 'each hose port’s collar';
    const end = (hoseMm: number) => socketEndMm(hoseMm, socket);
    return {
      tapeMm: sum(ports.map((p) => Math.PI * (collarInnerMm(end(p.hoseMm), taped) + 2 * tape.grooveDepthMm))),
      tape: `inside ${each}`,
      tpu: `a sleeve inside ${each}`,
    };
  },
};
