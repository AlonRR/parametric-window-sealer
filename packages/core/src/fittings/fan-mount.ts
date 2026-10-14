// The fan mount as a fitting (fan-mount, #28; Q15, Q16): a square-framed fan from the list,
// screwed to its piece over a round opening. Its sizes, form and check are in fan.ts.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import { FAN_SCREW_HOLE_MM, checkFan, fanSize, fanTag } from '../fan.js';
import type { FanSetting, FanSize } from '../fan.js';
import type { JointParams } from '../joint.js';
import type { GridLayout } from '../layout.js';
import { plainPanel } from '../panel.js';
import type { PanelSize } from '../panel.js';
import { PORT_SEGMENTS } from '../port.js';
import { mm } from '../words.js';
import type { FittingDefinition, InPiece } from './define.js';

// The piece with a fan: the opening right through the panel, centred, and a screw hole at each
// corner of the fan's hole square. Where the makers space the holes differently (the 140 mm
// fans, C93), each hole is a slot from the least spacing to the most, along its diagonal. The fan
// is screwed on either face; nothing stands proud of the panel, so it prints flat.
export function fanPanel(engine: Engine, size: PanelSize, fan: FanSize): Manifold {
  const { Manifold } = engine;
  const [x, y] = [size.widthMm / 2, size.heightMm / 2];
  const t = size.thicknessMm;
  const parts: Manifold[] = [];
  const keep = (m: Manifold): Manifold => {
    parts.push(m);
    return m;
  };
  const cylinder = (diameterMm: number, cx: number, cy: number) =>
    keep(Manifold.cylinder(t + 2, diameterMm / 2, diameterMm / 2, PORT_SEGMENTS).translate([cx, cy, -1]));
  try {
    const [least, most] = fan.holeSpacingMm;
    const holes = [cylinder(fan.openingMm, x, y)];
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const at = (spacing: number) => cylinder(FAN_SCREW_HOLE_MM, x + (sx * spacing) / 2, y + (sy * spacing) / 2);
      holes.push(least === most ? at(least) : keep(Manifold.hull([at(least), at(most)])));
    }
    const panel = keep(plainPanel(engine, size));
    return panel.subtract(keep(Manifold.union(holes)));
  } finally {
    for (const m of parts) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// A fan in its piece, by column and row from 1: what is wrong with it there, if anything.
export function fanProblem(plan: GridLayout, fan: FanSetting & InPiece, joint: JointParams): string | undefined {
  const room = checkFan(plan, { sizeMm: fan.sizeMm, column: fan.column - 1, row: fan.row - 1 }, joint);
  return room.ok ? undefined : room.message;
}

const listed = (sizeMm: number): FanSize => {
  const fan = fanSize(sizeMm);
  if (fan === undefined) throw new RangeError(`There is no listed ${mm(sizeMm)} mm fan`);
  return fan;
};

// "105 mm apart", or "124.5 to 125 mm apart" for a slot.
const spacingWords = ([least, most]: readonly [number, number]): string =>
  least === most ? `${mm(least)} mm` : `${mm(least)} to ${mm(most)} mm`;

export const FAN_MOUNT: FittingDefinition = {
  kind: 'fan',
  placed: ({ fans }) =>
    fans.map((f) => {
      const fan = listed(f.sizeMm);
      return {
        kind: 'fan',
        column: f.column,
        row: f.row,
        tag: fanTag(f.sizeMm),
        marks: {},
        solid: (engine, size) => fanPanel(engine, size, fan),
        // A pattern stays its border clear of the fan's frame, which covers the panel there.
        keepOut: (size, borderMm) => ({
          xMm: size.widthMm / 2,
          yMm: size.heightMm / 2,
          widthMm: fan.sizeMm + 2 * borderMm,
          heightMm: fan.sizeMm + 2 * borderMm,
        }),
        lining: () => undefined,
      };
    }),
  // The frame is screwed flat to the panel: nothing printed beside the pieces, and no seal.
  parts: () => [],
  lining: () => undefined,
  describe: ({ fans }) =>
    fans.map((f) => {
      const fan = listed(f.sizeMm);
      return (
        `Fan: a ${mm(fan.sizeMm)} mm fan, in column ${f.column}, row ${f.row}: a ${mm(fan.openingMm)} mm opening, ` +
        `and four ${mm(FAN_SCREW_HOLE_MM)} mm screw holes ${spacingWords(fan.holeSpacingMm)} apart.`
      );
    }),
};
