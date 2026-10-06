// Backlog item download-zip (#7): the files the user downloads (Q44 to Q47). Every format
// is read back and rebuilt as a solid, and its volume must match the piece it came from;
// a file that only looks right is not enough. With connector-strip (#10) the download also
// holds the strips and cross pieces, one file per shape with the count in its name (Q58).
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import type { Engine } from '../src/engine.js';
import { buildExport } from '../src/wall.js';
import { meshOf, packageDownload, partFileName, pieceFileName, to3mf, toStl, wallLabel } from '../src/export.js';
import type { ExportPart, ExportPiece } from '../src/export.js';
import { DEFAULT_JOINT } from '../src/joint.js';
import { stripSolid } from '../src/joint-geometry.js';
import { EXAMPLE_PARAMS } from '../src/params.js';

const solidFromTriangles = (engine: Engine, positions: Float32Array, tris: Uint32Array) => {
  const mesh = new engine.Mesh({ numProp: 3, vertProperties: positions, triVerts: tris });
  mesh.merge();
  return new engine.Manifold(mesh);
};

function readStl(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const positions = new Float32Array(count * 9);
  const normals: number[][] = [];
  for (let t = 0; t < count; t++) {
    const at = 84 + t * 50;
    normals.push([0, 1, 2].map((k) => view.getFloat32(at + k * 4, true)));
    for (let k = 0; k < 9; k++) positions[t * 9 + k] = view.getFloat32(at + 12 + k * 4, true);
  }
  return { header: strFromU8(bytes.slice(0, 80)), count, positions, normals };
}

function readModel(xml: string) {
  return [...xml.matchAll(/<object id="(\d+)" type="model" name="([^"]+)">(.*?)<\/object>/gs)].map(
    ([, id, name, body]) => {
      const verts = [...(body ?? '').matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)];
      const tris = [...(body ?? '').matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g)];
      return {
        id,
        name,
        positions: Float32Array.from(verts.flatMap((m) => [m[1], m[2], m[3]].map(Number))),
        triangles: Uint32Array.from(tris.flatMap((m) => [m[1], m[2], m[3]].map(Number))),
      };
    },
  );
}

// widthMm x heightMm is what the pieces and joints span. On the example slider the edges
// add 3 mm across and 13 mm up to the opening (track-edge, #11), so the opening is less.
async function exampleDownload(widthMm = 400, heightMm = 200): Promise<{ pieces: ExportPiece[]; parts: ExportPart[] }> {
  const engine = await loadEngine();
  return buildExport(engine, {
    ...EXAMPLE_PARAMS,
    openingWidthMm: widthMm - 3,
    openingHeightMm: heightMm - 13,
  });
}

const examplePieces = async (widthMm = 400, heightMm = 200) => (await exampleDownload(widthMm, heightMm)).pieces;

describe('names', () => {
  it('names a piece by its column and row, counted from 1 at the left and the bottom, and its size', () => {
    expect(pieceFileName({ column: 0, row: 0, widthMm: 200, heightMm: 200 }, 'stl')).toBe('piece-c1-r1-200x200.stl');
    expect(pieceFileName({ column: 2, row: 4, widthMm: 166.66667, heightMm: 75 }, '3mf')).toBe(
      'piece-c3-r5-166.7x75.3mf',
    );
  });

  it('names a strip or cross shape by its size and how many to print (Q58)', () => {
    expect(partFileName({ kind: 'strip', lengthMm: 188.7, widthMm: 18, count: 8 }, 'stl')).toBe(
      'strip-188.7x18-print-8.stl',
    );
    expect(partFileName({ kind: 'cross', lengthMm: 18, widthMm: 18, count: 1 }, '3mf')).toBe('cross-18x18-print-1.3mf');
    expect(partFileName({ kind: 'edge', lengthMm: 152.5, widthMm: 14, heightMm: 10, count: 8 }, 'stl')).toBe(
      'edge-152.5x14x10-print-8.stl',
    );
  });

  it('names the wall by the opening', () => {
    expect(wallLabel(600, 1000)).toBe('window-sealer-600x1000');
    expect(wallLabel(812.25, 1000)).toBe('window-sealer-812.3x1000');
  });
});

describe('meshOf', () => {
  it('takes only x, y, z when the mesh carries more per vertex (here with normals added)', async () => {
    const engine = await loadEngine();
    const cube = engine.Manifold.cube([20, 30, 3]);
    const withNormals = cube.calculateNormals(3);
    const { numProp, vertProperties } = withNormals.getMesh();
    expect(numProp).toBeGreaterThan(3);
    const mesh = meshOf(withNormals);
    expect(mesh.positions.length).toBe((vertProperties.length / numProp) * 3);
    const xs = mesh.positions.filter((_, i) => i % 3 === 0);
    const zs = mesh.positions.filter((_, i) => i % 3 === 2);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]).toEqual([0, 20, 0, 3]);
    cube.delete();
    withNormals.delete();
  });
});

