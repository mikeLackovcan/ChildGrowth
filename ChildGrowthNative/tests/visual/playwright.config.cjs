const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: '.', testMatch: '*.spec.cjs', timeout: 120000, workers: 1, retries: 0,
  snapshotPathTemplate: '{testDir}/baselines/{testFilePath}/{testName}/{arg}{ext}',
  outputDir: 'artifacts', reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  use: { baseURL: process.env.QB_VISUAL_URL || 'http://127.0.0.1:8083', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
  expect: { timeout: 15000, toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: 'disabled' } },
});
