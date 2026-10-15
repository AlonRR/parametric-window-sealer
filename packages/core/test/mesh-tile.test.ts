// A 3D tile of your own as the panel fill (mesh-tiles, #40): a mesh read as mesh-import reads one,
// turned so the side named faces the room, and set side by side in whole cells on one lattice
// across the wall, each cell's panel replaced by the tile: an organiser's own tile, or a tile of a
// 3D pattern.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  FILL_KINDS,
  NO_MESH_TILE,
  buildPiecesWith,
  describePlan,
  fillChoice,
  layoutGrid,
  loadEngine,
  planWall,
  readMeshTile,
  readParams,
  readSettings,
  tileCells,
  toFormValues,
} from '../src/index.js';
import type { ApplianceModel, FormValues, Params } from '../src/index.js';
import { boxFile, modelFileOf } from './model-file.js';

const engine = await loadEngine();
const { Manifold } = engine;
const example = toFormValues(EXAMPLE_PARAMS);
const read = (over: FormValues): Params => {
  const r = readParams({ ...example, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.params;
};
const errors = (over: FormValues) => {
  const r = readParams({ ...example, ...over });
  return r.ok ? {} : r.errors;
};
const probe = (solid: InstanceType<typeof Manifold>, x: number, y: number, z: number, size = 0.1) => {
  const cube = Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

// A tile drawn lying flat, as tiles are drawn to print: 28 mm square, with a 10 mm square hole
// through its middle.
const holed = (depthMm: number) =>
  modelFileOf(Manifold.cube([28, 28, depthMm]).subtract(Manifold.cube([10, 10, depthMm + 2]).translate([9, 9, -1])));
const TILE = holed(6);
const THIN = holed(2);
// A disc: round, so no face of it lies on a side of its box, and it would touch its neighbours at
// a line at most.
const DISC = modelFileOf(Manifold.cylinder(6, 14, 14, 32));

const tile = (file: string): ApplianceModel => {
  const r = readMeshTile(file, 'top');
  if (!r.ok) throw new Error(r.message);
  return r.model;
};

describe('reading the tile', () => {
  it('its box seen from the room is its cell, and the rest of it its depth', () => {
    expect(NO_MESH_TILE).toEqual({ file: '', view: 'top' });
    const t = tile(TILE);
    expect([t.outlineMm.widthMm, t.outlineMm.heightMm, t.depthMm]).toEqual([28, 28, 6]);
    const side = readMeshTile(TILE, 'front');
    if (!side.ok) throw new Error(side.message);
    expect([side.model.outlineMm.widthMm, side.model.outlineMm.heightMm, side.model.depthMm]).toEqual([28, 6, 28]);
  });

  it('refuses one that would not join the tiles beside it, no file, and a mesh it cannot use', () => {
    expect(readMeshTile(DISC, 'top')).toEqual({
      ok: false,
      message:
        'The tile has no flat face on its left side, so it would not join the tile beside it: tiles are set side ' +
        'by side, so give it a flat face on each side of its box, seen from the room.',
    });
    expect(readMeshTile('', 'top')).toEqual({ ok: false, message: 'Choose the tile’s file.' });
    expect(readMeshTile('bm90IGEgbWVzaA==', 'top')).toEqual({
      ok: false,
      message: 'The file is not a mesh: choose an STL, OBJ or 3MF file.',
    });
  });
});

describe('where the tiles go', () => {
  const piece = { xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 };

  it('whole cells inside the border, side by side on the lattice centred on the wall', () => {
    const cells = tileCells(tile(TILE), [100, 100], piece, 10);
    expect(cells).toHaveLength(25);
    expect([...new Set(cells.map(([x]) => x))].sort((a, b) => a - b)).toEqual([44, 72, 100, 128, 156]);
    // Elsewhere on the wall, the wall's lattice: a piece 20 mm to the right sees it 20 mm to the left.
    const moved = tileCells(tile(TILE), [100, 100], { ...piece, xMm: 20 }, 10);
    expect([...new Set(moved.map(([x]) => x))].sort((a, b) => a - b)).toEqual([24, 52, 80, 108, 136, 164]);
  });

  it('clear of the zone round a fitting', () => {
    const cells = tileCells(tile(TILE), [100, 100], piece, 10, { xMm: 100, yMm: 100, widthMm: 40, heightMm: 40 });
    expect(cells).toHaveLength(16); // the middle cell and its eight neighbours left out
    expect(cells.some(([x, y]) => x === 100 && y === 100)).toBe(false);
  });
});

describe('a piece of tiles', () => {
  const plan = layoutGrid({
    widthMm: 200,
    heightMm: 200,
    maxPieceWidthMm: 200,
    maxPieceHeightMm: 200,
    minPieceMm: 34,
    width: { mode: 'equal' },
    height: { mode: 'equal' },
  });
  const build = (file: string, thicknessMm: number) => {
    const built = buildPiecesWith(
      engine,
      plan,
      thicknessMm,
      [],
      { meshTile: tile(file), borderMm: 10 },
      undefined,
      undefined,
      () => false,
    );
    const [only] = built;
    if (only === undefined || built.length !== 1) throw new Error('expected one piece');
    return only.solid;
  };

  it('each whole cell the tile instead of the panel, standing proud where it is deeper', () => {
    const solid = build(TILE, 3);
    try {
      expect(solid.boundingBox().max[2]).toBeCloseTo(6, 6);
      // The panel, less the cells' 140 mm square, and 25 tiles.
      expect(solid.volume()).toBeCloseTo(200 * 200 * 3 - 140 * 140 * 3 + 25 * (28 * 28 - 10 * 10) * 6, 0);
      expect(solid.genus()).toBe(25);
      expect(probe(solid, 100, 100, 1.5)).toBe(0); // a tile's hole, through the wall
      expect(probe(solid, 109, 100, 1.5)).toBeGreaterThan(0);
      expect(probe(solid, 109, 100, 5.5)).toBeGreaterThan(0); // the tile, standing proud
      expect(probe(solid, 109, 100, 6.5)).toBe(0);
      expect(probe(solid, 20, 100, 1.5)).toBeGreaterThan(0); // the band round the cells, the panel
      expect(probe(solid, 20, 100, 4)).toBe(0);
      expect(probe(solid, 5, 5, 4)).toBe(0); // the border stays as thick as the piece, for the strips
    } finally {
      solid.delete();
    }
  });

  it('a tile thinner than the panel sits on its outside face, short of the room face', () => {
    const solid = build(THIN, 3);
    try {
      expect(solid.genus()).toBe(25);
      expect(probe(solid, 109, 100, 1)).toBeGreaterThan(0);
      expect(probe(solid, 109, 100, 2.5)).toBe(0);
      expect(probe(solid, 20, 100, 2.5)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });

  it('given by the fill, for the wall and for a piece of its own', () => {
    const p = read({ fill: 'mesh', fillMeshFile: TILE });
    expect(fillChoice(p.fill, DEFAULT_JOINT)).toEqual({ meshTile: tile(TILE), borderMm: DEFAULT_JOINT.slotMm + 2 });
    const own = read({ pieceFills: '1,1=mesh', fillMeshFile: TILE });
    expect(own.pieceFills).toEqual([{ column: 1, row: 1, kind: 'mesh' }]);
  });
});

describe('the setting', () => {
  it('a fill of its own, read only where it is used', () => {
    expect(FILL_KINDS.at(-1)).toBe('mesh');
    const p = read({ fill: 'mesh', fillMeshFile: TILE });
    expect(p.fill.mesh).toEqual({ file: TILE, view: 'top' });
    expect(readParams(toFormValues(p))).toEqual({ ok: true, params: p });
    expect(errors({ fill: 'mesh' })).toEqual({ fillMeshFile: 'Choose the tile’s file.' });
    expect(errors({ pieceFills: '1,1=mesh' })).toEqual({ fillMeshFile: 'Choose the tile’s file.' });
    expect(errors({ fill: 'mesh', fillMeshFile: DISC })).toEqual({
      fillMeshFile: expect.stringMatching(/^The tile has no flat face on its left side/),
    });
    expect(errors({ fill: 'mesh', fillMeshFile: TILE, fillMeshView: 'side' })).toEqual({
      fillMeshView: 'Choose one of the listed options.',
    });
    // Not used, not read.
    expect(read({ fillMeshFile: 'not base64!', fillMeshView: 'side' }).fill.kind).toBe('sealed');
  });

  it('refused for the whole wall with pieces cut from sheet, and with a double wall', () => {
    expect(errors({ fill: 'mesh', fillMeshFile: TILE, pieceSource: 'sheet' })).toEqual({
      pieceSource:
        '3D tiles of your own for the whole wall are printed into every piece, so none would be cut: choose a ' +
        'sealed fill, or give single pieces the tiles.',
    });
    expect(errors({ fill: 'mesh', fillMeshFile: TILE, wall: 'double', thicknessMm: '10' })).toEqual({
      wall:
        'A double wall’s skins are too thin for 3D tiles of your own across the wall: choose a sealed fill, or ' +
        'give single pieces a pattern of their own; those are printed solid.',
    });
  });

  it('a tile file given without a fill means the tile, in the library’s shape and as an override', () => {
    const opening = { openingWidthMm: 600, openingHeightMm: 1000 };
    const given = readSettings({ ...opening, fill: { mesh: { file: boxFile(28, 28, 6) } } });
    expect(given.ok && given.params.fill.kind).toBe('mesh');
    const flag = readSettings(opening, { fillMeshFile: boxFile(28, 28, 6) });
    expect(flag.ok && flag.params.fill.kind).toBe('mesh');
  });
});

describe('the plan', () => {
  const line = (p: Params) => describePlan(planWall(p), p).fill;

  it('the file, the tile’s size and depth, and how it stands against the room face', () => {
    expect(line(read({ fill: 'mesh', fillMeshFile: TILE }))).toBe(
      'Fill: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 6 mm deep, set side ' +
        'by side in whole cells inside each piece’s border, standing 3 mm proud on the room side.',
    );
    expect(line(read({ fill: 'mesh', fillMeshFile: THIN }))).toBe(
      'Fill: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 2 mm deep, set side ' +
        'by side in whole cells inside each piece’s border, 1 mm short of the room face.',
    );
    expect(line(read({ fill: 'mesh', fillMeshFile: holed(3) }))).toBe(
      'Fill: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 3 mm deep, set side ' +
        'by side in whole cells inside each piece’s border, flush with both faces.',
    );
    const own = read({ pieceFills: '2,1=mesh', fillMeshFile: TILE });
    expect(describePlan(planWall(own), own).pieceFills).toEqual([
      'Column 2, row 1: 3D tiles of your own, from the STL file: each 28 × 28 mm seen from its top and 6 mm deep, ' +
        'set side by side in whole cells inside each piece’s border, standing 3 mm proud on the room side.',
    ]);
  });
});