describe('STL', () => {
  it('is binary STL: an 80-byte header not starting with "solid", a count, 50 bytes a triangle', async () => {
    const [piece] = await examplePieces();
    if (!piece) throw new Error('no piece');
    const bytes = toStl(piece.mesh, 'piece-c1-r1-197.5x200');
    const stl = readStl(bytes);
    expect(stl.header.startsWith('solid')).toBe(false);
    expect(stl.count).toBe(piece.mesh.triangles.length / 3);
    expect(bytes.byteLength).toBe(84 + 50 * stl.count);
  });

  it('round-trips: the file rebuilds a solid of the same volume, with outward unit normals', async () => {
    const engine = await loadEngine();
    const [piece] = await examplePieces();
    if (!piece) throw new Error('no piece');
    const stl = readStl(toStl(piece.mesh, 'p'));
    const tris = Uint32Array.from({ length: stl.count * 3 }, (_, i) => i);
    const solid = solidFromTriangles(engine, stl.positions, tris);
    expect(solid.volume()).toBeCloseTo(197.5 * 200 * 3, 3);
    expect(solid.genus()).toBe(0);
    solid.delete();
    for (const n of stl.normals) expect(Math.hypot(...(n as [number, number, number]))).toBeCloseTo(1, 5);
  });
});

describe('3MF', () => {
  it('is a 3MF package: content types, the relationship and a model in millimetres', async () => {
    const pieces = await examplePieces();
    const files = unzipSync(to3mf(pieces));
    expect(Object.keys(files).sort()).toEqual(['3D/3dModel.model', '[Content_Types].xml', '_rels/.rels'].sort());
    const types = strFromU8(files['[Content_Types].xml'] ?? new Uint8Array());
    expect(types).toContain('Extension="model" ContentType="application/vnd.ms-package.3dmodel+xml"');
    expect(types).toContain('Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"');
    const rels = strFromU8(files['_rels/.rels'] ?? new Uint8Array());
    expect(rels).toContain('Target="/3D/3dModel.model"');
    expect(rels).toContain('Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"');
    const model = strFromU8(files['3D/3dModel.model'] ?? new Uint8Array());
    expect(model).toContain('unit="millimeter"');
    expect(model).toContain('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"');
  });

  it('holds every piece, named, each rebuilding a solid of its own volume', async () => {
    const engine = await loadEngine();
    const pieces = await examplePieces(500, 200); // 3 x 1: 166.7 mm pieces
    const model = strFromU8(unzipSync(to3mf(pieces))['3D/3dModel.model'] ?? new Uint8Array());
    const objects = readModel(model);
    expect(objects.map((o) => o.name)).toEqual(pieces.map((p) => pieceFileName(p.cell, '3mf').replace(/\.3mf$/, '')));
    for (const [i, o] of objects.entries()) {
      const solid = solidFromTriangles(engine, o.positions, o.triangles);
      const cell = pieces[i]?.cell;
      expect(solid.volume()).toBeCloseTo((cell?.widthMm ?? 0) * (cell?.heightMm ?? 0) * 3, 1);
      solid.delete();
    }
    expect([...model.matchAll(/<item objectid="(\d+)" transform="([^"]+)"\/>/g)]).toHaveLength(pieces.length);
  });

  it('places the pieces apart, as the wall laid out with a 10 mm gap, so none overlap', async () => {
    const pieces = await examplePieces(400, 400); // 2 x 2
    const model = strFromU8(unzipSync(to3mf(pieces))['3D/3dModel.model'] ?? new Uint8Array());
    const moves = [...model.matchAll(/transform="([^"]+)"/g)].map((m) => (m[1] ?? '').split(' ').map(Number).slice(9));
    // 197.5 mm pieces with a 5 mm joint between them, then the 10 mm gap.
    expect(moves.slice(0, 4)).toEqual([
      [0, 0, 0],
      [212.5, 0, 0],
      [0, 212.5, 0],
      [212.5, 212.5, 0],
    ]);
  });

  it('holds every copy of every strip, cross piece and edge strip, below the wall, none overlapping', async () => {
    const engine = await loadEngine();
    const { pieces, parts } = await exampleDownload(600, 1000);
    expect(parts.map((p) => [p.name, p.count])).toEqual([
      ['strip-180.7x18-print-12', 12],
      ['strip-180x18-print-10', 10],
      ['cross-18x18-print-8', 8],
      ['edge-197.4x14x10-print-5', 5],
      ['edge-197.4x15x10-print-5', 5],
      ['edge-151.8x14x10-print-8', 8], // 607 mm top and bottom, in four
    ]);
    const model = strFromU8(unzipSync(to3mf(pieces, parts))['3D/3dModel.model'] ?? new Uint8Array());
    const objects = readModel(model);
    expect(objects.map((o) => o.name)).toEqual([
      ...pieces.map((p) => pieceFileName(p.cell, '3mf').replace(/\.3mf$/, '')),
      ...parts.map((p) => p.name),
    ]);
    const items = [...model.matchAll(/<item objectid="(\d+)" transform="([^"]+)"\/>/g)].map(([, id, t]) => ({
      id: Number(id),
      move: (t ?? '').split(' ').map(Number).slice(9),
    }));
    expect(items).toHaveLength(15 + 12 + 10 + 8 + 5 + 5 + 8);
    // Each copy's box on the plate, from its object's vertices moved by its transform.
    const boxes = items.map(({ id, move }) => {
      const o = objects[id - 1];
      const xs = Array.from(o?.positions ?? []).filter((_, i) => i % 3 === 0);
      const ys = Array.from(o?.positions ?? []).filter((_, i) => i % 3 === 1);
      return {
        x: [Math.min(...xs) + (move[0] ?? 0), Math.max(...xs) + (move[0] ?? 0)],
        y: [Math.min(...ys) + (move[1] ?? 0), Math.max(...ys) + (move[1] ?? 0)],
      };
    });
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) {
        const apart =
          (a.x[1] ?? 0) <= (b.x[0] ?? 0) ||
          (b.x[1] ?? 0) <= (a.x[0] ?? 0) ||
          (a.y[1] ?? 0) <= (b.y[0] ?? 0) ||
          (b.y[1] ?? 0) <= (a.y[0] ?? 0);
        expect(apart).toBe(true);
      }
    }
    // The parts sit below the wall, and each is the solid it says it is.
    for (const box of boxes.slice(15)) expect(box.y[1]).toBeLessThan(0);
    const strip = objects[15];
    const solid = solidFromTriangles(
      engine,
      strip?.positions ?? new Float32Array(),
      strip?.triangles ?? new Uint32Array(),
    );
    const expected = stripSolid(engine, 180.7, DEFAULT_JOINT, 3, 'print');
    expect(solid.volume()).toBeCloseTo(expected.volume(), 2);
    solid.delete();
    expected.delete();
  });
});

