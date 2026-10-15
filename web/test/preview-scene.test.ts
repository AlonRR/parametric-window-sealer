// Backlog item preview-3d (#9), with three.js (Q49): the scene the preview draws, built
// from the same pieces the user downloads. This part needs no screen, so it runs in Node;
// the drawing itself is tested in the browser (e2e/preview.spec.ts). With connector-strip
// (#10) the scene also holds the strips and cross pieces, in place around the panels, and
// with track-edge (#11) the edge strips. Everything is in the pieces' frame: on the example
// slider the opening's left edge is 6.5 mm in from the pieces' left edge.
import { Box3, LineSegments, Mesh, MeshPhongMaterial } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { loadEngine } from 'parametric-window-sealer';
import { EXAMPLE_PARAMS, buildExport } from 'parametric-window-sealer';
import { SHEET_COLOUR, TPU_COLOUR, buildWallScene, disposeWall } from '../src/preview-scene';

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
    expect(solidsOf(wall, 'pin')).toHaveLength(2 * 22); // two through each strip (#110)
    // Top and bottom 510 mm in three segments each, the sides 1000 mm in five.
    expect(solidsOf(wall, 'edge')).toHaveLength(2 * 3 + 2 * 5);
    const outlines = wall.children.filter((c) => c instanceof LineSegments);
    expect(outlines).toHaveLength(15 + 22 + 8 + 44 + 16);
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

  it('draws the pins through the first strip’s middle, 2.5 mm in from each edge, right through it', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    const strip = new Box3().setFromObject(solidsOf(wall, 'strip')[0] as Mesh);
    const [a, b] = solidsOf(wall, 'pin').map((p) => new Box3().setFromObject(p));
    const middle = (strip.min.y + strip.max.y) / 2;
    expect(rounded(a?.getCenter(new Box3().min).toArray() ?? [])).toEqual(rounded([strip.min.x + 2.5, middle, 1.5]));
    expect(rounded(b?.getCenter(new Box3().min).toArray() ?? [])).toEqual(rounded([strip.max.x - 2.5, middle, 1.5]));
    expect(rounded([a?.min.z ?? 0, a?.max.z ?? 0])).toEqual([-1.8, 3 + 1.8]);
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
    // Each with its pins' slots (#110), as in the download.
    const download = buildExport(engine, EXAMPLE_PARAMS).pieces.map((p) => p.mesh.triangles.length);
    expect(solidsOf(wall, 'piece').map((solid) => solid.geometry.index?.count)).toEqual(download);
    expect(download.every((n) => n > 12 * 3)).toBe(true); // more than a plain panel's 12 triangles
    disposeWall(wall);
  });
});

describe('a wall cut from sheet (sheet-pieces, #112)', () => {
  it('draws the pieces to cut in the sheet’s colour, without slots, and a printed one as before', async () => {
    const engine = await loadEngine();
    const sheet = { ...EXAMPLE_PARAMS.sheet, source: 'sheet' as const };
    const one = buildWallScene(engine, { ...EXAMPLE_PARAMS, sheet });
    const [cut] = solidsOf(one, 'piece');
    if (cut === undefined) throw new Error('no piece');
    expect(solidsOf(one, 'piece')).toHaveLength(1);
    expect((cut.material as MeshPhongMaterial).color.getHex()).toBe(SHEET_COLOUR);
    expect(cut.geometry.index?.count).toBe(12 * 3); // a plain block
    disposeWall(one);
    const ported = buildWallScene(engine, { ...EXAMPLE_PARAMS, sheet, ports: [{ hoseMm: 150, column: 2, row: 1 }] });
    const colours = solidsOf(ported, 'piece').map((p) => (p.material as MeshPhongMaterial).color.getHex());
    expect(colours.filter((c) => c === SHEET_COLOUR)).toHaveLength(14);
    expect(colours.filter((c) => c !== SHEET_COLOUR)).toHaveLength(1);
    disposeWall(ported);
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
    expect(freed).toBe(2 * (15 + 22 + 8 + 44 + 18)); // a solid and an outline each
    expect(wall.children).toHaveLength(0);
  });
});

describe('a wall with a hose port (hose-port, #12)', () => {
  it('draws the port’s piece with its collar standing on the room side', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, ports: [{ hoseMm: 150, column: 2, row: 1 }] });
    const pieces = solidsOf(wall, 'piece');
    const depths = pieces.map((p) => new Box3().setFromObject(p).max.z);
    expect(depths.filter((z) => Math.abs(z - 23) < 1e-3)).toHaveLength(1); // 3 mm panel + 20 mm collar
    expect(depths.filter((z) => Math.abs(z - 3) < 1e-3)).toHaveLength(14);
    disposeWall(wall);
  });
});

