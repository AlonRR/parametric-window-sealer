// Mesh files read into one list of corners and one of faces, in mm (mesh-import, #42): STL, binary
// or text; OBJ; and 3MF, its objects placed by its build. Nothing here repairs or judges the mesh
// (repair.ts does); a file that cannot be read says why.
import { strFromU8, unzipSync } from 'fflate';

// Corners as x, y, z in turn; faces as three corner indices in turn, counter-clockwise from outside
// if the file is sound.
export interface RawMesh {
  format: 'stl' | 'obj' | '3mf';
  positions: number[];
  triangles: number[];
}

export type RawRead = { ok: true; mesh: RawMesh } | { ok: false; message: string };

// More faces than a browser can work with comfortably; a window AC's outline needs far fewer.
export const MESH_MAX_TRIANGLES = 500_000;

const refuse = (message: string): RawRead => ({ ok: false, message });

export const tooManyFaces = (count: number): string =>
  `The mesh has ${count} faces, more than the ${MESH_MAX_TRIANGLES} this tool takes: simplify it first, with ` +
  'your modelling program’s decimate tool.';

// Binary STL: an 80-byte header, the count of faces, then 50 bytes a face: its normal, its three
// corners and two spare bytes.
function binaryStl(bytes: Uint8Array): RawRead {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (count > MESH_MAX_TRIANGLES) return refuse(tooManyFaces(count));
  const positions: number[] = [];
  const triangles: number[] = [];
  for (let i = 0; i < count; i++) {
    const at = 84 + 50 * i + 12;
    for (let k = 0; k < 9; k++) positions.push(view.getFloat32(at + 4 * k, true));
    triangles.push(3 * i, 3 * i + 1, 3 * i + 2);
  }
  return { ok: true, mesh: { format: 'stl', positions, triangles } };
}

// Text STL: each face's three "vertex x y z" lines, between "outer loop" and "endloop".
function textStl(text: string): RawRead {
  const positions: number[] = [];
  for (const m of text.matchAll(/\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/g))
    positions.push(Number(m[1]), Number(m[2]), Number(m[3]));
  const corners = positions.length / 3;
  if (corners % 3 !== 0) return refuse('The STL file has a face without three corners.');
  if (corners / 3 > MESH_MAX_TRIANGLES) return refuse(tooManyFaces(corners / 3));
  return { ok: true, mesh: { format: 'stl', positions, triangles: Array.from({ length: corners }, (_, i) => i) } };
}

// OBJ: "v x y z" corners and "f a b c …" faces, a face's corners counted from 1, or back from the
// last when negative, each optionally followed by /texture/normal; a face of more than three corners
// is a fan of triangles. Everything else (normals, materials, groups) is left aside.
function obj(text: string): RawRead {
  const positions: number[] = [];
  const triangles: number[] = [];
  for (const [n, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line.startsWith('v ') || line.startsWith('v\t')) {
      const [x, y, z] = line.slice(2).trim().split(/\s+/).map(Number);
      positions.push(x ?? Number.NaN, y ?? Number.NaN, z ?? Number.NaN);
    } else if (line.startsWith('f ') || line.startsWith('f\t')) {
      const corners = positions.length / 3;
      const refs = line
        .slice(2)
        .trim()
        .split(/\s+/)
        .map((word) => Number(word.split('/')[0]));
      if (refs.length < 3 || refs.some((r) => !Number.isInteger(r) || r === 0)) {
        return refuse(`The OBJ file has a face it cannot read, on line ${n + 1}.`);
      }
      const indices = refs.map((r) => (r > 0 ? r - 1 : corners + r));
      const outside = refs.find((r, i) => (indices[i] ?? -1) < 0 || (indices[i] ?? 0) >= corners);
      if (outside !== undefined) {
        return refuse(`The OBJ file has a face naming corner ${outside}, but it has only ${corners}.`);
      }
      for (let k = 1; k + 1 < indices.length; k++)
        triangles.push(indices[0] ?? 0, indices[k] ?? 0, indices[k + 1] ?? 0);
      if (triangles.length / 3 > MESH_MAX_TRIANGLES) return refuse(tooManyFaces(triangles.length / 3));
    }
  }
  return { ok: true, mesh: { format: 'obj', positions, triangles } };
}

