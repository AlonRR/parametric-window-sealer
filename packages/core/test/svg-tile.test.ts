// An SVG tile as a pattern (svg-tile, #27; Q21): the user's own drawing, its viewBox one cell of
// the pattern and its filled shapes the openings, repeated across the wall at a width they choose.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  MIN_BAR_MM,
  SAMPLE_SVG_TILE,
  buildPieces,
  describePlan,
  fillPattern,
  loadEngine,
  planWall,
  SETTINGS,
  readParams,
  readSettings,
  readSvgDrawing,
  svgDrawingTile,
  toFormValues,
} from '../src/index.js';
import type { Point, SvgDrawing } from '../src/index.js';

const engine = await loadEngine();

const svg = (body: string, attributes = 'viewBox="0 0 20 20"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`;
const read = (text: string): SvgDrawing => {
  const r = readSvgDrawing(text);
  if (!r.ok) throw new Error(r.message);
  return r.drawing;
};
// Signed area: above zero for a counter-clockwise ring, an outline; below for a hole.
const area = (ring: readonly Point[]) =>
  ring.reduce((sum, [x, y], i) => {
    const [nx, ny] = ring[(i + 1) % ring.length] ?? [0, 0];
    return sum + (x * ny - nx * y) / 2;
  }, 0);
const total = (d: SvgDrawing) => d.rings.reduce((sum, ring) => sum + area(ring), 0);
const box = (ring: readonly Point[]) => {
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v * 1000) / 1000);
};

