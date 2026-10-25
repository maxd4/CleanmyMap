#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inventorySqlProofs } from "../ci/run-supabase-sql-proof.mjs";

const outputPath = resolve("artifacts/ci-public-evidence");
const sqlEvidenceSource = resolve("artifacts/ci/supabase-sql-evidence.json");
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
mkdirSync(resolve(outputPath, "evidence"), { recursive: true });
if (existsSync(sqlEvidenceSource)) {
  copyFileSync(sqlEvidenceSource, resolve(outputPath, "evidence/supabase-sql.json"));
} else {
  const inventory = inventorySqlProofs();
  const records = [
    ...inventory.pgtap,
    ...inventory.contracts,
    ...inventory.multisession,
    ...inventory.unregistered,
  ].map((path) => ({
    path,
    status: inventory.unregistered.includes(path) ? "DB_SEMANTICS_NOT_EXECUTED" : "NOT_RUN",
    outcome: "NOT_RUN",
    reason: "The ephemeral Supabase proof runner was not reached.",
  }));
  writeFileSync(
    resolve(outputPath, "evidence/supabase-sql.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      kind: "cleanmymap-supabase-sql-evidence",
      candidateSha: process.env.CMM_SUPABASE_CANDIDATE_SHA ?? "unknown",
      outcome: "NOT_RUN",
      records,
      reason: "The ephemeral Supabase proof runner was not reached.",
    }, null, 2)}\n`,
    "utf8",
  );
}
console.log(`[public-e2e-artifact] staged ${resolve(outputPath, "summary.json")}`);
