const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e/tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8510",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "python -m streamlit run app.py --server.port 8510 --server.headless true --server.fileWatcherType none",
    url: "http://127.0.0.1:8510",
    timeout: 120_000,
    reuseExistingServer: true,
  },
});

