// "Your printer" (Q115): the default, the listed printers grouped by maker, and a custom size.
// A listed printer's option is model:<id>; the choice is written into the hidden printer and
// printerModel fields, and read back from them.
import { DEFAULT_MAX_PIECE, PRINTERS } from 'parametric-window-sealer';
import { option, setValue, valueOf } from './form-fields';
import type { FormPart } from './form-part';

function fillPrinters(choice: HTMLSelectElement): void {
  choice.replaceChildren(
    option('default', `Not listed: ${DEFAULT_MAX_PIECE.widthMm} × ${DEFAULT_MAX_PIECE.heightMm} mm`),
  );
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const p of PRINTERS) {
    let group = groups.get(p.maker);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = p.maker;
      groups.set(p.maker, group);
      choice.append(group);
    }
    group.append(option(`model:${p.id}`, `${p.model} (bed ${p.bedXMm} × ${p.bedYMm} mm)`));
  }
  choice.append(option('custom', 'Custom size'));
}

export function printerChoice(form: HTMLFormElement): FormPart | null {
  const choice = form.querySelector<HTMLSelectElement>('[data-part="printer-choice"]');
  if (!choice) return null;
  fillPrinters(choice);
  return {
    load() {
      const kind = valueOf(form, 'printer');
      choice.value = kind === 'model' ? `model:${valueOf(form, 'printerModel') ?? ''}` : (kind ?? 'default');
    },
    sync() {
      const listed = choice.value.startsWith('model:');
      setValue(form, 'printer', listed ? 'model' : choice.value);
      setValue(form, 'printerModel', listed ? choice.value.slice('model:'.length) : '');
      return {};
    },
  };
}
