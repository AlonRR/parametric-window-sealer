// The wall cut round an imported model of the appliance (mesh-appliance, #35). The model's
// file is read as mesh-import reads any mesh (docs/meshes.md), turned so that the side the user
// names faces the room, and its outline seen from the room, its shadow, is cut through one piece
// with the measured cutout's clearance and rim round it. The fitting is in fittings/appliance-model.ts.
//
// Chosen without asking (docs/choices.md): the setting holds the file itself, its bytes in
// base64, so the library, the command's --params and the MCP server carry it as they carry any
// other setting; the side facing the room is named as a modelling program names its views; the
// opening follows the whole shadow, so the appliance passes through it whole, and an opening in the
// shadow (a frame's middle) is not left as an island; one model to a wall, in one piece.
import type { CrossSection, Manifold, SimplePolygon } from 'manifold-3d';
import { cutoutPieceMm } from './cutout.js';
import type { Rectangle, RimParams } from './cutout.js';
import type { Engine } from './engine.js';
import type { JointParams } from './joint.js';
import type { GridLayout } from './layout.js';
import { meshSolid, readMesh } from './mesh/index.js';
import type { ImportedMesh, MeshRead } from './mesh/index.js';
import { plainPanel } from './panel.js';
import type { PanelSize } from './panel.js';
import { mm } from './words.js';

// The side of the model facing the room.
export const MODEL_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
export type ModelView = (typeof MODEL_VIEWS)[number];

export interface ModelSetting {
  file: string; // the file's bytes in base64; empty for no model
  view: ModelView;
  column: number; // its piece from 1 at the bottom left seen from the room; 0 and 0, the starting piece
  row: number;
}

export const NO_MODEL: ModelSetting = { file: '', view: 'front', column: 0, row: 0 };

// The model turned to the wall: x to the right seen from the room, y up, z towards the room;
// centred on its outline's box across and up, and from z = 0 back to front. Its size as drawn
// stays in sizeMm.
export interface ApplianceModel extends ImportedMesh {
  outlineMm: Rectangle; // its outline's box, seen from the room
  depthMm: number; // through the wall
}

export type ModelRead = { ok: true; model: ApplianceModel } | { ok: false; message: string };

type Axis = readonly [number, number, number];

// Each view's directions in the model, to the right and up as the room sees it: a modelling
// program's front view looks along +y with z up, its right view along -x, its top view along -z
// with y up.
const VIEW_AXES: Record<ModelView, readonly [Axis, Axis]> = {
  front: [
    [1, 0, 0],
    [0, 0, 1],
  ],
  back: [
    [-1, 0, 0],
    [0, 0, 1],
  ],
  left: [
    [0, -1, 0],
    [0, 0, 1],
  ],
  right: [
    [0, 1, 0],
    [0, 0, 1],
  ],
  top: [
    [1, 0, 0],
    [0, 1, 0],
  ],
  bottom: [
    [1, 0, 0],
    [0, -1, 0],
  ],
};

export const VIEW_WORDS: Record<ModelView, string> = {
  front: 'its front',
  back: 'its back',
  left: 'its left side',
  right: 'its right side',
  top: 'its top',
  bottom: 'its underside',
};

export const FORMAT_WORDS: Record<ImportedMesh['format'], string> = { stl: 'STL', obj: 'OBJ', '3mf': '3MF' };

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DIGIT = new Int16Array(128).fill(-1);
for (let i = 0; i < BASE64.length; i++) DIGIT[BASE64.charCodeAt(i)] = i;
const letter = (n: number) => BASE64.charCodeAt(n & 63);

// A file's bytes as the setting holds them, in base64.
export function encodeModelFile(bytes: Uint8Array): string {
  const out = new Uint8Array(4 * Math.ceil(bytes.length / 3));
  let o = 0;
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i] ?? 0, bytes[i + 1] ?? 0, bytes[i + 2] ?? 0];
    const left = bytes.length - i;
    out[o++] = letter(a >> 2);
    out[o++] = letter((a << 4) | (b >> 4));
    out[o++] = left > 1 ? letter((b << 2) | (c >> 6)) : 61; // '='
    out[o++] = left > 2 ? letter(c) : 61;
  }
  return new TextDecoder().decode(out);
}

