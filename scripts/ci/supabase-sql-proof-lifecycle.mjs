import { readFileSync } from "node:fs";

export const WORKFLOW_STAGES = ["bootstrap", "dbReset", "migrations", "seed", "schemaSeedValidation", "sqlProofRunner"];

export function stageRecord(stage, status = "NOT_RUN", extra = {}) {
  return { stage, status, origin: "UNPROVEN", ...extra };
}

function parseFirstJsonObject(output) {
  const text = String(output ?? "");
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, index + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function readExistingWorkflowStages(candidate, evidencePath) {
  try {
    const prior = JSON.parse(readFileSync(evidencePath, "utf8"));
    if (prior.candidateSha !== candidate || prior.headSha !== candidate || prior.kind !== "cleanmymap-supabase-sql-evidence") return [];
    return Array.isArray(prior.workflowStages) ? prior.workflowStages.filter((entry) => WORKFLOW_STAGES.includes(entry.stage)) : [];
  } catch {
    return [];
  }
}

export function classifyDbResetFailure(output, code) {
  const text = String(output ?? "");
  const sqlstateMatch = text.match(/\b(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})\b/i);
  const sqlstate = sqlstateMatch?.[1]?.toUpperCase() ?? null;
  const migrationMatches = [...text.matchAll(/\bApplying migration\s+([0-9]{14})\b/gi)];
  const migrationIds = [...new Set(migrationMatches.map((match) => match[1]))];
  const seedMatch = /\bseeding\s+(?:data|from)\b/i.exec(text);
  const seedStarted = seedMatch !== null && sqlstateMatch !== null && sqlstateMatch.index > seedMatch.index;
  const terminalLines = text.split(/\r?\n/u).filter((line) => /\b(?:error|fatal|failed|unable|could not|cannot|connection refused|connection timed out|context deadline exceeded|unhealthy|exited)\b/i.test(line)).join("\n");
  const infrastructure = /\b(?:failed to create (?:a )?network|network (?:not found|unavailable|failed)|connection refused|connection timed out|context deadline exceeded|failed to start|container (?:unhealthy|exited)|docker (?:daemon|engine).*(?:unavailable|failed|error))\b/i.test(terminalLines) || /^08[A-Z0-9]{3}$/.test(sqlstate ?? "");
  const lastMigration = migrationMatches.at(-1);
  const sqlstateInMigrationPhase = lastMigration !== undefined && sqlstateMatch !== null && sqlstateMatch.index > lastMigration.index && (!seedMatch || sqlstateMatch.index < seedMatch.index);
  if (infrastructure) return { category: "INFRASTRUCTURE_FAILURE", origin: "INFRASTRUCTURE", sqlstate, migrationId: null, code };
  if (seedStarted && sqlstate) return { category: "SEED_FAILURE", origin: "SEED", sqlstate, migrationId: null, code };
  if (sqlstate && migrationMatches.length > 0 && sqlstateInMigrationPhase && /\b(?:ERROR|FATAL):/i.test(text)) {
    return { category: "MIGRATION_FAILURE", origin: "MIGRATION_REPLAY", sqlstate, migrationId: migrationIds.length === 1 ? migrationIds[0] : null, code };
  }
  return { category: "RESET_FAILURE_UNCLASSIFIED", origin: "UNPROVEN", sqlstate, migrationId: null, code };
}

export function createEvidenceReport(candidate, { inventorySqlProofs, prioritizePaths, baseRecord, migrationEvidence, env = process.env }) {
  const inventory = inventorySqlProofs();
  const priorityPaths = String(env.CMM_SUPABASE_PRIORITY_FILES ?? "").split(",").map((path) => path.trim()).filter(Boolean);
  const records = [
    ...prioritizePaths(inventory.pgtap, priorityPaths).map((path) => baseRecord(path, "PGTAP")),
    ...inventory.contracts.map((path) => baseRecord(path, "SQL_CONTRACT")),
    ...inventory.multisession.map((path) => baseRecord(path, "MULTISESSION")),
  ];
  for (const path of inventory.unregistered) records.push({ path, category: "UNREGISTERED_SQL_PROOF", status: "DB_SEMANTICS_NOT_EXECUTED", outcome: "NOT_RUN", reason: "No canonical runner protocol is registered for this SQL proof." });
  return { schemaVersion: 2, kind: "cleanmymap-supabase-sql-evidence", candidateSha: candidate, headSha: candidate, provenance: "COMMITTED_SNAPSHOT", workflow: "supabase-sql-proof-ephemeral", outcome: "NOT_RUN", migrations: migrationEvidence(), records, workflowStages: WORKFLOW_STAGES.map((stage) => stageRecord(stage)) };
}

