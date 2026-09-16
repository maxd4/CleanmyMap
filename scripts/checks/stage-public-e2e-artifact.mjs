#!/usr/bin/env node

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("artifacts/ci-public-evidence");
rmSync(outputPath, { recursive: true, force: true });
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(outputPath, { recursive: true });

const safeSummary = {
  schemaVersion: 1,
  kind: "cleanmymap-public-e2e-evidence",
  workflow: "e2e-supabase-ephemeral",
  outcome: process.env.E2E_OUTCOME ?? "unknown",
  rawPlaywrightArtifactsPublished: false,
};

writeFileSync(
  resolve(outputPath, "summary.json"),
  `${JSON.stringify(safeSummary, null, 2)}\n`,
  "utf8",
);
console.log(`[public-e2e-artifact] staged ${resolve(outputPath, "summary.json")}`);
