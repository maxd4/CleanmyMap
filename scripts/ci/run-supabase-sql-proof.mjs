#!/usr/bin/env node

import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatTimingMarkdown, loadTimingBaseline, summarizeTimings } from "./ci-timing-report.mjs";
import { gitExecutable, trustedCommandEnvironment } from "./git-executable.mjs";
import {
  WORKFLOW_STAGES,
  createEvidenceReport,
  finalizeWorkflowEvidence,
  initializeWorkflowEvidence,
  readExistingWorkflowStages,
  runCanonicalReset,
  stageRecord,
  verifyCanonicalSchemaSeed,
} from "./supabase-sql-proof-lifecycle.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidencePath = resolve(repositoryRoot, "artifacts/ci/supabase-sql-evidence.json");
const logDirectory = resolve(repositoryRoot, "artifacts/ci/supabase-sql");
const pgtapDirectory = "apps/web/supabase/tests";
const applicationContractDirectory = "apps/web/supabase/tests";
const e2eContractDirectory = "e2e";
const MAX_CAPTURED_PROCESS_BYTES = 1024 * 1024;
const DEFAULT_PROCESS_TIMEOUT_MS = 8 * 60 * 1000;

const CONTRACT_MARKERS = new Map([
  ["apps/web/supabase/tests/action-participant-individual-impact-optimistic-concurrency.sql", "EXECUTED_DB_CONTRACT: optimistic individual-impact revision, partial PATCH, authorization withdrawal and idempotent retry contract passed"],
  ["apps/web/supabase/tests/action-role-attestation-correction.sql", "EXECUTED_DB_CONTRACT: Action role attestation correction contract passed"],
  ["apps/web/supabase/tests/reports-persistent-contract.sql", "EXECUTED_DB_CONTRACT: Reports persistence, RLS, snapshots, quota, PDF artifacts, shares, publications and action_media contract passed"],
  ["apps/web/supabase/tests/spogomi-mixed-division-smoke.sql", "EXECUTED_DB_CONTRACT: SPOGOMI mixed-division closure and replay contract passed"],
  ["apps/web/supabase/tests/spogomi-referee-qualification.sql", "EXECUTED_DB_CONTRACT: SPOGOMI referee quiz evaluation and versioned requalification contract passed"],
  ["apps/web/supabase/tests/spogomi-registration-quiz.sql", "EXECUTED_DB_CONTRACT: SPOGOMI registration quiz proof and admission gate passed"],
  ["apps/web/supabase/tests/spogomi-team-referees.sql", "EXECUTED_DB_CONTRACT: SPOGOMI team referee assignment, 1:1 uniqueness, and readiness contract passed"],
  ["apps/web/supabase/tests/spogomi-transactional-contract.sql", "EXECUTED_DB_CONTRACT: SPOGOMI RLS, lock triggers and atomic A-B-A consolidation contract passed"],
  ["e2e/profile-security.sql", "EXECUTED_DB_CONTRACT: SECURITY-01 profile and notification boundary contract passed"],
  ["e2e/security-02-projection-revocation.sql", "EXECUTED_DB_CONTRACT: SECURITY-02 projection revocation contract passed"],
  ["e2e/security-03-bug-report.sql", "EXECUTED_DB_CONTRACT: SECURITY-03 bug-report boundary contract passed"],
  ["e2e/supabase-admission-requests.sql", "EXECUTED_DB_CONTRACT: SPOGOMI admission request contract passed"],
  ["e2e/supabase-advisory-hardening.sql", "EXECUTED_DB_CONTRACT: Supabase advisory hardening contract passed"],
]);

