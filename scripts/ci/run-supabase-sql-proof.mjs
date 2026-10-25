#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidencePath = resolve(repositoryRoot, "artifacts/ci/supabase-sql-evidence.json");
const logDirectory = resolve(repositoryRoot, "artifacts/ci/supabase-sql");
const pgtapDirectory = "apps/web/supabase/tests";
const applicationContractDirectory = "apps/web/supabase/tests";
const e2eContractDirectory = "e2e";

const CONTRACT_MARKERS = new Map([
  ["apps/web/supabase/tests/action-role-attestation-correction.sql", "EXECUTED_DB_CONTRACT: Action role attestation correction contract passed"],
  ["apps/web/supabase/tests/reports-persistent-contract.sql", "EXECUTED_DB_CONTRACT: Reports persistence, RLS, snapshots, quota, PDF artifacts, shares, publications and action_media contract passed"],
  ["apps/web/supabase/tests/spogomi-mixed-division-smoke.sql", "EXECUTED_DB_CONTRACT: SPOGOMI mixed-division closure and replay contract passed"],
  ["apps/web/supabase/tests/spogomi-transactional-contract.sql", "EXECUTED_DB_CONTRACT: SPOGOMI RLS, lock triggers and atomic A-B-A consolidation contract passed"],
  ["e2e/profile-security.sql", "EXECUTED_DB_CONTRACT: SECURITY-01 profile and notification boundary contract passed"],
  ["e2e/security-02-projection-revocation.sql", "EXECUTED_DB_CONTRACT: SECURITY-02 projection revocation contract passed"],
  ["e2e/security-03-bug-report.sql", "EXECUTED_DB_CONTRACT: SECURITY-03 bug-report boundary contract passed"],
  ["e2e/supabase-admission-requests.sql", "EXECUTED_DB_CONTRACT: SPOGOMI admission request contract passed"],
  ["e2e/supabase-advisory-hardening.sql", "EXECUTED_DB_CONTRACT: Supabase advisory hardening contract passed"],
]);

