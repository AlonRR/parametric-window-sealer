// Q49 spike: one build per page, so each page's download is measured on its own, under
// out/<page>/. PAGE is three, babylon or model-viewer.
import { defineConfig } from 'vite';

const page = process.env.PAGE;
const pages = {
  three: { root: '.', input: 'three.html' },
  babylon: { root: '.', input: 'babylon.html' },
  'model-viewer': { root: 'model-viewer', input: 'model-viewer/index.html' },
};
if (!pages[page]) throw new Error(`PAGE must be one of ${Object.keys(pages).join(', ')}`);

export default defineConfig({
  root: pages[page].root,
  base: './',
  publicDir: new URL('./public', import.meta.url).pathname,
  logLevel: 'warn',
  build: {
    outDir: new URL(`./out/${page}`, import.meta.url).pathname,
    emptyOutDir: true,
    rollupOptions: { input: new URL(pages[page].input, import.meta.url).pathname },
  },
});
