// The page's entry point: the parameter panel, and the geometry engine started in the
// background with a check part the browser test reads. The preview and the download join
// them as the MVP items land (docs/backlog.md).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { mountDownload } from './download-dialog';
import { buildCheckPart, loadEngine } from 'parametric-window-sealer';
import { mountPanel } from './panel';
import { mountGuide } from './guide';
import type { Params } from 'parametric-window-sealer';
import { mountPreview } from './preview';

// The engine's .wasm: served beside the page, and found by its URL. The offline file (#25) leaves
// the engine to find its own, which the build has put inside the file as a data URL, so the file
// holds one copy (C54).
const engineUrl = import.meta.env.MODE === 'offline' ? undefined : wasmUrl;
const engine = () => loadEngine(engineUrl);

async function start(status: HTMLElement): Promise<void> {
  try {
    const part = buildCheckPart(await engine());
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
const previewBox = document.querySelector<HTMLElement>('#preview');
const preview = previewBox ? mountPreview(previewBox, engine) : null;
let current: Params | null = null;
if (form && plan) {
  mountPanel(form, plan, (params) => {
    current = params;
    if (openButton) openButton.disabled = params === null;
    preview?.show(params);
  });
}
if (form) mountGuide(form);
if (openButton && dialog) {
  mountDownload({
    openButton,
    dialog,
    getParams: () => current,
    getEngine: engine,
  });
}

// Opened from the disk, the page is already the offline file: it does not offer itself (C55).
if (location.protocol === 'file:') {
  for (const offer of document.querySelectorAll<HTMLElement>('[data-part="offline"]')) offer.hidden = true;
}

const status = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
if (status) void start(status);
