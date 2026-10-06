// What passes through the wall, on the page: the hose ports (hose-port, #12) and the measured
// cutout (measured-cutout, #23). Their controls are not fields of their own: they are written
// into the hidden ports and cutouts fields as the command's --port and --cutout take them (Q114,
// C44), so the library checks them all. Each box shows only for its answer to "What is in the
// window?" (data-show-when in the page).
import type { FieldErrors } from 'parametric-window-sealer';
import { setValue, valueOf } from './form-fields';
import type { FormPart } from './form-part';

type PartControl = HTMLInputElement | HTMLSelectElement;
const part = (box: ParentNode, name: string): PartControl | null =>
  box.querySelector<PartControl>(`[data-part="${name}"]`);
const read = (box: ParentNode, name: string): string => part(box, name)?.value.trim() ?? '';
const WHOLE = /^[1-9][0-9]*$/;

// A piece given by column and row: both or neither, each a whole number from 1.
function pieceProblem(column: string, row: string, label: string): string | undefined {
  if ((column === '') !== (row === '')) return `${label}: give both its column and its row.`;
  if ([column, row].some((v) => v !== '' && !WHOLE.test(v))) {
    return `${label}: the column and the row are whole numbers from 1.`;
  }
  return undefined;
}

// A box's piece starts where the plan put it (Q105, C47), shown once it is placed.
function showPlacedPiece(box: ParentNode, placed: { column: number; row: number } | undefined): void {
  const [column, row] = [part(box, 'column'), part(box, 'row')];
  if (!placed || !column || !row || column.value !== '' || row.value !== '') return;
  column.value = String(placed.column);
  row.value = String(placed.row);
}

const portRows = (form: HTMLFormElement): HTMLElement[] => [...form.querySelectorAll<HTMLElement>('[data-port]')];

// The ports as text, and the page's own word for what it can tell before the library: what is
// missing, in plainer terms than the --port form. A problem always leaves text the library
// refuses, so nothing is planned from it.
function portsText(form: HTMLFormElement): { text: string; problem?: string } {
  if (valueOf(form, 'appliance') !== 'hose') return { text: '' };
  const words: string[] = [];
  let problem: string | undefined;
  portRows(form).forEach((row, i) => {
    const label = `Port ${i + 1}`;
    const size = read(row, read(row, 'size') === 'own' ? 'own' : 'size');
    const [column, rowNumber] = [read(row, 'column'), read(row, 'row')];
    if (size === '') problem ??= `${label}: enter the hose end's outside diameter in mm.`;
    if (i > 0 && (column === '' || rowNumber === '')) problem ??= `${label}: choose its piece: column and row.`;
    problem ??= pieceProblem(column, rowNumber, label);
    const placed = i === 0 && column === '' && rowNumber === '' ? size : `${size}@${column},${rowNumber}`;
    words.push(size === '' ? '@' : placed);
  });
  const text = words.join(' ');
  return problem === undefined ? { text } : { text, problem };
}

// A row for another port, from the main port's controls, without their notes.
function newPortRow(first: HTMLElement): HTMLElement | null {
  const row = first.cloneNode(true);
  if (!(row instanceof HTMLElement)) return null;
  for (const note of row.querySelectorAll('.note')) note.remove();
  for (const name of ['own', 'column', 'row']) {
    const c = part(row, name);
    if (c) c.value = '';
  }
  const size = part(row, 'size');
  if (size) size.value = first.querySelector<HTMLSelectElement>('[data-part="size"] option')?.value ?? '';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.dataset.part = 'remove';
  row.append(remove);
  return row;
}

function numberPortRows(form: HTMLFormElement): void {
  portRows(form).forEach((row, i) => {
    row.dataset.port = String(i + 1);
    if (i > 0) row.dataset.testid = `extra-port-${i + 1}`;
  });
}

// The main form's port and any added under Advanced (Q111, Q113).
export function hosePorts(form: HTMLFormElement, changed: () => void): FormPart {
  const extras = form.querySelector<HTMLElement>('[data-testid="extra-ports"]');
  const first = form.querySelector<HTMLElement>('[data-port="1"]');
  form.querySelector('#add-port')?.addEventListener('click', () => {
    const row = first ? newPortRow(first) : null;
    if (!row || !extras) return;
    extras.append(row);
    numberPortRows(form);
    changed();
  });
  extras?.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('[data-part="remove"]') : null;
    if (!button) return;
    button.closest('[data-port]')?.remove();
    numberPortRows(form);
    changed();
  });
  return {
    sync(): FieldErrors {
      // A row's own size shows when "Your own measurement" is chosen in that row.
      for (const row of portRows(form)) {
        const own = row.querySelector<HTMLElement>('[data-part="own-label"]');
        if (own) own.hidden = read(row, 'size') !== 'own';
      }
      const ports = portsText(form);
      setValue(form, 'ports', ports.text);
      return ports.problem === undefined ? {} : { ports: ports.problem };
    },
    placed(params) {
      const main = portRows(form)[0];
      if (main) showPlacedPiece(main, params.ports[0]);
    },
  };
}

// The measured cutout: one on the page (C45), its piece as the port's (C47).
export function measuredCutout(form: HTMLFormElement): FormPart | null {
  const box = form.querySelector<HTMLElement>('[data-testid="cutout"]');
  if (!box) return null;
  const text = (): { text: string; problem?: string } => {
    if (valueOf(form, 'appliance') !== 'cutout') return { text: '' };
    const [width, height] = [read(box, 'cutout-width'), read(box, 'cutout-height')];
    const [column, row] = [read(box, 'column'), read(box, 'row')];
    const problem =
      width === '' || height === ''
        ? 'Cutout: enter the appliance’s width and height in mm.'
        : pieceProblem(column, row, 'Cutout');
    if (problem !== undefined) return { text: '@', problem };
    const size = `${width}x${height}`;
    return { text: column === '' ? size : `${size}@${column},${row}` };
  };
  return {
    sync(): FieldErrors {
      const cutouts = text();
      setValue(form, 'cutouts', cutouts.text);
      return cutouts.problem === undefined ? {} : { cutouts: cutouts.problem };
    },
    placed(params) {
      showPlacedPiece(box, params.cutouts[0]);
    },
  };
}