// 3MF's units, in mm.
const UNITS: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

type Matrix = number[]; // 3MF's 3 × 4: x' = x·m0 + y·m3 + z·m6 + m9, and so on
const IDENTITY: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

const attribute = (attributes: string, name: string): string | undefined =>
  new RegExp(`(?:^|\\s)(?:[\\w-]+:)?${name}\\s*=\\s*"([^"]*)"`).exec(attributes)?.[1];

function matrixOf(attributes: string): Matrix {
  const text = attribute(attributes, 'transform');
  const values = text?.trim().split(/\s+/).map(Number) ?? [];
  return values.length === 12 && values.every(Number.isFinite) ? values : IDENTITY;
}

// One transform after another: first `inner`, then `outer`.
const then = (inner: Matrix, outer: Matrix): Matrix => {
  const at = (m: Matrix, i: number) => m[i] ?? 0;
  const out: number[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      let v = row === 3 ? at(outer, 9 + col) : 0;
      for (let k = 0; k < 3; k++) v += at(inner, 3 * row + k) * at(outer, 3 * k + col);
      out.push(v);
    }
  }
  return out;
};

interface ModelObject {
  vertices: number[];
  triangles: number[];
  components: { objectId: string; path?: string; matrix: Matrix }[];
}

// The objects of one model part, by id: their meshes, or the components they are made of.
function objectsOf(xml: string): Map<string, ModelObject> {
  const objects = new Map<string, ModelObject>();
  for (const m of xml.matchAll(/<(?:[\w-]+:)?object\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?object>/g)) {
    const [attributes, body] = [m[1] ?? '', m[2] ?? ''];
    const id = attribute(attributes, 'id');
    if (id === undefined) continue;
    const vertices: number[] = [];
    for (const v of body.matchAll(/<(?:[\w-]+:)?vertex\b([^>]*?)\/?>/g)) {
      const a = v[1] ?? '';
      vertices.push(Number(attribute(a, 'x')), Number(attribute(a, 'y')), Number(attribute(a, 'z')));
    }
    const triangles: number[] = [];
    for (const t of body.matchAll(/<(?:[\w-]+:)?triangle\b([^>]*?)\/?>/g)) {
      const a = t[1] ?? '';
      triangles.push(Number(attribute(a, 'v1')), Number(attribute(a, 'v2')), Number(attribute(a, 'v3')));
    }
    const components = [...body.matchAll(/<(?:[\w-]+:)?component\b([^>]*?)\/?>/g)].flatMap((c) => {
      const a = c[1] ?? '';
      const objectId = attribute(a, 'objectid');
      const path = attribute(a, 'path');
      return objectId === undefined ? [] : [{ objectId, matrix: matrixOf(a), ...(path === undefined ? {} : { path }) }];
    });
    objects.set(id, { vertices, triangles, components });
  }
  return objects;
}

const MAX_NESTING = 16; // components inside components: deeper than any program writes