describe('packageDownload', () => {
  // 400 x 200 mm: two 197.5 mm pieces side by side, one strip 8 mm short of each edge
  // strip (Q74), and the edge strips: top and bottom 407 mm in three segments each.
  const names = (files: { name: string }[]) => files.map((f) => f.name);
  const ALL = [
    'piece-c1-r1-197.5x200.stl',
    'piece-c2-r1-197.5x200.stl',
    'strip-184x18-print-1.stl',
    'edge-187x14x10-print-1.stl',
    'edge-187x15x10-print-1.stl',
    'edge-135.7x14x10-print-6.stl',
  ];

  it('STL, separate: one .stl per piece and one per strip shape', async () => {
    const { pieces, parts } = await exampleDownload();
    const files = packageDownload(pieces, parts, { format: 'stl', packaging: 'separate' }, 400, 200);
    expect(names(files)).toEqual(ALL);
    expect(files.every((f) => f.type === 'model/stl')).toBe(true);
  });

  it('STL, zip: one .zip holding all of them', async () => {
    const { pieces, parts } = await exampleDownload();
    const [zip, ...rest] = packageDownload(pieces, parts, { format: 'stl', packaging: 'zip' }, 400, 200);
    expect(rest).toEqual([]);
    expect(zip?.name).toBe('window-sealer-400x200-stl.zip');
    expect(Object.keys(unzipSync(zip?.bytes ?? new Uint8Array())).sort()).toEqual([...ALL].sort());
  });

  it('3MF, one file: everything in one .3mf', async () => {
    const { pieces, parts } = await exampleDownload();
    const files = packageDownload(pieces, parts, { format: '3mf', packaging: 'single' }, 400, 200);
    expect(names(files)).toEqual(['window-sealer-400x200.3mf']);
    expect(files[0]?.type).toBe('model/3mf');
  });

  it('3MF, one per piece or shape: separate or zipped, one copy in each', async () => {
    const { pieces, parts } = await exampleDownload(600, 1000);
    const separate = packageDownload(pieces, parts, { format: '3mf', packaging: 'separate' }, 600, 1000);
    expect(separate).toHaveLength(15 + 6);
    const cross = separate.find((f) => f.name === 'cross-18x18-print-8.3mf');
    const model = strFromU8(unzipSync(cross?.bytes ?? new Uint8Array())['3D/3dModel.model'] ?? new Uint8Array());
    expect([...model.matchAll(/<item /g)]).toHaveLength(1);
    expect(model).toContain('transform="1 0 0 0 1 0 0 0 1 0 0 0"');
    const [zip] = packageDownload(pieces, parts, { format: '3mf', packaging: 'zip' }, 600, 1000);
    expect(zip?.name).toBe('window-sealer-600x1000-3mf.zip');
    expect(Object.keys(unzipSync(zip?.bytes ?? new Uint8Array()))).toHaveLength(21);
  });

  it('a wall of one piece has edge strips but no joint strips', async () => {
    const { pieces, parts } = await exampleDownload(150, 150);
    expect(pieces).toHaveLength(1);
    expect(parts.map((p) => p.name.split('-')[0])).toEqual(['edge', 'edge', 'edge']);
  });

  it('refuses "one file" for STL, which holds a single object', async () => {
    const { pieces, parts } = await exampleDownload();
    expect(() => packageDownload(pieces, parts, { format: 'stl', packaging: 'single' }, 400, 200)).toThrow(RangeError);
  });
});
