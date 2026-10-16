// The patterns on the page (fill-registry, #96): the patterns in the fill's list, and each
// pattern's sizes under "Advanced: the pattern", made from the library's PATTERNS, so a new
// pattern needs nothing here. Each pattern's sizes show only while it is the fill chosen, as the
// others would only crowd it. The organisers' boards follow them in the list, each with a note,
// from the library's offered organisers: a hidden one is left out.
import { OFFERED_ORGANISERS, PATTERNS } from 'parametric-window-sealer';
import type { OrganiserDefinition, Pattern } from 'parametric-window-sealer';
import { option } from './form-fields';

function sizeControls(pattern: Pattern): HTMLDivElement {
  const box = document.createElement('div');
  box.dataset.showWhen = `fill=${pattern.kind}`;
  box.hidden = true;
  for (const size of pattern.sizes) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.name = size.field;
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    label.append(`${size.label} `, input);
    box.append(label);
    if (size.note !== undefined) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = size.note;
      box.append(note);
    }
    const error = document.createElement('span');
    error.className = 'error';
    error.dataset.testid = `error-${size.field}`;
    box.append(error);
  }
  return box;
}

function organiserNote(organiser: OrganiserDefinition): HTMLParagraphElement {
  const note = document.createElement('p');
  note.className = 'note';
  note.dataset.showWhen = `fill=${organiser.kind}`;
  note.hidden = true;
  note.textContent =
    `For ${organiser.accessories}: a board ${organiser.boardMm} mm thick, raised on the room side inside each ` +
    'piece’s border where the pieces are thinner. Its openings go through the wall, so air passes.';
  return note;
}

export function mountPatternControls(form: HTMLFormElement): void {
  form.querySelector('[data-part="pattern-list"]')?.replaceChildren(...PATTERNS.map((p) => option(p.kind, p.name)));
  form.querySelector('[data-part="pattern-sizes"]')?.replaceChildren(...PATTERNS.map(sizeControls));
  form
    .querySelector('[data-part="organiser-list"]')
    ?.replaceChildren(...OFFERED_ORGANISERS.map((o) => option(o.kind, o.name)));
  form.querySelector('[data-part="organiser-notes"]')?.replaceChildren(...OFFERED_ORGANISERS.map(organiserNote));
  // A pattern's style shows for the patterns only: an organiser's board is always cut through.
  const style = form.querySelector<HTMLElement>('[data-part="pattern-style"]');
  if (style) style.dataset.showWhen = `fill=${PATTERNS.map((p) => p.kind).join('|')}`;
}
