import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The offline file (backlog item offline-file, #25; Q24), chosen without asking (Q144;
// docs/choices.md): the page as one HTML file with its script, styles and geometry engine inside
// (C54), built beside the site so the page can offer it (C55), as window-sealer.html (C56).
export const OFFLINE_FILE = 'window-sealer.html';

// After the bundle is made: the entry script and any stylesheet go into the HTML, and the HTML
// is written under the offline file's name. The engine is already inside the script, as a data
// URL (assetsInlineLimit below), so the file needs nothing beside it.
function oneFile(name: string): Plugin {
  const inline = (text: string, tag: 'script' | 'style') => text.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
  return {
    name: 'window-sealer-one-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const page = bundle['index.html'];
      if (page === undefined || page.type !== 'asset') throw new Error('The offline build has no index.html');
      let html = String(page.source);
      for (const [fileName, item] of Object.entries(bundle)) {
        const at = new RegExp(`<(script|link)\\b[^>]*(?:src|href)="\\./${fileName.replace(/[.$]/g, '\\$&')}"[^>]*>(?:</script>)?`);
        if (!at.test(html)) continue;
        const code = item.type === 'chunk' ? item.code : String(item.source);
        const tag = fileName.endsWith('.css') ? `<style>${inline(code, 'style')}</style>` : `<script type="module">${inline(code, 'script')}</script>`;
        html = html.replace(at, () => tag);
        delete bundle[fileName];
      }
      const left = Object.keys(bundle).filter((f) => f !== 'index.html');
      if (left.length > 0) throw new Error(`The offline file would need files beside it: ${left.join(', ')}`);
      delete bundle['index.html'];
      this.emitFile({ type: 'asset', fileName: name, source: html });
    },
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    // The page builds the library from its source, so an edit there shows at once; the
    // published package is the built dist/ (packages/core, checked by its test:dist).
    resolve: {
      alias: {
        'parametric-window-sealer': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url)),
      },
    },
    // Relative asset URLs: the same build works under GitHub Pages' /<repo>/ path.
    base: './',
    build: offline
      ? {
          outDir: 'out/site', // beside the site it is offered from; the site's build empties it first
          emptyOutDir: false,
          assetsInlineLimit: () => true, // the engine's .wasm too, as a data URL
          rolldownOptions: { output: { codeSplitting: false } }, // one script
        }
      : {
          outDir: 'out/site', // every generated file lives under out/ (CLAUDE.md, output layout)
          emptyOutDir: true,
        },
    plugins: offline ? [oneFile(OFFLINE_FILE)] : [],
    test: {
      include: ['test/**/*.test.ts'],
      environment: 'node',
    },
  };
});
