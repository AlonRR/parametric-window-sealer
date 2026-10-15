// Importing a mesh (mesh-import, #42): STL (binary and text), OBJ and 3MF read into one indexed
// mesh in mm; what can safely be repaired is (corners welded, faces of no area dropped, faces
// turned to face one way and outward), and what cannot is refused, with what to do about it.
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { MESH_MAX_TRIANGLES, loadEngine, meshSolid, readMesh } from '../src/index.js';
import type { ImportedMesh, MeshRead } from '../src/index.js';

type V = [number, number, number];
type T = [number, number, number];

// A 10 mm cube, its faces counter-clockwise seen from outside.
const CUBE_V: V[] = [
  [0, 0, 0],
  [10, 0, 0],
  [10, 10, 0],
  [0, 10, 0],
  [0, 0, 10],
  [10, 0, 10],
  [10, 10, 10],
  [0, 10, 10],
];
const CUBE_T: T[] = [
  [0, 2, 1],
  [0, 3, 2],
  [4, 5, 6],
  [4, 6, 7],
  [0, 1, 5],
  [0, 5, 4],
  [1, 2, 6],
  [1, 6, 5],
  [2, 3, 7],
  [2, 7, 6],
  [3, 0, 4],
  [3, 4, 7],
];

function binaryStl(vertices: V[], triangles: T[], count = triangles.length): Uint8Array {
  const bytes = new Uint8Array(84 + 50 * triangles.length);
  const view = new DataView(bytes.buffer);
  bytes.set(strToU8('solid cube written as binary'), 0); // a header may start with "solid"
  view.setUint32(80, count, true);
  for (const [i, t] of triangles.entries()) {
    const at = 84 + 50 * i + 12; // after the normal, left 0
    for (const [k, v] of t.entries()) {
      const p = vertices[v] ?? [0, 0, 0];
      for (const [a, c] of p.entries()) view.setFloat32(at + 12 * k + 4 * a, c, true);
    }
  }
  return bytes;
}

const textStl = (vertices: V[], triangles: T[]): Uint8Array =>
  strToU8(
    [
      'solid cube',
      ...triangles.flatMap((t) => [
        '  facet normal 0 0 0',
        '    outer loop',
        ...t.map((v) => `      vertex ${(vertices[v] ?? []).join(' ')}`),
        '    endloop',
        '  endfacet',
      ]),
      'endsolid cube',
    ].join('\n'),
  );

const obj = (vertices: V[], faces: string[]): Uint8Array =>
  strToU8(['# a cube', ...vertices.map((v) => `v ${v.join(' ')}`), ...faces].join('\n'));

const model = (body: string, unit = 'millimeter') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="${unit}" xml:lang="en-US" ` +
  `xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">${body}</model>`;
const meshXml = (vertices: V[], triangles: T[]) =>
  `<mesh><vertices>${vertices.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('')}</vertices>` +
  `<triangles>${triangles.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('')}</triangles></mesh>`;
const threeMf = (xml: string, path = '3D/3dmodel.model'): Uint8Array =>
  zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types/>'),
    '_rels/.rels': strToU8(
      `<?xml version="1.0"?><Relationships><Relationship Target="/${path}" Id="rel0" ` +
        'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
    ),
    [path]: strToU8(xml),
  });

const read = (bytes: Uint8Array): ImportedMesh => {
  const r = readMesh(bytes);
  if (!r.ok) throw new Error(r.message);
  return r.mesh;
};
const refused = (bytes: Uint8Array): string => {
  const r: MeshRead = readMesh(bytes);
  if (r.ok) throw new Error('read, but should have been refused');
  return r.message;
};

// The signed volume of an indexed mesh: positive when its faces face outward.
function volume(m: ImportedMesh): number {
  let v = 0;
  for (let t = 0; t < m.triangles.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => 3 * (m.triangles[t + k] ?? 0));
    const p = (i: number, j: number) => m.positions[(i ?? 0) + j] ?? 0;
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [a, a, a, b, b, b, c, c, c].map((i, n) => p(i ?? 0, n % 3));
    v +=
      ((ax ?? 0) * ((by ?? 0) * (cz ?? 0) - (bz ?? 0) * (cy ?? 0)) -
        (ay ?? 0) * ((bx ?? 0) * (cz ?? 0) - (bz ?? 0) * (cx ?? 0)) +
        (az ?? 0) * ((bx ?? 0) * (cy ?? 0) - (by ?? 0) * (cx ?? 0))) /
      6;
  }
  return v;
}

