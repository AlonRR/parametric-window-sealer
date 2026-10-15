// Per-piece fills (params-advanced, #21): one list for a piece, its fill and style together (C29),
// and the map of the wall's pieces, the top row first as the wall is seen. The choice is written
// into the hidden pieceFills field as the command's --piece-fill takes it (C28).
import { ORGANISERS, PATTERNS, PATTERN_STYLES, formatPieceFills, parsePieceFills } from 'parametric-window-sealer';
import type { PatternStyle, PieceFill } from 'parametric-window-sealer';
import { option, setValue, valueOf } from './form-fields';

const STYLE_NAMES: Record<PatternStyle, string> = { relief: 'relief', through: 'cut through' };

// Sealed, then each of the library's patterns in each style, then each organiser's board.
function fillChoices(choice: HTMLSelectElement): void {
  const options = [option('', 'As the wall'), option('sealed', 'Sealed')];
  for (const pattern of PATTERNS) {
    for (const style of PATTERN_STYLES) {
      options.push(option(`${pattern.kind}:${style}`, `${pattern.name}, ${STYLE_NAMES[style]}`));
    }
  }
  for (const organiser of ORGANISERS) options.push(option(organiser.kind, organiser.name));
  choice.replaceChildren(...options);
}

const pieceFillsOf = (form: HTMLFormElement): PieceFill[] => {
  const read = parsePieceFills(valueOf(form, 'pieceFills') ?? '');
  return read.ok ? read.fills : [];
};

// A piece's own fill, written as the list's value (kind:style), or none for "As the wall".
function setPieceFill(form: HTMLFormElement, column: number, row: number, value: string): void {
  const others = pieceFillsOf(form).filter((f) => !(f.column === column && f.row === row));
  const own = value === '' ? { ok: true as const, fills: [] } : parsePieceFills(`${column},${row}=${value}`);
  setValue(form, 'pieceFills', formatPieceFills([...others, ...(own.ok ? own.fills : [])]));
}

export interface PieceMap {
  draw(columns: number, rows: number): void;
}

export function pieceMap(form: HTMLFormElement, changed: () => void): PieceMap {
  const map = form.querySelector<HTMLElement>('[data-testid="piece-map"]');
  const choice = form.querySelector<HTMLSelectElement>('[data-part="piece-fill"]');
  const label = form.querySelector<HTMLElement>('[data-part="piece-fill-label"]');
  const name = form.querySelector<HTMLElement>('[data-part="piece-fill-name"]');
  if (choice) fillChoices(choice);
  let chosen: { column: number; row: number } | undefined;
  let shownFor: string | undefined;
  choice?.addEventListener('change', () => {
    if (chosen) setPieceFill(form, chosen.column, chosen.row, choice.value);
  });

  // The map follows the plan: a button for each piece, the top row first.
  const draw = (columns: number, rows: number): void => {
    if (!map) return;
    if (chosen && (chosen.column > columns || chosen.row > rows)) chosen = undefined;
    const fills = pieceFillsOf(form);
    map.style.gridTemplateColumns = `repeat(${columns}, auto)`;
    const buttons: HTMLButtonElement[] = [];
    for (let row = rows; row >= 1; row--) {
      for (let column = 1; column <= columns; column++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${column},${row}`;
        b.setAttribute('aria-label', `Column ${column}, row ${row}`);
        b.setAttribute('aria-pressed', String(chosen?.column === column && chosen.row === row));
        b.dataset.own = fills.some((f) => f.column === column && f.row === row) ? 'yes' : 'no';
        b.addEventListener('click', () => {
          chosen = { column, row };
          changed();
          choice?.focus();
        });
        buttons.push(b);
      }
    }
    map.replaceChildren(...buttons);
    if (label) label.hidden = chosen === undefined;
    // The list shows the chosen piece's fill when the choice moves to it, and is left alone while
    // the user changes it: the page redraws on its input event, before its change event is heard.
    const key = chosen === undefined ? undefined : `${chosen.column},${chosen.row}`;
    if (chosen && choice && name && key !== shownFor) {
      const own = fills.find((f) => f.column === chosen?.column && f.row === chosen.row);
      name.textContent = `Fill of column ${chosen.column}, row ${chosen.row}`;
      const style = own?.style ?? valueOf(form, 'fillStyle') ?? 'relief';
      const plain = own === undefined || own.kind === 'sealed' || ORGANISERS.some((o) => o.kind === own.kind);
      choice.value = own === undefined ? '' : plain ? own.kind : `${own.kind}:${style}`;
    }
    shownFor = key;
  };
  return { draw };
}
