// Backlog item preview-3d (#9), with three.js (Q49): the scene the preview draws, built
// from the same pieces the user downloads. This part needs no screen, so it runs in Node;
// the drawing itself is tested in the browser (e2e/preview.spec.ts). With connector-strip
// (#10) the scene also holds the strips and cross pieces, in place around the panels, and
// with track-edge (#11) the edge strips. Everything is in the pieces' frame: on the example
// slider the opening's left edge is 6.5 mm in from the pieces' left edge.
import { Box3, LineSegments, Mesh } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { loadEngine } from 'parametric-window-sealer';
import { EXAMPLE_PARAMS } from 'parametric-window-sealer';
import { buildWallScene, disposeWall } from '../src/preview-scene';

const solidsOf = (wall: Object3D, kind: string) =>
  wall.children.filter((c): c is Mesh => c instanceof Mesh && c.userData.kind === kind);

// Vertices are 32-bit floats on the graphics card: a few nanometres of rounding at 600 mm.
const rounded = (v: number[]) => v.map((x) => Math.round(x * 1e4) / 1e4);

describe('buildWallScene', () => {
  it('has a solid and an outline for every piece, strip and cross piece', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, openingWidthMm: 500 }); // 3 x 5
    expect(solidsOf(wall, 'piece')).toHaveLength(15);
    expect(solidsOf(wall, 'strip')).toHaveLength(2 * 5 + 4 * 3);
    expect(solidsOf(wall, 'cross')).toHaveLength(2 * 4);
    // Top and bottom 510 mm in three segments each, the sides 1000 mm in five.
    expect(solidsOf(wall, 'edge')).toHaveLength(2 * 3 + 2 * 5);
    const outlines = wall.children.filter((c) => c instanceof LineSegments);
    expect(outlines).toHaveLength(15 + 22 + 8 + 16);
    disposeWall(wall);
  });

  it('puts each piece at its place, the joints between them', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, openingWidthMm: 500 });
    const pieces = solidsOf(wall, 'piece');
    expect(pieces[0]?.position.toArray()).toEqual([0, 0, 0]);
    const last = pieces[14]?.position.toArray() ?? [];
    expect(last[0]).toBeCloseTo(2 * ((503 - 10) / 3 + 5), 6);
    expect(last[1]).toBeCloseTo(4 * (198.6 + 5), 6);
    disposeWall(wall);
  });

  it('spans the opening and its tracks, the edge strips centred on the panel', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, thicknessMm: 4 });
    const pieces = new Box3();
    for (const p of solidsOf(wall, 'piece')) pieces.expandByObject(p);
    expect(rounded(pieces.max.toArray())).toEqual([603, 1013, 4]);
    // The edge strips' outer faces: the bottoms of three tracks, and the sash at the right,
    // the opening's 600 mm from its left edge at 6.5 mm.
    const box = new Box3().setFromObject(wall);
    expect(rounded(box.min.toArray())).toEqual([-3.5, -3.5, 2 - 7.5]);
    expect(rounded(box.max.toArray())).toEqual([6.5 + 600, 1013 + 3.5, 2 + 7.5]);
    disposeWall(wall);
  });

  it('draws the joint strips proud of both faces (Q50)', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, thicknessMm: 4 });
    const strips = new Box3();
    for (const s of solidsOf(wall, 'strip')) strips.expandByObject(s);
    expect(rounded([strips.min.z, strips.max.z])).toEqual([-1.8, 4 + 1.8]);
    disposeWall(wall);
  });

  it('draws a strip along its joint and a cross piece centred on its crossing', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    const [firstStrip] = solidsOf(wall, 'strip');
    const strip = new Box3().setFromObject(firstStrip as Mesh);
    const jointCentre = 593 / 3 + 2.5;
    // 8 mm up from the edge strip (Q74), 10.5 mm short of the crossing's centre (Q57).
    expect(rounded(strip.min.toArray())).toEqual(rounded([jointCentre - 9, 8, -1.8]));
    expect(rounded(strip.max.toArray())).toEqual(rounded([jointCentre + 9, 198.6 - 8, 3 + 1.8]));
    const [firstCross] = solidsOf(wall, 'cross');
    const cross = new Box3().setFromObject(firstCross as Mesh);
    expect(rounded(cross.getCenter(strip.min).toArray())).toEqual(rounded([jointCentre, 198.6 + 2.5, 1.5]));
    disposeWall(wall);
  });

  it('draws each edge strip segment along its edge, its slot on the panel', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    const edges = solidsOf(wall, 'edge');
    expect(edges).toHaveLength(18);
    const [bottom] = edges;
    const b = new Box3().setFromObject(bottom as Mesh);
    expect(rounded(b.min.toArray())).toEqual([-3.5, -3.5, 1.5 - 7]);
    expect(rounded(b.max.toArray())).toEqual([-3.5 + 152.5, 6.5, 1.5 + 7]);
    disposeWall(wall);
  });

  it('draws the pieces the download writes: same triangles as the built pieces', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    expect(solidsOf(wall, 'piece')).toHaveLength(15);
    for (const solid of solidsOf(wall, 'piece')) {
      expect(solid.geometry.index?.count).toBe(12 * 3); // a plain panel: 12 triangles
    }
    disposeWall(wall);
  });
});

describe('disposeWall', () => {
  it('frees every geometry it built, so redrawing does not leak graphics memory', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    let freed = 0;
    for (const child of wall.children) {
      (child as Mesh).geometry.addEventListener('dispose', () => {
        freed += 1;
      });
    }
    disposeWall(wall);
    expect(freed).toBe(2 * (15 + 22 + 8 + 18)); // a solid and an outline each
    expect(wall.children).toHaveLength(0);
  });
});