describe('reading each format', () => {
  it('a binary STL: its corners welded into one indexed mesh', () => {
    const m = read(binaryStl(CUBE_V, CUBE_T));
    expect(m.format).toBe('stl');
    expect(m.positions.length / 3).toBe(8);
    expect(m.triangles.length / 3).toBe(12);
    expect(m.sizeMm).toEqual([10, 10, 10]);
    expect(volume(m)).toBeCloseTo(1000, 6);
    expect(m.repairs).toEqual([]);
  });

  it('a text STL', () => {
    const m = read(textStl(CUBE_V, CUBE_T));
    expect([m.format, m.positions.length / 3, m.triangles.length / 3]).toEqual(['stl', 8, 12]);
    expect(volume(m)).toBeCloseTo(1000, 6);
  });

  it('an OBJ: faces of three or more corners, with or without texture and normal indices', () => {
    const quads = ['f 1 4 3 2', 'f 5 6 7 8', 'f 1 2 6 5', 'f 2 3 7 6', 'f 3 4 8 7', 'f 4 1 5 8'];
    const m = read(obj(CUBE_V, quads));
    expect([m.format, m.triangles.length / 3]).toEqual(['obj', 12]);
    expect(volume(m)).toBeCloseTo(1000, 6);
    const slashed = CUBE_T.map((t) => `f ${t.map((v) => `${v + 1}/${v + 1}/1`).join(' ')}`);
    expect(volume(read(obj(CUBE_V, slashed)))).toBeCloseTo(1000, 6);
    const negative = CUBE_T.map((t) => `f ${t.map((v) => v - 8).join(' ')}`); // counted back from the last
    expect(volume(read(obj(CUBE_V, negative)))).toBeCloseTo(1000, 6);
  });

  it('a 3MF: its model in mm, placed by the build', () => {
    const xml = model(
      `<resources><object id="1" type="model">${meshXml(CUBE_V, CUBE_T)}</object></resources>` +
        '<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 5 0 0"/></build>',
    );
    const m = read(threeMf(xml));
    expect(m.format).toBe('3mf');
    expect(m.sizeMm).toEqual([10, 10, 10]);
    expect(Math.min(...[...m.positions].filter((_, i) => i % 3 === 0))).toBeCloseTo(5, 6);
    expect(volume(m)).toBeCloseTo(1000, 6);
  });

  it('a 3MF in inches, its model found through its relationships, its components placed', () => {
    const xml = model(
      `<resources><object id="1" type="model">${meshXml(CUBE_V, CUBE_T)}</object>` +
        '<object id="2" type="model"><components>' +
        '<component objectid="1"/><component objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/>' +
        '</components></object></resources><build><item objectid="2"/></build>',
      'inch',
    );
    const m = read(threeMf(xml, '3D/thing.model'));
    expect(m.triangles.length / 3).toBe(24);
    expect(m.sizeMm.map((v) => Math.round(v * 1000) / 1000)).toEqual([762, 254, 254]); // 30 by 10 inches
    expect(volume(m)).toBeCloseTo(2 * 1000 * 25.4 ** 3, 0);
  });
});

describe('what it repairs, and says it did', () => {
  it('faces turned the wrong way, one or all', () => {
    const one = CUBE_T.map((t, i): T => (i === 4 ? [t[0], t[2], t[1]] : t));
    const m = read(binaryStl(CUBE_V, one));
    expect(volume(m)).toBeCloseTo(1000, 6);
    expect(m.repairs).toEqual(['1 face turned to face the same way as its neighbours']);
    const all = CUBE_T.map(([a, b, c]): T => [a, c, b]);
    const inside = read(binaryStl(CUBE_V, all));
    expect(volume(inside)).toBeCloseTo(1000, 6);
    expect(inside.repairs).toEqual(['the mesh turned inside out, so it faces outward']);
  });

  it('a face of no area dropped', () => {
    const withSliver: T[] = [...CUBE_T, [0, 1, 1]];
    const m = read(
      obj(
        CUBE_V,
        withSliver.map((t) => `f ${t.map((v) => v + 1).join(' ')}`),
      ),
    );
    expect(m.triangles.length / 3).toBe(12);
    expect(m.repairs).toEqual(['1 face with no area dropped']);
  });

  it('two separate parts kept, each facing outward', () => {
    const second = CUBE_V.map(([x, y, z]): V => [x + 20, y, z]);
    const m = read(
      binaryStl([...CUBE_V, ...second], [...CUBE_T, ...CUBE_T.map(([a, b, c]): T => [a + 8, c + 8, b + 8])]),
    );
    expect(volume(m)).toBeCloseTo(2000, 6);
    expect(m.repairs).toEqual(['1 part turned inside out, so it faces outward']);
  });

  it('a mesh far too small or too large for mm, noted', () => {
    const tiny = read(
      binaryStl(
        CUBE_V.map(([x, y, z]): V => [x / 1000, y / 1000, z / 1000]),
        CUBE_T,
      ),
    );
    expect(tiny.notes).toEqual([
      'It is 0.01 × 0.01 × 0.01 mm: if it was drawn in metres or inches, scale it to mm before importing.',
    ]);
    const huge = read(
      binaryStl(
        CUBE_V.map(([x, y, z]): V => [x * 2000, y * 2000, z * 2000]),
        CUBE_T,
      ),
    );
    expect(huge.notes).toEqual([
      'It is 20000 × 20000 × 20000 mm, over 10 m: if it was drawn in a smaller unit, scale it to mm before ' +
        'importing.',
    ]);
    expect(read(binaryStl(CUBE_V, CUBE_T)).notes).toEqual([]);
  });
});

