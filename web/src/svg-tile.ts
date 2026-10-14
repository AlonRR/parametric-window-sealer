// The SVG tile's file (svg-tile, #27): the drawing the user chooses, read as text into the
// hidden fillDrawing field the library reads, which checks it and says what is wrong with it.
// The page starts with the library's drawing, one round opening, until a file is chosen.
import { setValue } from './form-fields';
import type { FormPart } from './form-part';

export function svgTile(form: HTMLFormElement, changed: () => void): FormPart | null {
  const file = form.querySelector<HTMLInputElement>('[data-part="svg-file"]');
  const name = form.querySelector<HTMLElement>('[data-testid="svg-tile-name"]');
  if (!file || !name) return null;
  return {
    load() {
      file.addEventListener('change', () => {
        const chosen = file.files?.[0];
        if (chosen === undefined) return;
        void chosen.text().then((text) => {
          setValue(form, 'fillDrawing', text);
          name.textContent = `Using ${chosen.name}.`;
          changed();
        });
      });
    },
  };
}
