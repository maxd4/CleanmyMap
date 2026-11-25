#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("artifacts/ci-public-evidence");
rmSync(outputPath, { recursive: true, force: true });
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(outputPath, { recursive: true });

let timingSummary = null;
const timingPath = resolve("artifacts/ci/e2e-timing-summary.json");
if (existsSync(timingPath)) {
  try {
    const parsed = JSON.parse(readFileSync(timingPath, "utf8"));
    timingSummary = {
      count: parsed.count ?? 0,
      totalDurationMs: parsed.totalDurationMs ?? 0,
      slowest: Array.isArray(parsed.slowest) ? parsed.slowest : [],
      regressions: Array.isArray(parsed.regressions) ? parsed.regressions : [],
    };
  } catch {
    timingSummary = null;
  }
}

const safeSummary = {
  schemaVersion: 1,
  kind: "cleanmymap-public-e2e-evidence",
  workflow: "e2e-supabase-ephemeral",
  outcome: process.env.E2E_OUTCOME ?? "unknown",
  ...(process.env.SPOGOMI_OUTCOME ? { spogomiOutcome: process.env.SPOGOMI_OUTCOME } : {}),
  ...(process.env.E2E_SELECTION_REASON ? { selectionReason: process.env.E2E_SELECTION_REASON } : {}),
  ...(process.env.E2E_PLAYWRIGHT_PROJECTS ? { playwrightProjects: process.env.E2E_PLAYWRIGHT_PROJECTS } : {}),
  ...(timingSummary ? { timingSummary } : {}),
  rawPlaywrightArtifactsPublished: false,
};

writeFileSync(
  resolve(outputPath, "summary.json"),
  `${JSON.stringify(safeSummary, null, 2)}\n`,
  "utf8",
);
console.log(`[public-e2e-artifact] staged ${resolve(outputPath, "summary.json")}`);
