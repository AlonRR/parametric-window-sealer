// An SVG tile (svg-tile, #27; Q21): the user's own drawing as the pattern, its cell repeated
// across the wall at the width they give, its height in proportion, and its filled shapes the
// openings. Reading the drawing is svg/drawing.ts; how to draw one is docs/svg-tiles.md.
import { MIN_BAR_MM } from '../pattern.js';
import type { PatternTile } from '../pattern.js';
import { readSvgDrawing, signedArea } from '../svg/drawing.js';
import type { SvgDrawing } from '../svg/drawing.js';
import { mm } from '../words.js';
import { definePattern } from './define.js';

// The drawing a wall starts with: one round opening, 14 mm across in a 20 mm cell.
export const SAMPLE_SVG_TILE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/></svg>';

export const DEFAULT_SVG_WIDTH_MM = 20;

// The drawing's cell repeated every widthMm across and its height in proportion up. The bars are
// what the drawing leaves between its shapes; a sliver thinner than the least bar stays solid.
export function svgDrawingTile(drawing: SvgDrawing, widthMm: number): PatternTile {
  const scale = widthMm / drawing.widthUnits;
  return {
    pitchXMm: widthMm,
    pitchYMm: drawing.heightUnits * scale,
    rowShiftMm: 0,
    openings: drawing.rings.map((ring) => ring.map(([x, y]) => [x * scale, y * scale])),
    barMm: MIN_BAR_MM,
  };
}

// The drawing, which readParams has checked; a library caller that has not gets the reason.
function drawingOf(text: string): SvgDrawing {
  const read = readSvgDrawing(text);
  if (!read.ok) throw new RangeError(read.message);
  return read.drawing;
}

export const SVG_TILE = definePattern({
  kind: 'svg',
  name: 'SVG tile',
  words: 'an SVG tile of your own',
  group: "The SVG tile's width in mm; its height follows the drawing's.",
  sizes: [
    {
      key: 'widthMm',
      field: 'svgWidthMm',
      flag: 'svg-width',
      label: 'Tile width (mm)',
      note: "The drawing's width on the wall; its height follows.",
      help: "The SVG tile's width on the wall; its height follows the drawing's.",
      start: DEFAULT_SVG_WIDTH_MM,
    },
  ],
  tile: (size, drawing) => svgDrawingTile(drawingOf(drawing), size('widthMm')),
  describe: (size, drawing) => {
    const tile = svgDrawingTile(drawingOf(drawing), size('widthMm'));
    const openings = tile.openings.filter((ring) => signedArea(ring) > 0).length;
    return (
      `an SVG tile ${mm(tile.pitchXMm)} × ${mm(tile.pitchYMm)} mm with ${openings} ` +
      `opening${openings === 1 ? '' : 's'}`
    );
  },
});