export function initializeWorkflowEvidence({ candidateSha, createEvidenceReport, writeReport }) {
  const report = createEvidenceReport(candidateSha());
  report.workflowStages = WORKFLOW_STAGES.map((stage) => stageRecord(stage));
  writeReport(report);
  console.log(`SUPABASE_SQL_EVIDENCE: INITIALIZED candidate=${report.candidateSha}`);
  return 0;
}

export async function runCanonicalReset({ assertEphemeralSupabaseTestEnvironment, candidateSha, evidencePath, runCommand, commandName, writeReport }) {
  assertEphemeralSupabaseTestEnvironment();
  const candidate = candidateSha();
  const report = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (report.candidateSha !== candidate || report.headSha !== candidate) throw new Error("SQL evidence candidate does not match the reset candidate.");
  const networkId = String(process.env.CMM_SUPABASE_NETWORK_ID ?? "").trim();
  const args = ["db", "reset", "--local", "--workdir", "apps/web", "--yes", ...(networkId ? [`--network-id=${networkId}`] : [])];
  let result;
  try {
    result = await runCommand(commandName(), args, { logName: "canonical-db-reset", timeoutMs: 20 * 60 * 1000 });
  } catch {
    const failure = { category: "RESET_PROCESS_START_FAILED", origin: "PROCESS", sqlstate: null, migrationId: null, code: null };
    report.workflowStages = [stageRecord("bootstrap", "PASS"), stageRecord("dbReset", "FAIL", { ...failure, failure }), stageRecord("migrations", "INCONCLUSIVE", { failure }), stageRecord("seed", "NOT_RUN", { reason: "database reset process did not start" }), stageRecord("schemaSeedValidation")];
    report.outcome = "FAIL";
    report.firstFailure = { stage: "dbReset", ...failure };
    writeReport(report);
    throw new Error("Canonical Supabase database reset process could not be started.");
  }
  if (result.code === 0 && !result.timedOut) {
    report.workflowStages = [stageRecord("bootstrap", "PASS", { origin: "SUPABASE_START" }), stageRecord("dbReset", "PASS", { origin: "CANONICAL_DB_RESET" }), stageRecord("migrations", "PASS", { origin: "CANONICAL_DB_RESET" }), stageRecord("seed", "PASS", { origin: "CANONICAL_DB_RESET" }), ...(report.workflowStages ?? []).filter(({ stage }) => stage === "schemaSeedValidation")];
    writeReport(report);
    console.log("SUPABASE_DB_RESET: PASS migrations=PASS seed=PASS");
    return 0;
  }
  const failure = result.timedOut
    ? { category: "RESET_TIMEOUT", origin: "PROCESS", sqlstate: null, migrationId: null, code: result.code }
    : classifyDbResetFailure(result.output, result.code);
  const migrationStatus = failure.origin === "MIGRATION_REPLAY" ? "FAIL" : failure.origin === "SEED" ? "PASS" : "INCONCLUSIVE";
  const seedStatus = failure.origin === "SEED" ? "FAIL" : failure.origin === "MIGRATION_REPLAY" ? "NOT_RUN" : "INCONCLUSIVE";
  report.workflowStages = [
    ...(report.workflowStages ?? []).filter(({ stage }) => stage !== "bootstrap" && stage !== "dbReset" && stage !== "migrations" && stage !== "seed"),
    stageRecord("bootstrap", "PASS", { origin: "SUPABASE_START" }),
    stageRecord("dbReset", "FAIL", { origin: failure.origin, failure: { category: failure.category }, ...(failure.sqlstate ? { sqlstate: failure.sqlstate } : {}) }),
    stageRecord("migrations", migrationStatus, { origin: failure.origin, failure: { category: failure.category }, ...(failure.migrationId ? { migrationId: failure.migrationId } : {}), ...(failure.sqlstate ? { sqlstate: failure.sqlstate } : {}) }),
    stageRecord("seed", seedStatus, { origin: failure.origin, ...(failure.sqlstate && failure.origin === "SEED" ? { sqlstate: failure.sqlstate } : {}), ...(seedStatus === "NOT_RUN" ? { reason: "migration replay failed before seed" } : {}) }),
  ].sort((left, right) => WORKFLOW_STAGES.indexOf(left.stage) - WORKFLOW_STAGES.indexOf(right.stage));
  report.outcome = "FAIL";
  const failureStage = failure.origin === "SEED" ? "seed" : failure.origin === "MIGRATION_REPLAY" ? "migrations" : "dbReset";
  const migrationPath = failure.migrationId ? report.migrations.find(({ id }) => id === failure.migrationId)?.path : null;
  report.firstFailure = { stage: failureStage, ...failure, ...(migrationPath ? { file: migrationPath } : {}) };
  writeReport(report);
  console.error(`SUPABASE_DB_RESET: FAIL category=${failure.category} origin=${failure.origin}${failure.sqlstate ? ` sqlstate=${failure.sqlstate}` : ""}`);
  return 1;
}

