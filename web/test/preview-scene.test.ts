// Backlog item preview-3d (#9), with three.js (Q49): the scene the preview draws, built
// from the same pieces the user downloads. This part needs no screen, so it runs in Node;
// the drawing itself is tested in the browser (e2e/preview.spec.ts). With connector-strip
// (#10) the scene also holds the strips and cross pieces, in place around the panels.
import { Box3, LineSegments, Mesh } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine';
import { EXAMPLE_PARAMS } from '../src/params';
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
    const outlines = wall.children.filter((c) => c instanceof LineSegments);
    expect(outlines).toHaveLength(15 + 22 + 8);
    disposeWall(wall);
  });

  it('puts each piece at its place, the joints between them', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, openingWidthMm: 500 });
    const pieces = solidsOf(wall, 'piece');
    expect(pieces[0]?.position.toArray()).toEqual([0, 0, 0]);
    const last = pieces[14]?.position.toArray() ?? [];
    expect(last[0]).toBeCloseTo(2 * ((500 - 10) / 3 + 5), 6);
    expect(last[1]).toBeCloseTo(4 * (196 + 5), 6);
    disposeWall(wall);
  });

  it('spans the opening, with the strips proud of both faces (Q50)', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, thicknessMm: 4 });
    const box = new Box3().setFromObject(wall);
    expect(rounded(box.min.toArray())).toEqual([0, 0, -1.8]);
    expect(rounded(box.max.toArray())).toEqual([600, 1000, 4 + 1.8]);
    disposeWall(wall);
  });

  it('draws a strip along its joint and a cross piece centred on its crossing', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    const [firstStrip] = solidsOf(wall, 'strip');
    const strip = new Box3().setFromObject(firstStrip as Mesh);
    const jointCentre = 590 / 3 + 2.5;
    expect(rounded(strip.min.toArray())).toEqual(rounded([jointCentre - 9, 0, -1.8]));
    expect(rounded(strip.max.toArray())).toEqual(rounded([jointCentre + 9, 196 - 8, 3 + 1.8]));
    const [firstCross] = solidsOf(wall, 'cross');
    const cross = new Box3().setFromObject(firstCross as Mesh);
    expect(rounded(cross.getCenter(strip.min).toArray())).toEqual(rounded([jointCentre, 196 + 2.5, 1.5]));
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
    expect(freed).toBe(2 * (15 + 22 + 8)); // a solid and an outline each
    expect(wall.children).toHaveLength(0);
  });
});
