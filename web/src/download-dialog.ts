// The download dialog (backlog item download-zip, #7). Clicking Download opens it (Q45);
// the user chooses the format and the packaging (Q44, Q46): a zip is one option, not a
// default. Nothing is chosen the first time; after that the last choice is chosen again
// (Q47), remembered in the user's own browser only.

import { makeFiles } from 'parametric-window-sealer';
import type {
  DownloadChoice,
  DownloadFile,
  Engine,
  Format,
  Packaging,
  Params,
} from 'parametric-window-sealer';

export const STORAGE_KEY = 'parametric-window-sealer.download-choice.v1';
const FORMATS: readonly Format[] = ['stl', '3mf'];
const PACKAGINGS: readonly Packaging[] = ['separate', 'zip', 'single'];

// STL holds one object, so "one file holding every piece" exists only for 3MF.
export function isValidChoice(choice: DownloadChoice): boolean {
  return choice.packaging !== 'single' || choice.format === '3mf';
}

// What is stored may be anything: an older version, another page's data, a hand edit.
// Anything that is not a valid choice reads as "nothing remembered".
export function readStoredChoice(stored: string | null): DownloadChoice | null {
  if (stored === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { format, packaging } = value as Record<string, unknown>;
  if (!FORMATS.includes(format as Format) || !PACKAGINGS.includes(packaging as Packaging)) {
    return null;
  }
  const choice = { format: format as Format, packaging: packaging as Packaging };
  return isValidChoice(choice) ? choice : null;
}

// Browser storage can be missing or refuse (a private window, blocked site data); the
// dialog then works as on a first visit and simply does not remember.
function loadChoice(): DownloadChoice | null {
  try {
    return readStoredChoice(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveChoice(choice: DownloadChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Not remembered; nothing else depends on it.
  }
}

function saveFile(file: DownloadFile): void {
  const blob = new Blob([new Uint8Array(file.bytes)], { type: file.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DownloadHooks {
  openButton: HTMLButtonElement;
  dialog: HTMLDialogElement;
  getParams: () => Params | null;
  getEngine: () => Promise<Engine>;
}

export function mountDownload({ openButton, dialog, getParams, getEngine }: DownloadHooks): void {
  const form = dialog.querySelector('form');
  const go = dialog.querySelector<HTMLButtonElement>('[data-download-go]');
  const cancel = dialog.querySelector<HTMLButtonElement>('[data-download-cancel]');
  const status = dialog.querySelector<HTMLElement>('[data-download-status]');
  const single = dialog.querySelector<HTMLInputElement>('input[name="packaging"][value="single"]');
  if (!form || !go || !cancel || !status || !single) return;

  const radio = (name: 'format' | 'packaging', value: string) =>
    form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  const chosen = (name: 'format' | 'packaging') =>
    form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;

  const choice = (): DownloadChoice | null => {
    const format = chosen('format') as Format | undefined;
    const packaging = chosen('packaging') as Packaging | undefined;
    if (!format || !packaging) return null;
    const c = { format, packaging };
    return isValidChoice(c) ? c : null;
  };

  const sync = (): void => {
    single.disabled = chosen('format') === 'stl';
    if (single.disabled) single.checked = false;
    go.disabled = choice() === null;
  };

  openButton.addEventListener('click', () => {
    form.reset();
    const stored = loadChoice();
    if (stored) {
      const f = radio('format', stored.format);
      const p = radio('packaging', stored.packaging);
      if (f) f.checked = true;
      if (p) p.checked = true;
    }
    status.textContent = '';
    sync();
    dialog.showModal();
  });
  form.addEventListener('change', sync);
  cancel.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const params = getParams();
    const c = choice();
    if (!params || !c) return;
    go.disabled = true;
    status.textContent = 'Making the files...';
    void (async () => {
      try {
        const files = makeFiles(await getEngine(), params, c);
        saveChoice(c);
        dialog.close();
        for (const [i, file] of files.entries()) {
          if (i > 0) await pause(150); // one at a time, so the browser keeps up
          saveFile(file);
        }
      } catch (error) {
        status.textContent = `The files could not be made: ${String(error)}`;
      } finally {
        sync();
      }
    })();
  });
}