// Backlog item seal-tape (#15): the tape is drawn in place, in its own colour (Q132): one
// length along each edge strip, and a ring in each port's collar when it goes there too.
describe('the tape in the preview', () => {
  const tape = { widthMm: 9, thicknessMm: 4, grooveMm: 1, squeezePct: 50, sides: true, port: true, joints: false };

  it('none without a seal', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, EXAMPLE_PARAMS);
    expect(solidsOf(wall, 'tape')).toHaveLength(0);
    disposeWall(wall);
  });

  it('one along each edge strip and one in the port, each clear of the parts it sits in', async () => {
    const engine = await loadEngine();
    const params = {
      ...EXAMPLE_PARAMS,
      ports: [{ hoseMm: 150, column: 2, row: 1 }],
      seal: { kind: 'tape' as const, tape },
    };
    const wall = buildWallScene(engine, params);
    const edges = solidsOf(wall, 'edge');
    const tapes = solidsOf(wall, 'tape');
    expect(tapes).toHaveLength(edges.length + 1);
    // The bottom strips sit 1 mm off the track floor; their tape reaches down to it, 5.5 mm
    // below the pieces as the bare strips are on the example slider.
    const lowest = Math.min(...tapes.map((t) => new Box3().setFromObject(t).min.y));
    expect(lowest).toBeCloseTo(-5.5, 4);
    disposeWall(wall);
  });
});

// Backlog item seal-tpu (#22): the printed TPU seal is drawn where the tape would be, in a dark
// grey of its own (C36), and joint strips and cross pieces in TPU in the same grey, gripping the
// panels (C34).
describe('the printed TPU seal in the preview', () => {
  const tpu = { widthMm: 9, thicknessMm: 4, grooveMm: 1, squeezePct: 50, sides: false, port: true, joints: true };
  const params = {
    ...EXAMPLE_PARAMS,
    ports: [{ hoseMm: 150, column: 2, row: 1 }],
    seal: { kind: 'tpu' as const, tape: tpu },
  };
  const colour = (m: Mesh) => (m.material as MeshPhongMaterial).color.getHex();
  const thickness = (m: Mesh) => {
    const box = new Box3().setFromObject(m);
    return box.max.z - box.min.z;
  };

  it('a gasket along each edge strip and a sleeve in the port, in dark grey; no tape', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, params);
    const gaskets = solidsOf(wall, 'tpu');
    expect(gaskets).toHaveLength(solidsOf(wall, 'edge').length + 1);
    expect(solidsOf(wall, 'tape')).toHaveLength(0);
    expect(new Set(gaskets.map(colour))).toEqual(new Set([TPU_COLOUR]));
    expect(TPU_COLOUR).not.toBe(colour(solidsOf(wall, 'edge')[0] as Mesh));
    disposeWall(wall);
  });

  it('TPU strips and cross pieces in the same grey, 0.4 mm thinner across the panel', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, params);
    const loose = buildWallScene(engine, {
      ...params,
      seal: { kind: 'tpu' as const, tape: { ...tpu, joints: false } },
    });
    for (const kind of ['strip', 'cross']) {
      const [inTpu, inPla] = [solidsOf(wall, kind)[0] as Mesh, solidsOf(loose, kind)[0] as Mesh];
      expect(colour(inTpu)).toBe(TPU_COLOUR);
      expect(colour(inPla)).not.toBe(TPU_COLOUR);
      expect(thickness(inTpu)).toBeCloseTo(3 - 0.2 + 3.2, 4);
      expect(thickness(inPla)).toBeCloseTo(3 + 0.4 + 3.2, 4);
    }
    disposeWall(wall);
    disposeWall(loose);
  });
});

// Backlog item measured-cutout (#23): the cutout's piece is drawn as it is downloaded, and its
// lining, tape or TPU, in place in the rim (C43).
describe('a measured cutout in the preview', () => {
  const cutouts = [{ widthMm: 120, heightMm: 80, column: 2, row: 1 }];
  const tape = { widthMm: 9, thicknessMm: 4, grooveMm: 1, squeezePct: 50, sides: false, port: false, joints: false };

  it('its piece has the opening and the rim', async () => {
    const engine = await loadEngine();
    const wall = buildWallScene(engine, { ...EXAMPLE_PARAMS, cutouts });
    const pieces = solidsOf(wall, 'piece');
    const deepest = Math.max(...pieces.map((m) => new Box3().setFromObject(m).max.z));
    expect(deepest).toBeCloseTo(3 + 15, 4); // the rim stands 15 mm on the room side
    disposeWall(wall);
  });

  it('lined with the tape, or with the TPU frame in its own grey', async () => {
    const engine = await loadEngine();
    const taped = buildWallScene(engine, { ...EXAMPLE_PARAMS, cutouts, seal: { kind: 'tape' as const, tape } });
    expect(solidsOf(taped, 'tape')).toHaveLength(solidsOf(taped, 'edge').length + 1);
    disposeWall(taped);
    const tpu = buildWallScene(engine, { ...EXAMPLE_PARAMS, cutouts, seal: { kind: 'tpu' as const, tape } });
    expect(solidsOf(tpu, 'tpu')).toHaveLength(solidsOf(tpu, 'edge').length + 1);
    disposeWall(tpu);
  });
});