const MULTISESSION_PROOFS = new Map([
  ["e2e/action-attendance-registry-concurrency.mjs", /Attendance registry idempotent retry, two-session revision conflict and explicit reactivation uniqueness passed\./],
  ["e2e/action-attendance-teams-concurrency.mjs", /Action attendance team idempotency and two-session revision conflict passed\./],
  ["e2e/action-role-attestation-concurrency.mjs", /Role attestation concurrent correction contract passed\./],
  ["e2e/action-collection-concurrency.mjs", /Action collection count write serialization and concurrency contract passed\./],
  ["e2e/action-buddy-concurrency.mjs", /Action buddy two-session matching invariant passed\./],
  ["e2e/community-helper-skills-concurrency.mjs", /Community helper skills two-session exact replacement contract passed\./],
  ["e2e/external-action-sync-concurrency.mjs", /EXECUTED_DB_CONTRACT: External action sync two-session revocation serialization, out-of-order apply, idempotent retry, reservation, lock-order, expiration and suppression idempotency contract passed\./],
  ["e2e/external-action-sync-e2e.mjs", /EXECUTED_DB_CONTRACT: External action sync E2E PostgreSQL lifecycle passed\./],
  ["e2e/gamification-reconciliation-concurrency.mjs", /Gamification reconciliation two-session lock, CAS, atomicity and idempotence passed\./],
  ["e2e/territorial-legend-revision-concurrency.mjs", /Territorial legend monotone fact revision and stale same-day reconciliation concurrency passed\./],
  ["e2e/quiz-progression-concurrency.mjs", /Quiz progression two-session user lock and balanced milestone passed\./],
  ["e2e/personal-ai-write-concurrency.mjs", /Personal AI owner lock ordering, concurrent scenario writes and overlap rejection passed\./],
  ["e2e/reports-postgres-concurrency.mjs", /EXECUTED_DB_CONTRACT: Reports quota and PDF artifact two-session concurrency contract passed\./],
  ["e2e/action-media-route-reference-concurrency.mjs", /EXECUTED_DB_CONTRACT: Route-reference quota serialization and tombstone compare-and-set prevent late finalization from reactivating a removed intent\./],
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
    .sort((left, right) => left.localeCompare(right));
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
    contracts: [...applicationContracts, ...e2eContracts].sort((left, right) => left.localeCompare(right)),
    multisession,
    unregistered: [...unregistered, ...unregisteredMultisession].sort((left, right) => left.localeCompare(right)),
  };
}

