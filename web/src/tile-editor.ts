// The tile editor (draw-tile, #39): a cell drawn on a grid of squares, by clicking or by typing
// each point, written into the hidden fillDrawing field as the SVG text a file would give
// (drawn-tile.ts). The wall takes it as it takes a file: its width on the wall is the SVG tile's
// width, under Advanced. A shape is used once finished; a file chosen afterwards replaces it, and
// drawing again uses the drawing again.
import { describeDrawnTile, drawnTileSvg, isFinished, snap } from './drawn-tile';
import type { DrawnPoint, DrawnShape, DrawnTile } from './drawn-tile';
import { setValue, valueOf } from './form-fields';
import type { FormPart } from './form-part';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARGIN = 2; // squares shown round the cell, where a shape may reach into the next one
const CLOSE_SQUARES = 0.75; // a click this near the first corner finishes the shape
const MAX_SQUARES = 100;

const draw = <K extends keyof SVGElementTagNameMap>(
  parent: Element,
  name: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] => {
  const made = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) made.setAttribute(key, String(value));
  parent.append(made);
  return made;
};

const shapeOn = (parent: Element, shape: DrawnShape, dx: number, dy: number): void => {
  const look = { fill: 'currentColor', 'fill-opacity': 0.55 };
  if (shape.kind === 'corners') {
    const points = shape.corners.map(([x, y]) => `${x + dx},${y + dy}`).join(' ');
    draw(parent, 'polygon', { points, ...look });
  } else draw(parent, 'circle', { cx: shape.centre[0] + dx, cy: shape.centre[1] + dy, r: shape.radius, ...look });
};

const shapeWords = (shape: DrawnShape): string =>
  shape.kind === 'corners'
    ? `${shape.corners.length} corners`
    : `a circle ${String(Math.round(shape.radius * 2 * 1000) / 1000)} squares across`;

const plainNumber = (n: number): string => String(Math.round(n * 100) / 100);

