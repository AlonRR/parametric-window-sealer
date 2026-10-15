// The 3D tile's file (mesh-tiles, #40): the mesh the user chooses, read as its bytes in base64 into
// the hidden fillMeshFile field the library reads, which checks it and says what is wrong with it.
import { setValue } from './form-fields';
import type { FormPart } from './form-part';

export function meshTile(form: HTMLFormElement, changed: () => void): FormPart | null {
  const file = form.querySelector<HTMLInputElement>('[data-part="mesh-file"]');
  const name = form.querySelector<HTMLElement>('[data-testid="mesh-tile-name"]');
  if (!file || !name) return null;
  return {
    load() {
      file.addEventListener('change', () => {
        const chosen = file.files?.[0];
        if (chosen === undefined) return;
        name.textContent = `Reading ${chosen.name}…`;
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const url = typeof reader.result === 'string' ? reader.result : '';
          setValue(form, 'fillMeshFile', url.slice(url.indexOf(',') + 1)); // after "data:…;base64,"
          name.textContent = `Using ${chosen.name}.`;
          changed();
        });
        reader.readAsDataURL(chosen);
      });
    },
  };
}
