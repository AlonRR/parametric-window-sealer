// The form's fields (code-params-page, #95): every field the library names (FIELD_NAMES), read
// and written by name. Read by name rather than through FormData, which leaves out disabled
// controls: a disabled filler select still has a value the plan needs.
import { FIELD_NAMES } from 'parametric-window-sealer';
import type { FormValues } from 'parametric-window-sealer';

export type Control = HTMLInputElement | HTMLSelectElement | RadioNodeList;

// The control with this name, if the form has one: an input, a list, or a group of radios.
export function control(form: HTMLFormElement, name: string): Control | null {
  const item = form.elements.namedItem(name);
  const named = item instanceof HTMLInputElement || item instanceof HTMLSelectElement || item instanceof RadioNodeList;
  return named ? item : null;
}

// What a control holds: the radio chosen, the option chosen, or what is typed.
export const valueOf = (form: HTMLFormElement, name: string): string | undefined => control(form, name)?.value;

export function setValue(form: HTMLFormElement, name: string, value: string): void {
  const c = control(form, name);
  if (c) c.value = value;
}

// A checkbox is yes or no, as the library writes a place for the tape.
const isCheckbox = (c: Control | null): c is HTMLInputElement => c instanceof HTMLInputElement && c.type === 'checkbox';

export function readForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  for (const name of FIELD_NAMES) {
    const c = control(form, name);
    if (isCheckbox(c)) values[name] = c.checked ? 'yes' : 'no';
    else if (c) values[name] = c.value;
  }
  return values;
}

export function writeForm(form: HTMLFormElement, values: FormValues): void {
  for (const name of FIELD_NAMES) {
    const c = control(form, name);
    const v = values[name];
    if (isCheckbox(c)) c.checked = v === 'yes';
    else if (c && v !== undefined) c.value = v;
  }
}

// Each field's problem beside it (its data-testid="error-<field>"), and the field marked.
export function showErrors(form: HTMLFormElement, errors: Partial<Record<string, string>>): void {
  for (const name of FIELD_NAMES) {
    const message = errors[name];
    const c = control(form, name);
    if (c instanceof HTMLInputElement || c instanceof HTMLSelectElement) {
      if (message) c.setAttribute('aria-invalid', 'true');
      else c.removeAttribute('aria-invalid');
    }
    const box = form.querySelector(`[data-testid="error-${name}"]`);
    if (box) box.textContent = message ?? '';
  }
}

// An option for a list on the page.
export function option(value: string, text: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

// One list item for each line.
export const listItems = (lines: readonly string[]): HTMLLIElement[] =>
  lines.map((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    return li;
  });