export function tileEditor(form: HTMLFormElement, changed: () => void): FormPart | null {
  const box = form.querySelector<HTMLElement>('[data-testid="tile-editor"]');
  const note = form.querySelector<HTMLElement>('[data-testid="svg-tile-name"]');
  const file = form.querySelector<HTMLInputElement>('[data-part="svg-file"]');
  const canvas = box?.querySelector<SVGSVGElement>('[data-testid="tile-canvas"]') ?? null;
  const repeat = box?.querySelector<SVGSVGElement>('[data-testid="tile-repeat"]') ?? null;
  const scale = box?.querySelector<HTMLElement>('[data-testid="tile-scale"]') ?? null;
  const status = box?.querySelector<HTMLElement>('[data-testid="tile-status"]') ?? null;
  const list = box?.querySelector<HTMLOListElement>('[data-testid="tile-shapes"]') ?? null;
  const input = (part: string) => box?.querySelector<HTMLInputElement>(`[data-part="${part}"]`) ?? null;
  const button = (part: string) => box?.querySelector<HTMLButtonElement>(`[data-part="${part}"]`) ?? null;
  const [width, height, x, y, radius] = ['tile-width', 'tile-height', 'tile-x', 'tile-y', 'tile-radius'].map(input);
  const [addCorner, addCircle, finish, undo, clear, save] = [
    'tile-add-corner',
    'tile-add-circle',
    'tile-finish',
    'tile-undo',
    'tile-clear',
    'tile-save',
  ].map(button);
  if (!box || !note || !canvas || !repeat || !scale || !status || !list) return null;
  if (!width || !height || !x || !y || !radius || !addCorner || !addCircle || !finish || !undo || !clear || !save) {
    return null;
  }

  let shapes: DrawnShape[] = [];
  let corners: DrawnPoint[] = []; // the shape being drawn
  let centre: DrawnPoint | undefined; // a circle's centre, waiting for its rim
  let inUse = false; // the wall uses the drawing: set by a finished shape, cleared by a file
  let cell = { widthSquares: 20, heightSquares: 20 };

  const tile = (): DrawnTile => ({ ...cell, shapes });
  const say = (text: string) => {
    status.textContent = text;
  };
  const drawing = (): string => {
    if (centre !== undefined) return 'Drawing a circle: click a point on its rim.';
    if (corners.length === 0) return '';
    const n = corners.length;
    const words = `Drawing a shape: ${n} corner${n === 1 ? '' : 's'}.`;
    return n < 3 ? words : `${words} Click its first corner, or Finish the shape, to finish it.`;
  };

  const showScale = () => {
    const widthMm = Number(valueOf(form, 'svgWidthMm') ?? '');
    scale.textContent =
      widthMm > 0
        ? `At a tile width of ${plainNumber(widthMm)} mm, a square is ${plainNumber(widthMm / cell.widthSquares)} mm.`
        : "Give the tile's width under Advanced: the pattern to see a square's size on the wall.";
  };

  const render = () => {
    const { widthSquares: w, heightSquares: h } = cell;
    canvas.replaceChildren();
    canvas.setAttribute('viewBox', `${-MARGIN} ${-MARGIN} ${w + 2 * MARGIN} ${h + 2 * MARGIN}`);
    const lines: string[] = [];
    const strong: string[] = [];
    for (let i = -MARGIN; i <= w + MARGIN; i++) (i % 5 === 0 ? strong : lines).push(`M${i} ${-MARGIN}V${h + MARGIN}`);
    for (let j = -MARGIN; j <= h + MARGIN; j++) (j % 5 === 0 ? strong : lines).push(`M${-MARGIN} ${j}H${w + MARGIN}`);
    const grid = { fill: 'none', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 1 };
    draw(canvas, 'path', { d: lines.join(''), stroke: '#e2e2e2', ...grid });
    draw(canvas, 'path', { d: strong.join(''), stroke: '#c0c0c0', ...grid });
    draw(canvas, 'rect', { x: 0, y: 0, width: w, height: h, stroke: 'currentColor', ...grid, 'stroke-width': 2 });
    for (const shape of shapes) shapeOn(canvas, shape, 0, 0);
    const mark = { fill: 'none', stroke: 'currentColor', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 };
    if (corners.length > 0) {
      draw(canvas, 'polyline', { points: corners.map(([px, py]) => `${px},${py}`).join(' '), ...mark });
      for (const [i, [px, py]] of corners.entries())
        draw(canvas, 'circle', { cx: px, cy: py, r: i === 0 ? 0.45 : 0.25, ...mark });
    }
    if (centre !== undefined) draw(canvas, 'circle', { cx: centre[0], cy: centre[1], r: 0.25, ...mark });

    repeat.replaceChildren();
    repeat.setAttribute('viewBox', `0 0 ${3 * w} ${3 * h}`);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        draw(repeat, 'rect', { x: i * w, y: j * h, width: w, height: h, stroke: '#c0c0c0', ...grid });
        for (const shape of shapes) shapeOn(repeat, shape, i * w, j * h);
      }
    }

    list.replaceChildren();
    for (const [i, shape] of shapes.entries()) {
      const item = document.createElement('li');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        shapes = shapes.filter((s) => s !== shape);
        use();
      });
      item.append(`Shape ${i + 1}: ${shapeWords(shape)} `, remove);
      list.append(item);
    }
    save.disabled = !shapes.some(isFinished);
    showScale();
  };

  // The drawing into the field the library reads, and the plan again.
  const use = () => {
    inUse = true;
    setValue(form, 'fillDrawing', drawnTileSvg(tile()));
    note.textContent = `Using your drawn tile: ${describeDrawnTile(tile())}.`;
    render();
    changed();
  };

  const add = (shape: DrawnShape) => {
    shapes = [...shapes, shape];
    say('');
    use();
  };

  const finishShape = () => {
    if (corners.length < 3) {
      say(`A shape needs at least three corners: ${corners.length} so far.`);
      return;
    }
    const done: DrawnShape = { kind: 'corners', corners };
    corners = [];
    add(done);
  };

  const typed = (): DrawnPoint | undefined => {
    const [px, py] = [x.value.trim(), y.value.trim()].map((v) => (v === '' ? NaN : Number(v)));
    if (!Number.isFinite(px) || !Number.isFinite(py)) return undefined;
    return [px ?? 0, py ?? 0];
  };

  const place = (point: DrawnPoint, raw: DrawnPoint) => {
    const circle = valueOf(form, 'tileTool') === 'circle';
    if (circle && centre === undefined) {
      centre = point;
    } else if (circle && centre !== undefined) {
      const [cx, cy] = centre;
      const r = snap(Math.hypot(raw[0] - cx, raw[1] - cy));
      centre = undefined;
      if (r > 0) {
        add({ kind: 'circle', centre: [cx, cy], radius: r });
        return;
      }
    } else {
      const first = corners[0];
      const near = first !== undefined && Math.hypot(raw[0] - first[0], raw[1] - first[1]) <= CLOSE_SQUARES;
      if (near && corners.length >= 3) {
        finishShape();
        return;
      }
      corners = [...corners, point];
    }
    say(drawing());
    render();
  };

  return {
    load() {
      // Its controls are not the form's fields: typing a point leaves the wall as it is, and only a
      // shape used (use, above) asks for the plan and the preview again.
      for (const type of ['input', 'change']) box.addEventListener(type, (event) => event.stopPropagation());
      canvas.addEventListener('click', (event) => {
        const matrix = canvas.getScreenCTM();
        if (matrix === null) return;
        const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        place([snap(at.x), snap(at.y)], [at.x, at.y]);
      });
      addCorner.addEventListener('click', () => {
        const point = typed();
        if (point === undefined) {
          say('Type a number of squares across and down.');
          return;
        }
        corners = [...corners, point];
        say(drawing());
        render();
      });
      addCircle.addEventListener('click', () => {
        const point = typed();
        const r = radius.value.trim() === '' ? NaN : Number(radius.value);
        if (point === undefined) say('Type a number of squares across and down.');
        else if (!(r > 0)) say('Type a radius above 0 squares for the circle.');
        else add({ kind: 'circle', centre: point, radius: r });
      });
      finish.addEventListener('click', finishShape);
      undo.addEventListener('click', () => {
        if (centre !== undefined) centre = undefined;
        else if (corners.length > 0) corners = corners.slice(0, -1);
        else if (shapes.length > 0) {
          shapes = shapes.slice(0, -1);
          say('');
          use();
          return;
        }
        say(drawing());
        render();
      });
      clear.addEventListener('click', () => {
        [shapes, corners, centre] = [[], [], undefined];
        say('');
        use();
      });
      save.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([drawnTileSvg(tile())], { type: 'image/svg+xml' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tile.svg';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      });
      for (const size of [width, height]) {
        size.addEventListener('input', () => {
          const [w, h] = [width.value.trim(), height.value.trim()].map((v) => (/^[0-9]+$/.test(v) ? Number(v) : 0));
          if (!(w !== undefined && h !== undefined && w >= 1 && h >= 1 && w <= MAX_SQUARES && h <= MAX_SQUARES)) {
            say(`Make the cell a whole number of squares each way, from 1 to ${MAX_SQUARES}.`);
            return;
          }
          cell = { widthSquares: w, heightSquares: h };
          say(drawing());
          if (inUse) use();
          else render();
        });
      }
      file?.addEventListener('change', () => {
        inUse = false;
      });
      form.addEventListener('input', showScale);
      render();
    },
  };
}
