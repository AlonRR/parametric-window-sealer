// The page's entry point. For now it starts the engine and reports a check part, which
// the browser test reads; the parameter panel and the preview replace this as the MVP
// items land (docs/backlog.md).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildCheckPart, loadEngine } from './engine';

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

const status = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
if (status) void start(status);
