import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The tests run against the library's source, as the page does (web/vite.config.ts), so the
// two cannot drift apart; scripts/check-dist.mjs runs the built server on the built library.
export default defineConfig({
  resolve: {
    alias: {
      'parametric-window-sealer': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
