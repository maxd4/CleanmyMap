import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: "artifacts/playwright/results",
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "artifacts/playwright/report" }]]
    : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "global setup",
      testMatch: /global\.setup\.ts/,
      teardown: "global teardown",
    },
    {
      name: "chromium",
      testMatch: /public-first-campaign\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated campaign",
      testMatch: /authenticated-campaign\.spec\.ts/,
      dependencies: ["global setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "signalement campaign 2",
      testMatch: /signalement-campaign-2\.spec\.ts/,
      dependencies: ["global setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "global teardown",
      testMatch: /global\.teardown\.ts/,
    },
  ],
  webServer: {
    command: "node scripts/dev/dev-with-fallback-port.mjs",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DEV_HOST: process.env.DEV_HOST ?? "127.0.0.1",
      DEV_STRICT_PORT: process.env.DEV_STRICT_PORT ?? "1",
      CMM_DISABLE_DEV_AUTH_BYPASS: "1",
    },
  },
});
