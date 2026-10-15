// A double wall for winter (double-wall, #119). Two skins with still air between them lose about half
// what one printed skin does, and keep the room side above the dew point up to a higher room humidity.
// The wall keeps the thickness set for it, which must fit the track; each plain printed piece is made
// hollow inside the solid border the strips hold it by: two skins round a closed air gap, with ribs
// across it so the room side's skin bridges no more than about 20 mm as it prints. A piece with a
// fitting or a pattern of its own is printed solid.
//
// The figures are worked as ISO 6946 does, from its surface resistances and its table for still air
// layers, with printed PETG at 0.2 W/mK and the ribs left out; they match the design review's.
import type { Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import type { PanelSize } from './panel.js';
import { mm } from './words.js';

export type WallKind = 'single' | 'double';
export const WALL_KINDS: readonly WallKind[] = ['single', 'double'];

export const DOUBLE_SKIN_MM = 1.2; // three lines from a 0.4 mm nozzle
export const DOUBLE_LEAST_GAP_MM = 4;
export const DOUBLE_RIB_PITCH_MM = 20; // at most, so the skin over the air bridges no more
export const DOUBLE_RIB_MM = 1.2;
export const doubleLeastMm = (): number => 2 * DOUBLE_SKIN_MM + DOUBLE_LEAST_GAP_MM;

const RSI = 0.13; // m²K/W, the room side's surface, heat flowing sideways
const RSE = 0.04; // the outside's
const LAMBDA = 0.2; // W/mK, printed PETG
// Still air layers between high-emissivity faces, heat flowing sideways: [mm, m²K/W].
const AIR: [number, number][] = [
  [0, 0],
  [5, 0.11],
  [7, 0.13],
  [10, 0.15],
  [15, 0.17],
  [25, 0.18],
];

export function airGapResistance(gapMm: number): number {
  const last = AIR[AIR.length - 1] ?? [25, 0.18];
  if (gapMm >= last[0]) return last[1];
  for (let i = 1; i < AIR.length; i++) {
    const a = AIR[i - 1] ?? [0, 0];
    const b = AIR[i] ?? last;
    if (gapMm <= b[0]) return a[1] + ((gapMm - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
  }
  return last[1];
}

// W/m²K through the wall.
export function wallUValue(thicknessMm: number, kind: WallKind): number {
  if (kind === 'single') return 1 / (RSI + RSE + thicknessMm / 1000 / LAMBDA);
  const skins = (2 * DOUBLE_SKIN_MM) / 1000 / LAMBDA;
  return 1 / (RSI + RSE + skins + airGapResistance(thicknessMm - 2 * DOUBLE_SKIN_MM));
}

// The room humidity, in %, at which the room side reaches the dew point.
const saturation = (c: number) => 6.112 * Math.exp((17.62 * c) / (243.12 + c)); // hPa, Magnus
export function condensesAtPct(u: number, insideC = 20, outsideC = 0): number {
  const surfaceC = insideC - u * RSI * (insideC - outsideC);
  return Math.round((100 * saturation(surfaceC)) / saturation(insideC));
}

// What to take from a plain piece lying as it prints to make it hollow: the air inside its border,
// between the skins, less the ribs that run up the piece. Nothing where there is no room for it.
export function hollowCut(engine: Engine, size: PanelSize, borderMm: number): Manifold {
  const { Manifold } = engine;
  const { widthMm: w, heightMm: h, thicknessMm: t } = size;
  const [across, up, gap] = [w - 2 * borderMm, h - 2 * borderMm, t - 2 * DOUBLE_SKIN_MM];
  if (!(across > 2 * DOUBLE_RIB_MM && up > 0 && gap > 0)) return Manifold.cube([0, 0, 0]);
  const air = Manifold.cube([across, up, gap]).translate([borderMm, borderMm, DOUBLE_SKIN_MM]);
  const count = Math.max(1, Math.ceil(across / DOUBLE_RIB_PITCH_MM - 1e-9));
  const ribs = Array.from({ length: count - 1 }, (_, i) => {
    const x = borderMm + ((i + 1) * across) / count;
    const rib = Manifold.cube([DOUBLE_RIB_MM, up + 2, gap + 2]);
    const placed = rib.translate([x - DOUBLE_RIB_MM / 2, borderMm - 1, DOUBLE_SKIN_MM - 1]);
    rib.delete();
    return placed;
  });
  if (ribs.length === 0) return air;
  const all = Manifold.union(ribs);
  const cut = air.subtract(all);
  for (const m of [air, all, ...ribs]) m.delete();
  return cut;
}

export function describeDouble(p: {
  wall: WallKind;
  thicknessMm: number;
  borderMm: number;
  cutFromSheet: boolean;
}): string[] {
  if (p.wall === 'single') return [];
  const [double, solid] = [wallUValue(p.thicknessMm, 'double'), wallUValue(p.thicknessMm, 'single')];
  const sheet = p.cutFromSheet
    ? ` Cut the pieces from twin-wall sheet ${mm(p.thicknessMm)} mm thick, or as near as is sold.`
    : '';
  return [
    `Double wall: each plain printed piece is hollow, two ${mm(DOUBLE_SKIN_MM)} mm skins round a ` +
      `${mm(p.thicknessMm - 2 * DOUBLE_SKIN_MM)} mm air gap with ribs about every ${mm(DOUBLE_RIB_PITCH_MM)} mm, ` +
      `inside its ${mm(p.borderMm)} mm solid border; a piece with a fitting or a pattern of its own is solid. By ` +
      `calculation the wall loses about ${mm(double)} W/m²K where a solid one as thick loses ${mm(solid)}, and its ` +
      `room side stays dry up to about ${condensesAtPct(double)} % room humidity, against ${condensesAtPct(solid)} %, ` +
      `at 20 °C inside and 0 °C outside.${sheet}`,
  ];
}
