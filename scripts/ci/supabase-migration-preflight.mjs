#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  isValidProjectRef,
  parseSupabaseJson,
  projectMatches,
  resolveProjectRef,
  runSupabase,
} from "./audit-supabase-release.mjs";
import { findRlsContractFindings } from "../../apps/web/scripts/supabase-security-advisors.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsRoot = path.join(repoRoot, "apps", "web", "supabase", "migrations");
const migrationFilePattern = /^(\d{14})_(.+)\.sql$/;
const shaPattern = /^[0-9a-f]{40}$/i;
const PREFLIGHT_STATUSES = Object.freeze(["ALIGNED", "READY_TO_APPLY", "BLOCKED", "DIVERGED"]);

export const READ_ONLY_COMMANDS = Object.freeze([
  ["projects", "list", "--output", "json"],
  ["branches", "list", "--project-ref", "<linked-ref>", "--output", "json"],
  ["migration", "list", "--linked"],
  ["db", "push", "--dry-run"],
  ["db", "advisors", "--linked", "--type", "security", "--level", "info", "--fail-on", "none", "--output-format", "json"],
  ["db", "advisors", "--linked", "--type", "performance", "--level", "info", "--fail-on", "none", "--output-format", "json"],
]);

function normalizeMigrationId(value) {
  const match = String(value ?? "").match(/^(\d{14})(?:_|$)/);
  return match?.[1] ?? "";
}

function migrationIdFromValue(value) {
  if (typeof value === "string") return normalizeMigrationId(value);
  if (!value || typeof value !== "object") return "";
  return normalizeMigrationId(value.version ?? value.id ?? value.name ?? value.migration);
}

function migrationNameFromValue(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return String(value.name ?? value.file ?? value.migration ?? value.version ?? "");
}

function migrationRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.migrations)) return payload.migrations;
  return [];
}

