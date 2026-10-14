# SVG tiles

A pattern of your own for the panel fill: draw one cell of it in any drawing program that saves
SVG (Inkscape, Illustrator, Affinity Designer, Figma and others), and the wall repeats it across
every piece, lined up across the joints as the other patterns are. The filled shapes in your
drawing are the openings; the rest of the cell stays solid.

## Drawing a tile

1. **Make the page the cell.** The drawing's `viewBox` is one cell of the pattern; in most
   programs that is the page, artboard or frame. Without a `viewBox`, its `width` and `height`
   are. The cells sit side by side and one above the other, with no gap and no shift between
   rows: make the page as wide and as tall as the step from one opening to the next.
2. **Draw each opening as a filled shape**: rectangles, circles, ellipses, polygons and paths,
   with curves and arcs. The fill's colour does not matter; a shape with no fill (`fill="none"`)
   is not an opening. A shape may reach past the edge of the page: it then joins the
   neighbouring cell's openings.
3. **Make a hole in a shape** (a ring, a letter O) by combining the outer and inner paths into
   one path (Inkscape: Path → Combine; Illustrator: Object → Compound Path → Make), so the inner
   one is drawn the other way round or the path's fill rule is even-odd.
4. **Turn strokes and text into shapes.** A stroke is not an opening, however wide, and text is
   left out: convert them first (Inkscape: Path → Stroke to Path and Path → Object to Path;
   Illustrator: Object → Expand and Type → Create Outlines).
5. **Save as SVG.** Plain SVG and each program's own SVG both work.

Shapes drawn inside a group, moved, turned or scaled, and copies made with clones (`<use>`)
are read where they appear. Shapes inside `defs`, symbols, masks and clip paths are not drawn
unless a clone draws them. A colour set by a style sheet of simple rules (`.st0 { fill: none }`,
as Illustrator writes them) counts as set on the shape.

## Using it

On the page, choose **SVG tile** as the fill, then your file under **SVG file**. The plan names
the tile, its size and how many openings each cell has. A wall starts with a sample drawing,
one round opening 14 mm across in a 20 mm cell, until you choose a file; reloading the page
starts from the sample again.

- **Its width on the wall** is **Tile width (mm)**, with the pattern's sizes under
  **Advanced: the pattern**: 20 mm to start with. Its height follows the drawing's proportions.
  The size the drawing gives itself in mm is not used.
- **Relief or cut through**, and **piece by piece**, work as for every pattern.
- **Bars.** The solid between the openings is what the drawing leaves. A sliver of opening
  thinner than 0.8 mm (two lines from a 0.4 mm nozzle) stays solid, and a bar of solid thinner
  than that may print poorly: keep the openings at least 0.8 mm apart at the width you choose.
- **The border.** As with every pattern, each piece keeps a solid border clear of the strips,
  and solid round a hose port, a cutout or a fan.

The command takes the file with `--svg-tile`, its width with `--svg-width`:

```bash
window-sealer --width 600 --height 1000 --svg-tile tile.svg --svg-width 30
```

In a `--params` file, the library and the MCP server, the drawing is the setting `fill.drawing`,
the SVG file's text, and the width `fill.svg.widthMm`; a drawing given without `fill.kind` means
the SVG tile.

## What it refuses

A drawing the tile would read wrongly is refused, with a message saying what to change, rather
than cut into the wall differently from what you drew:

| The message | What to change |
|---|---|
| The file is not an SVG drawing | Choose an SVG file; the message names what is wrong in it. |
| Give the drawing a viewBox, or a width and height | Give the page a size. A width in percent does not count. |
| The drawing has no filled shapes | Fill the openings; see step 4 for strokes and text. |
| The drawing has more than 8000 corners | Simplify it (Inkscape: Path → Simplify). Curves count as many short lines. |
| The drawing clips or masks a shape | Release the clip or the mask. |
| The drawing has an svg element inside it | Ungroup it, or paste its shapes into the drawing. |
| The drawing uses a symbol with a viewBox of its own | Unlink the clone. |
| The drawing's `<use>` elements refer to each other in a circle | Remove the clone that holds itself. |
| The drawing's style sheet has a rule the tile cannot read | Set the fill on the shapes, or keep the style sheet to rules of one type, class or id. |
| The drawing has a transform, a length, a path or a shape's points it cannot read | Save it again as plain SVG. |

## How it is read

For the curious and for contributors; the code is `packages/core/src/svg/`.

- Curves and arcs become straight lines, no further from the curve than a thousandth of the
  cell's larger side: 0.02 mm on a 20 mm tile.
- Lengths in mm, cm, in, pt and pc are converted to the drawing's own units at 96 to the inch,
  as browsers do. A drawing in percent or em lengths is refused.
- Each shape is read with its own fill rule, non-zero or even-odd. Within one shape, its rings
  are taken to nest without crossing, as drawing programs leave them: which ring lies inside
  which decides the holes. A ring that crosses itself or another ring of the same shape may fill
  differently from what a browser shows. Separate shapes may overlap freely: each opening is
  every point that any shape fills.
- Hidden shapes are left out: `display: none`, `visibility: hidden`, `opacity: 0`,
  `fill-opacity: 0` and `fill: transparent`.

The drawing and everything printed from it are yours, as are all the files the tool makes.
