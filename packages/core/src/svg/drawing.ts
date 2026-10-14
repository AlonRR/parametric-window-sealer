// Reading an SVG tile (svg-tile, #27; Q21): the user's own drawing as one cell of a pattern, its
// filled shapes the openings. MPL-2.0 like the rest of the code (Q36); the drawing stays the user's.
//
// The cell is the drawing's viewBox, or its width and height in user units (px) without one.
// Rectangles, circles, ellipses, polygons, polylines and paths are read, with their transforms and
// their groups' and with <use>; a shape is an opening when it is filled and drawn, by its fill
// and fill-rule as the attributes, the style attribute or a simple style sheet set them. Curves
// and arcs become straight lines no further than a thousandth of the cell from the curve.
//
// What would be read wrongly is refused, with what to change: a clip or a mask, a style rule
// with a selector it cannot match, an svg inside the drawing. Strokes, text and images are not
// openings and are left out, as is everything inside defs, symbols, masks and clip paths until
// a <use> draws it. Within one shape, its rings are taken to nest without crossing, as drawing
// programs leave them: which ring holds which decides the holes. A ring that crosses itself or
// another may fill otherwise than a browser shows it; shapes may overlap freely.
import { SVGPathData, SVGShapes } from 'svg-pathdata';
import type { SVGCommand } from 'svg-pathdata';
import type { Point } from '../pattern.js';
import { XmlError, parseXml } from './xml.js';
import type { XmlElement } from './xml.js';

export interface SvgDrawing {
  widthUnits: number; // the cell, in the drawing's own units
  heightUnits: number;
  rings: Point[][]; // round the cell's centre, y up: counter-clockwise outlines, clockwise holes
}

export type SvgDrawingResult = { ok: true; drawing: SvgDrawing } | { ok: false; message: string };

export const SVG_MAX_CORNERS = 8000;

// A drawing that cannot be used, with the user's message.
class Refusal extends Error {}

const NO_SIZE = 'Give the drawing a viewBox, or a width and height, so the tile has a size.';
const NO_FILL = 'The drawing has no filled shapes: draw each opening as a filled shape.';
const TOO_MANY = `The drawing has more than ${SVG_MAX_CORNERS} corners; simplify it.`;
const CLIPPED =
  'The drawing clips or masks a shape, which the tile cannot read: release the clip or the mask in the drawing program.';
const NESTED = 'The drawing has an svg element inside it: ungroup it in the drawing program.';
const SYMBOL_VIEWBOX = 'The drawing uses a symbol with a viewBox of its own: unlink the clone in the drawing program.';
const CIRCULAR = 'The drawing’s <use> elements refer to each other in a circle.';

// x' = a x + c y + e, y' = b x + d y + f.
type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

// m after n: n applies first.
const times = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];

const NUMBER = /[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;
const SEPARATOR = /\s*,?\s*/y;

// A list of numbers as SVG writes them, "0,0 10-5 .5.5"; undefined if anything else is there.
function numbers(text: string): number[] | undefined {
  const out: number[] = [];
  const t = text.trim();
  let at = 0;
  while (at < t.length) {
    NUMBER.lastIndex = at;
    const m = NUMBER.exec(t);
    if (m === null) return undefined;
    out.push(Number(m[0]));
    SEPARATOR.lastIndex = NUMBER.lastIndex;
    SEPARATOR.exec(t);
    at = SEPARATOR.lastIndex;
  }
  return out;
}

const TRANSFORM = /[\s,]*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)[\s,]*/y;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function oneTransform(kind: string, n: readonly number[]): Matrix | undefined {
  const [a = 0, b, c, d, e, f] = n;
  if (kind === 'matrix' && n.length === 6) return [a, b ?? 0, c ?? 0, d ?? 0, e ?? 0, f ?? 0];
  if (kind === 'translate' && n.length <= 2 && n.length > 0) return translate(a, b ?? 0);
  if (kind === 'scale' && n.length <= 2 && n.length > 0) return [a, 0, 0, b ?? a, 0, 0];
  if (kind === 'rotate' && (n.length === 1 || n.length === 3)) {
    const [cos, sin] = [Math.cos(radians(a)), Math.sin(radians(a))];
    const turn: Matrix = [cos, sin, -sin, cos, 0, 0];
    return n.length === 1 ? turn : times(times(translate(b ?? 0, c ?? 0), turn), translate(-(b ?? 0), -(c ?? 0)));
  }
  if (kind === 'skewX' && n.length === 1) return [1, 0, Math.tan(radians(a)), 1, 0, 0];
  if (kind === 'skewY' && n.length === 1) return [1, Math.tan(radians(a)), 0, 1, 0, 0];
  return undefined;
}

