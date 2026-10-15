// The printed TPU seal (backlog item seal-tpu, #22; Q6, Q17, Q122, Q128). MPL-2.0 like the rest
// of the code (Q36); the parts it makes belong to whoever makes them.
//
// Chosen without asking (Q144; docs/choices.md). The seal is a third choice beside none and foam
// tape: gaskets printed in TPU, in the tape's grooves and to the tape's size, so the panels
// leave them the same room (C31, C35). A gasket is a base filling its groove with two thin fins
// along it, leaning outwards so that squeezed they fold away from each other; it prints standing
// on its base (C32). Inside a hose port's collar a TPU sleeve sits in the collar's groove and
// grips the hose (C33). Under Advanced the joint strips and cross pieces can be printed in TPU
// too, a tight fit on the panels (C34); foam tape does not fit a joint (Q128), so that is for
// the TPU seal only (C38).
import type { Manifold } from 'manifold-3d';
import type { EdgeStripPlacement } from './edge.js';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import { PORT_SEGMENTS, collarInnerMm } from './port.js';
import type { CollarParams, PortSetting } from './port.js';
import type { TapeFit } from './tape.js';

// Each fin, and the thinnest base: two lines from a 0.4 mm nozzle, as the walls beside a
// groove (Q131).
export const TPU_FIN_MM = 0.8;

// How far each fin leans out from upright.
export const TPU_FIN_LEAN_DEG = 20;

// The sleeve is this much smaller than the hose, per side, so it grips it.
export const TPU_GRIP_MM = 0.5;

// A TPU joint's slot is this much narrower than the panel on each face, so it grips the panel
// all along, and needs no ribs.
export const TPU_JOINT_FIT_MM = -0.1;

export const tpuJoint = (joint: JointParams): JointParams => ({ ...joint, fitMm: TPU_JOINT_FIT_MM, gripMm: 0 });

// The gasket's base is a fin thick at the foot of its groove, and its fins lean in over it, so that
// squeezed they fold flat inside the groove and the strip's face bears before they are crushed
// (tpu-fin-seals, #115).
export const gasketBaseMm = (_fit?: TapeFit): number => TPU_FIN_MM;

// How wide a gasket this tall must be for its fins, leaning in, not to meet at the top.
export const gasketFinsAcrossMm = (heightMm: number): number =>
  2 * (TPU_FIN_MM + (heightMm - TPU_FIN_MM) * Math.tan((TPU_FIN_LEAN_DEG * Math.PI) / 180));

// How deep a groove must be to take the base and the fins folded flat on it: one fin's thickness,
// or two where the fins are long enough to fold over each other.
export function foldedFinsMm(t: { widthMm: number; thicknessMm: number }): number {
  const across = t.widthMm + 0.5 - 2 * TPU_FIN_MM; // the groove between the fins' feet
  const fin = t.thicknessMm - TPU_FIN_MM;
  const overlap = 2 * fin > across + 1e-9;
  return Math.round((overlap ? 3 : 2) * TPU_FIN_MM * 10) / 10;
}

export interface GasketShape {
  kind: 'gasket';
  lengthMm: number;
  widthMm: number; // the base, as wide as the groove
  heightMm: number; // the base and the fins, as thick as the tape
  count: number;
}

export interface SleeveShape {
  kind: 'sleeve';
  hoseMm: number;
  outerMm: number; // the collar's groove floor
  innerMm: number; // what grips the hose
  heightMm: number; // as tall as the tape is wide
  count: number;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

// One gasket along each edge strip's outer face, and with the sides, one on each side of the
// strips in a track: wherever the tape would go. Gaskets of other lengths, such as
// those for the filler between the sashes, join them, one file for each length.
export function gasketShapes(
  strips: readonly EdgeStripPlacement[],
  fit: TapeFit,
  heightMm: number,
  others: readonly number[] = [],
): GasketShape[] {
  const counts = new Map<number, number>();
  const add = (lengthMm: number, count: number) =>
    counts.set(tenth(lengthMm), (counts.get(tenth(lengthMm)) ?? 0) + count);
  for (const s of strips) add(s.lengthMm, s.tape?.groove.side === undefined ? 1 : 3);
  for (const lengthMm of others) add(lengthMm, 1);
  return [...counts]
    .sort(([a], [b]) => b - a)
    .map(([lengthMm, count]) => ({
      kind: 'gasket' as const,
      lengthMm,
      widthMm: tenth(fit.grooveWidthMm),
      heightMm,
      count,
    }));
}

// A gasket lying as it prints: along X from 0, its base from y = 0 across the groove's width and
// from z = 0, its fins up to its height, leaning in from both sides.
export function gasketSolid(engine: Engine, lengthMm: number, fit: TapeFit, heightMm: number): Manifold {
  const [w, b, fin] = [fit.grooveWidthMm, gasketBaseMm(fit), TPU_FIN_MM];
  if (!(lengthMm > 0)) throw new RangeError(`A gasket must be longer than 0 mm, got ${lengthMm}`);
  if (!(w > 2 * fin)) throw new RangeError(`A ${w} mm base cannot hold two ${fin} mm fins`);
  if (!(heightMm > b)) throw new RangeError(`A ${heightMm} mm gasket leaves no fins above its ${b} mm base`);
  const lean = (heightMm - b) * Math.tan((TPU_FIN_LEAN_DEG * Math.PI) / 180);
  if (2 * (fin + lean) > w + 1e-9) throw new RangeError(`A ${heightMm} mm gasket's fins would cross at the top`);
  const outline: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, b],
    [w - lean, heightMm],
    [w - fin - lean, heightMm],
    [w - fin, b],
    [fin, b],
    [fin + lean, heightMm],
    [lean, heightMm],
    [0, b],
  ];
  const section = new engine.CrossSection([outline], 'Positive');
  const prism = section.extrude(lengthMm);
  const solid = prism.rotate([90, 0, 90]); // across the groove along Y, up along Z, along X
  section.delete();
  prism.delete();
  return solid;
}

// One sleeve for each hose port with the seal inside its collar (Q129), the same hoses one shape.
export function sleeveShapes(ports: readonly PortSetting[], collar: CollarParams, fit: TapeFit): SleeveShape[] {
  if (!fit.port) return [];
  const counts = new Map<number, number>();
  for (const p of ports) counts.set(tenth(p.hoseMm), (counts.get(tenth(p.hoseMm)) ?? 0) + 1);
  return [...counts]
    .sort(([a], [b]) => b - a)
    .map(([hoseMm, count]) => ({
      kind: 'sleeve' as const,
      hoseMm,
      outerMm: collarInnerMm(hoseMm, collar) + 2 * fit.grooveDepthMm,
      innerMm: hoseMm - 2 * TPU_GRIP_MM,
      heightMm: fit.widthMm,
      count,
    }));
}

// A sleeve standing as it prints: a ring round the Z axis from z = 0.
export function sleeveSolid(engine: Engine, shape: SleeveShape): Manifold {
  if (!(shape.outerMm > shape.innerMm && shape.innerMm > 0)) {
    throw new RangeError(`A sleeve from ${shape.innerMm} to ${shape.outerMm} mm has no wall`);
  }
  const { Manifold } = engine;
  const outer = Manifold.cylinder(shape.heightMm, shape.outerMm / 2, -1, PORT_SEGMENTS);
  const inner = Manifold.cylinder(shape.heightMm + 2, shape.innerMm / 2, -1, PORT_SEGMENTS);
  const moved = inner.translate([0, 0, -1]);
  const solid = outer.subtract(moved);
  for (const m of [outer, inner, moved]) m.delete();
  return solid;
}
