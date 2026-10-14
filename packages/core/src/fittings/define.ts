// A fitting: something in one piece that passes through the wall (fitting-registry, #97). The hose
// port (#12) and the measured cutout (#23) are fittings; a fan mount, clamps or the cut round an
// imported appliance would be more. Each kind is declared once (fittings/index.ts lists them),
// with what the wall needs from it: each one in its piece, the piece's shape with it, the zone a
// pattern keeps clear, its tag in the piece's file name, its seal for the preview, the parts
// printed for it, and its lines and share of the seal in the plan.
import type { Manifold } from 'manifold-3d';
import type { CutoutSetting, Rectangle, RimParams } from '../cutout.js';
import type { Engine } from '../engine.js';
import type { AnyPartShape } from '../export.js';
import type { PanelSize } from '../panel.js';
import type { KeepOut } from '../pattern.js';
import type { CollarParams, PortSetting } from '../port.js';
import type { SealParams, TapeFit } from '../tape.js';

// Where a fitting sits: its piece, by column and row from 1 at the bottom left seen from the room.
export interface InPiece {
  column: number;
  row: number;
}

// What the fittings are made from: each kind's fittings, placed, and the settings they share with
// the seal. A new kind of fitting adds its own here.
export interface FittingSource {
  ports: readonly Required<PortSetting>[];
  cutouts: readonly Required<CutoutSetting>[];
  collar: CollarParams;
  rim: RimParams;
  tape: TapeFit | undefined; // the seal, if any: foam tape or printed TPU
  sealKind: SealParams['kind'];
}

// One fitting in its piece, with everything the wall needs from it.
export interface PlacedFitting extends InPiece {
  kind: string;
  tag: string; // in the piece's file name: "-port-150"
  // The port's and the cutout's own fields on a built piece, kept for the library's earlier
  // callers; a new kind leaves it empty, and its piece is known by its tag.
  marks: { hoseMm?: number; cutout?: Rectangle };
  solid(engine: Engine, size: PanelSize): Manifold; // the piece with the fitting
  keepOut(size: PanelSize, borderMm: number): KeepOut; // clear of a pattern, in the piece's frame
  lining(engine: Engine, size: PanelSize): Manifold | undefined; // its seal, for the preview only
}

// A part printed for a fitting, beside the pieces: its shape, one with a count for identical
// ones, its name in the download, and its solid lying as it prints.
export interface FittingPart {
  shape: AnyPartShape;
  name: string; // without the extension: "sleeve-150-tpu-print-1"
  solid(engine: Engine): Manifold;
}

// A kind of fitting's share of the seal: the tape it takes, and its place in the plan's words.
export interface FittingLining {
  tapeMm: number; // how much foam tape it takes
  tape: string; // where the tape goes: "inside the hose port's collar"
  tpu: string; // what is printed in TPU instead: "a sleeve inside the hose port's collar"
}

export interface FittingDefinition {
  kind: string;
  placed(source: FittingSource): PlacedFitting[]; // every one, in its piece
  parts(source: FittingSource, tpu: TapeFit): FittingPart[]; // printed beside the pieces with the TPU seal
  lining(source: FittingSource): FittingLining | undefined; // with a seal, if this kind takes any
  describe(source: FittingSource): string[]; // its line in the plan, one for each
}