export async function verifyCanonicalSchemaSeed({ assertEphemeralSupabaseTestEnvironment, candidateSha, evidencePath, runCommand, commandName, writeReport, networkArgs }) {
  assertEphemeralSupabaseTestEnvironment();
  const candidate = candidateSha();
  const report = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (report.candidateSha !== candidate || report.headSha !== candidate) throw new Error("SQL evidence candidate does not match the schema-validation candidate.");
  const prefix = ["--workdir", "apps/web", ...networkArgs()];
  let statusResult;
  try {
    statusResult = await runCommand(commandName(), ["status", ...prefix, "--output", "json"], { logName: "canonical-schema-status" });
  } catch {
    return recordSchemaValidationFailure(report, "SCHEMA_STATUS_START_FAILED", "PROCESS", writeReport);
  }
  if (statusResult.code !== 0 || statusResult.timedOut) {
    return recordSchemaValidationFailure(report, statusResult.timedOut ? "SCHEMA_STATUS_TIMEOUT" : "SCHEMA_STATUS_FAILED", "SUPABASE_CLI", writeReport, statusResult.output);
  }
  const status = parseFirstJsonObject(statusResult.output);
  if (!status) return recordSchemaValidationFailure(report, "SCHEMA_STATUS_JSON_INVALID", "SUPABASE_CLI", writeReport);
  if (typeof status.DB_URL !== "string" || status.DB_URL.trim() === "") {
    return recordSchemaValidationFailure(report, "SCHEMA_STATUS_DB_URL_MISSING", "SUPABASE_CLI", writeReport);
  }
  let databaseUrl;
  try {
    databaseUrl = new URL(status.DB_URL);
  } catch {
    return recordSchemaValidationFailure(report, "SCHEMA_STATUS_DB_URL_INVALID", "SUPABASE_CLI", writeReport);
  }
  if (databaseUrl.hostname !== "127.0.0.1" && databaseUrl.hostname !== "localhost") {
    return recordSchemaValidationFailure(report, "NON_LOCAL_DATABASE_URL", "ENVIRONMENT_GUARD", writeReport);
  }
  const validationSql = "select case when to_regclass('public.actions') is not null and to_regclass('public.spogomi_events') is not null and exists (select 1 from supabase_migrations.schema_migrations where version ~ '^[0-9]{14}$') and exists (select 1 from public.actions where id = '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid and notes like 'E2E_FIXTURE:group-join:v1%') then 'PASS' else 'FAIL' end";
  let queryResult;
  try {
    queryResult = await runCommand(commandName(), ["db", "query", ...prefix, "--local", validationSql], { logName: "canonical-schema-seed-check" });
  } catch {
    return recordSchemaValidationFailure(report, "SCHEMA_QUERY_START_FAILED", "PROCESS", writeReport);
  }
  const output = String(queryResult.output ?? "");
  const sqlstate = output.match(/\b(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase() ?? null;
  const passed = queryResult.code === 0 && !queryResult.timedOut && /\bPASS\b/.test(output) && !/\bFAIL\b/.test(output);
  if (!passed) return recordSchemaValidationFailure(report, queryResult.timedOut ? "SCHEMA_QUERY_TIMEOUT" : "SCHEMA_SEED_CHECK_FAILED", sqlstate ? "POSTGRESQL" : "SUPABASE_CLI", writeReport, output, sqlstate);
  report.workflowStages = [
    ...(report.workflowStages ?? []).filter(({ stage }) => stage !== "schemaSeedValidation"),
    stageRecord("schemaSeedValidation", "PASS", { origin: "POST_RESET_SQL_CHECK" }),
  ].sort((left, right) => WORKFLOW_STAGES.indexOf(left.stage) - WORKFLOW_STAGES.indexOf(right.stage));
  writeReport(report);
  console.log("SUPABASE_SCHEMA_SEED_VALIDATION: PASS");
  return 0;
}

function recordSchemaValidationFailure(report, category, origin, writeReport, output = "", sqlstate = null) {
  const observedSqlstate = sqlstate ?? String(output).match(/\b(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase() ?? null;
  const failure = { category, origin, ...(observedSqlstate ? { sqlstate: observedSqlstate } : {}) };
  report.workflowStages = [
    ...(report.workflowStages ?? []).filter(({ stage }) => stage !== "schemaSeedValidation"),
    stageRecord("schemaSeedValidation", "FAIL", { ...failure, failure }),
  ].sort((left, right) => WORKFLOW_STAGES.indexOf(left.stage) - WORKFLOW_STAGES.indexOf(right.stage));
  report.outcome = "FAIL";
  report.firstFailure ??= { stage: "schemaSeedValidation", ...failure };
  writeReport(report);
  console.error(`SUPABASE_SCHEMA_SEED_VALIDATION: FAIL category=${category} origin=${origin}${observedSqlstate ? ` sqlstate=${observedSqlstate}` : ""}`);
  return 1;
}

function startupFailureFields(repositoryRoot) {
  try {
    const text = readFileSync(`${repositoryRoot}/artifacts/ci/supabase-start-diagnostic.txt`, "utf8");
    const read = (name) => text.match(new RegExp(`^${name}=([^\\r\\n]*)$`, "m"))?.[1] ?? null;
    const category = read("category");
    const sqlstateValue = read("first_error_sqlstate");
    const diagnosticCode = read("diagnostic_code");
    return {
      origin: "SUPABASE_START_DIAGNOSTIC",
      ...(category && /^[A-Z][A-Z0-9_]{1,63}$/.test(category) ? { category } : { category: "UNCLASSIFIED" }),
      ...(sqlstateValue && /^[0-9A-Z]{5}$/.test(sqlstateValue) ? { sqlstate: sqlstateValue } : {}),
      ...(diagnosticCode && /^SUPABASE_START_[A-Z0-9_]{1,64}$/.test(diagnosticCode) ? { diagnosticCode } : {}),
    };
  } catch {
    return { origin: "UNPROVEN", category: "UNCLASSIFIED" };
  }
}

export function finalizeWorkflowEvidence({ candidateSha, evidencePath, readFileSync: readFile, writeReport, createEvidenceReport, repositoryRoot }) {
  const candidate = candidateSha();
  let report;
  try { report = JSON.parse(readFile(evidencePath, "utf8")); } catch { report = createEvidenceReport(candidate); }
  if (report.candidateSha !== candidate || report.headSha !== candidate) throw new Error("Refusing to finalize evidence for a different candidate SHA.");
  const outcome = (name) => String(process.env[`CMM_STEP_${name}`] ?? "NOT_RUN").toUpperCase();
  const byName = new Map((report.workflowStages ?? []).map((stage) => [stage.stage, stage]));
  const bootstrapOutcome = outcome("BOOTSTRAP");
  const schemaOutcome = outcome("SCHEMA_SEED");
  const sqlProofOutcome = outcome("SQL_PROOF");
  if (!byName.has("bootstrap") || byName.get("bootstrap").status === "NOT_RUN") {
    const failed = bootstrapOutcome === "FAILURE";
    const interrupted = bootstrapOutcome === "CANCELLED";
    const failure = failed ? startupFailureFields(repositoryRoot) : interrupted ? { origin: "PROCESS", category: "PROCESS_INTERRUPTED" } : null;
    byName.set("bootstrap", stageRecord("bootstrap", bootstrapOutcome === "SUCCESS" ? "PASS" : failed ? "FAIL" : interrupted ? "INCONCLUSIVE" : "NOT_RUN", failed || interrupted ? { ...failure, failure } : { origin: bootstrapOutcome === "SUCCESS" ? "SUPABASE_START" : "UNPROVEN" }));
  }
  const resetOutcome = outcome("DB_RESET");
  const resetNotReached = resetOutcome === "SKIPPED" || bootstrapOutcome === "FAILURE" || bootstrapOutcome === "CANCELLED";
  const missingResetStageStatus = resetNotReached ? "NOT_RUN" : "INCONCLUSIVE";
  const resetNotReachedReason = resetNotReached ? "bootstrap failed or was interrupted before canonical db reset" : "canonical db reset did not write a stage result";
  if (!byName.has("migrations") || byName.get("migrations").status === "NOT_RUN") byName.set("migrations", stageRecord("migrations", missingResetStageStatus, { origin: "UNPROVEN", reason: resetNotReachedReason }));
  if (!byName.has("seed") || byName.get("seed").status === "NOT_RUN") byName.set("seed", stageRecord("seed", missingResetStageStatus, { origin: "UNPROVEN", reason: resetNotReachedReason }));
  if (!byName.has("dbReset") || (byName.get("dbReset").status === "NOT_RUN" && ["FAILURE", "CANCELLED"].includes(resetOutcome))) {
    const resetFailed = resetOutcome === "FAILURE";
    const resetInterrupted = resetOutcome === "CANCELLED";
    byName.set("dbReset", stageRecord("dbReset", resetFailed ? "FAIL" : resetInterrupted ? "INCONCLUSIVE" : "NOT_RUN", {
      origin: resetInterrupted ? "PROCESS" : "UNPROVEN",
      ...(resetFailed ? { failure: { category: "RESET_WRAPPER_FAILED" } } : resetInterrupted ? { failure: { category: "PROCESS_INTERRUPTED" } } : {}),
    }));
  }
  if (!byName.has("schemaSeedValidation") || byName.get("schemaSeedValidation").status === "NOT_RUN") {
    const interrupted = schemaOutcome === "CANCELLED";
    byName.set("schemaSeedValidation", stageRecord("schemaSeedValidation", schemaOutcome === "SUCCESS" ? "PASS" : schemaOutcome === "FAILURE" ? "FAIL" : interrupted ? "INCONCLUSIVE" : "NOT_RUN", {
      origin: schemaOutcome === "SUCCESS" ? "POST_RESET_SQL_CHECK" : interrupted ? "PROCESS" : "UNPROVEN",
      ...(schemaOutcome === "FAILURE" ? { failure: { category: "SCHEMA_SEED_VALIDATION_FAILED" } } : interrupted ? { failure: { category: "PROCESS_INTERRUPTED" } } : {}),
    }));
  }
  const sqlProofInterrupted = sqlProofOutcome === "CANCELLED";
  byName.set("sqlProofRunner", stageRecord("sqlProofRunner", sqlProofOutcome === "SUCCESS" ? "PASS" : sqlProofOutcome === "FAILURE" ? "FAIL" : sqlProofInterrupted ? "INCONCLUSIVE" : "NOT_RUN", {
    origin: sqlProofOutcome === "SUCCESS" ? "CANONICAL_SQL_PROOF_RUNNER" : sqlProofInterrupted ? "PROCESS" : "UNPROVEN",
    ...(sqlProofOutcome === "FAILURE" ? { failure: { category: "SQL_PROOF_RUNNER_FAILED" } } : sqlProofInterrupted ? { failure: { category: "PROCESS_INTERRUPTED" } } : {}),
  }));
  report.workflowStages = WORKFLOW_STAGES.map((stage) => byName.get(stage));
  const failed = report.workflowStages.find(({ status }) => status === "FAIL" || status === "INCONCLUSIVE" || status === "NOT_RUN");
  if (failed) {
    report.outcome = "FAIL";
    report.firstFailure ??= { stage: failed.stage, origin: failed.origin, category: failed.failure?.category ?? failed.category ?? "STAGE_NOT_PASSED", ...(failed.sqlstate ? { sqlstate: failed.sqlstate } : {}) };
  }
  writeReport(report);
  console.log(`SUPABASE_SQL_EVIDENCE: FINALIZED outcome=${report.outcome} candidate=${candidate}`);
  return report.outcome === "PASS" ? 0 : 1;
}
