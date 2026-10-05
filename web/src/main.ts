// The page's entry point: the parameter panel, and the geometry engine started in the
// background with a check part the browser test reads. The preview and the download join
// them as the MVP items land (docs/backlog.md).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildCheckPart, loadEngine } from './engine';
import { mountPanel } from './panel';

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
if (form && plan) mountPanel(form, plan);

const status = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
if (status) void start(status);
