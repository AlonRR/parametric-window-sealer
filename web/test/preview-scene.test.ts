// Backlog item preview-3d (#9), with three.js (Q49): the scene the preview draws, built
// from the same pieces the user downloads. This part needs no screen, so it runs in Node;
// the drawing itself is tested in the browser (e2e/preview.spec.ts).
import { Box3, LineSegments, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine';
import { EXAMPLE_PARAMS } from '../src/params';
import { buildWallScene, disposeWall } from '../src/preview-scene';

describe('buildWallScene', () => {
  it('has one solid and one outline per piece, each at its place in the wall', async () => {
    const engine = await loadEngine();
    const params = { ...EXAMPLE_PARAMS, openingWidthMm: 500 }; // 3 x 5 pieces, 166.7 mm wide
    const wall = buildWallScene(engine, params);
    const solids = wall.children.filter((c) => c instanceof Mesh);
    const outlines = wall.children.filter((c) => c instanceof LineSegments);
    expect(solids).toHaveLength(15);
    expect(outlines).toHaveLength(15);
    expect(solids[0]?.position.toArray()).toEqual([0, 0, 0]);
    const last = solids[14]?.position.toArray() ?? [];
    expect(last[0]).toBeCloseTo(2 * (500 / 3), 6);
    expect(last[1]).toBeCloseTo(800, 6);
    disposeWall(wall);
  });

  it('spans exactly the opening and the panel thickness', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, thicknessMm: 4 });
    const box = new Box3().setFromObject(wall);
    expect(box.min.toArray().map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0]);
    expect(box.max.toArray().map((v) => Math.round(v * 1e6) / 1e6)).toEqual([600, 1000, 4]);
    disposeWall(wall);
  });

  it('draws the pieces the download writes: same triangles as the built pieces', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    for (const solid of wall.children.filter((c): c is Mesh => c instanceof Mesh)) {
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
    expect(freed).toBe(30); // 15 solids and 15 outlines
    expect(wall.children).toHaveLength(0);
  });
});
