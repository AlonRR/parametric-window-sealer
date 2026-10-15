// The files the user downloads (backlog item download-zip, #7). The user chooses (Q44 to
// Q47): STL, one file per piece, separate or in one zip; or 3MF, every piece in one file,
// or one file per piece, separate or zipped. Whatever is generated is the user's (Q36).
//
// The strips and cross pieces (connector-strip, #10) and the edge strips (track-edge, #11)
// come as one file per shape, named with how many to print; the single 3MF holds every
// copy (Q58).
//
// STL is written as binary STL. 3MF follows the 3MF Core Specification: an OPC (zip)
// package holding [Content_Types].xml, _rels/.rels and the model at /3D/3dModel.model,
// in millimetres, with triangles wound counter-clockwise seen from outside (Manifold's
// own winding).

import { strToU8, zipSync } from 'fflate';
import type { Manifold } from 'manifold-3d';
import type { EdgeShape } from './edge.js';
import type { PartShape } from './joint.js';
import type { GridPiece } from './layout.js';
import type { GasketShape, SleeveShape } from './tpu.js';
import type { FrameShape, Rectangle } from './cutout.js';
import type { JawShape } from './clamp.js';
import type { ShutterShape } from './insert.js';
import type { SliderShape } from './slider.js';
import type { CouponShape } from './coupon.js';
import type { RailShape } from './rail.js';
import type { StopShape } from './stop.js';
import type { ClipShape } from './stiffener.js';
import type { CapShape, RingShape } from './socket.js';
import { cutoutTag } from './cutout.js';
import { portTag } from './port.js';
import { hundredth } from './words.js';

export interface MeshData {
  positions: Float32Array; // x, y, z per vertex, in mm
  triangles: Uint32Array; // three vertex indices per triangle
}

export interface ExportPiece {
  cell: GridPiece;
  mesh: MeshData;
  hoseMm?: number; // the piece holds a hose port of this size (hose-port, #12)
  cutout?: Rectangle; // or a cutout for an appliance this size (measured-cutout, #23)
  tag?: string; // its fitting in its file name, which takes the place of the two above
}

// A strip or cross piece shape, lying as it prints, and how many to print.
export interface ExportPart {
  name: string; // without the extension
  mesh: MeshData;
  count: number;
}

export type Format = 'stl' | '3mf';
export type Packaging = 'separate' | 'zip' | 'single';

export interface DownloadChoice {
  format: Format;
  packaging: Packaging;
}

export interface DownloadFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export function meshOf(solid: Manifold): MeshData {
  const mesh = solid.getMesh();
  const count = mesh.vertProperties.length / mesh.numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) positions[v * 3 + k] = mesh.vertProperties[v * mesh.numProp + k] ?? 0;
  }
  return { positions, triangles: Uint32Array.from(mesh.triVerts) };
}

const mm = (n: number) => String(Math.round(n * 10) / 10);

type Cell = Pick<GridPiece, 'column' | 'row' | 'widthMm' | 'heightMm'>;

// A piece's file: its place and size, and its fitting's tag (fittings/), as
// piece-c2-r1-197.7x198.6-port-150.stl.
export const taggedFileName = (cell: Cell, extension: Format, tag = ''): string =>
  `piece-c${cell.column + 1}-r${cell.row + 1}-${mm(cell.widthMm)}x${mm(cell.heightMm)}${tag}.${extension}`;

// A piece with a hose port says so, and the hose's size: piece-c2-r1-197.7x198.6-port-150.stl;
// a piece with a cutout, the appliance's: piece-c2-r1-197.7x198.6-cutout-120x80.stl (C46).
export function pieceFileName(cell: Cell, extension: Format, hoseMm?: number, cutout?: Rectangle): string {
  const tag = (hoseMm === undefined ? '' : portTag(hoseMm)) + (cutout === undefined ? '' : cutoutTag(cutout));
  return taggedFileName(cell, extension, tag);
}

const fileOf = (piece: ExportPiece, extension: Format): string =>
  piece.tag === undefined
    ? pieceFileName(piece.cell, extension, piece.hoseMm, piece.cutout)
    : taggedFileName(piece.cell, extension, piece.tag);

// The wall's own parts beside the pieces: the joints, the edge strips, the TPU seal's gaskets, the
// filler between the sashes and the sash stop if there are any, and if asked for, the joint's test
// coupon.
export type WallPartShape =
  PartShape | EdgeShape | GasketShape | CouponShape | RailShape | StopShape | ClipShape | SliderShape;

// Every part beside the pieces: the wall's own and the fittings', a sleeve in each hose port, a
// frame in each cutout's rim and a clamp's jaws. A fitting with a new kind of part adds its shape
// here and its name below; its solid stays in its own file (docs/extending.md, "A new fitting").
export type AnyPartShape = WallPartShape | SleeveShape | FrameShape | JawShape | ShutterShape | RingShape | CapShape;

