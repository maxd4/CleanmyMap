#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const smokeUrl = process.env.DEPLOY_SMOKE_URL?.trim();
if (!smokeUrl) {
  console.log("CONTROL_STATUS: BLOCKED_ENVIRONMENT");
  console.error("DEPLOY_SMOKE_URL is required when the deploy scope includes API or Vercel surface changes.");
  process.exitCode = 0;
} else {
  const result = spawnSync(process.execPath, ["apps/web/scripts/smoke-tests.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_PUBLIC_APP_URL: smokeUrl },
    stdio: "inherit",
    windowsHide: true,
  });
  process.exitCode = result.error ? 1 : (result.status ?? 1);
}
