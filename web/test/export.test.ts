// Backlog item download-zip (#7): the files the user downloads (Q44 to Q47). Every format
// is read back and rebuilt as a solid, and its volume must match the piece it came from;
// a file that only looks right is not enough.
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine';
import type { Engine } from '../src/engine';
import { meshOf, packageDownload, pieceFileName, to3mf, toStl, wallLabel } from '../src/export';
import type { ExportPiece } from '../src/export';
import { buildPieces } from '../src/panel-geometry';
import { EXAMPLE_PARAMS, planWall } from '../src/params';

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

async function examplePieces(widthMm = 400, heightMm = 200): Promise<ExportPiece[]> {
  const engine = await loadEngine();
  const params = { ...EXAMPLE_PARAMS, openingWidthMm: widthMm, openingHeightMm: heightMm };
  const plan = planWall(params);
  const built = buildPieces(engine, plan, params.thicknessMm);
  const pieces = built.map((b, i) => {
    const cell = plan.pieces[i];
    if (!cell) throw new Error('plan and pieces differ');
    return { cell, mesh: meshOf(b.solid) };
  });
  for (const b of built) b.solid.delete();
  return pieces;
}

describe('names', () => {
  it('names a piece by its column and row, counted from 1 at the left and the bottom, and its size', () => {
    expect(pieceFileName({ column: 0, row: 0, widthMm: 200, heightMm: 200 }, 'stl')).toBe(
      'piece-c1-r1-200x200.stl',
    );
    expect(pieceFileName({ column: 2, row: 4, widthMm: 166.66667, heightMm: 75 }, '3mf')).toBe(
      'piece-c3-r5-166.7x75.3mf',
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
    const bytes = toStl(piece.mesh, 'piece-c1-r1-200x200');
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
    expect(solid.volume()).toBeCloseTo(200 * 200 * 3, 3);
    expect(solid.genus()).toBe(0);
    solid.delete();
    for (const n of stl.normals) expect(Math.hypot(...(n as [number, number, number]))).toBeCloseTo(1, 5);
  });
});

describe('3MF', () => {
  it('is a 3MF package: content types, the relationship and a model in millimetres', async () => {
    const pieces = await examplePieces();
    const files = unzipSync(to3mf(pieces));
    expect(Object.keys(files).sort()).toEqual(
      ['3D/3dModel.model', '[Content_Types].xml', '_rels/.rels'].sort(),
    );
    const types = strFromU8(files['[Content_Types].xml'] ?? new Uint8Array());
    expect(types).toContain('Extension="model" ContentType="application/vnd.ms-package.3dmodel+xml"');
    expect(types).toContain(
      'Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"',
    );
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
    expect(objects.map((o) => o.name)).toEqual(
      pieces.map((p) => pieceFileName(p.cell, '3mf').replace(/\.3mf$/, '')),
    );
    for (const [i, o] of objects.entries()) {
      const solid = solidFromTriangles(engine, o.positions, o.triangles);
      const cell = pieces[i]?.cell;
      expect(solid.volume()).toBeCloseTo((cell?.widthMm ?? 0) * (cell?.heightMm ?? 0) * 3, 1);
      solid.delete();
    }
    expect([...model.matchAll(/<item objectid="(\d+)" transform="([^"]+)"\/>/g)]).toHaveLength(
      pieces.length,
    );
  });

  it('places the pieces apart, as the wall laid out with a 10 mm gap, so none overlap', async () => {
    const pieces = await examplePieces(400, 400); // 2 x 2
    const model = strFromU8(unzipSync(to3mf(pieces))['3D/3dModel.model'] ?? new Uint8Array());
    const moves = [...model.matchAll(/transform="([^"]+)"/g)].map((m) =>
      (m[1] ?? '').split(' ').map(Number).slice(9),
    );
    expect(moves).toEqual([
      [0, 0, 0],
      [210, 0, 0],
      [0, 210, 0],
      [210, 210, 0],
    ]);
  });
});

describe('packageDownload', () => {
  it('STL, separate: one .stl per piece', async () => {
    const pieces = await examplePieces();
    const files = packageDownload(pieces, { format: 'stl', packaging: 'separate' }, 400, 200);
    expect(files.map((f) => f.name)).toEqual(['piece-c1-r1-200x200.stl', 'piece-c2-r1-200x200.stl']);
    expect(files.every((f) => f.type === 'model/stl')).toBe(true);
  });

  it('STL, zip: one .zip holding an .stl per piece', async () => {
    const pieces = await examplePieces();
    const [zip, ...rest] = packageDownload(pieces, { format: 'stl', packaging: 'zip' }, 400, 200);
    expect(rest).toEqual([]);
    expect(zip?.name).toBe('window-sealer-400x200-stl.zip');
    expect(Object.keys(unzipSync(zip?.bytes ?? new Uint8Array())).sort()).toEqual([
      'piece-c1-r1-200x200.stl',
      'piece-c2-r1-200x200.stl',
    ]);
  });

  it('3MF, one file: every piece in one .3mf', async () => {
    const pieces = await examplePieces();
    const files = packageDownload(pieces, { format: '3mf', packaging: 'single' }, 400, 200);
    expect(files.map((f) => f.name)).toEqual(['window-sealer-400x200.3mf']);
    expect(files[0]?.type).toBe('model/3mf');
  });

  it('3MF, one per piece: separate or zipped', async () => {
    const pieces = await examplePieces();
    expect(
      packageDownload(pieces, { format: '3mf', packaging: 'separate' }, 400, 200).map((f) => f.name),
    ).toEqual(['piece-c1-r1-200x200.3mf', 'piece-c2-r1-200x200.3mf']);
    const [zip] = packageDownload(pieces, { format: '3mf', packaging: 'zip' }, 400, 200);
    expect(zip?.name).toBe('window-sealer-400x200-3mf.zip');
    expect(Object.keys(unzipSync(zip?.bytes ?? new Uint8Array())).sort()).toEqual([
      'piece-c1-r1-200x200.3mf',
      'piece-c2-r1-200x200.3mf',
    ]);
  });

  it('refuses "one file" for STL, which holds a single object', async () => {
    const pieces = await examplePieces();
    expect(() => packageDownload(pieces, { format: 'stl', packaging: 'single' }, 400, 200)).toThrow(
      RangeError,
    );
  });
});