function advisorFindings(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["results", "advisors", "findings", "issues", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function findingLevel(finding) {
  return String(finding?.level ?? finding?.severity ?? "").trim().toUpperCase();
}

function findingName(finding) {
  return String(finding?.name ?? finding?.id ?? finding?.slug ?? finding?.key ?? finding?.code ?? "");
}

function summarizeAdvisors(securityPayload, performancePayload) {
  const security = advisorFindings(securityPayload);
  const performance = advisorFindings(performancePayload);
  const rls = findRlsContractFindings(JSON.stringify(securityPayload ?? []));
  const actionableSecurity = security.filter((finding) => ["WARN", "ERROR", "CRITICAL"].includes(findingLevel(finding)));
  const actionablePerformance = performance.filter((finding) => ["WARN", "ERROR", "CRITICAL"].includes(findingLevel(finding)));
  return {
    securityCount: security.length,
    performanceCount: performance.length,
    rlsFindings: rls,
    actionableSecurity,
    actionablePerformance,
  };
}

function extractCreatedObjects(sql) {
  const objects = [];
  const patterns = [
    /\bcreate\s+(?:or\s+replace\s+)?table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi,
    /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of sql.matchAll(pattern)) objects.push(`public.${match[1].toLowerCase()}`);
  }
  return [...new Set(objects)];
}

function extractReferencedObjects(sql) {
  const references = [];
  const pattern = /\bpublic\.([a-z0-9_]+)/gi;
  for (const match of sql.matchAll(pattern)) references.push(`public.${match[1].toLowerCase()}`);
  return [...new Set(references)];
}

function analyzeMigration(entry, creationIndex) {
  const sql = entry.sql;
  const dataMutation = /\b(?:insert\s+into|update\s+public\.|delete\s+from|truncate\b|setval\s*\()/i.test(sql);
  const destructive = /\b(?:drop\s+(?:table|column|schema)|truncate\b|delete\s+from\s+public\.)/i.test(sql);
  const rlsPolicyChanges = /\b(?:create|alter|drop)\s+policy\b|\benable\s+row\s+level\s+security\b/i.test(sql);
  const grantChanges = /\b(?:grant|revoke)\b/i.test(sql);
  const rpcChanges = /\b(?:create|replace|drop)\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(sql);
  const forwardDependencies = extractReferencedObjects(sql)
    .filter((objectName) => creationIndex.has(objectName) && creationIndex.get(objectName) > entry.index)
    .map((objectName) => ({ objectName, migration: entry.allIds[creationIndex.get(objectName)] }));
  return {
    id: entry.id,
    file: entry.file,
    dataMutation,
    destructive,
    rlsPolicyChanges,
    grantChanges,
    rpcChanges,
    forwardDependencies,
  };
}

export function readLocalMigrations(root = migrationsRoot) {
  const files = fs.readdirSync(root).filter((file) => migrationFilePattern.test(file)).sort();
  const entries = files.map((file, index) => {
    const match = file.match(migrationFilePattern);
    return { id: match[1], file, index, sql: fs.readFileSync(path.join(root, file), "utf8") };
  });
  const allIds = entries.map((entry) => entry.id);
  const creationIndex = new Map();
  for (const entry of entries) {
    for (const objectName of extractCreatedObjects(entry.sql)) {
      if (!creationIndex.has(objectName)) creationIndex.set(objectName, entry.index);
    }
  }
  return entries.map((entry) => analyzeMigration({ ...entry, allIds }, creationIndex));
}

function normalizeHistory(localEntries, remotePayload) {
  const rows = migrationRows(remotePayload);
  const localIds = localEntries.map((entry) => entry.id);
  const remoteIds = rows.map((row) => normalizeMigrationId(row?.remote ?? row?.version ?? row?.id ?? "")).filter(Boolean);
  const localRowIds = rows.map((row) => normalizeMigrationId(row?.local ?? row?.name ?? row?.version ?? "")).filter(Boolean);
  const mismatches = rows
    .filter((row) => row?.local && row?.remote && normalizeMigrationId(row.local) !== normalizeMigrationId(row.remote))
    .map((row) => ({ local: row.local, remote: row.remote }));
  const remotePrefix = localIds.slice(0, remoteIds.length);
  const prefixAligned = remoteIds.length <= localIds.length && remoteIds.every((id, index) => id === remotePrefix[index]);
  const localRowsAligned = localRowIds.length === 0 || localRowIds.every((id, index) => id === localIds[index]);
  const pending = prefixAligned ? localIds.slice(remoteIds.length) : localIds.filter((id) => !remoteIds.includes(id));
  return {
    localIds,
    remoteIds,
    localRowIds,
    pending,
    mismatches,
    aligned: mismatches.length === 0 && prefixAligned && localRowsAligned,
  };
}

function normalizeDryRunMigrations(payload) {
  return migrationRows(payload).map(migrationIdFromValue).filter(Boolean);
}

function normalizeRuntimeEvidence(evidence) {
  if (!evidence) return { status: "MISSING", reason: "runtime proof was not supplied" };
  if (evidence.status !== "COMPATIBLE") return { status: "INCOMPATIBLE", reason: evidence.reason ?? "runtime proof is not compatible" };
  if (evidence.sha && !shaPattern.test(evidence.sha)) return { status: "INCOMPATIBLE", reason: "runtime proof SHA is invalid" };
  if (!evidence.migrationVersion || !/^\d{14}$/.test(String(evidence.migrationVersion))) {
    return { status: "INCOMPATIBLE", reason: "runtime proof has no canonical migration version" };
  }
  return { status: "COMPATIBLE", sha: evidence.sha, migrationVersion: String(evidence.migrationVersion), source: evidence.source };
}

export function evaluatePreflight({
  projectRef,
  projectMatched = false,
  authSource = "UNKNOWN",
  history,
  dryRunIds = [],
  analyses = [],
  advisors = { rlsFindings: [], actionableSecurity: [], actionablePerformance: [] },
  runtimeEvidence,
  commandFailures = [],
} = {}) {
  const causes = [];
  const pending = history?.pending ?? [];
  if (!isValidProjectRef(projectRef) || !projectMatched || authSource === "UNKNOWN") {
    causes.push({ code: "CLI_AUTH_OR_TARGET_UNVERIFIED", detail: "CLI authentication or linked project identity is not proven." });
  }
  if (commandFailures.length > 0) {
    causes.push(...commandFailures.map((failure) => ({ code: "CLI_COMMAND_FAILED", detail: failure })));
  }
  if (history && !history.aligned) {
    causes.push({ code: "MIGRATION_HISTORY_DIVERGED", detail: "Local and remote migration order/pairs are not a canonical prefix." });
  }
  if (history && dryRunIds.join(",") !== pending.join(",")) {
    causes.push({ code: "DRY_RUN_MISMATCH", detail: "db push --dry-run does not describe exactly the canonical pending queue." });
  }
  for (const analysis of analyses.filter((entry) => pending.includes(entry.id))) {
    if (analysis.destructive || analysis.dataMutation) {
      causes.push({ code: "MIGRATION_DATA_RISK", detail: `${analysis.id} contains data-mutating or destructive SQL.` });
    }
    if (analysis.forwardDependencies?.length) {
      causes.push({ code: "SQL_FORWARD_DEPENDENCY", detail: `${analysis.id} references objects created by a later migration.` });
    }
  }
  if (advisors.rlsFindings?.length || advisors.actionableSecurity?.length) {
    causes.push({ code: "SECURITY_ADVISOR_FINDING", detail: `${(advisors.rlsFindings?.length ?? 0) + (advisors.actionableSecurity?.length ?? 0)} security finding(s) require review.` });
  }
  if (advisors.actionablePerformance?.length) {
    causes.push({ code: "PERFORMANCE_ADVISOR_FINDING", detail: `${advisors.actionablePerformance.length} performance finding(s) require review.` });
  }
  const runtime = normalizeRuntimeEvidence(runtimeEvidence);
  if (runtime.status !== "COMPATIBLE") {
    causes.push({ code: `RUNTIME_${runtime.status}`, detail: runtime.reason });
  }
  let status = "READY_TO_APPLY";
  if (causes.some((cause) => cause.code === "MIGRATION_HISTORY_DIVERGED" || cause.code === "DRY_RUN_MISMATCH")) status = "DIVERGED";
  else if (causes.length > 0) status = "BLOCKED";
  else if (pending.length === 0) status = "ALIGNED";
  return { status, causes, pending, runtime, projectRef, pendingCount: pending.length };
}

function cliAuthSource(env = process.env) {
  if (String(env.SUPABASE_ACCESS_TOKEN ?? "").trim()) return "ENV_SECRET";
  return "NATIVE_CREDENTIAL_STORE";
}

function readRuntimeProof(filePath) {
  if (!filePath) return undefined;
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function parseRuntimeProofArg(argv) {
  const value = argv.find((arg) => arg.startsWith("--runtime-proof="));
  return value?.slice("--runtime-proof=".length) || "";
}

export function buildReadOnlyCommandArgs(projectRef) {
  return READ_ONLY_COMMANDS.map((args) => args.map((arg) => arg === "<linked-ref>" ? projectRef : arg));
}

function currentGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  return result.status === 0 ? result.stdout.trim() : "";
}

export function runPreflight({ argv = process.argv.slice(2), env = process.env, runner = runSupabase, migrationRoot = migrationsRoot } = {}) {
  if (!argv.includes("--dry-run")) throw new Error("--dry-run is mandatory; this preflight has no mutating mode.");
  const projectRef = resolveProjectRef({ argv, env });
  const localEntries = readLocalMigrations(migrationRoot);
  const commands = buildReadOnlyCommandArgs(projectRef);
  const run = (args) => runner(args);
  const projectsResult = run(commands[0]);
  const projects = projectsResult.status === 0 ? parseSupabaseJson(projectsResult, "Supabase projects list") : undefined;
  const projectMatched = projectMatches(projects, projectRef);
  const parsed = commands.slice(1).map((args, index) => {
    const label = ["Supabase branches list", "Supabase migration list", "Supabase db push dry-run", "Supabase security advisors", "Supabase performance advisors"][index];
    return { label, ...runAndParseWithRunner(run, args, label) };
  });
  const [branches, historyResult, dryRun, security, performance] = parsed;
  const history = historyResult.payload ? normalizeHistory(localEntries, historyResult.payload) : undefined;
  const dryRunIds = dryRun.payload ? normalizeDryRunMigrations(dryRun.payload) : [];
  const advisors = security.payload && performance.payload
    ? summarizeAdvisors(security.payload, performance.payload)
    : { rlsFindings: [], actionableSecurity: [], actionablePerformance: [] };
  const commandFailures = [{ label: "Supabase projects list", result: projectsResult }, ...parsed]
    .filter((entry) => entry.result?.status !== 0 || entry.error)
    .map((entry) => entry.label ?? "Supabase projects list");
  const runtimeProofPath = parseRuntimeProofArg(argv);
  const runtimeEvidence = runtimeProofPath ? readRuntimeProof(runtimeProofPath) : undefined;
  const summary = evaluatePreflight({
    projectRef,
    projectMatched,
    authSource: projectMatched && projectsResult.status === 0 ? cliAuthSource(env) : "UNKNOWN",
    history,
    dryRunIds,
    analyses: localEntries,
    advisors,
    runtimeEvidence,
    commandFailures,
  });
  return {
    ...summary,
    authSource: projectMatched && projectsResult.status === 0 ? cliAuthSource(env) : "UNKNOWN",
    localCount: localEntries.length,
    remoteAppliedCount: history?.remoteIds.length ?? 0,
    dryRunIds,
    advisors: {
      securityCount: advisors.securityCount ?? 0,
      performanceCount: advisors.performanceCount ?? 0,
      rlsCount: advisors.rlsFindings?.length ?? 0,
      actionableSecurityCount: advisors.actionableSecurity?.length ?? 0,
      actionablePerformanceCount: advisors.actionablePerformance?.length ?? 0,
    },
    branchesRead: branches.result?.status === 0,
    currentGitSha: currentGitSha(),
    remoteWrites: "NONE",
  };
}

function runAndParseWithRunner(runner, args, label) {
  const result = runner(args);
  if (result.status !== 0) return { result, payload: undefined, error: `${label} failed` };
  try {
    return { result, payload: parseSupabaseJson(result, label) };
  } catch (error) {
    return { result, payload: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}

function printSummary(summary) {
  console.log(`PREFLIGHT_MODE: DRY_RUN`);
  console.log(`PREFLIGHT_STATUS: ${summary.status}`);
  console.log(`SUPABASE_PROJECT_REF: ${summary.projectRef || "UNKNOWN"}`);
  console.log(`CLI_AUTH: ${summary.authSource === "UNKNOWN" ? "BLOCKED" : "PASS"}`);
  console.log(`CLI_AUTH_SOURCE: ${summary.authSource}`);
  console.log(`LOCAL_MIGRATIONS: ${summary.localCount}`);
  console.log(`REMOTE_APPLIED_MIGRATIONS: ${summary.remoteAppliedCount}`);
  console.log(`PENDING_MIGRATIONS: ${summary.pendingCount}`);
  for (const migration of summary.pending) console.log(`PENDING: ${migration}`);
  console.log(`DRY_RUN_MIGRATIONS: ${summary.dryRunIds.length}`);
  console.log(`SECURITY_ADVISOR_FINDINGS: ${summary.advisors.securityCount}`);
  console.log(`RLS_FINDINGS: ${summary.advisors.rlsCount}`);
  console.log(`PERFORMANCE_ADVISOR_FINDINGS: ${summary.advisors.performanceCount}`);
  console.log(`RUNTIME_COMPATIBILITY: ${summary.runtime.status}`);
  console.log(`REMOTE_WRITES: ${summary.remoteWrites}`);
  for (const cause of summary.causes) console.log(`CAUSE: ${cause.code} — ${cause.detail}`);
}

function main() {
  try {
    const summary = runPreflight();
    printSummary(summary);
    process.exitCode = PREFLIGHT_STATUSES.includes(summary.status) && ["ALIGNED", "READY_TO_APPLY"].includes(summary.status) ? 0 : 2;
  } catch (error) {
    console.error("PREFLIGHT_STATUS: BLOCKED");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