const MULTISESSION_PROOFS = new Map([
  ["e2e/action-role-attestation-concurrency.mjs", /Role attestation concurrent correction contract passed\./],
  ["e2e/reports-postgres-concurrency.mjs", /EXECUTED_DB_CONTRACT: Reports quota and PDF artifact two-session concurrency contract passed\./],
  ["e2e/security-02-two-sessions.mjs", /SECURITY-02 two-session PostgreSQL contract passed\./],
  ["e2e/spogomi-concurrency.mjs", /EXECUTED_DB_CONTRACT: SPOGOMI composition, lock, GPX, certificate, consolidation and closure republication safety passed\./],
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

export function inventorySqlProofs(root = repositoryRoot) {
  const pgtapFiles = readdirSync(resolve(root, pgtapDirectory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pgtap.sql"))
    .map((entry) => normalizePath(`${pgtapDirectory}/${entry.name}`))
    .sort();
  const applicationContracts = listFilesFromRoot(root, applicationContractDirectory, ".sql")
    .filter((filePath) => !filePath.endsWith(".pgtap.sql"));
  const e2eContracts = listFilesFromRoot(root, e2eContractDirectory, ".sql");
  const multisession = listFilesFromRoot(root, e2eContractDirectory, ".mjs")
    .filter((filePath) => filePath.endsWith("-concurrency.mjs") || filePath.endsWith("security-02-two-sessions.mjs"));

  const unregistered = [
    ...applicationContracts,
    ...e2eContracts,
  ].filter((filePath) => !CONTRACT_MARKERS.has(filePath));
  const unregisteredMultisession = multisession.filter((filePath) => !MULTISESSION_PROOFS.has(filePath));

  return {
    pgtap: pgtapFiles,
    contracts: [...applicationContracts, ...e2eContracts].sort(),
    multisession,
    unregistered: [...unregistered, ...unregisteredMultisession].sort(),
  };
}

function listFilesFromRoot(root, relativeDirectory, extension) {
  return readdirSync(resolve(root, relativeDirectory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => normalizePath(`${relativeDirectory}/${entry.name}`))
    .sort();
}

export function extractPlan(sql) {
  const match = sql.match(/\bselect\s+plan\(\s*(\d+)\s*\)/i);
  return match ? Number(match[1]) : null;
}

export function parsePgTapOutput(output, expectedPlan) {
  const planMatch = output.match(/(?:^|\n)\s*1\.\.(\d+)\s*(?:\n|$)/m);
  const assertions = [...output.matchAll(/(?:^|\n)\s*(ok|not ok)\s+\d+\b[^\n]*/gi)].map((match) => match[1].toLowerCase());
  const failures = assertions.filter((assertion) => assertion === "not ok").length;
  const passed = assertions.filter((assertion) => assertion === "ok").length;
  const actualPlan = planMatch ? Number(planMatch[1]) : null;
  if (expectedPlan === null) throw new Error("pgTAP source has no explicit plan() assertion");
  if (actualPlan !== expectedPlan) throw new Error(`pgTAP output plan mismatch: expected ${expectedPlan}, received ${actualPlan ?? "missing"}`);
  if (failures > 0) throw new Error(`pgTAP output contains ${failures} failing assertion(s)`);
  if (passed !== expectedPlan) throw new Error(`pgTAP output is incomplete: expected ${expectedPlan} passing assertions, received ${passed}`);
  return { expectedPlan, actualPlan, passed, failures };
}

export function validateSqlContractMarkerPlacement(sql, marker) {
  const markerPosition = sql.indexOf(marker);
  const lastAssertionPosition = Math.max(
    sql.toLowerCase().lastIndexOf("raise exception"),
    sql.toLowerCase().lastIndexOf("assert"),
  );
  if (markerPosition < 0) throw new Error("SQL contract completion marker is absent from the source");
  if (markerPosition < lastAssertionPosition) throw new Error("SQL contract completion marker precedes a later assertion");
  return true;
}

function commandName() {
  return process.platform === "win32" ? resolve(repositoryRoot, "node_modules/.bin/supabase.cmd") : resolve(repositoryRoot, "node_modules/.bin/supabase");
}

function runCommand(command, args, { logName, env = process.env } = {}) {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(command, args, { cwd: repositoryRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectResult);
    child.on("close", (code, signal) => {
      const output = `${stdout}${stderr}`;
      mkdirSync(logDirectory, { recursive: true });
      writeFileSync(resolve(logDirectory, `${logName}.log`), output, "utf8");
      resolveResult({ code: code ?? 1, signal, stdout, stderr, output });
    });
  });
}

function candidateSha(explicitSha) {
  const sha = String(explicitSha ?? process.env.CMM_SUPABASE_CANDIDATE_SHA ?? "").trim() || execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`Invalid candidate SHA: ${sha}`);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (head.toLowerCase() !== sha.toLowerCase()) throw new Error(`Candidate SHA ${sha} does not match checked-out HEAD ${head}`);
  return sha;
}

function baseRecord(path, category) {
  return { path, category, status: "NOT_RUN", outcome: "NOT_RUN" };
}

async function runProof(record, command, args, validate) {
  let result;
  try {
    result = await runCommand(command, args, { logName: record.path.replaceAll("/", "__").replaceAll(".", "_") });
  } catch (error) {
    record.status = "DB_SEMANTICS_NOT_EXECUTED";
    record.outcome = "FAIL";
    record.reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${record.path}: ${record.reason}`);
  }
  if (result.code !== 0) {
    record.status = "INTEGRATION_PROOF";
    record.outcome = "FAIL";
    record.reason = `command exited with ${result.code}${result.signal ? ` (${result.signal})` : ""}`;
    throw new Error(`${record.path}: ${record.reason}`);
  }
  try {
    const details = validate(result.output);
    record.status = "INTEGRATION_PROOF";
    record.outcome = "PASS";
    record.details = details;
  } catch (error) {
    record.status = "INTEGRATION_PROOF";
    record.outcome = "FAIL";
    record.reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${record.path}: ${record.reason}`);
  }
}

function writeReport(report) {
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function runSupabaseSqlProof({ sha, run = true } = {}) {
  const candidate = candidateSha(sha);
  const inventory = inventorySqlProofs();
  const records = [
    ...inventory.pgtap.map((path) => baseRecord(path, "PGTAP")),
    ...inventory.contracts.map((path) => baseRecord(path, "SQL_CONTRACT")),
    ...inventory.multisession.map((path) => baseRecord(path, "MULTISESSION")),
  ];
  for (const path of inventory.unregistered) {
    records.push({ path, category: "UNREGISTERED_SQL_PROOF", status: "DB_SEMANTICS_NOT_EXECUTED", outcome: "NOT_RUN", reason: "No canonical runner protocol is registered for this SQL proof." });
  }

  const report = {
    schemaVersion: 1,
    kind: "cleanmymap-supabase-sql-evidence",
    candidateSha: candidate,
    headSha: candidate,
    provenance: "COMMITTED_SNAPSHOT",
    workflow: "e2e-supabase-ephemeral",
    outcome: "NOT_RUN",
    records,
  };
  if (!run) {
    writeReport(report);
    return report;
  }
  if (inventory.unregistered.length > 0) {
    report.outcome = "FAIL";
    writeReport(report);
    throw new Error(`Unregistered SQL proof files: ${inventory.unregistered.join(", ")}`);
  }

  try {
    for (const record of records) {
      if (record.category === "PGTAP") {
        const sql = readFileSync(resolve(repositoryRoot, record.path), "utf8");
        const expectedPlan = extractPlan(sql);
        record.expectedAssertions = expectedPlan;
        await runProof(record, commandName(), ["test", "db", "--workdir", "apps/web", "--local", `supabase/tests/${record.path.split("/").at(-1)}`], (output) => parsePgTapOutput(output, expectedPlan));
      } else if (record.category === "SQL_CONTRACT") {
        const sql = readFileSync(resolve(repositoryRoot, record.path), "utf8");
        const marker = CONTRACT_MARKERS.get(record.path);
        record.expectedMarker = marker;
        try {
          validateSqlContractMarkerPlacement(sql, marker);
        } catch (error) {
          record.status = "DB_SEMANTICS_NOT_EXECUTED";
          record.outcome = "FAIL";
          record.reason = error instanceof Error ? error.message : String(error);
          throw new Error(`${record.path}: ${record.reason}`);
        }
        await runProof(record, commandName(), ["db", "query", "--workdir", "apps/web", "--local", sql], (output) => {
          if (!output.includes(marker)) throw new Error("completion marker is absent from the PostgreSQL output");
          return { marker };
        });
      } else if (record.category === "MULTISESSION") {
        const expectedOutput = MULTISESSION_PROOFS.get(record.path);
        await runProof(record, process.execPath, [record.path], (output) => {
          if (!expectedOutput.test(output)) throw new Error("completion marker is absent from the multi-session output");
          return { marker: expectedOutput.source };
        });
      }
    }
    report.outcome = "PASS";
  } catch (error) {
    report.outcome = "FAIL";
    const failedPath = error instanceof Error ? error.message.split(": ")[0] : "unknown";
    for (const record of records) {
      if (record.status === "NOT_RUN") record.reason = `not reached after failure in ${failedPath}`;
    }
    writeReport(report);
    throw error;
  }
  writeReport(report);
  return report;
}

async function main() {
  try {
    const report = await runSupabaseSqlProof();
    console.log(`SUPABASE_SQL_EVIDENCE: ${report.outcome} candidate=${report.candidateSha} records=${report.records.length}`);
  } catch (error) {
    console.error(`SUPABASE_SQL_EVIDENCE: FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
