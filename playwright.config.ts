import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

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
      name: "local public",
      testMatch:
        /(?:smoke-public|public-first-campaign|public-interactions-campaign-3a|public-locale-explorer-campaign-3a1|public-campaign-3b|security-boundaries)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "local authenticated",
      testMatch: /route-campaign-3c\.spec\.ts/,
      dependencies: ["global setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: /public-first-campaign\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "homepage chromium",
      testMatch: /homepage-reveal\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "homepage webkit",
      testMatch: /homepage-reveal\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "authenticated campaign",
      testMatch: /authenticated-campaign\.spec\.ts/,
      dependencies: ["global setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "messagerie authenticated",
      testMatch: /messagerie-information-architecture\.spec\.ts/,
      dependencies: ["global setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "artifacts/playwright/clerk/user.json",
      },
    },
    {
      name: "action sharing",
      testMatch: /action-sharing\.spec\.ts/,
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
      name: "public interactions campaign 3a",
      testMatch: /public-interactions-campaign-3a\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public locale explorer campaign 3a1",
      testMatch: /public-locale-explorer-campaign-3a1\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public campaign 3b",
      testMatch: /public-campaign-3b\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "route campaign 3c",
      testMatch: /route-campaign-3c\.spec\.ts/,
      dependencies: ["global setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "global teardown",
      testMatch: /global\.teardown\.ts/,
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
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
