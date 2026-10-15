// The tile drawn on the page (draw-tile, #39): its shapes written as the SVG text the library
// reads, which reads them back as the openings drawn.
import { describe, expect, it } from 'vitest';
import { readSvgDrawing, signedArea } from 'parametric-window-sealer';
import type { SvgDrawing } from 'parametric-window-sealer';
import { describeDrawnTile, drawnTileSvg, snap } from '../src/drawn-tile';
import type { DrawnTile } from '../src/drawn-tile';

const read = (tile: DrawnTile): SvgDrawing => {
  const result = readSvgDrawing(drawnTileSvg(tile));
  if (!result.ok) throw new Error(result.message);
  return result.drawing;
};

const SQUARE = {
  kind: 'corners',
  corners: [
    [2, 2],
    [8, 2],
    [8, 8],
    [2, 8],
  ],
} as const;

describe('drawnTileSvg', () => {
  it('writes the cell as the viewBox and each finished shape as an opening', () => {
    const drawing = read({ widthSquares: 20, heightSquares: 20, shapes: [SQUARE] });
    expect([drawing.widthUnits, drawing.heightUnits]).toEqual([20, 20]);
    expect(drawing.rings).toHaveLength(1);
    expect(Math.abs(signedArea(drawing.rings[0] ?? []))).toBeCloseTo(36, 6);
  });

  it('writes a circle round its centre', () => {
    const drawing = read({
      widthSquares: 20,
      heightSquares: 20,
      shapes: [{ kind: 'circle', centre: [10, 10], radius: 4 }],
    });
    expect(drawing.rings).toHaveLength(1);
    expect(Math.abs(signedArea(drawing.rings[0] ?? []))).toBeCloseTo(Math.PI * 16, 0);
  });

  it('keeps the cell’s proportions', () => {
    const drawing = read({ widthSquares: 20, heightSquares: 10, shapes: [SQUARE] });
    expect([drawing.widthUnits, drawing.heightUnits]).toEqual([20, 10]);
  });

  it('a shape drawn either way round is an opening', () => {
    const reversed = {
      kind: 'corners',
      corners: [
        [2, 8],
        [8, 8],
        [8, 2],
        [2, 2],
      ],
    } as const;
    const drawing = read({ widthSquares: 20, heightSquares: 20, shapes: [reversed] });
    expect(drawing.rings).toHaveLength(1);
    expect(signedArea(drawing.rings[0] ?? [])).toBeGreaterThan(0);
  });

  it('leaves out a shape of fewer than three corners, and a circle of no size', () => {
    const svg = drawnTileSvg({
      widthSquares: 20,
      heightSquares: 20,
      shapes: [
        {
          kind: 'corners',
          corners: [
            [1, 1],
            [5, 5],
          ],
        },
        { kind: 'circle', centre: [10, 10], radius: 0 },
      ],
    });
    expect(svg).not.toMatch(/<polygon|<circle/);
    expect(readSvgDrawing(svg)).toEqual({
      ok: false,
      message: 'The drawing has no filled shapes: draw each opening as a filled shape.',
    });
  });

  it('writes a typed corner to a thousandth of a square', () => {
    const svg = drawnTileSvg({
      widthSquares: 20,
      heightSquares: 20,
      shapes: [
        {
          kind: 'corners',
          corners: [
            [1 / 3, 0],
            [5, 0],
            [5, 2 / 3],
          ],
        },
      ],
    });
    expect(svg).toContain('0.333,0 5,0 5,0.667');
  });
});

describe('snap', () => {
  it.each([
    [3.26, 3.5],
    [3.24, 3],
    [0.2, 0],
    [-0.2, 0],
    [19.8, 20],
  ])('%d snaps to %d, the nearest half square', (v, to) => {
    expect(snap(v)).toBe(to);
  });
});

describe('describeDrawnTile', () => {
  it.each([
    [[], 'no shapes'],
    [[SQUARE], '1 shape'],
    [[SQUARE, SQUARE], '2 shapes'],
    [
      [
        SQUARE,
        {
          kind: 'corners',
          corners: [
            [1, 1],
            [5, 5],
          ],
        },
      ],
      '1 shape',
    ],
  ] as const)('%j: %s', (shapes, words) => {
    expect(describeDrawnTile({ widthSquares: 20, heightSquares: 20, shapes: [...shapes] })).toBe(words);
  });
});