// A transform attribute: its list, the first written outermost.
function transformOf(text: string): Matrix {
  let m = IDENTITY;
  let at = 0;
  while (text.slice(at).trim() !== '') {
    TRANSFORM.lastIndex = at;
    const t = TRANSFORM.exec(text);
    const one = t === null ? undefined : oneTransform(t[1] ?? '', numbers(t[2] ?? '') ?? []);
    if (one === undefined) throw new Refusal(`The drawing has a transform it cannot read: “${text.trim()}”.`);
    m = times(m, one);
    at = TRANSFORM.lastIndex;
  }
  return m;
}

// User units (px) per unit: CSS's 96 to the inch.
const UNITS: Record<string, number> = { '': 1, px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 4 / 3, pc: 16 };
const LENGTH = /^\s*([+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\s*([a-zA-Z]*)\s*$/;

// A length in user units; undefined if it is not one the tile can read (a percentage, an em).
function lengthOf(text: string): number | undefined {
  const m = LENGTH.exec(text);
  const unit = m === null ? undefined : UNITS[(m[2] ?? '').toLowerCase()];
  return m === null || unit === undefined ? undefined : Number(m[1]) * unit;
}

function length(el: XmlElement, key: string): number {
  const text = el.attributes.get(key);
  if (text === undefined) return 0;
  const n = lengthOf(text);
  if (n === undefined)
    throw new Refusal(`The drawing has a length it cannot read: ${key}="${text}" on a <${el.name}>.`);
  return n;
}

// The cell: the viewBox, or the width and height in user units.
function cellOf(root: XmlElement): [number, number, number, number] {
  const viewBox = root.attributes.get('viewBox');
  if (viewBox !== undefined) {
    const [x = 0, y = 0, w = 0, h = 0, ...more] = numbers(viewBox) ?? [];
    if (w > 0 && h > 0 && more.length === 0) return [x, y, w, h];
    throw new Refusal(NO_SIZE);
  }
  const [w, h] = ['width', 'height'].map((key) => lengthOf(root.attributes.get(key) ?? '') ?? 0);
  if (w !== undefined && h !== undefined && w > 0 && h > 0) return [0, 0, w, h];
  throw new Refusal(NO_SIZE);
}

// The style properties the tile reads; the first four are inherited.
const PROPERTIES = ['fill', 'fill-rule', 'fill-opacity', 'visibility', 'display', 'opacity', 'clip-path', 'mask'];
const INHERITED = PROPERTIES.slice(0, 4);
const START = new Map([
  ['fill', 'black'],
  ['fill-rule', 'nonzero'],
  ['fill-opacity', '1'],
  ['visibility', 'visible'],
]);

// "fill: none; stroke: #000" as its properties, the names in lower case.
function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of css.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const value = part.slice(colon + 1).replace(/!\s*important\s*$/i, '');
    out.set(part.slice(0, colon).trim().toLowerCase(), value.trim());
  }
  return out;
}

interface Rule {
  tag?: string;
  id?: string;
  classes: string[];
  specificity: number;
  order: number;
  declarations: Map<string, string>;
}