// The bytes back, or undefined if the text is not base64. Spaces and line breaks are ignored.
function decodeModelFile(text: string): Uint8Array | undefined {
  const s = /\s/.test(text) ? text.replace(/\s+/g, '') : text;
  let end = s.length;
  while (end > 0 && s[end - 1] === '=') end--;
  if (s.length - end > 2 || (end < s.length && s.length % 4 !== 0) || end % 4 === 1) return undefined;
  const out = new Uint8Array(Math.floor((3 * end) / 4));
  let bits = 0;
  let held = 0;
  let o = 0;
  for (let i = 0; i < end; i++) {
    const code = s.charCodeAt(i);
    const digit = code < 128 ? (DIGIT[code] ?? -1) : -1;
    if (digit < 0) return undefined;
    bits = ((bits << 6) | digit) & 0xffffff;
    held += 6;
    if (held >= 8) {
      held -= 8;
      out[o++] = (bits >> held) & 0xff;
    }
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// The mesh turned to the wall. The views are quarter turns, so every corner keeps its value.
function turned(mesh: ImportedMesh, view: ModelView): ApplianceModel {
  const [right, up] = VIEW_AXES[view];
  // Towards the room: right × up, so the turn keeps the faces facing outward.
  const toward: Axis = [
    right[1] * up[2] - right[2] * up[1],
    right[2] * up[0] - right[0] * up[2],
    right[0] * up[1] - right[1] * up[0],
  ];
  const from = mesh.positions;
  const wall = new Float64Array(from.length);
  const lows = [Infinity, Infinity, Infinity];
  const highs = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < from.length; v += 3) {
    const p: Axis = [from[v] ?? 0, from[v + 1] ?? 0, from[v + 2] ?? 0];
    for (const [a, axis] of [right, up, toward].entries()) {
      const value = p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2] || 0; // never -0
      wall[v + a] = value;
      lows[a] = Math.min(lows[a] ?? 0, value);
      highs[a] = Math.max(highs[a] ?? 0, value);
    }
  }
  const [lx, ly, lz] = lows.map((n) => n ?? 0);
  const [hx, hy, hz] = highs.map((n) => n ?? 0);
  const centre = [((lx ?? 0) + (hx ?? 0)) / 2, ((ly ?? 0) + (hy ?? 0)) / 2, lz ?? 0];
  const positions = new Float32Array(from.length);
  for (let v = 0; v < from.length; v++) positions[v] = (wall[v] ?? 0) - (centre[v % 3] ?? 0);
  return {
    ...mesh,
    positions,
    outlineMm: { widthMm: round((hx ?? 0) - (lx ?? 0)), heightMm: round((hy ?? 0) - (ly ?? 0)) },
    depthMm: round((hz ?? 0) - (lz ?? 0)),
  };
}

// The files read last, and the models turned last: the settings are read again at every change on
// the page, a wall can hold a model and a tile, and a model's file can be tens of MB.
const KEPT = 4;
const meshes: { file: string; read: MeshRead }[] = [];
const models: { file: string; view: ModelView; read: ModelRead }[] = [];
const kept = <T>(list: T[], entry: T): T => {
  list.unshift(entry);
  list.length = Math.min(list.length, KEPT);
  return entry;
};

// The mesh in a file given as the setting holds it, turned to the wall.
export function readApplianceModel(file: string, view: ModelView): ModelRead {
  if (file === '') return { ok: false, message: 'Choose the model’s file.' };
  const model = models.find((m) => m.view === view && m.file === file);
  if (model !== undefined) return model.read;
  let mesh = meshes.find((m) => m.file === file)?.read;
  if (mesh === undefined) {
    const bytes = decodeModelFile(file);
    mesh =
      bytes === undefined
        ? { ok: false, message: 'The model file should be the file’s bytes in base64.' }
        : readMesh(bytes);
    kept(meshes, { file, read: mesh });
  }
  const read: ModelRead = mesh.ok ? { ok: true, model: turned(mesh.mesh, view) } : mesh;
  return kept(models, { file, view, read }).read;
}

// A shadow's outlines, once for each model: projecting a large mesh takes a while.
const OUTLINES = new WeakMap<ApplianceModel, SimplePolygon[]>();
const OUTLINE_TOLERANCE_MM = 0.01; // a corner this close to the line past it is dropped

const area = (polygon: SimplePolygon): number =>
  polygon.reduce((sum, [x, y], i) => {
    const [nx, ny] = polygon[(i + 1) % polygon.length] ?? [x, y];
    return sum + x * ny - nx * y;
  }, 0) / 2;