describe('reading an SVG tile', () => {
  it('takes the viewBox as the cell, its centre the origin, y up as seen from the room', () => {
    const d = read(svg('<rect x="0" y="0" width="5" height="4"/>'));
    expect([d.widthUnits, d.heightUnits]).toEqual([20, 20]);
    expect(d.rings).toHaveLength(1);
    const [ring = []] = d.rings;
    expect(area(ring)).toBeCloseTo(20, 9); // an outline, counter-clockwise
    expect(box(ring)).toEqual([-10, 6, -5, 10]); // the drawing's top left stays top left
    const shifted = read(svg('<rect x="-10" y="-10" width="5" height="4"/>', 'viewBox="-10 -10 20 20"'));
    expect(box(shifted.rings[0] ?? [])).toEqual([-10, 6, -5, 10]);
  });

  // Curves become straight lines no further than a thousandth of the cell (here 0.02) from them,
  // so a curved shape's area is short by less than its curves' length times that.
  const TOLERANCE = 20 / 1000;
  const short = (d: SvgDrawing, exact: number, curves: number) => {
    expect(total(d)).toBeLessThanOrEqual(exact + 1e-9);
    expect(total(d)).toBeGreaterThan(exact - curves * TOLERANCE);
  };
  // Every corner on the circle, and every side's middle no further inside it than the tolerance.
  const onCircle = (ring: readonly Point[], [cx, cy]: Point, r: number) => {
    for (const [i, [x, y]] of ring.entries()) {
      const [nx, ny] = ring[(i + 1) % ring.length] ?? [x, y];
      expect(Math.abs(Math.hypot(x - cx, y - cy) - r)).toBeLessThan(TOLERANCE);
      expect(r - Math.hypot((x + nx) / 2 - cx, (y + ny) / 2 - cy)).toBeLessThan(TOLERANCE);
    }
  };

  it('reads circles, ellipses, polygons, polylines and paths with curves and arcs', () => {
    const circle = read(svg('<circle cx="10" cy="10" r="5"/>'));
    short(circle, Math.PI * 25, Math.PI * 10);
    onCircle(circle.rings[0] ?? [], [0, 0], 5);
    short(read(svg('<ellipse cx="10" cy="10" rx="6" ry="3"/>')), Math.PI * 18, 30);
    expect(total(read(svg('<polygon points="0,0 10,0 0,10"/>')))).toBeCloseTo(50, 9);
    expect(total(read(svg('<polyline points="0 0 10 0 0 10"/>')))).toBeCloseTo(50, 9); // filled as if closed
    short(read(svg('<rect x="2" y="2" width="10" height="10" rx="2"/>')), 100 - (4 - Math.PI) * 4, Math.PI * 4);
    // A circle of radius 5 as two arcs, and a square with one side a cubic curve and one a quadratic.
    const arcs = read(svg('<path d="M5 10a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z"/>'));
    short(arcs, Math.PI * 25, Math.PI * 10);
    onCircle(arcs.rings[0] ?? [], [0, 0], 5);
    const curved = read(svg('<path d="M0 0H10V10C7 10 3 10 0 10Q0 5 0 0Z"/>'));
    expect(total(curved)).toBeCloseTo(100, 6);
  });

  it('applies the transforms on each shape and on the groups round it', () => {
    const square = '<rect x="0" y="0" width="2" height="2"/>';
    expect(box(read(svg(`<g transform="translate(4 6)">${square}</g>`)).rings[0] ?? [])).toEqual([-6, 2, -4, 4]);
    expect(total(read(svg(`<rect transform="scale(2,3)" x="0" y="0" width="2" height="2"/>`)))).toBeCloseTo(24, 9);
    const turned = read(
      svg(`<g transform="translate(10 10)"><rect transform="rotate(90)" x="0" y="0" width="4" height="2"/></g>`),
    );
    expect(box(turned.rings[0] ?? [])).toEqual([-2, -4, 0, 0]);
    const matrix = read(svg(`<rect transform="matrix(1 0 0 1 10 10)" x="0" y="0" width="2" height="2"/>`));
    expect(box(matrix.rings[0] ?? [])).toEqual([0, -2, 2, 0]);
    expect(area(turned.rings[0] ?? [])).toBeGreaterThan(0);
  });

  it('leaves out what is not filled or not drawn', () => {
    const square = (extra: string) => `<rect ${extra} x="0" y="0" width="2" height="2"/>`;
    const kept = square('');
    for (const body of [
      square('fill="none"'),
      square('style="stroke:#000; fill: none"'),
      `<g fill="none">${square('')}</g>`,
      `<defs>${square('')}</defs>`,
      `<clipPath id="c">${square('')}</clipPath>`,
      `<mask id="m">${square('')}</mask>`,
      `<symbol id="s">${square('')}</symbol>`,
      square('display="none"'),
      square('style="display:none"'),
      '<text x="0" y="10">openings</text>',
    ]) {
      expect(read(svg(`${body}${kept}`)).rings, body).toHaveLength(1);
    }
    // A fill set again inside a group that has none is drawn.
    expect(read(svg(`<g fill="none">${square('fill="black"')}</g>${kept}`)).rings).toHaveLength(2);
  });

  it('makes holes of rings inside others, by the even-odd rule or drawn the other way round', () => {
    const outer = 'M0 0H10V10H0Z';
    const sameWay = 'M3 3H7V7H3Z';
    const otherWay = 'M3 3V7H7V3Z';
    const evenOdd = read(svg(`<path fill-rule="evenodd" d="${outer} ${sameWay}"/>`));
    expect(evenOdd.rings.map((r) => Math.round(area(r)))).toEqual([100, -16]);
    const nonZero = read(svg(`<path d="${outer} ${otherWay}"/>`));
    expect(nonZero.rings.map((r) => Math.round(area(r)))).toEqual([100, -16]);
    // Drawn the same way under the nonzero rule, the inner ring is filled too: no hole.
    expect(total(read(svg(`<path d="${outer} ${sameWay}"/>`)))).toBeCloseTo(100, 9);
    // The rule is inherited from a group.
    expect(Math.round(total(read(svg(`<g fill-rule="evenodd"><path d="${outer} ${sameWay}"/></g>`))))).toBe(84);
  });

  it('reads a style sheet of types, classes and ids, the more specific first and the style attribute over all', () => {
    const square = (extra: string) => `<rect ${extra} x="0" y="0" width="2" height="2"/>`;
    const kept = '<circle cx="15" cy="15" r="2"/>';
    const rings = (css: string, body: string) => read(svg(`<style>${css}</style>${body}${kept}`)).rings.length;
    expect(rings('.st0 { fill: none; stroke: #000 }', square('class="st0"'))).toBe(1);
    expect(rings('rect { fill: none }', square('fill="black"'))).toBe(1); // a style sheet over the attributes
    expect(rings('.open { fill: #000 } rect { fill: none }', `${square('class="open"')}${square('')}`)).toBe(2);
    expect(rings('#a { fill: none } .x { fill: #000 }', square('id="a" class="x"'))).toBe(1);
    expect(rings('.st0 { fill: none }', square('class="st0" style="fill: red"'))).toBe(2);
    expect(rings('/* a comment */ @media print { rect { fill: none } } g rect { stroke: red }', square(''))).toBe(2);
    expect(readSvgDrawing(svg(`<style>g rect { fill: none }</style>${kept}`))).toEqual({
      ok: false,
      message:
        "The drawing's style sheet has a rule the tile cannot read: “g rect”. Set the fill on the shapes themselves.",
    });
  });

  it('draws what a <use> points at, where it places it, painted as the <use> says', () => {
    const defs = '<defs><rect id="r" x="0" y="0" width="2" height="2"/></defs>';
    const placed = read(svg(`${defs}<use href="#r" x="4" y="6"/>`));
    expect(placed.rings.map(box)).toEqual([[-6, 2, -4, 4]]);
    expect(read(svg(`${defs}<use xlink:href="#r"/>`, 'viewBox="0 0 20 20" xmlns:xlink="x"')).rings).toHaveLength(1);
    expect(
      read(svg('<symbol id="s"><rect width="2" height="2"/></symbol><use href="#s"/><use href="#s" x="5"/>')).rings,
    ).toHaveLength(2);
    expect(read(svg(`${defs}<use href="#r" fill="none"/><use href="#r" x="5"/>`)).rings).toHaveLength(1);
    expect(read(svg(`${defs}<use href="#nowhere"/><use href="#r"/>`)).rings).toHaveLength(1);
  });

  it('refuses what it would read wrongly, saying what to change', () => {
    const refused = (body: string) => {
      const r = readSvgDrawing(svg(`${body}<rect width="2" height="2"/>`));
      return r.ok ? '' : r.message;
    };
    const clip =
      'The drawing clips or masks a shape, which the tile cannot read: release the clip or the mask in the drawing program.';
    expect(refused('<rect clip-path="url(#c)" width="2" height="2"/>')).toBe(clip);
    expect(refused('<g style="mask: url(#m)"><rect width="2" height="2"/></g>')).toBe(clip);
    expect(refused('<svg viewBox="0 0 5 5"><rect width="2" height="2"/></svg>')).toBe(
      'The drawing has an svg element inside it: ungroup it in the drawing program.',
    );
    expect(refused('<symbol id="s" viewBox="0 0 2 2"><rect width="2" height="2"/></symbol><use href="#s"/>')).toBe(
      'The drawing uses a symbol with a viewBox of its own: unlink the clone in the drawing program.',
    );
    expect(refused('<g id="a"><use href="#a"/></g>')).toBe(
      'The drawing’s <use> elements refer to each other in a circle.',
    );
    expect(refused('<rect transform="rotate(1 2)" width="2" height="2"/>')).toBe(
      'The drawing has a transform it cannot read: “rotate(1 2)”.',
    );
    expect(refused('<rect width="50%" height="2"/>')).toBe(
      'The drawing has a length it cannot read: width="50%" on a <rect>.',
    );
    expect(refused('<polygon points="0,0 1,x"/>')).toBe('The drawing has a <polygon> whose points it cannot read.');
    expect(refused('<path d="M0 0 L 5"/>')).toBe('The drawing has a path it cannot read.');
    expect(refused('<path d="L 5 5 10 10"/>')).toBe('The drawing has a path it cannot read.');
  });

  it('reads what drawing programs write round the drawing: a declaration, a doctype, comments, CDATA, entities', () => {
    const text =
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">\n' +
      '<!-- made by hand -->\n' +
      svg(
        '<title>A &amp; B &#38; C</title><style><![CDATA[ rect { fill: black } ]]></style>' +
          '<metadata><x:y xmlns:x="urn:example"/></metadata><rect x="0" y="0" width="2" height="2" />',
      );
    expect(read(text).rings).toHaveLength(1);
  });

  it('reads drawings as Inkscape, Illustrator and Figma write them', () => {
    const inkscape =
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n' +
      '<svg width="20mm" height="20mm" viewBox="0 0 20 20" version="1.1" id="svg1" sodipodi:docname="tile.svg" ' +
      'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ' +
      'xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg">\n' +
      '  <sodipodi:namedview id="namedview1" pagecolor="#ffffff" inkscape:document-units="mm" />\n' +
      '  <defs id="defs1" />\n' +
      '  <g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(-1,-1)">\n' +
      '    <circle style="fill:#000000;stroke:none;stroke-width:0.264583" id="path1" cx="11" cy="11" r="7" />\n' +
      '  </g>\n</svg>\n';
    const illustrator =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n' +
      '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'x="0px" y="0px"\n\t viewBox="0 0 20 20" style="enable-background:new 0 0 20 20;" xml:space="preserve">\n' +
      '<style type="text/css">\n\t.st0{fill:none;stroke:#000000;stroke-miterlimit:10;}\n</style>\n' +
      '<rect x="2" y="2" class="st0" width="16" height="16"/>\n<circle cx="10" cy="10" r="7"/>\n</svg>\n';
    const figma =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
      '<rect x="0.5" y="0.5" width="19" height="19" stroke="black"/>\n<circle cx="10" cy="10" r="7" fill="#D9D9D9"/>\n</svg>\n';
    for (const text of [inkscape, illustrator, figma]) {
      const d = read(text);
      expect([d.widthUnits, d.heightUnits]).toEqual([20, 20]);
      expect(d.rings).toHaveLength(1); // the circle; a stroked square is no opening
      expect(box(d.rings[0] ?? [])).toEqual([-7, -7, 7, 7]);
    }
  });

  it('takes the size from width and height when there is no viewBox, in the user units (px) shapes use', () => {
    const d = read(svg('<rect x="0" y="0" width="2" height="2"/>', 'width="30mm" height="15mm"'));
    expect(d.widthUnits).toBeCloseTo((30 * 96) / 25.4, 9);
    expect(d.heightUnits).toBeCloseTo((15 * 96) / 25.4, 9);
    expect(read(svg('<rect width="2" height="2"/>', 'width="40" height="20"')).widthUnits).toBe(40);
    expect(read(svg('<rect width="2" height="2"/>', 'width="40px" height="1in"')).heightUnits).toBe(96);
  });

  it('refuses what it cannot use, and says why', () => {
    const refused = (text: string) => {
      const r = readSvgDrawing(text);
      return r.ok ? '' : r.message;
    };
    expect(refused('<html><body/></html>')).toBe('The file is not an SVG drawing: it has no svg element at its root.');
    expect(refused('<svg viewBox="0 0 10 10"><rect')).toMatch(/^The file is not an SVG drawing: /);
    expect(refused('')).toMatch(/^The file is not an SVG drawing: /);
    expect(refused(svg('<rect width="2" height="2"/>', ''))).toBe(
      'Give the drawing a viewBox, or a width and height, so the tile has a size.',
    );
    expect(refused(svg('<rect width="2" height="2"/>', 'viewBox="0 0 0 10"'))).toBe(
      'Give the drawing a viewBox, or a width and height, so the tile has a size.',
    );
    expect(refused(svg('<rect width="2" height="2" fill="none"/>'))).toBe(
      'The drawing has no filled shapes: draw each opening as a filled shape.',
    );
    const many = Array.from({ length: 2100 }, (_, i) => `<rect x="${i % 20}" y="0" width="0.5" height="1"/>`).join('');
    expect(refused(svg(many))).toBe('The drawing has more than 8000 corners; simplify it.');
  });
});

