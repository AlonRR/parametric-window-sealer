// The patterns on the page (fill-registry, #96): the patterns in the fill's list, and each
// pattern's sizes under "Advanced: the pattern", made from the library's PATTERNS, so a new
// pattern needs nothing here. Each pattern's sizes show only while it is the fill chosen (C17).
import { PATTERNS } from 'parametric-window-sealer';
import type { Pattern } from 'parametric-window-sealer';
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

export function mountPatternControls(form: HTMLFormElement): void {
  form.querySelector('[data-part="pattern-list"]')?.replaceChildren(...PATTERNS.map((p) => option(p.kind, p.name)));
  form.querySelector('[data-part="pattern-sizes"]')?.replaceChildren(...PATTERNS.map(sizeControls));
}
