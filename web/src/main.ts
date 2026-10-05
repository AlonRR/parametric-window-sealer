// The page's entry point: the parameter panel, and the geometry engine started in the
// background with a check part the browser test reads. The preview and the download join
// them as the MVP items land (docs/backlog.md).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { mountDownload } from './download-dialog';
import { buildCheckPart, loadEngine } from './engine';
import { mountPanel } from './panel';
import type { Params } from './params';

async function start(status: HTMLElement): Promise<void> {
  try {
    const part = buildCheckPart(await loadEngine(wasmUrl));
    status.dataset.state = 'ready';
    status.dataset.volumeMm3 = String(Math.round(part.volumeMm3));
    status.textContent = 'Geometry engine ready.';
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = `The geometry engine could not start: ${String(error)}`;
  }
}

const form = document.querySelector<HTMLFormElement>('#params');
const plan = document.querySelector<HTMLElement>('#plan');
const openButton = document.querySelector<HTMLButtonElement>('#download-open');
const dialog = document.querySelector<HTMLDialogElement>('#download-dialog');
let current: Params | null = null;
if (form && plan) {
  mountPanel(form, plan, (params) => {
    current = params;
    if (openButton) openButton.disabled = params === null;
  });
}
if (openButton && dialog) {
  mountDownload({
    openButton,
    dialog,
    getParams: () => current,
    getEngine: () => loadEngine(wasmUrl),
  });
}

const status = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
if (status) void start(status);