describe('an SVG tile on the wall', () => {
  const drawing = read(svg('<rect x="0" y="0" width="10" height="5"/>', 'viewBox="0 0 20 10"'));

  it('repeats the cell at the width given, its height in proportion, bars no thinner than the least', () => {
    const tile = svgDrawingTile(drawing, 40);
    expect([tile.pitchXMm, tile.pitchYMm, tile.rowShiftMm, tile.barMm]).toEqual([40, 20, 0, MIN_BAR_MM]);
    expect(tile.openings).toHaveLength(1);
    expect(box(tile.openings[0] ?? [])).toEqual([-20, 0, 0, 10]);
  });

  it('starts with a sample: a 14 mm round opening in a 20 mm cell', () => {
    expect(EXAMPLE_PARAMS.fill.drawing).toBe(SAMPLE_SVG_TILE);
    const sample = read(SAMPLE_SVG_TILE);
    expect([sample.widthUnits, sample.heightUnits]).toEqual([20, 20]);
    expect(total(sample)).toBeCloseTo(Math.PI * 49, 0);
  });

  const start = toFormValues(EXAMPLE_PARAMS);
  const choose = (over: Record<string, string>) => readParams({ ...start, fill: 'svg', ...over });

  it('is a fill like the others: chosen, its width read and checked, its drawing read and named', () => {
    const r = choose({
      svgWidthMm: '30',
      fillDrawing: svg('<rect width="10" height="10"/><rect x="12" width="5" height="5"/>'),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.params.fill.svg).toEqual({ widthMm: 30 });
    expect(describePlan(planWall(r.params), r.params).fill).toBe(
      'Fill: an SVG tile 30 × 30 mm with 2 openings, cut 1.5 mm into the room side.',
    );
    expect(choose({ svgWidthMm: '0' })).toMatchObject({ ok: false, errors: { svgWidthMm: expect.any(String) } });
    expect(choose({ fillDrawing: '<html/>' })).toEqual({
      ok: false,
      errors: { fillDrawing: 'The file is not an SVG drawing: it has no svg element at its root.' },
    });
    // A wall that is not using the tile keeps a drawing it cannot read, as it keeps a size (C15).
    expect(readParams({ ...start, fillDrawing: '<html/>' }).ok).toBe(true);
    // A piece of its own using the tile needs it too.
    expect(readParams({ ...start, pieceFills: '1,1=svg', fillDrawing: '<html/>' })).toMatchObject({
      ok: false,
      errors: { fillDrawing: expect.any(String) },
    });
  });

  it('is a setting of its own, as text, and given alone means the SVG tile', () => {
    expect(SETTINGS.find((s) => s.field === 'fillDrawing')).toMatchObject({ path: 'fill.drawing', text: true });
    const square = svg('<rect width="10" height="10"/>');
    expect(readSettings({ ...EXAMPLE_PARAMS, fill: { drawing: square } })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'svg', drawing: square } },
    });
    expect(readSettings(EXAMPLE_PARAMS, { fillDrawing: square })).toMatchObject({
      ok: true,
      params: { fill: { kind: 'svg', drawing: square } },
    });
    expect(readSettings({ ...EXAMPLE_PARAMS, fill: { drawing: 3 } })).toMatchObject({
      ok: false,
      problems: [{ kind: 'shape', path: 'fill.drawing', message: 'fill.drawing should be text' }],
    });
    expect(readSettings({ ...EXAMPLE_PARAMS, fill: { kind: 'svg', drawing: '<svg/>' } })).toMatchObject({
      ok: false,
      problems: [
        { kind: 'value', field: 'fillDrawing', path: 'fill.drawing', message: expect.stringMatching(/^Give/) },
      ],
    });
  });

  it('cuts its openings through the pieces', () => {
    const r = choose({ fillStyle: 'through' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const plan = planWall(r.params);
    const pattern = fillPattern(r.params.fill, r.params.joint);
    const plain = buildPieces(engine, plan, 3);
    const cut = buildPieces(engine, plan, 3, [], undefined, undefined, pattern);
    try {
      const [first, firstCut] = [plain[0]?.solid, cut[0]?.solid];
      if (first === undefined || firstCut === undefined) throw new Error('no pieces');
      // Many 14 mm circles go through the first piece, each a hole right through it.
      expect(firstCut.volume()).toBeLessThan(first.volume() - 10 * Math.PI * 49 * 3);
      expect(firstCut.genus()).toBeGreaterThan(10);
    } finally {
      for (const p of [...plain, ...cut]) p.solid.delete();
    }
  });
});