// The model's outline seen from the room, centred on its box: its shadow, with any opening in it
// filled. The caller frees it.
export function modelOutline(engine: Engine, model: ApplianceModel): CrossSection {
  let outer = OUTLINES.get(model);
  if (outer === undefined) {
    const solid = meshSolid(engine, model);
    const shadow = solid.project();
    const simple = shadow.simplify(OUTLINE_TOLERANCE_MM);
    outer = simple.toPolygons().filter((p) => area(p) > 0); // outlines run counter-clockwise, holes clockwise
    for (const m of [solid, shadow, simple]) m.delete();
    OUTLINES.set(model, outer);
  }
  return new engine.CrossSection(outer, 'Positive');
}

// The piece with the model: an opening the rim's clearance outside the outline, right through the
// panel and centred, and the rim standing round it on the room side, as the measured cutout's.
export function modelPanel(engine: Engine, size: PanelSize, model: ApplianceModel, rim: RimParams): Manifold {
  const [x, y] = [size.widthMm / 2, size.heightMm / 2];
  const t = size.thicknessMm;
  const freed: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(m: T): T => {
    freed.push(m);
    return m;
  };
  try {
    const outline = keep(modelOutline(engine, model));
    const inner = keep(outline.offset(rim.clearanceMm, 'Round'));
    const outer = keep(outline.offset(rim.clearanceMm + rim.wallMm, 'Round'));
    const ring = keep(outer.subtract(inner));
    const hole = keep(keep(inner.extrude(t + 2)).translate([x, y, -1]));
    const standing = keep(keep(ring.extrude(rim.depthMm)).translate([x, y, t]));
    const panel = keep(plainPanel(engine, size));
    return keep(panel.subtract(hole)).add(standing);
  } finally {
    for (const m of freed) m.delete(); // WebAssembly memory: free everything but the result
  }
}

// The model in its piece, by column and row from 1: what is wrong with it there, if anything.
// It needs the room a measured cutout of its outline's box needs.
export function modelProblem(
  plan: GridLayout,
  model: ApplianceModel,
  at: { column: number; row: number },
  rim: RimParams,
  joint: JointParams,
): string | undefined {
  const where = `column ${at.column}, row ${at.row}`;
  const piece = plan.pieces.find((p) => p.column === at.column - 1 && p.row === at.row - 1);
  if (piece === undefined) {
    return `The model: there is no ${where}: the wall has ${plan.columns.length} columns and ${plan.rows.length} rows.`;
  }
  const needs = cutoutPieceMm(model.outlineMm, rim, joint);
  if (piece.widthMm >= needs.widthMm - 1e-9 && piece.heightMm >= needs.heightMm - 1e-9) return undefined;
  const { widthMm, heightMm } = model.outlineMm;
  return (
    `The model’s outline, ${mm(widthMm)} × ${mm(heightMm)} mm seen from the room, needs a piece at least ` +
    `${mm(needs.widthMm)} × ${mm(needs.heightMm)} mm; ${where} is ${mm(piece.widthMm)} × ${mm(piece.heightMm)} mm. ` +
    'Full-size pieces plus a filler, or a larger printer size, make bigger pieces.'
  );
}

export const modelTag = (model: ApplianceModel): string =>
  `-model-${mm(model.outlineMm.widthMm)}x${mm(model.outlineMm.heightMm)}`;

// The model's line in the plan: the file, how it faces, where, the opening and the rim, and what
// was repaired or may be wrong with it.
export function describeModel(setting: ModelSetting, model: ApplianceModel, rim: RimParams): string {
  const { widthMm, heightMm } = model.outlineMm;
  const opening =
    rim.clearanceMm > 0
      ? `an opening ${mm(rim.clearanceMm)} mm clear of its outline`
      : 'an opening the shape of its outline';
  const repaired = model.repairs.length > 0 ? ` Repaired: ${model.repairs.join('; ')}.` : '';
  return (
    `Model: the appliance in the ${FORMAT_WORDS[model.format]} file, ${mm(widthMm)} × ${mm(heightMm)} mm seen from ` +
    `${VIEW_WORDS[setting.view]}, in column ${setting.column}, row ${setting.row}, through ${opening}, in a ` +
    `${mm(rim.depthMm)} mm rim.${repaired}${model.notes.map((n) => ` ${n}`).join('')}`
  );
}
