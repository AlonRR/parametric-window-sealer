import { defineConfig } from 'vitest/config';

export default defineConfig({
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