const SIMPLE = /^(\*|[A-Za-z][-\w]*)?((?:[.#][-\w]+)*)$/;

// A style sheet's rules whose selectors are a type, classes and an id, as drawing programs write
// them (".st0", "rect", "#a"); a rule the tile cannot match that sets what it reads is refused.
function styleSheet(text: string, order: { next: number }): Rule[] {
  const rules: Rule[] = [];
  const css = text.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/@[a-z-]+[^{;]*;/gi, '');
  let at = 0;
  while (at < css.length) {
    const open = css.indexOf('{', at);
    if (open === -1) break;
    let [depth, end] = [1, open + 1];
    for (; end < css.length && depth > 0; end++) depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0;
    const prelude = css.slice(at, open).trim();
    const body = declarations(css.slice(open + 1, end - 1));
    at = end;
    if (prelude.startsWith('@')) continue; // @media, @font-face: not read
    for (const selector of prelude.split(',').map((s) => s.trim())) {
      const m = SIMPLE.exec(selector);
      if (m === null || selector === '') {
        if (PROPERTIES.some((p) => body.has(p))) {
          throw new Refusal(
            `The drawing's style sheet has a rule the tile cannot read: “${selector}”. Set the fill on the shapes themselves.`,
          );
        }
        continue;
      }
      const tag = m[1] === undefined || m[1] === '*' ? undefined : m[1];
      const parts = [...(m[2] ?? '').matchAll(/([.#])([-\w]+)/g)];
      const ids = parts.filter((p) => p[1] === '#').map((p) => p[2] ?? '');
      const classes = parts.filter((p) => p[1] === '.').map((p) => p[2] ?? '');
      if (new Set(ids).size > 1) continue; // matches nothing
      const specificity = 100 * ids.length + 10 * classes.length + (tag === undefined ? 0 : 1);
      rules.push({ tag, id: ids[0], classes, specificity, order: order.next++, declarations: body });
    }
  }
  return rules;
}

// Every element, depth first, the root first.
function* everyElement(el: XmlElement): Generator<XmlElement> {
  yield el;
  for (const child of el.children) yield* everyElement(child);
}

const matches = (rule: Rule, el: XmlElement): boolean => {
  if (rule.tag !== undefined && rule.tag !== el.name) return false;
  if (rule.id !== undefined && rule.id !== el.attributes.get('id')) return false;
  const classes = (el.attributes.get('class') ?? '').split(/\s+/);
  return rule.classes.every((c) => classes.includes(c));
};

// What an element sets: its attributes, then the style sheet's rules, then its style attribute.
function declared(el: XmlElement, rules: readonly Rule[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of PROPERTIES) {
    const value = el.attributes.get(p);
    if (value !== undefined) out.set(p, value.trim());
  }
  const applying = rules.filter((r) => matches(r, el));
  applying.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  for (const rule of applying) for (const [key, value] of rule.declarations) out.set(key, value);
  for (const [key, value] of declarations(el.attributes.get('style') ?? '')) out.set(key, value);
  return out;
}

const isNone = (value: string | undefined) => value?.toLowerCase() === 'none';
const isZero = (value: string | undefined) => value !== undefined && Number.parseFloat(value) <= 0;

// A shape's outline as path data in its own units; undefined if it has no area.
function pathOf(el: XmlElement): SVGPathData | undefined {
  const at = (key: string) => length(el, key);
  if (el.name === 'rect') {
    const [x, y, w, h] = [at('x'), at('y'), at('width'), at('height')];
    if (!(w > 0 && h > 0)) return undefined;
    const given = (key: string) => {
      const text = el.attributes.get(key);
      return text === undefined || text.trim() === 'auto' ? undefined : Math.max(0, at(key));
    };
    const [rx, ry] = [given('rx'), given('ry')];
    const [rX, rY] = [Math.min(rx ?? ry ?? 0, w / 2), Math.min(ry ?? rx ?? 0, h / 2)];
    return SVGShapes.createRect(x, y, w, h, rX, rY);
  }
  if (el.name === 'circle') {
    const r = at('r');
    return r > 0 ? SVGShapes.createEllipse(r, r, at('cx'), at('cy')) : undefined;
  }
  if (el.name === 'ellipse') {
    const given = (key: string) => (el.attributes.get(key)?.trim() === 'auto' ? undefined : at(key));
    const [rx, ry] = [given('rx'), given('ry')];
    const [rX, rY] = [rx ?? ry ?? 0, ry ?? rx ?? 0];
    return rX > 0 && rY > 0 ? SVGShapes.createEllipse(rX, rY, at('cx'), at('cy')) : undefined;
  }
  if (el.name === 'polygon' || el.name === 'polyline') {
    const text = el.attributes.get('points') ?? '';
    const coords = numbers(text);
    if (coords === undefined) throw new Refusal(`The drawing has a <${el.name}> whose points it cannot read.`);
    const even = coords.slice(0, coords.length - (coords.length % 2)); // an odd one out is dropped
    return even.length >= 6 ? SVGShapes.createPolygon(even) : undefined; // filled as if closed
  }
  if (el.name === 'path') {
    const d = el.attributes.get('d') ?? '';
    if (d.trim() === '') return undefined;
    try {
      return new SVGPathData(d);
    } catch {
      throw new Refusal('The drawing has a path it cannot read.');
    }
  }
  return undefined;
}

const SHAPES = new Set(['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'path']);
const GROUPS = new Set(['svg', 'g', 'a', 'switch']);

interface Reading {
  root: XmlElement;
  rules: readonly Rule[];
  ids: ReadonlyMap<string, XmlElement>;
  tolerance: number; // the most a straight line may stray from a curve
  corners: number;
  rings: Point[][];
}

// How far a curve's points bend at b: the second difference.
const second = (a: Point, b: Point, c: Point) => Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1]);

// A cubic curve from p0, as straight lines to p3 at most `tolerance` from it: n lines bound the
// error by 3/4 of the larger second difference of its points over n².
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, tolerance: number, out: Point[]): void {
  const n = Math.max(1, Math.ceil(Math.sqrt((0.75 * Math.max(second(p0, p1, p2), second(p1, p2, p3))) / tolerance)));
  if (!(n <= SVG_MAX_CORNERS)) throw new Refusal(TOO_MANY);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const [a, b, c, d] = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t ** 2 * (1 - t), t ** 3];
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
}

// The path's rings in the cell's frame, each closed, with no point repeated.
function ringsOf(path: SVGPathData, m: Matrix, reading: Reading): Point[][] {
  let commands: SVGCommand[];
  try {
    commands = path
      .toAbs()
      .normalizeHVZ(false)
      .normalizeST()
      .qtToC()
      .aToC()
      .matrix(...m).commands;
  } catch {
    throw new Refusal('The drawing has a path it cannot read.');
  }
  const rings: Point[][] = [];
  let ring: Point[] = [];
  let pen: Point = [0, 0];
  let start: Point = pen;
  const finish = () => {
    const kept = ring.filter((p, i) => {
      const [x, y] = ring[(i + 1) % ring.length] ?? p;
      return Math.hypot(x - p[0], y - p[1]) > reading.tolerance / 1000;
    });
    if (kept.length >= 3) {
      reading.corners += kept.length;
      if (reading.corners > SVG_MAX_CORNERS) throw new Refusal(TOO_MANY);
      rings.push(kept);
    }
    ring = [];
  };
  for (const c of commands) {
    if (c.type === SVGPathData.MOVE_TO) {
      finish();
      pen = [c.x, c.y];
      start = pen;
      ring = [pen];
      continue;
    }
    if (ring.length === 0) ring = [pen]; // drawing on after a close starts where it closed
    if (c.type === SVGPathData.LINE_TO) {
      pen = [c.x, c.y];
      ring.push(pen);
    } else if (c.type === SVGPathData.CURVE_TO) {
      const end: Point = [c.x, c.y];
      cubic(pen, [c.x1, c.y1], [c.x2, c.y2], end, reading.tolerance, ring);
      pen = end;
    } else if (c.type === SVGPathData.CLOSE_PATH) {
      finish();
      pen = start;
    }
  }
  finish();
  return rings;
}

export const signedArea = (ring: readonly Point[]): number => {
  let sum = 0;
  for (const [i, [x, y]] of ring.entries()) {
    const [nx, ny] = ring[(i + 1) % ring.length] ?? [x, y];
    sum += x * ny - nx * y;
  }
  return sum / 2;
};

function inside(ring: readonly Point[], [px, py]: Point): boolean {
  let within = false;
  for (const [i, [x, y]] of ring.entries()) {
    const [qx, qy] = ring[(i + 1) % ring.length] ?? [x, y];
    if (y > py !== qy > py && px < ((qx - x) * (py - y)) / (qy - y) + x) within = !within;
  }
  return within;
}

// One shape's rings, each drawn the way that makes the shape what its fill rule fills: a ring is
// an outline (counter-clockwise) where the shape is filled inside it and not just outside it, a
// hole (clockwise) the other way round, and left out where both sides are the same.
function oriented(rings: readonly Point[][], evenOdd: boolean): Point[][] {
  const areas = rings.map(signedArea);
  const boxes = rings.map((r) => {
    const [xs, ys] = [r.map((p) => p[0]), r.map((p) => p[1])];
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  const order = rings.map((_, i) => i).filter((i) => (areas[i] ?? 0) !== 0);
  order.sort((i, j) => Math.abs(areas[j] ?? 0) - Math.abs(areas[i] ?? 0)); // the largest first
  const parent = new Map<number, number>();
  const winding = new Map<number, number>();
  const depth = new Map<number, number>();
  const filled = new Map<number, boolean>();
  const out = new Map<number, Point[]>();
  for (const [k, i] of order.entries()) {
    const ring = rings[i] ?? [];
    const [first = [0, 0]] = ring;
    const [bx0 = 0, by0 = 0, bx1 = 0, by1 = 0] = boxes[i] ?? [];
    // The smallest ring before it in the order that holds it.
    for (let l = k - 1; l >= 0; l--) {
      const j = order[l] ?? 0;
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = boxes[j] ?? [];
      const within = bx0 >= x0 && by0 >= y0 && bx1 <= x1 && by1 <= y1;
      if (within && inside(rings[j] ?? [], first)) {
        parent.set(i, j);
        break;
      }
    }
    const up = parent.get(i);
    const sign = Math.sign(areas[i] ?? 0);
    winding.set(i, sign + (up === undefined ? 0 : (winding.get(up) ?? 0)));
    depth.set(i, up === undefined ? 0 : (depth.get(up) ?? 0) + 1);
    const isFilled = evenOdd ? (depth.get(i) ?? 0) % 2 === 0 : winding.get(i) !== 0;
    filled.set(i, isFilled);
    const outside = up === undefined ? false : (filled.get(up) ?? false);
    if (isFilled === outside) continue;
    out.set(i, isFilled === sign > 0 ? ring : ring.map((_, n) => ring[ring.length - 1 - n] ?? first));
  }
  return rings.flatMap((_, i) => {
    const ring = out.get(i);
    return ring === undefined ? [] : [ring];
  });
}

// An element and what it holds, in the cell's frame through `m`.
function walk(
  el: XmlElement,
  paint: ReadonlyMap<string, string>,
  m: Matrix,
  reading: Reading,
  using: readonly XmlElement[],
  kind: string = el.name,
): void {
  if (!GROUPS.has(kind) && !SHAPES.has(kind) && kind !== 'use') return; // defs, text, images and the rest
  if (kind === 'svg' && el !== reading.root) throw new Refusal(NESTED);
  const own = declared(el, reading.rules);
  if (isNone(own.get('display')) || isZero(own.get('opacity'))) return;
  if (!(isNone(own.get('clip-path') ?? 'none') && isNone(own.get('mask') ?? 'none'))) throw new Refusal(CLIPPED);
  const inherits = new Map(paint);
  for (const p of INHERITED) {
    const value = own.get(p);
    if (value !== undefined && value.toLowerCase() !== 'inherit') inherits.set(p, value.toLowerCase());
  }
  const at = times(m, transformOf(el.attributes.get('transform') ?? ''));
  if (GROUPS.has(kind)) {
    for (const child of el.children) walk(child, inherits, at, reading, using);
  } else if (kind === 'use') {
    const href = el.attributes.get('href') ?? el.attributes.get('xlink:href') ?? '';
    const target = href.startsWith('#') ? reading.ids.get(href.slice(1)) : undefined;
    if (target === undefined) return; // nothing, or another file's: not drawn
    if (using.includes(target) || using.length >= 16) throw new Refusal(CIRCULAR);
    if (target.name === 'svg') throw new Refusal(NESTED);
    if (target.name === 'symbol' && target.attributes.has('viewBox')) throw new Refusal(SYMBOL_VIEWBOX);
    const placed = times(at, translate(length(el, 'x'), length(el, 'y')));
    walk(target, inherits, placed, reading, [...using, target], target.name === 'symbol' ? 'g' : target.name);
  } else {
    const fill = inherits.get('fill');
    const shown = inherits.get('visibility') === 'visible';
    if (!shown || isNone(fill) || fill === 'transparent' || isZero(inherits.get('fill-opacity'))) return;
    const path = pathOf(el);
    if (path === undefined) return;
    reading.rings.push(...oriented(ringsOf(path, at, reading), inherits.get('fill-rule') === 'evenodd'));
  }
}

const cache = new Map<string, SvgDrawingResult>();
const CACHED = 8; // a page, a command and a server each read the same few drawings again and again

// The drawing in an SVG file's text, or why it cannot be a tile. The result is shared between
// callers with the same text: do not change it.
export function readSvgDrawing(text: string): SvgDrawingResult {
  const known = cache.get(text);
  if (known !== undefined) return known;
  const result = read(text);
  cache.set(text, result);
  for (const old of cache.keys()) {
    if (cache.size <= CACHED) break;
    cache.delete(old);
  }
  return result;
}

function read(text: string): SvgDrawingResult {
  let root: XmlElement;
  try {
    root = parseXml(text);
  } catch (error) {
    if (error instanceof XmlError) return { ok: false, message: `The file is not an SVG drawing: ${error.message}.` };
    throw error;
  }
  if (root.name !== 'svg') {
    return { ok: false, message: 'The file is not an SVG drawing: it has no svg element at its root.' };
  }
  try {
    const [x, y, w, h] = cellOf(root);
    const elements = [...everyElement(root)];
    const order = { next: 0 };
    const rules = elements.filter((e) => e.name === 'style').flatMap((e) => styleSheet(e.text, order));
    const ids = new Map<string, XmlElement>();
    for (const e of elements) {
      const id = e.attributes.get('id');
      if (id !== undefined && !ids.has(id)) ids.set(id, e);
    }
    const reading: Reading = { root, rules, ids, tolerance: Math.max(w, h) / 1000, corners: 0, rings: [] };
    // The cell's centre the origin, y up as seen from the room.
    walk(root, START, [1, 0, 0, -1, -x - w / 2, y + h / 2], reading, []);
    if (!reading.rings.some((r) => signedArea(r) > 0)) return { ok: false, message: NO_FILL };
    return { ok: true, drawing: { widthUnits: w, heightUnits: h, rings: reading.rings } };
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, message: error.message };
    throw error;
  }
}