describe('what it refuses, saying what to do', () => {
  it('a file that is no mesh', () => {
    expect(refused(strToU8('hello'))).toBe('The file is not a mesh: choose an STL, OBJ or 3MF file.');
    expect(refused(new Uint8Array(0))).toBe('The file is empty.');
  });

  it('a binary STL cut short', () => {
    const whole = binaryStl(CUBE_V, CUBE_T);
    expect(refused(binaryStl(CUBE_V, CUBE_T, 20))).toBe(
      'The STL file is cut short: it says it holds 20 triangles, but has room for 12.',
    );
    expect(refused(whole.slice(0, whole.length - 50))).toBe(
      'The STL file is cut short: it says it holds 12 triangles, but has room for 11.',
    );
  });

  it('a mesh with a hole', () => {
    expect(refused(binaryStl(CUBE_V, CUBE_T.slice(0, 11)))).toBe(
      'The mesh is not closed: 3 edges belong to one face only. Close its holes first, with your modelling ' +
        'program or your slicer’s repair.',
    );
  });

  it('an edge shared by more than two faces', () => {
    const fin: V[] = [...CUBE_V, [5, -10, 0]];
    expect(refused(binaryStl(fin, [...CUBE_T, [0, 1, 8], [1, 0, 8]]))).toBe(
      'The mesh has 1 edge shared by more than two faces, so it has no clear inside: repair it first, with your ' +
        'modelling program or your slicer’s repair.',
    );
  });

  it('a corner that is not a number, and a face naming a corner that is not there', () => {
    expect(refused(textStl([[0, 0, Number.NaN], ...CUBE_V.slice(1)], CUBE_T))).toBe(
      'The mesh has a corner that is not a number.',
    );
    expect(refused(obj(CUBE_V, ['f 1 2 9']))).toBe('The OBJ file has a face naming corner 9, but it has only 8.');
  });

  it('a mesh with too many faces, before reading them', () => {
    const header = new Uint8Array(84);
    new DataView(header.buffer).setUint32(80, MESH_MAX_TRIANGLES + 1, true);
    expect(refused(header)).toBe(
      `The mesh has ${MESH_MAX_TRIANGLES + 1} faces, more than the ${MESH_MAX_TRIANGLES} this tool takes: ` +
        'simplify it first, with your modelling program’s decimate tool.',
    );
  });

  it('a 3MF with no model, and one whose build names no object', () => {
    expect(refused(zipSync({ 'readme.txt': strToU8('hi') }))).toBe('The 3MF file has no model in it.');
    const xml = model(`<resources><object id="1">${meshXml(CUBE_V, CUBE_T)}</object></resources><build/>`);
    expect(refused(threeMf(xml))).toBe('The 3MF file’s build places nothing.');
  });
});

describe('as a solid', () => {
  it('the engine takes the repaired mesh: its volume and its parts', async () => {
    const engine = await loadEngine();
    const turned = CUBE_T.map(([a, b, c]): T => [a, c, b]);
    const solid = meshSolid(engine, read(binaryStl(CUBE_V, turned)));
    try {
      expect(solid.volume()).toBeCloseTo(1000, 6);
      expect(solid.genus()).toBe(0);
    } finally {
      solid.delete();
    }
  });
});