function threeMf(bytes: Uint8Array): RawRead {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return refuse('The file is not a mesh: choose an STL, OBJ or 3MF file.');
  }
  const text = (path: string): string | undefined => {
    const file = files[path.replace(/^\//, '')];
    return file === undefined ? undefined : strFromU8(file);
  };
  const rels = text('_rels/.rels') ?? '';
  const start =
    /Target="([^"]+)"[^>]*Type="[^"]*\/3dmodel"|Type="[^"]*\/3dmodel"[^>]*Target="([^"]+)"/
      .exec(rels)
      ?.slice(1)
      .find(Boolean) ??
    (text('3D/3dmodel.model') === undefined
      ? Object.keys(files).find((f) => f.endsWith('.model'))
      : '3D/3dmodel.model');
  const startXml = start === undefined ? undefined : text(start);
  if (start === undefined || startXml === undefined) return refuse('The 3MF file has no model in it.');
  const scale = UNITS[/<(?:[\w-]+:)?model\b[^>]*\bunit\s*=\s*"([^"]+)"/.exec(startXml)?.[1] ?? 'millimeter'] ?? 1;

  const parts = new Map<string, Map<string, ModelObject>>([[start.replace(/^\//, ''), objectsOf(startXml)]]);
  const partOf = (path: string): Map<string, ModelObject> | undefined => {
    const key = path.replace(/^\//, '');
    if (!parts.has(key)) {
      const xml = text(key);
      if (xml === undefined) return undefined;
      parts.set(key, objectsOf(xml));
    }
    return parts.get(key);
  };

  const positions: number[] = [];
  const triangles: number[] = [];
  let failed: string | undefined;
  const place = (part: string, id: string, matrix: Matrix, depth: number): void => {
    const object = partOf(part)?.get(id);
    if (object === undefined || depth > MAX_NESTING) {
      failed ??= 'The 3MF file’s build names an object it does not hold.';
      return;
    }
    const first = positions.length / 3;
    const at = (m: Matrix, i: number) => m[i] ?? 0;
    for (let v = 0; v + 2 < object.vertices.length; v += 3) {
      const [x, y, z] = [object.vertices[v] ?? 0, object.vertices[v + 1] ?? 0, object.vertices[v + 2] ?? 0];
      for (let c = 0; c < 3; c++) {
        positions.push(x * at(matrix, c) + y * at(matrix, 3 + c) + z * at(matrix, 6 + c) + at(matrix, 9 + c));
      }
    }
    const count = object.vertices.length / 3;
    for (const index of object.triangles) {
      if (!Number.isInteger(index) || index < 0 || index >= count) {
        failed ??= 'The 3MF file has a face naming a corner it does not hold.';
        return;
      }
      triangles.push(first + index);
    }
    for (const c of object.components) place(c.path ?? part, c.objectId, then(c.matrix, matrix), depth + 1);
  };
  const items = [...startXml.matchAll(/<(?:[\w-]+:)?item\b([^>]*?)\/?>/g)];
  if (items.length === 0) return refuse('The 3MF file’s build places nothing.');
  for (const item of items) {
    const a = item[1] ?? '';
    const id = attribute(a, 'objectid');
    if (id !== undefined) place(attribute(a, 'path') ?? start, id, matrixOf(a), 0);
    if (triangles.length / 3 > MESH_MAX_TRIANGLES) return refuse(tooManyFaces(triangles.length / 3));
  }
  if (failed !== undefined) return refuse(failed);
  return { ok: true, mesh: { format: '3mf', positions: positions.map((v) => v * scale), triangles } };
}

const looksLikeText = (bytes: Uint8Array): boolean =>
  bytes.subarray(0, 512).every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128);

// The file's format from its bytes, whatever its name, and the mesh in it.
export function readMeshFile(bytes: Uint8Array): RawRead {
  if (bytes.length === 0) return refuse('The file is empty.');
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return threeMf(bytes); // "PK", a zip: 3MF
  const count = bytes.length >= 84 ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(80, true) : -1;
  if (count >= 0 && 84 + 50 * count === bytes.length) return binaryStl(bytes);
  if (looksLikeText(bytes)) {
    const text = strFromU8(bytes);
    if (/^\s*solid\b/.test(text) && /\bfacet\b/.test(text)) return textStl(text);
    if (/^\s*v\s/m.test(text) && /^\s*f\s/m.test(text)) return obj(text);
  }
  if (count > MESH_MAX_TRIANGLES) return refuse(tooManyFaces(count));
  if (count >= 0 && !looksLikeText(bytes)) {
    const room = Math.floor((bytes.length - 84) / 50);
    return refuse(`The STL file is cut short: it says it holds ${count} triangles, but has room for ${room}.`);
  }
  return refuse('The file is not a mesh: choose an STL, OBJ or 3MF file.');
}
