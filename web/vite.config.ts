import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The page builds the library from its source, so an edit there shows at once; the
  // published package is the built dist/ (packages/core, checked by its test:dist).
  resolve: {
    alias: {
      'parametric-window-sealer': fileURLToPath(
        new URL('../packages/core/src/index.ts', import.meta.url),
      ),
    },
  },
  // Relative asset URLs: the same build works under GitHub Pages' /<repo>/ path and,
  // later, opened from a file (backlog item offline-file).
  base: './',
  build: {
    outDir: 'out/site', // every generated file lives under out/ (CLAUDE.md, output layout)
    emptyOutDir: true,
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
