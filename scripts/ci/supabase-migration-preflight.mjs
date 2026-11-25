#!/usr/bin/env node

import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isValidProjectRef,
  parseSupabaseJson,
  projectMatches,
  resolveProjectRef,
  runSupabase,
} from "./audit-supabase-release.mjs";
import { findRlsContractFindings } from "../../apps/web/scripts/supabase-security-advisors.mjs";
import { classifyMigrationSql, findSqlContractCompatibilityIssues } from "./supabase-migration-sql.mjs";
import { validateEphemeralEvidence } from "./supabase-convergence-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsRoot = path.join(repoRoot, "apps", "web", "supabase", "migrations");
const migrationFilePattern = /^(\d{14})_(.+)\.sql$/;
const PREFLIGHT_STATUSES = Object.freeze(["ALIGNED", "READY_TO_APPLY", "BLOCKED", "DIVERGED"]);

export const READ_ONLY_COMMANDS = Object.freeze([
  ["projects", "list", "--output", "json"],
  ["branches", "list", "--project-ref", "<linked-ref>", "--output", "json"],
  ["migration", "list", "--linked", "--output-format", "json"],
  ["db", "push", "--dry-run", "--output-format", "json"],
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

function isCriticalFinding(finding) {
  return finding?.critical === true || ["ERROR", "CRITICAL", "FATAL"].includes(findingLevel(finding));
}

function isExplicitRegression(finding) {
  return finding?.regression === true
    || finding?.introducedByLot === true
    || finding?.currentBatch === true
    || ["pending", "current", "lot"].includes(String(finding?.introducedBy ?? "").toLowerCase());
}

function summarizeAdvisors(securityPayload, performancePayload) {
  const security = advisorFindings(securityPayload);
  const performance = advisorFindings(performancePayload);
  const rls = findRlsContractFindings(JSON.stringify(securityPayload ?? []));
  const actionableSecurity = security.filter((finding) => ["WARN", "ERROR", "CRITICAL"].includes(findingLevel(finding)));
  const actionablePerformance = performance.filter((finding) => ["WARN", "ERROR", "CRITICAL"].includes(findingLevel(finding)));
  const criticalSecurity = security.filter(isCriticalFinding);
  const criticalPerformance = performance.filter(isCriticalFinding);
  const regressions = [...security, ...performance].filter(isExplicitRegression);
  return {
    securityCount: security.length,
    performanceCount: performance.length,
    rlsFindings: rls,
    actionableSecurity,
    actionablePerformance,
    criticalSecurity,
    criticalPerformance,
    regressions,
    historicalSecurity: actionableSecurity.filter((finding) => !isCriticalFinding(finding) && !isExplicitRegression(finding)),
    historicalPerformance: actionablePerformance.filter((finding) => !isCriticalFinding(finding) && !isExplicitRegression(finding)),
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
  const sqlClassification = classifyMigrationSql(sql, entry);
  const rlsPolicyChanges = /\b(?:create|alter|drop)\s+policy\b|\b(?:enable|disable|force)\s+row\s+level\s+security\b/i.test(sql);
  const grantChanges = /\b(?:grant|revoke)\b/i.test(sql);
  const triggerChanges = /\b(?:create|drop|alter)\s+(?:constraint\s+)?trigger\b/i.test(sql);
  const securityDefinerChanges = /\bsecurity\s+definer\b/i.test(sql);
  const transactionLockChanges = /\block\s+table\b|\bpg_advisory_(?:xact_)?lock\b|\bset\s+(?:local\s+)?transaction\b/i.test(sql);
  const rpcChanges = /\b(?:create|replace|drop)\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(sql);
  const createdObjects = extractCreatedObjects(sql);
  const referencedObjects = extractReferencedObjects(sql);
  const dependencyMigrations = referencedObjects
    .filter((objectName) => creationIndex.has(objectName) && creationIndex.get(objectName) < entry.index)
    .map((objectName) => entry.allIds[creationIndex.get(objectName)]);
  const forwardDependencies = referencedObjects
    .filter((objectName) => creationIndex.has(objectName) && creationIndex.get(objectName) > entry.index)
    .map((objectName) => ({ objectName, migration: entry.allIds[creationIndex.get(objectName)] }));
  return {
    id: entry.id,
    file: entry.file,
    sqlSha256: createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex"),
    ...sqlClassification,
    rlsPolicyChanges,
    grantChanges,
    triggerChanges,
    securityDefinerChanges,
    transactionLockChanges,
    rpcChanges,
    createdObjects,
    referencedObjects,
    dependencyMigrations: [...new Set(dependencyMigrations)],
    forwardDependencies,
  };
}

export function isSensitiveMigration(analysis) {
  return Boolean(
    analysis?.reviewedDataMutation
    || analysis?.approval?.proofs?.length
    || analysis?.rlsPolicyChanges
    || analysis?.grantChanges
    || analysis?.triggerChanges
    || analysis?.securityDefinerChanges
    || analysis?.transactionLockChanges,
  );
}

export function readLocalMigrations(root = migrationsRoot, { applicationSource = "" } = {}) {
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
  return entries.map((entry) => ({
    ...analyzeMigration({ ...entry, allIds }, creationIndex),
    sqlContractIssues: findSqlContractCompatibilityIssues(entry.sql, applicationSource),
  }));
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

const ACTIONS_BY_CAUSE = Object.freeze({
  CLI_AUTH_OR_TARGET_UNVERIFIED: "Vérifier l'identité CLI, le projet lié et les permissions sans modifier l'historique.",
  CLI_COMMAND_FAILED: "Corriger l'accès ou la disponibilité de la commande, puis relancer le préflight ; ne pas utiliser migration repair.",
  MIGRATION_HISTORY_DIVERGED: "Arrêter et réconcilier l'historique par une procédure forward-only validée.",
  DRY_RUN_MISMATCH: "Arrêter et comparer la file complète avec db push --dry-run avant toute application.",
  MIGRATION_DATA_RISK: "Revoir la migration et obtenir une preuve SQL éphémère autorisée avant application.",
  MIGRATION_REVIEW_REQUIRED: "Revoir la migration SQL indécidable et obtenir une classification explicite avant application.",
  SQL_FORWARD_DEPENDENCY: "Corriger l'ordre ou la dépendance SQL dans une migration forward-only avant application.",
  SQL_CONTRACT_INCOMPATIBLE: "Coordonner la compatibilité du contrat SQL avec les consommateurs existants avant application.",
  SENSITIVE_PROOF_INVALID: "Fournir une preuve SQL éphémère valide dont les empreintes exactes et la provenance correspondent aux migrations et tests sensibles en attente.",
  SECURITY_ADVISOR_CRITICAL: "Résoudre le risque de sécurité critique avant application.",
  ADVISOR_REGRESSION: "Résoudre la régression Advisor explicitement attribuée à la file avant application.",
});

export const PREFLIGHT_SUCCESS_STATUSES = Object.freeze(["ALIGNED", "READY_TO_APPLY"]);

export function preflightExitCode(status) {
  return PREFLIGHT_SUCCESS_STATUSES.includes(status) ? 0 : 2;
}

export function firstBlockingMigration(pending = [], analyses = [], causes = []) {
  const explicitCause = causes.find((cause) => cause.migrationId && pending.includes(cause.migrationId));
  if (explicitCause) return explicitCause.migrationId;
  const risky = analyses.find((entry) => pending.includes(entry.id)
    && (entry.destructive || entry.dataMutation || entry.reviewRequired || entry.forwardDependencies?.length || entry.sqlContractIssues?.length));
  if (risky) return risky.id;
  return causes.length > 0 ? "GLOBAL" : "NONE";
}

export function actionRequiredForCauses(causes = []) {
  return causes.map((cause) => ACTIONS_BY_CAUSE[cause.code] ?? "Analyser la cause indiquée et obtenir une validation explicite avant mutation.")[0] ?? "Aucune action requise.";
}

function normalizedFileSha256(filePath) {
  const normalized = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalized).digest("hex");
}

function findMatchingProofFiles(analysis, root = repoRoot) {
  const objects = new Set([
    ...(analysis.createdObjects ?? []),
    ...(analysis.referencedObjects ?? []),
  ]);
  if (objects.size === 0) return [];
  const matches = [];
  const candidateDirs = [
    { rel: "apps/web/supabase/tests", pattern: /\.sql$/ },
    { rel: "e2e", pattern: /(?:\.sql|-concurrency\.mjs)$/ },
  ];
  for (const { rel, pattern } of candidateDirs) {
    const absDir = path.join(root, rel);
    if (!fs.existsSync(absDir)) continue;
    for (const file of fs.readdirSync(absDir).filter((name) => pattern.test(name)).sort()) {
      const relPath = `${rel}/${file}`;
      const content = fs.readFileSync(path.join(absDir, file), "utf8").toLowerCase();
      if ([...objects].some((objectName) => content.includes(objectName))) {
        matches.push(relPath);
      }
    }
  }
  return matches;
}

export function buildSensitiveExpectedDigests(
  sensitiveAnalyses = [],
  { allAnalyses = [], pendingIds = [], root = repoRoot, extraProofPaths = [] } = {},
) {
  const digests = {};
  const missingFiles = [];
  const missingProofDeclarations = [];
  const byId = new Map(allAnalyses.map((entry) => [entry.id, entry]));

  const addFileDigest = (relPath) => {
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) {
      missingFiles.push(relPath);
      return false;
    }
    digests[relPath] = normalizedFileSha256(abs);
    return true;
  };

  for (const analysis of sensitiveAnalyses) {
    const migrationPath = analysis.approval?.path ?? (analysis.file ? `apps/web/supabase/migrations/${analysis.file}` : "");
    if (!migrationPath) {
      missingFiles.push(analysis.id ?? "UNKNOWN_MIGRATION");
    } else {
      addFileDigest(migrationPath);
    }
    for (const depId of analysis.dependencyMigrations ?? []) {
      const depEntry = byId.get(depId);
      const depPath = depEntry?.approval?.path ?? (depEntry?.file ? `apps/web/supabase/migrations/${depEntry.file}` : "");
      if (depPath) addFileDigest(depPath);
    }
    for (const pendingId of pendingIds) {
      if (pendingId < analysis.id) {
        const pendingDep = byId.get(pendingId);
        const pendingPath = pendingDep?.approval?.path ?? (pendingDep?.file ? `apps/web/supabase/migrations/${pendingDep.file}` : "");
        if (pendingPath) addFileDigest(pendingPath);
      }
    }
    const approvalProofs = (analysis.approval?.proofs ?? []).map((proof) => proof.path);
    const matchedProofs = approvalProofs.length > 0 ? [] : findMatchingProofFiles(analysis, root);
    const allProofPaths = [...new Set([...approvalProofs, ...matchedProofs, ...extraProofPaths])];
    if (allProofPaths.length === 0) {
      missingProofDeclarations.push(analysis.id);
    }
    for (const proofPath of allProofPaths) {
      addFileDigest(proofPath);
    }
  }
  return {
    digests,
    missingFiles: [...new Set(missingFiles)],
    missingProofDeclarations: [...new Set(missingProofDeclarations)],
  };
}

function readEvidencePayload({ argv = [], env = {} } = {}, root = repoRoot) {
  const argPath = argv.find((arg) => arg.startsWith("--evidence="))?.slice("--evidence=".length);
  const candidates = [
    argPath,
    env.CMM_SUPABASE_EVIDENCE_PATH,
    "artifacts/ci/supabase-sql-evidence.json",
    "artifacts/ci-public-evidence/evidence/supabase-sql.json",
  ].filter(Boolean);
  for (const candidate of candidates) {
    const abs = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
    if (fs.existsSync(abs)) {
      try {
        return JSON.parse(fs.readFileSync(abs, "utf8"));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function evaluatePreflight({
  projectRef,
  projectMatched = false,
  authSource = "UNKNOWN",
  history,
  dryRunIds = [],
  analyses = [],
  advisors = { rlsFindings: [], actionableSecurity: [], actionablePerformance: [], criticalSecurity: [], criticalPerformance: [], regressions: [] },
  commandFailures = [],
  evidence = null,
  expectedDigests = null,
  extraProofPaths = [],
  verifyGitHubRun,
  root = repoRoot,
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
  const pendingAnalyses = analyses.filter((entry) => pending.includes(entry.id));
  for (const analysis of pendingAnalyses) {
    if (analysis.destructive || analysis.dataMutation) {
      causes.push({ code: "MIGRATION_DATA_RISK", migrationId: analysis.id, detail: `${analysis.id} contains data-mutating or destructive SQL.` });
    }
    if (analysis.reviewRequired) {
      causes.push({ code: "MIGRATION_REVIEW_REQUIRED", migrationId: analysis.id, detail: `${analysis.id} contains SQL whose execution timing cannot be classified safely.` });
    }
    if (analysis.forwardDependencies?.length) {
      causes.push({ code: "SQL_FORWARD_DEPENDENCY", migrationId: analysis.id, dependencies: analysis.forwardDependencies, detail: `${analysis.id} references objects created by a later migration.` });
    }
  }
  const sensitiveAnalyses = pendingAnalyses.filter(isSensitiveMigration);
  let sensitiveProofStatus = "NOT_REQUIRED";
  if (sensitiveAnalyses.length > 0) {
    const digestSource = expectedDigests
      ? { digests: expectedDigests, missingFiles: [], missingProofDeclarations: [] }
      : buildSensitiveExpectedDigests(sensitiveAnalyses, { allAnalyses: analyses, pendingIds: pending, root, extraProofPaths });
    if (digestSource.missingProofDeclarations.length > 0) {
      sensitiveProofStatus = "BLOCKED";
      causes.push({
        code: "SENSITIVE_PROOF_INVALID",
        migrationId: digestSource.missingProofDeclarations[0],
        detail: `Sensitive migration(s) lack required PostgreSQL/RLS/trigger/concurrency proof declarations: ${digestSource.missingProofDeclarations.join(", ")}`,
      });
    } else if (digestSource.missingFiles.length > 0) {
      sensitiveProofStatus = "BLOCKED";
      causes.push({
        code: "SENSITIVE_PROOF_INVALID",
        migrationId: sensitiveAnalyses[0].id,
        detail: `Missing canonical proof input(s): ${digestSource.missingFiles.join(", ")}`,
      });
    } else {
      const proofResult = validateEphemeralEvidence({
        evidence,
        expectedDigests: digestSource.digests,
        pendingIds: pending,
        verifyGitHubRun,
      });
      if (!proofResult.valid) {
        sensitiveProofStatus = "BLOCKED";
        causes.push({
          code: "SENSITIVE_PROOF_INVALID",
          migrationId: sensitiveAnalyses[0].id,
          detail: proofResult.reason,
        });
      } else {
        sensitiveProofStatus = "PASS";
      }
    }
  }
  if (pending.length > 0 && (advisors.criticalSecurity?.length || advisors.criticalPerformance?.length)) {
    causes.push({ code: "SECURITY_ADVISOR_CRITICAL", detail: `${(advisors.criticalSecurity?.length ?? 0) + (advisors.criticalPerformance?.length ?? 0)} critical Advisor finding(s) require resolution.` });
  }
  if (pending.length > 0 && advisors.regressions?.length) {
    causes.push({ code: "ADVISOR_REGRESSION", detail: `${advisors.regressions.length} Advisor regression(s) are explicitly attributed to the pending lot.` });
  }
  for (const analysis of pendingAnalyses) {
    if (analysis.sqlContractIssues?.length) {
      causes.push({ code: "SQL_CONTRACT_INCOMPATIBLE", migrationId: analysis.id, contracts: analysis.sqlContractIssues, detail: `${analysis.id} removes SQL contracts used by existing application consumers.` });
    }
  }
  let status = "READY_TO_APPLY";
  if (causes.some((cause) => cause.code === "MIGRATION_HISTORY_DIVERGED" || cause.code === "DRY_RUN_MISMATCH")) status = "DIVERGED";
  else if (causes.length > 0) status = "BLOCKED";
  else if (pending.length === 0) status = "ALIGNED";
  return {
    status,
    causes,
    pending,
    projectRef,
    pendingCount: pending.length,
    sensitivePendingCount: sensitiveAnalyses.length,
    sensitiveProofStatus,
    firstBlockingMigration: firstBlockingMigration(pending, analyses, causes),
    actionRequired: actionRequiredForCauses(causes),
  };
}

function cliAuthSource(env = process.env) {
  if (String(env.SUPABASE_ACCESS_TOKEN ?? "").trim()) return "ENV_SECRET";
  return "NATIVE_CREDENTIAL_STORE";
}

function readApplicationSource() {
  const sourceRoot = path.join(repoRoot, "apps", "web", "src");
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(fs.readFileSync(entryPath, "utf8"));
    }
  };
  visit(sourceRoot);
  return files.join("\n");
}

export function buildReadOnlyCommandArgs(projectRef) {
  return READ_ONLY_COMMANDS.map((args) => args.map((arg) => arg === "<linked-ref>" ? projectRef : arg));
}

export function runPreflight({ argv = process.argv.slice(2), env = process.env, runner = runSupabase, migrationRoot = migrationsRoot } = {}) {
  if (!argv.includes("--dry-run")) throw new Error("--dry-run is mandatory; this preflight has no mutating mode.");
  const projectRef = resolveProjectRef({ argv, env });
  const localEntries = readLocalMigrations(migrationRoot, { applicationSource: readApplicationSource() });
  const commands = buildReadOnlyCommandArgs(projectRef);
  const run = (args) => runner(args);
  const projectsParsed = runAndParseWithRunner(run, commands[0], "Supabase projects list");
  const projectsResult = projectsParsed.result;
  const projects = projectsParsed.payload;
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
    : { rlsFindings: [], actionableSecurity: [], actionablePerformance: [], criticalSecurity: [], criticalPerformance: [], regressions: [] };
  const commandFailures = [projectsParsed, ...parsed]
    .filter((entry) => entry.result?.status !== 0 || entry.error)
    .map((entry) => entry.label ?? "Supabase projects list");
  const extraProofPaths = argv.filter((arg) => arg.startsWith("--proof=")).map((arg) => arg.slice("--proof=".length)).filter(Boolean);
  const summary = evaluatePreflight({
    projectRef,
    projectMatched,
    authSource: projectMatched && projectsResult.status === 0 ? cliAuthSource(env) : "UNKNOWN",
    history,
    dryRunIds,
    analyses: localEntries,
    advisors,
    commandFailures,
    evidence: readEvidencePayload({ argv, env }),
    extraProofPaths,
  });
  return {
    ...summary,
    authSource: projectMatched && projectsResult.status === 0 ? cliAuthSource(env) : "UNKNOWN",
    localCount: localEntries.length,
    remoteAppliedCount: history?.remoteIds.length ?? 0,
    dryRunIds,
    pendingExecutedDmlCount: localEntries.filter((entry) => history?.pending?.includes(entry.id) && entry.dataMutation).length,
    pendingReviewedBackfillCount: localEntries.filter((entry) => history?.pending?.includes(entry.id) && entry.reviewedDataMutation).length,
    pendingReviewRequiredCount: localEntries.filter((entry) => history?.pending?.includes(entry.id) && entry.reviewRequired).length,
    pendingEmbeddedFunctionDmlCount: localEntries.filter((entry) => history?.pending?.includes(entry.id) && entry.embeddedDml).length,
    pendingSqlContractIssueCount: localEntries.reduce((count, entry) => count + (history?.pending?.includes(entry.id) ? entry.sqlContractIssues?.length ?? 0 : 0), 0),
    advisors: {
      securityCount: advisors.securityCount ?? 0,
      performanceCount: advisors.performanceCount ?? 0,
      rlsCount: advisors.rlsFindings?.length ?? 0,
      actionableSecurityCount: advisors.actionableSecurity?.length ?? 0,
      actionablePerformanceCount: advisors.actionablePerformance?.length ?? 0,
      criticalSecurityCount: advisors.criticalSecurity?.length ?? 0,
      criticalPerformanceCount: advisors.criticalPerformance?.length ?? 0,
      regressionCount: advisors.regressions?.length ?? 0,
      historicalSecurityCount: advisors.historicalSecurity?.length ?? 0,
      historicalPerformanceCount: advisors.historicalPerformance?.length ?? 0,
    },
    branchesRead: branches.result?.status === 0,
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
  console.log(`PENDING_EXECUTED_DML: ${summary.pendingExecutedDmlCount ?? 0}`);
  console.log(`PENDING_REVIEWED_BACKFILLS: ${summary.pendingReviewedBackfillCount ?? 0}`);
  console.log(`PENDING_REVIEW_REQUIRED: ${summary.pendingReviewRequiredCount ?? 0}`);
  console.log(`PENDING_EMBEDDED_FUNCTION_DML: ${summary.pendingEmbeddedFunctionDmlCount ?? 0}`);
  console.log(`PENDING_SQL_CONTRACT_ISSUES: ${summary.pendingSqlContractIssueCount ?? 0}`);
  console.log(`SENSITIVE_PENDING_MIGRATIONS: ${summary.sensitivePendingCount ?? 0}`);
  console.log(`SENSITIVE_PROOF_STATUS: ${summary.sensitiveProofStatus ?? "NOT_REQUIRED"}`);
  console.log(`SECURITY_ADVISOR_FINDINGS: ${summary.advisors.securityCount}`);
  console.log(`RLS_FINDINGS: ${summary.advisors.rlsCount}`);
  console.log(`PERFORMANCE_ADVISOR_FINDINGS: ${summary.advisors.performanceCount}`);
  console.log(`CRITICAL_ADVISOR_FINDINGS: ${(summary.advisors.criticalSecurityCount ?? 0) + (summary.advisors.criticalPerformanceCount ?? 0)}`);
  console.log(`ADVISOR_REGRESSIONS: ${summary.advisors.regressionCount ?? 0}`);
  console.log(`HISTORICAL_ADVISOR_WARNINGS: ${(summary.advisors.historicalSecurityCount ?? 0) + (summary.advisors.historicalPerformanceCount ?? 0)}`);
  console.log(`FIRST_BLOCKING_MIGRATION: ${summary.firstBlockingMigration}`);
  console.log(`ACTION_REQUIRED: ${summary.actionRequired}`);
  console.log(`REMOTE_WRITES: ${summary.remoteWrites}`);
  for (const cause of summary.causes) console.log(`CAUSE: ${cause.code} — ${cause.detail}`);
}

function main() {
  try {
    const summary = runPreflight();
    printSummary(summary);
    process.exitCode = PREFLIGHT_STATUSES.includes(summary.status) ? preflightExitCode(summary.status) : 2;
  } catch (error) {
    console.error("PREFLIGHT_STATUS: BLOCKED");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
