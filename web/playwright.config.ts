// The browser test (Q35): the BUILT page, served by `vite preview`, opened in Chromium.
import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'out/playwright',
  reporter: 'list',
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'chromium',
      testIgnore: /no-webgl/,
      use: {
        ...devices['Desktop Chrome'],
        // CI downloads the Chromium build this Playwright version expects. A machine that
        // already has one elsewhere can point at it instead of downloading.
        launchOptions: {
          executablePath: process.env.PW_CHROMIUM_PATH || undefined,
          // Headless Chromium has no graphics card; these let it draw WebGL in software
          // (SwiftShader), so the 3D preview can be tested.
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
    {
      // The same browser with 3D switched off, for the page's fallback (preview-3d, #9).
      name: 'no-webgl',
      testMatch: /no-webgl/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PW_CHROMIUM_PATH || undefined,
          args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'],
        },
      },
    },
  ],
  use: { baseURL: `http://127.0.0.1:${port}/` },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
  },
});