function listFilesFromRoot(root, relativeDirectory, extension) {
  return readdirSync(resolve(root, relativeDirectory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => normalizePath(`${relativeDirectory}/${entry.name}`))
    .sort((left, right) => left.localeCompare(right));
}

export function extractPlan(sql) {
  const match = sql.match(/\bselect\s+plan\(\s*(\d+)\s*\)/i);
  return match ? Number(match[1]) : null;
}

function parseSummaryCounter(output, label) {
  const matches = [...output.matchAll(new RegExp(`(?:\\b${label}\\s*=\\s*(\\d+)\\b|\\b(\\d+)\\s+${label}\\b)`, "gi"))]
    .map((match) => Number(match[1] ?? match[2]));
  if (matches.length > 1) {
    throw new Error(`pg_prove summary is ambiguous: duplicate ${label} counter`);
  }
  if (matches.length === 0 && new RegExp(`\\b${label}\\b`, "i").test(output)) {
    throw new Error(`pg_prove summary is incomplete: ${label} counter has no numeric value`);
  }
  return matches[0] ?? null;
}

const publicEvidenceForbiddenTerm = /\b(?:authorization|cookie|set-cookie|bearer|storageState|access_token|refresh_token|session(?:_?id|_?token)?|clerk(?:_?session)?|supabase(?:_?service)?_?role)\b/gi;

export function sanitizePublicEvidenceText(value) {
  return String(value ?? "").replace(publicEvidenceForbiddenTerm, "<redacted-term>");
}

function proofPhase(value) {
  const phase = String(value ?? "").match(/\bPROOF_PHASE=([a-z0-9_.-]{1,64})\b/i)?.[1]?.toLowerCase();
  return phase ? { phase } : {};
}

export function sanitizeProofFailureExcerpt(output) {
  const lines = String(output ?? "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const safeLines = lines.map((line) => {
    const phase = line.match(/\bPROOF_PHASE=([a-z0-9_.-]{1,64})\b/i)?.[1]?.toLowerCase();
    const sqlstate = line.match(/\b(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase()
      ?? line.match(/\b(?:ERROR|FATAL|PANIC):\s*([0-9A-Z]{5}):/i)?.[1]?.toUpperCase();
    if (phase && sqlstate) return `PROOF_PHASE=${phase} SQLSTATE=${sqlstate}`;
    if (phase) return `PROOF_PHASE=${phase}`;
    if (sqlstate) return `SQLSTATE=${sqlstate}`;
    const assertion = line.match(/^\s*not ok\s+(\d+)\b/i);
    if (assertion) return `not ok ${assertion[1]}`;
    const counts = line.match(/\bFiles\s*=\s*(\d+)\s*,\s*Tests\s*=\s*(\d+)/i);
    if (counts) return `Files=${counts[1]}, Tests=${counts[2]}`;
    const result = line.match(/\bResult\s*:\s*(PASS|FAIL)\b/i);
    if (result) return `Result: ${result[1].toUpperCase()}`;
    if (/test count mismatch/i.test(line)) return "TEST_COUNT_MISMATCH";
    if (/\bbail out!/i.test(line)) return "Bail out!";
    if (/\bpermission denied\b/i.test(line)) return "permission denied";
    const territorialPhase = line.match(/\bTERRITORIAL_PHASE=([A-Z0-9_-]{1,40})\b/i);
    if (territorialPhase) return `TERRITORIAL_PHASE=${territorialPhase[1]}`;
    if (/\b(?:ERROR|FATAL|PANIC):/i.test(line)) return "ERROR (details withheld)";
    if (/\b(?:timeout|timed out|connection refused|could not connect)\b/i.test(line)) return "PROCESS OR CONNECTION FAILURE";
    if (/\b(?:invalid|violates|duplicate key|does not exist)\b/i.test(line)) return "DATABASE REJECTION (details withheld)";
    return null;
  }).filter(Boolean);
  return [...new Set(safeLines)].slice(0, 12).join(" | ").slice(0, 1200) || "unavailable";
}

function parsePgProveSummary(output, expectedPlan) {
  const filesMatches = [...output.matchAll(/\bFiles\s*=\s*(\d+)\b/gi)];
  const testsMatches = [...output.matchAll(/\bTests\s*=\s*(\d+)\b/gi)];
  const resultMatches = [...output.matchAll(/\bResult\s*:\s*(PASS|FAIL)\b/gi)];

  if (filesMatches.length === 0 || testsMatches.length === 0 || resultMatches.length === 0) {
    throw new Error("pg_prove summary is incomplete: expected exactly one Files, Tests and Result field");
  }
  if (filesMatches.length !== 1 || testsMatches.length !== 1 || resultMatches.length !== 1) {
    throw new Error("pg_prove summary is ambiguous: duplicate Files, Tests or Result fields");
  }

  const files = Number(filesMatches[0][1]);
  const tests = Number(testsMatches[0][1]);
  const result = resultMatches[0][1].toUpperCase();
  const counterLines = String(output).split(/\r?\n/u).filter((line) =>
    /\b(?:Files|Tests)\s*=|\bResult\s*:|\b(?:Failed|Ignored|Todo|Skipped)\s*=|\b\d+\s+(?:Failed|Ignored|Todo|Skipped)\b/i.test(line),
  );
  const summaryCounters = counterLines.join("\n");
  const failed = parseSummaryCounter(summaryCounters, "Failed");
  const ignored = parseSummaryCounter(summaryCounters, "Ignored");
  const todo = parseSummaryCounter(summaryCounters, "Todo");
  const skipped = parseSummaryCounter(summaryCounters, "Skipped");

  if (result !== "PASS") throw new Error(`pg_prove reported Result: ${result}`);
  if ((failed ?? 0) !== 0) {
    throw new Error("pg_prove summary reports failed tests");
  }
  if ((ignored ?? 0) !== 0 || (todo ?? 0) !== 0 || (skipped ?? 0) !== 0) {
    throw new Error("pg_prove summary does not prove that every planned assertion was executed and passed");
  }
  if (/\bnot ok\b/i.test(output)) throw new Error("pg_prove summary contains a failing TAP assertion");
  if (files !== 1) throw new Error(`pg_prove summary expected one file, received ${files}`);
  if (tests !== expectedPlan) throw new Error(`pg_prove summary test count mismatch: expected ${expectedPlan}, received ${tests}`);

  return {
    expectedPlan,
    actualPlan: null,
    planned: expectedPlan,
    executed: tests,
    passed: tests,
    failures: 0,
    files,
    tests,
    failed,
    ignored,
    todo,
    skipped,
    verificationMode: "pg-prove-summary",
  };
}

function isHorizontalWhitespace(character) {
  return character === " " || character === "\t";
}

function trimHorizontalStart(value) {
  let start = 0;
  while (start < value.length && isHorizontalWhitespace(value[start])) start += 1;
  return value.slice(start);
}

function trimHorizontal(value) {
  const trimmed = trimHorizontalStart(value);
  let end = trimmed.length;
  while (end > 0 && isHorizontalWhitespace(trimmed[end - 1])) end -= 1;
  return trimmed.slice(0, end);
}

function parsePlanLine(line) {
  const trimmed = trimHorizontal(line);
  if (!trimmed.startsWith("1..")) return null;
  const digits = trimmed.slice(3);
  if (!digits || [...digits].some((character) => character < "0" || character > "9")) return null;
  return Number(digits);
}

function parseAssertionLine(line) {
  const trimmed = trimHorizontalStart(line);
  const lower = trimmed.toLowerCase();
  let status;
  let cursor;
  if (lower.startsWith("not ok")) {
    status = "not ok";
    cursor = 6;
  } else if (lower.startsWith("ok")) {
    status = "ok";
    cursor = 2;
  } else {
    return null;
  }
  if (!isHorizontalWhitespace(trimmed[cursor])) return null;
  while (cursor < trimmed.length && isHorizontalWhitespace(trimmed[cursor])) cursor += 1;
  const numberStart = cursor;
  while (cursor < trimmed.length && trimmed[cursor] >= "0" && trimmed[cursor] <= "9") cursor += 1;
  if (cursor === numberStart) return null;
  const next = trimmed[cursor];
  if (next && /[A-Za-z0-9_]/u.test(next)) return null;
  const description = trimmed.slice(cursor);
  const directive = description.match(/(?:^|\s)#\s*(skip|todo)(?:\s|$)/i);
  return { status, number: Number(trimmed.slice(numberStart, cursor)), directive: directive?.[1].toUpperCase() ?? null };
}

function hasBailOut(lines) {
  return lines.some((line) => {
    const trimmed = trimHorizontalStart(line);
    if (trimmed.slice(0, 9).toLowerCase() !== "bail out!") return false;
    const next = trimmed[9];
    return next === undefined || isHorizontalWhitespace(next);
  });
}

export function parsePgTapOutput(output, expectedPlan) {
  if (expectedPlan === null) throw new Error("pgTAP source has no explicit plan() assertion");

  const lines = String(output ?? "").split(/\r?\n/u);
  if (hasBailOut(lines)) {
    throw new Error("pgTAP output contains a Bail out! interruption");
  }

  const planMatches = lines.map(parsePlanLine).filter((plan) => plan !== null);
  if (planMatches.length > 1) throw new Error("pgTAP output contains multiple plans");
  const assertions = lines.map(parseAssertionLine).filter((assertion) => assertion !== null);
  const hasSummaryFields = /\b(?:Files|Tests)\s*=|\bResult\s*:/i.test(output);

  if (assertions.length === 0 && hasSummaryFields) {
    if (planMatches.length > 0) throw new Error("pgTAP output contains an incomplete TAP stream alongside a pg_prove summary");
    return parsePgProveSummary(output, expectedPlan);
  }
  if (assertions.length === 0) throw new Error("pgTAP output contains neither a complete TAP stream nor a pg_prove summary");

  const failures = assertions.filter((assertion) => assertion.status === "not ok").length;
  const passed = assertions.filter((assertion) => assertion.status === "ok").length;
  const actualPlan = planMatches.length === 1 ? planMatches[0] : null;
  if (actualPlan !== expectedPlan) throw new Error(`pgTAP output plan mismatch: expected ${expectedPlan}, received ${actualPlan ?? "missing"}`);
  const duplicateOrOutOfRange = assertions.find((assertion, index) => assertion.number !== index + 1 || assertion.number < 1 || assertion.number > expectedPlan);
  if (duplicateOrOutOfRange) {
    throw new Error(`pgTAP output assertion numbering is incomplete or inconsistent at assertion ${duplicateOrOutOfRange.number}`);
  }
  const directive = assertions.find((assertion) => assertion.directive !== null);
  if (directive) {
    throw new Error(`pgTAP output contains a ${directive.directive} assertion that was not executed`);
  }
  if (failures > 0) throw new Error(`pgTAP output contains ${failures} failing assertion(s)`);
  if (passed !== expectedPlan) throw new Error(`pgTAP output is incomplete: expected ${expectedPlan} passing assertions, received ${passed}`);

  if (hasSummaryFields) {
    const summary = parsePgProveSummary(output, expectedPlan);
    if (summary.executed !== assertions.length || summary.passed !== passed) {
      throw new Error(`pgTAP and pg_prove assertion counts disagree: TAP=${passed}, summary=${summary.passed}`);
    }
  }

  return { expectedPlan, actualPlan, planned: expectedPlan, executed: assertions.length, passed, failures, verificationMode: "tap-detailed" };
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

function psqlCommand() {
  return process.platform === "win32" ? "psql" : "/usr/bin/psql";
}

function resolveLocalDbUrl() {
  const raw = execFileSync(commandName(), ["status", "--workdir", "apps/web", "--output", "json"], {
    cwd: repositoryRoot,
    env: trustedCommandEnvironment(process.env, [commandName()]),
    encoding: "utf8",
  });
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("Supabase status did not return JSON for apps/web.");
  const status = JSON.parse(raw.slice(start));
  const dbUrl = String(status.DB_URL ?? "").trim();
  if (!dbUrl) throw new Error("Supabase status did not include DB_URL for apps/web.");
  const parsed = new URL(dbUrl);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Refusing non-local DB_URL for SQL contract proof.");
  }
  return dbUrl;
}

export function supabaseNetworkArgs(env = process.env) {
  const networkId = String(env.CMM_SUPABASE_NETWORK_ID ?? "").trim();
  return networkId ? ["--network-id", networkId] : [];
}

export function pgtapCliPath(recordPath) {
  return String(recordPath).replaceAll("\\", "/");
}

export function prioritizePaths(paths, priorityPaths = []) {
  const priority = new Set(priorityPaths.map((path) => normalizePath(path)).filter(Boolean));
  return [...paths].sort((left, right) => {
    const leftPriority = priority.has(normalizePath(left)) ? 0 : 1;
    const rightPriority = priority.has(normalizePath(right)) ? 0 : 1;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
}

export function captureProcessText(current, chunk, maxBytes = MAX_CAPTURED_PROCESS_BYTES) {
  const remaining = Math.max(0, maxBytes - Buffer.byteLength(current, "utf8"));
  if (remaining === 0) return current;
  let captured = current + Buffer.from(chunk).subarray(0, remaining).toString("utf8");
  while (Buffer.byteLength(captured, "utf8") > maxBytes) captured = captured.slice(0, -1);
  return captured;
}

export function classifyProofFailure({ output = "", code = null, signal = null, timedOut = false, diagnostic = "" } = {}) {
  const text = `${output}\n${diagnostic}`;
  const sqlstate = text.match(/\b(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase()
    ?? text.match(/\b(?:ERROR|FATAL|PANIC):\s*([0-9A-Z]{5}):/i)?.[1]?.toUpperCase()
    ?? null;
  let category = "UNKNOWN";
  let origin = "UNPROVEN";
  if (timedOut || signal) {
    category = "PROCESS_INTERRUPTED";
    origin = "PROCESS";
  } else if (/\bfixture (?:is )?(?:invalid|malformed)\b/i.test(text)) {
    category = "FIXTURE_INVALID";
    origin = "FIXTURE_DIAGNOSTIC";
  } else if (sqlstate === "42501" || /\bpermission denied\b/i.test(text)) {
    category = "PRIVILEGE_ERROR";
    origin = "POSTGRESQL";
  } else if (sqlstate || /\bERROR:\s|\bFATAL:\s/i.test(text)) {
    category = "UNCAUGHT_SQL_ERROR";
    origin = sqlstate ? "POSTGRESQL" : "UNPROVEN";
  } else if (/\bnot ok\s+\d+\b|\bfailed (?:assertion|tests?)\b|\bResult\s*:\s*FAIL\b/i.test(text)) {
    category = "ASSERTION_FAILED";
    origin = "PGTAP_ASSERTION";
  } else if (/\bbail out!\b/i.test(text) || /(?:incomplete|plan mismatch|numbering is incomplete|test count mismatch)/i.test(diagnostic)) {
    category = "PLAN_INCOMPLETE_OR_INTERRUPTED";
    origin = "PGTAP_STREAM";
  } else if (code !== null) {
    category = "PROCESS_EXIT";
    origin = "PROCESS";
  }
  return { category, origin, sqlstate };
}

function pgTapCounts(output, planned = null) {
  const lines = String(output ?? "").split(/\r?\n/u);
  const assertions = lines.filter((line) => /^\s*(?:ok|not ok)\s+\d+\b/i.test(line));
  const failed = assertions.filter((line) => /^\s*not ok\b/i.test(line)).length;
  const plan = lines.map(parsePlanLine).find((value) => value !== null) ?? planned;
  const summaryTests = String(output ?? "").match(/\bTests\s*=\s*(\d+)\b/i)?.[1];
  return { planned: plan ?? null, executed: assertions.length || (summaryTests ? Number(summaryTests) : null), failed };
}

export function runCommand(command, args, { logName, env = trustedCommandEnvironment(process.env, [command]), timeoutMs = DEFAULT_PROCESS_TIMEOUT_MS } = {}) {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(command, args, { cwd: repositoryRoot, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let externallyCancelled = null;
    let settled = false;
    let forceKillTimer = null;
    let closeDeadline = null;
    let orphanDrainTimer = null;
    const signalChild = (signal) => {
      if (!child.pid) return;
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch { /* The process group may already have exited. */ }
    };
    const terminate = (signal) => {
      signalChild(signal);
      forceKillTimer = setTimeout(() => signalChild("SIGKILL"), 5000);
      forceKillTimer.unref();
      closeDeadline = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
      }, 6500);
      closeDeadline.unref();
    };
    const onTerm = () => { externallyCancelled = "SIGTERM"; terminate("SIGTERM"); };
    const onInt = () => { externallyCancelled = "SIGINT"; terminate("SIGTERM"); };
    process.once("SIGTERM", onTerm);
    process.once("SIGINT", onInt);
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdoutBytes += chunk.length; stdout = captureProcessText(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderrBytes += chunk.length; stderr = captureProcessText(stderr, chunk); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      process.removeListener("SIGTERM", onTerm);
      process.removeListener("SIGINT", onInt);
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      if (closeDeadline) clearTimeout(closeDeadline);
      if (orphanDrainTimer) clearTimeout(orphanDrainTimer);
      rejectResult(error);
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      if (timedOut || externallyCancelled) return;
      orphanDrainTimer = setTimeout(() => {
        if (!settled) terminate("SIGTERM");
      }, 1000);
      orphanDrainTimer.unref();
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      process.removeListener("SIGTERM", onTerm);
      process.removeListener("SIGINT", onInt);
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      if (closeDeadline) clearTimeout(closeDeadline);
      if (orphanDrainTimer) clearTimeout(orphanDrainTimer);
      const output = `${stdout}${stderr}`;
      mkdirSync(logDirectory, { recursive: true });
      writeFileSync(resolve(logDirectory, `${logName}.log`), output, "utf8");
      resolveResult({ code: code ?? 1, signal: externallyCancelled ?? signal, stdout, stderr, output, timedOut, externallyCancelled: Boolean(externallyCancelled), outputTruncated: stdoutBytes > MAX_CAPTURED_PROCESS_BYTES || stderrBytes > MAX_CAPTURED_PROCESS_BYTES });
    });
  });
}

function candidateSha(explicitSha) {
  const sha = String(explicitSha ?? process.env.CMM_SUPABASE_CANDIDATE_SHA ?? "").trim() || execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`Invalid candidate SHA: ${sha}`);
  const head = execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (head.toLowerCase() !== sha.toLowerCase()) throw new Error(`Candidate SHA ${sha} does not match checked-out HEAD ${head}`);
  return sha;
}

function baseRecord(path, category) {
  const content = readFileSync(resolve(repositoryRoot, path));
  return {
    path,
    category,
    contentSha256: createHash("sha256").update(content).digest("hex"),
    status: "NOT_RUN",
    outcome: "NOT_RUN",
  };
}

function migrationEvidence() {
  const directory = resolve(repositoryRoot, "apps/web/supabase/migrations");
  return readdirSync(directory)
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .sort()
    .map((file) => ({
      id: file.slice(0, 14),
      path: `apps/web/supabase/migrations/${file}`,
      contentSha256: createHash("sha256").update(readFileSync(resolve(directory, file))).digest("hex"),
    }));
}

export function assertEphemeralSupabaseTestEnvironment(env = process.env) {
  if (env.CMM_SUPABASE_TEST_ENVIRONMENT !== "ephemeral" ||
      env.CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION !== "I_UNDERSTAND_EPHEMERAL_ONLY") {
    throw new Error(
      "Destructive Supabase proofs require explicit ephemeral authorization; linked and production environments are never accepted.",
    );
  }
  const configuredUrl = String(env.SUPABASE_URL ?? env.SUPABASE_DB_URL ?? "").trim();
  if (configuredUrl) {
    let hostname;
    try {
      hostname = new URL(configuredUrl).hostname;
    } catch {
      throw new Error("Destructive Supabase proofs require a valid local ephemeral URL when a URL is configured.");
    }
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      throw new Error("Destructive Supabase proofs refuse non-local Supabase URLs.");
    }
  }
  return true;
}

export function attestProofResult(record, result, validate) {
  if (result.code !== 0) {
    record.status = "INTEGRATION_PROOF";
    record.outcome = "FAIL";
    const failure = classifyProofFailure({ ...result, diagnostic: sanitizeProofFailureExcerpt(result.output) });
    record.failure = { ...failure, ...proofPhase(result.output) };
    if (record.category === "PGTAP") record.counts = pgTapCounts(result.output, record.expectedAssertions ?? null);
    const phase = proofPhase(result.output).phase;
    record.reason = `step=${record.category ?? "SQL_PROOF"}; command exited with ${result.code}${result.signal ? ` (${result.signal})` : ""}${result.timedOut ? "; timeout=true" : ""}${result.outputTruncated ? "; output_truncated=true" : ""}; category=${failure.category}; origin=${failure.origin}${failure.sqlstate ? `; sqlstate=${failure.sqlstate}` : ""}${phase ? `; phase=${phase}` : ""}; diagnostic=${sanitizeProofFailureExcerpt(result.output)}`;
    throw new Error(record.reason);
  }
  try {
    record.status = "INTEGRATION_PROOF";
    record.outcome = "PASS";
    record.details = validate(result.output);
  } catch (error) {
    record.status = "INTEGRATION_PROOF";
    record.outcome = "FAIL";
    const diagnostic = error instanceof Error ? error.message : String(error);
    record.failure = { ...classifyProofFailure({ ...result, diagnostic }), ...proofPhase(`${result.output}\n${diagnostic}`) };
    if (record.category === "PGTAP") record.counts = pgTapCounts(result.output, record.expectedAssertions ?? null);
    record.reason = `step=${record.category ?? "SQL_PROOF"}; category=${record.failure.category}; origin=${record.failure.origin}${record.failure.sqlstate ? `; sqlstate=${record.failure.sqlstate}` : ""}${record.failure.phase ? `; phase=${record.failure.phase}` : ""}; diagnostic=${sanitizeProofFailureExcerpt(`${result.output}\n${diagnostic}`)}`;
    throw new Error(record.reason);
  }
}

async function runProof(record, command, args, validate, commandRunner = runCommand) {
  const startedAt = Date.now();
  let result;
  try {
    result = await commandRunner(command, args, { logName: record.path.replaceAll("/", "__").replaceAll(".", "_") });
  } catch (error) {
    record.durationMs = Date.now() - startedAt;
    record.status = "DB_SEMANTICS_NOT_EXECUTED";
    record.outcome = "FAIL";
    record.failure = { category: "COMMAND_START_FAILED", origin: "PROCESS", sqlstate: null };
    record.reason = `step=${record.category ?? "SQL_PROOF"}; category=COMMAND_START_FAILED; origin=PROCESS; code=${error?.code ?? error?.name ?? "unknown"}`;
    throw new Error(`${record.path}: ${record.reason}`);
  }
  record.durationMs = Date.now() - startedAt;
  try {
    attestProofResult(record, result, validate);
  } catch (error) {
    throw new Error(`${record.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeReport(report) {
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function runSupabaseSqlProof({ sha, run = true, commandRunner = runCommand, writeReportImpl = writeReport, targets = null } = {}) {
  const candidate = candidateSha(sha);
  const priorStages = readExistingWorkflowStages(candidate, evidencePath);
  const report = createEvidenceReport(candidate, { inventorySqlProofs, prioritizePaths, baseRecord, migrationEvidence });
  if (priorStages.length > 0) report.workflowStages = WORKFLOW_STAGES.map((stage) => priorStages.find((entry) => entry.stage === stage) ?? stageRecord(stage));
  const requestedTargets = (
    Array.isArray(targets)
      ? targets
      : String(process.env.CMM_SUPABASE_SQL_TARGETS ?? "").split(",")
  ).map((value) => normalizePath(value.trim())).filter(Boolean);
  if (requestedTargets.length > 0) {
    const requestedSet = new Set(requestedTargets);
    const knownPaths = new Set(report.records.map((record) => record.path));
    const unknown = requestedTargets.filter((target) => !knownPaths.has(target));
    if (unknown.length > 0) {
      throw new Error(`Unknown SQL proof target(s): ${unknown.join(", ")}`);
    }
    report.selectionMode = "targeted";
    report.selectedTargets = requestedTargets;
    report.records = report.records.filter((record) => requestedSet.has(record.path));
  } else {
    report.selectionMode = "full";
  }
  const records = report.records;
  if (!run) {
    writeReportImpl(report);
    return report;
  }
  if (commandRunner === runCommand) assertEphemeralSupabaseTestEnvironment();
  const unregistered = records.filter((record) => record.category === "UNREGISTERED_SQL_PROOF").map((record) => record.path);
  if (unregistered.length > 0) {
    report.outcome = "FAIL";
    report.firstFailure = { stage: "inventory", file: unregistered[0], category: "UNREGISTERED_SQL_PROOF", origin: "STATIC_INVENTORY" };
    writeReportImpl(report);
    throw new Error(`Unregistered SQL proof files: ${unregistered.join(", ")}`);
  }

  const failures = [];
  const networkArgs = supabaseNetworkArgs();
  let localDbUrl = null;
  for (const record of records) {
    try {
      if (record.category === "PGTAP") {
        const sql = readFileSync(resolve(repositoryRoot, record.path), "utf8");
        const expectedPlan = extractPlan(sql);
        record.expectedAssertions = expectedPlan;
        await runProof(record, commandName(), ["test", "db", "--workdir", "apps/web", "--local", ...networkArgs, "--debug", pgtapCliPath(record.path)], (output) => parsePgTapOutput(output, expectedPlan), commandRunner);
      } else if (record.category === "SQL_CONTRACT") {
        const sql = readFileSync(resolve(repositoryRoot, record.path), "utf8");
        const marker = CONTRACT_MARKERS.get(record.path);
        record.expectedMarker = sanitizePublicEvidenceText(marker);
        try {
          validateSqlContractMarkerPlacement(sql, marker);
        } catch (error) {
          record.status = "DB_SEMANTICS_NOT_EXECUTED";
          record.outcome = "FAIL";
          record.reason = sanitizePublicEvidenceText(error instanceof Error ? error.message : String(error));
          throw new Error(`${record.path}: ${record.reason}`);
        }
        if (commandRunner === runCommand) {
          localDbUrl ??= resolveLocalDbUrl();
        }
        const sqlCommand = commandRunner === runCommand ? psqlCommand() : commandName();
        const sqlArgs = commandRunner === runCommand
          ? ["-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-f", resolve(repositoryRoot, record.path), localDbUrl]
          : ["db", "query", "--workdir", "apps/web", "--local", ...networkArgs, sql];
        await runProof(record, sqlCommand, sqlArgs, (output) => {
          if (!output.includes(marker)) throw new Error("completion marker is absent from the PostgreSQL output");
          return { marker: sanitizePublicEvidenceText(marker) };
        }, commandRunner);
      } else if (record.category === "MULTISESSION") {
        const expectedOutput = MULTISESSION_PROOFS.get(record.path);
        await runProof(record, process.execPath, [record.path], (output) => {
          if (!expectedOutput.test(output)) throw new Error("completion marker is absent from the multi-session output");
          return { marker: sanitizePublicEvidenceText(expectedOutput.source) };
        }, commandRunner);
      }
    } catch (error) {
      failures.push(error);
      if (!report.firstFailure) {
        report.firstFailure = {
          stage: record.category ?? "SQL_PROOF",
          file: record.path,
          category: record.failure?.category ?? "PROOF_VALIDATION_FAILED",
          origin: record.failure?.origin ?? "UNPROVEN",
          ...(record.failure?.sqlstate ? { sqlstate: record.failure.sqlstate } : {}),
          ...(record.failure?.phase ? { phase: record.failure.phase } : {}),
          ...(record.counts ? { counts: record.counts } : {}),
        };
      }
    }
  }

  const slowThresholdMs = Number(process.env.CMM_SQL_REGRESSION_THRESHOLD_MS ?? 30_000);
  const baselineDurationsMs = loadTimingBaseline();
  report.timingSummary = summarizeTimings(
    records.map((record) => ({
      name: record.path,
      category: record.category,
      outcome: record.outcome,
      durationMs: record.durationMs ?? 0,
    })),
    { slowThresholdMs, baselineDurationsMs },
  );
  if (commandRunner === runCommand && process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${formatTimingMarkdown("Supabase SQL & Concurrency Proof Timings", report.timingSummary)}\n`,
      "utf8",
    );
  }

  if (failures.length > 0) {
    report.outcome = "FAIL";
    writeReportImpl(report);
    throw failures[0];
  }
  report.outcome = "PASS";
  writeReportImpl(report);
  return report;
}

export async function main(run = runSupabaseSqlProof) {
  try {
    const createReport = (candidate) => createEvidenceReport(candidate, { inventorySqlProofs, prioritizePaths, baseRecord, migrationEvidence });
    if (process.argv.includes("--initialize-workflow-evidence")) return initializeWorkflowEvidence({ candidateSha, createEvidenceReport: createReport, writeReport });
    if (process.argv.includes("--reset-canonical-db")) return await runCanonicalReset({ assertEphemeralSupabaseTestEnvironment, candidateSha, evidencePath, runCommand, commandName, writeReport });
    if (process.argv.includes("--verify-canonical-schema-seed")) return await verifyCanonicalSchemaSeed({ assertEphemeralSupabaseTestEnvironment, candidateSha, evidencePath, runCommand, commandName, writeReport, networkArgs: supabaseNetworkArgs });
    if (process.argv.includes("--finalize-workflow-evidence")) return finalizeWorkflowEvidence({ candidateSha, evidencePath, readFileSync, writeReport, createEvidenceReport: createReport, repositoryRoot });
    const report = await run();
    console.log(`SUPABASE_SQL_EVIDENCE: ${report.outcome} candidate=${report.candidateSha} records=${report.records.length}`);
    return 0;
  } catch (error) {
    console.error(`SUPABASE_SQL_EVIDENCE: FAIL ${error instanceof Error ? error.name : "non-error rejection"}`);
    return 1;
  }
}

export function reportMainRejection(error) {
  console.error(`SUPABASE_SQL_EVIDENCE: FAIL main rejected (${error instanceof Error ? error.name : "non-error rejection"})`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.exitCode = reportMainRejection(error);
  });
}
