// The seal's size (Q121): the listed tape sizes, or the user's own. A listed size is written into
// the width and thickness fields, and read back from them; the user's own shows those two fields
// (data-show-when="tapeSize=own" in the page).
import { TAPE_SIZES } from 'parametric-window-sealer';
import { option, setValue, valueOf } from './form-fields';
import type { FormPart } from './form-part';

const sizeOf = (widthMm: string | number, thicknessMm: string | number) => `${widthMm}x${thicknessMm}`;

export function tapeSize(form: HTMLFormElement): FormPart | null {
  const choice = form.querySelector<HTMLSelectElement>('[data-part="tape-size"]');
  if (!choice) return null;
  choice.replaceChildren(
    ...TAPE_SIZES.map((t) => option(sizeOf(t.widthMm, t.thicknessMm), `${t.widthMm} × ${t.thicknessMm} mm`)),
    option('own', 'Your own size'),
  );
  return {
    load() {
      const size = sizeOf(valueOf(form, 'tapeWidthMm') ?? '', valueOf(form, 'tapeThicknessMm') ?? '');
      choice.value = TAPE_SIZES.some((t) => sizeOf(t.widthMm, t.thicknessMm) === size) ? size : 'own';
    },
    sync() {
      const listed = TAPE_SIZES.find((t) => sizeOf(t.widthMm, t.thicknessMm) === choice.value);
      if (listed) {
        setValue(form, 'tapeWidthMm', String(listed.widthMm));
        setValue(form, 'tapeThicknessMm', String(listed.thicknessMm));
      }
      return {};
    },
  };
}