// An edge strip's height depends on its track, so it is part of the name; with tape on its
// sides, so is the track's depth, as two depths can give one size with grooves in different
// places (Q127). A part printed in TPU says so (C37); a sleeve is named by its hose.
export function partName(shape: AnyPartShape): string {
  if (shape.kind === 'ring' || shape.kind === 'cap') return `${shape.kind}-${mm(shape.hoseMm)}-print-${shape.count}`;
  if (shape.kind === 'coupon') {
    const [first, last] = [shape.grips[0] ?? 0, shape.grips[shape.grips.length - 1] ?? 0];
    return `coupon-grip-${hundredth(first)}-to-${hundredth(last)}-print-${shape.count}`;
  }
  if (shape.kind === 'rail') {
    const part = shape.part === 'whole' ? '' : `-${shape.part}`;
    return `rail${part}-${mm(shape.lengthMm)}x${mm(shape.depthMm)}x${mm(shape.heightMm)}-print-${shape.count}`;
  }
  if (shape.kind === 'clip') return `stiffener-clip-print-${shape.count}`;
  if (shape.kind === 'stop') {
    const part = shape.part === 'whole' ? '' : `-${shape.part}`;
    return `stop${part}-${mm(shape.lengthMm)}x${mm(shape.widthMm)}x${mm(shape.heightMm)}-print-${shape.count}`;
  }
  if (shape.kind === 'sleeve') return `sleeve-${mm(shape.hoseMm)}-tpu-print-${shape.count}`;
  if (shape.kind === 'frame') return `frame-${mm(shape.widthMm)}x${mm(shape.heightMm)}-tpu-print-${shape.count}`;
  if (shape.kind === 'shutter') return `shutter-${mm(shape.widthMm)}x${mm(shape.heightMm)}-print-${shape.count}`;
  if (shape.kind === 'jaw') {
    return `jaw-${mm(shape.lengthMm)}x${mm(shape.widthMm)}x${mm(shape.depthMm)}-print-${shape.count}`;
  }
  const height = shape.kind === 'edge' || shape.kind === 'gasket' ? `x${mm(shape.heightMm)}` : '';
  const side =
    shape.kind === 'edge' && shape.groove?.side !== undefined ? `-track-${mm(shape.groove.side.trackMm)}` : '';
  const tpu = shape.kind === 'gasket' || ('tpu' in shape && shape.tpu === true) ? '-tpu' : '';
  return `${shape.kind}-${mm(shape.lengthMm)}x${mm(shape.widthMm)}${height}${side}${tpu}-print-${shape.count}`;
}

export function partFileName(shape: AnyPartShape, extension: Format): string {
  return `${partName(shape)}.${extension}`;
}

export function wallLabel(openingWidthMm: number, openingHeightMm: number): string {
  return `window-sealer-${mm(openingWidthMm)}x${mm(openingHeightMm)}`;
}

export function toStl(mesh: MeshData, name: string): Uint8Array {
  const count = mesh.triangles.length / 3;
  const bytes = new Uint8Array(84 + 50 * count);
  const view = new DataView(bytes.buffer);
  // A binary STL whose header starts with "solid" is misread as text by some readers.
  bytes.set(strToU8(`Parametric window sealer: ${name}`.slice(0, 80)));
  view.setUint32(80, count, true);
  const p = mesh.positions;
  for (let t = 0; t < count; t++) {
    const vertex = (k: number) => (mesh.triangles[t * 3 + k] ?? 0) * 3;
    const [a, b, c] = [vertex(0), vertex(1), vertex(2)];
    const u = [0, 1, 2].map((k) => (p[b + k] ?? 0) - (p[a + k] ?? 0));
    const w = [0, 1, 2].map((k) => (p[c + k] ?? 0) - (p[a + k] ?? 0));
    const n = [
      (u[1] ?? 0) * (w[2] ?? 0) - (u[2] ?? 0) * (w[1] ?? 0),
      (u[2] ?? 0) * (w[0] ?? 0) - (u[0] ?? 0) * (w[2] ?? 0),
      (u[0] ?? 0) * (w[1] ?? 0) - (u[1] ?? 0) * (w[0] ?? 0),
    ];
    const length = Math.hypot(...n) || 1;
    const at = 84 + t * 50;
    n.forEach((x, k) => view.setFloat32(at + k * 4, x / length, true));
    [a, b, c].forEach((v, corner) => {
      for (let k = 0; k < 3; k++) {
        view.setFloat32(at + 12 + (corner * 3 + k) * 4, p[v + k] ?? 0, true);
      }
    });
    // The last two bytes of each triangle, the attribute count, stay zero.
  }
  return bytes;
}

// Pieces in one 3MF are laid out as the wall, with this gap between them, so that none
// overlap when a slicer opens the file. Strips and cross pieces go below the wall, one
// column per shape with its copies one under the other, the same gap apart.
const GAP_MM = 10;

const num = (n: number) => {
  const s = String(Number(n.toFixed(6)));
  return s === '-0' ? '0' : s;
};

const xmlAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function footprint(mesh: MeshData) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let v = 0; v < mesh.positions.length; v += 3) {
    for (let k = 0; k < 2; k++) {
      const x = mesh.positions[v + k] ?? 0;
      min[k] = Math.min(min[k] ?? x, x);
      max[k] = Math.max(max[k] ?? x, x);
    }
  }
  return {
    minX: min[0] ?? 0,
    minY: min[1] ?? 0,
    width: (max[0] ?? 0) - (min[0] ?? 0),
    depth: (max[1] ?? 0) - (min[1] ?? 0),
  };
}

function objectXml(id: number, name: string, mesh: MeshData): string {
  const { positions, triangles } = mesh;
  const vertices: string[] = [];
  for (let v = 0; v < positions.length; v += 3) {
    vertices.push(
      `<vertex x="${num(positions[v] ?? 0)}" y="${num(positions[v + 1] ?? 0)}" z="${num(positions[v + 2] ?? 0)}"/>`,
    );
  }
  const tris: string[] = [];
  for (let t = 0; t < triangles.length; t += 3) {
    tris.push(`<triangle v1="${triangles[t]}" v2="${triangles[t + 1]}" v3="${triangles[t + 2]}"/>`);
  }
  return (
    `<object id="${id}" type="model" name="${xmlAttr(name)}"><mesh><vertices>${vertices.join('')}</vertices>` +
    `<triangles>${tris.join('')}</triangles></mesh></object>`
  );
}

const itemXml = (id: number, x: number, y: number) =>
  `<item objectid="${id}" transform="1 0 0 0 1 0 0 0 1 ${num(x)} ${num(y)} 0"/>`;

export function to3mf(pieces: ExportPiece[], parts: ExportPart[] = []): Uint8Array {
  const objects: string[] = [];
  const items: string[] = [];
  // A file holding one thing puts it at the origin.
  const alone = pieces.length + parts.reduce((n, p) => n + p.count, 0) === 1;
  pieces.forEach((piece, i) => {
    const id = i + 1;
    objects.push(objectXml(id, fileOf(piece, '3mf').replace(/\.3mf$/, ''), piece.mesh));
    const x = alone ? 0 : piece.cell.xMm + piece.cell.column * GAP_MM;
    const y = alone ? 0 : piece.cell.yMm + piece.cell.row * GAP_MM;
    items.push(itemXml(id, x, y));
  });
  let column = 0;
  parts.forEach((part, i) => {
    const id = pieces.length + i + 1;
    objects.push(objectXml(id, part.name, part.mesh));
    const { minX, minY, width, depth } = footprint(part.mesh);
    for (let copy = 0; copy < part.count; copy++) {
      const top = alone ? 0 : -(GAP_MM + copy * (depth + GAP_MM));
      items.push(itemXml(id, alone ? -minX : column - minX, alone ? -minY : top - depth - minY));
    }
    column += width + GAP_MM;
  });

  const model =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">' +
    `<resources>${objects.join('')}</resources><build>${items.join('')}</build></model>\n`;
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmodel+xml"/>' +
    '</Types>\n';
  const rels =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Target="/3D/3dModel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>' +
    '</Relationships>\n';
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rels),
    '3D/3dModel.model': strToU8(model),
  });
}

export const MEDIA_TYPES: Record<Format | 'zip', string> = {
  stl: 'model/stl',
  '3mf': 'model/3mf',
  zip: 'application/zip',
};

// The one choice that cannot be made: an STL holds a single object.
export function checkChoice(choice: DownloadChoice): void {
  if (choice.packaging === 'single' && choice.format !== '3mf') {
    throw new RangeError('Only 3MF holds every piece in one file; STL holds one object');
  }
}

export function packageDownload(
  pieces: ExportPiece[],
  parts: ExportPart[],
  choice: DownloadChoice,
  openingWidthMm: number,
  openingHeightMm: number,
): DownloadFile[] {
  checkChoice(choice);
  const label = wallLabel(openingWidthMm, openingHeightMm);
  if (choice.packaging === 'single') {
    return [{ name: `${label}.3mf`, type: MEDIA_TYPES['3mf'], bytes: to3mf(pieces, parts) }];
  }
  const type = MEDIA_TYPES[choice.format];
  const perPiece = pieces.map((piece) => {
    const name = fileOf(piece, choice.format);
    const bytes = choice.format === 'stl' ? toStl(piece.mesh, name.replace(/\.stl$/, '')) : to3mf([piece]);
    return { name, type, bytes };
  });
  // One copy in each file; the name says how many to print.
  const perPart = parts.map((part) => ({
    name: `${part.name}.${choice.format}`,
    type,
    bytes: choice.format === 'stl' ? toStl(part.mesh, part.name) : to3mf([], [{ ...part, count: 1 }]),
  }));
  const files = [...perPiece, ...perPart];
  if (choice.packaging === 'separate') return files;
  const zip = zipSync(Object.fromEntries(files.map((f) => [f.name, f.bytes])));
  return [{ name: `${label}-${choice.format}.zip`, type: MEDIA_TYPES.zip, bytes: zip }];
}
