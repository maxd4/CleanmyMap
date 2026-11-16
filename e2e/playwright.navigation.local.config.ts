import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const configDirectory = __dirname;
const repositoryRoot = path.resolve(configDirectory, "..");

export default defineConfig({
  testDir: configDirectory,
  fullyParallel: false,
  workers: 1,
  outputDir: path.join(repositoryRoot, "artifacts/playwright/navigation-local-results"),
  reporter: "line",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "local public",
      testMatch: /navigation-ribbon-variants\.test\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/dev/dev-with-fallback-port.mjs",
    cwd: repositoryRoot,
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DEV_HOST: "localhost",
      PORT: "3001",
      DEV_STRICT_PORT: "1",
      NEXT_PUBLIC_APP_URL: "http://localhost:3001",
      PLAYWRIGHT_BASE_URL: "http://localhost:3001",
      CMM_DISABLE_DEV_AUTH_BYPASS: "1",
    },
  },
});
