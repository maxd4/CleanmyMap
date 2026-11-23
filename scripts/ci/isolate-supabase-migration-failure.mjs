#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationDirectory = resolve(root, "apps/web/supabase/migrations");
const cli = resolve(root, "node_modules/.bin/supabase");
const comparisonMigrationVersion = "20261121000002";
const allowedTypes = new Set([
  "smallint", "integer", "bigint", "numeric", "real", "double precision", "boolean",
  "character", "character varying", "text", "uuid", "json", "jsonb", "date", "time",
  "timestamp", "timestamp with time zone", "timestamp without time zone", "interval",
  "inet", "cidr", "macaddr", "bytea", "enum", "array",
]);

function run(command, args, { cwd, env = process.env, privateLog, allowFailure = false, input } = {}) {
  const result = spawnSync(command, args, { cwd, env, input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (privateLog) writeFileSync(privateLog, output, { mode: 0o600 });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`isolated replay command failed (${basename(command)} ${args[0] ?? ""}); private output retained only on runner`);
  }
  return { status: result.status ?? 1, output };
}

function basename(path) {
  return path.split(/[\\/]/u).at(-1);
}

export function extractSafePostgresError(output, migrationVersion) {
  const structured = collectStructuredErrorFields(output);
  const sqlstate = structured.sqlstate
    ?? String(output).match(/(?:SQLSTATE|SQL\s+state)\s*[:=]?\s*([0-9A-Z]{5})/iu)?.[1]?.toUpperCase()
    ?? String(output).match(/\bERROR\s*:\s*([0-9A-Z]{5})\s*:/iu)?.[1]?.toUpperCase()
    ?? "unavailable";
  const position = structured.position
    ?? Number(String(output).match(/(?:position|character)\s*[:=]?\s*(\d+)/iu)?.[1] ?? NaN);
  const errorText = [structured.message, String(output)].filter(Boolean).join(" ");
  const typeCandidate = errorText.match(/invalid input syntax for type ([a-z][a-z0-9_ ]*):/iu)?.[1]?.trim().toLowerCase();
  const type = typeCandidate && allowedTypes.has(typeCandidate) ? typeCandidate : "unavailable";
  return {
    migrationVersion,
    sqlstate: /^[0-9A-Z]{5}$/u.test(sqlstate) ? sqlstate : "unavailable",
    expectedType: type,
    statementPosition: Number.isSafeInteger(position) && position > 0 ? position : null,
  };
}

export function classifyPrivateFailure(output) {
  const text = String(output ?? "");
  if (/cannot use subquery in check constraint/iu.test(text)) return "POSTGRES_CHECK_CONSTRAINT_SUBQUERY";
  if (/\b0A000\b/iu.test(text)) return "POSTGRES_FEATURE_NOT_SUPPORTED";
  if (/\b22P02\b|invalid input syntax for type/iu.test(text)) return "POSTGRES_INVALID_TEXT_REPRESENTATION";
  if (/\b42501\b|permission denied|insufficient privilege/iu.test(text)) return "LOCAL_DATABASE_PERMISSION";
  if (/\bSQLSTATE\s*[:=]?\s*42/iu.test(text)) return "POSTGRES_SQL_DEPENDENCY_OR_SYNTAX";
  if (/connection refused|could not connect|connection timed out/iu.test(text)) return "LOCAL_DATABASE_CONNECTION";
  if (/unknown flag|unknown command|flag provided but not defined/iu.test(text)) return "SUPABASE_CLI_USAGE";
  if (/error|failed|fatal/iu.test(text)) return "UNCLASSIFIED_COMMAND_FAILURE";
  return "NO_ERROR_TEXT_OBSERVED";
}

export function classifyPrefixReplayAttempt(result) {
  if (result.commandError) return "COMMAND_ERROR";
  if (result.status === 0) return "PASS";
  const diagnostic = extractSafePostgresError(result.output, null);
  if (diagnostic.sqlstate !== "unavailable") return "POSTGRES_FAIL";
  const failureClass = classifyPrivateFailure(result.output);
  if (["LOCAL_DATABASE_CONNECTION", "SUPABASE_CLI_USAGE"].includes(failureClass)) return "COMMAND_ERROR";
  return "UNPROVEN_FAILURE";
}

export function compareMigrationExecutors({ cliStatus, cliError = null, psqlStatus, psqlError = null }) {
  if (!["PASS", "FAIL"].includes(cliStatus) || !["PASS", "FAIL"].includes(psqlStatus)) {
    return { result: "INCONCLUSIVE", divergence: null };
  }
  if (cliStatus === "PASS" && psqlStatus === "PASS") {
    return { result: "MATCH", divergence: null };
  }
  if (cliStatus === "FAIL" && psqlStatus === "FAIL" && (!cliError?.sqlstate || !psqlError?.sqlstate)) {
    return { result: "INCONCLUSIVE", divergence: null };
  }
  if (cliStatus === "FAIL" && psqlStatus === "FAIL" && cliError?.sqlstate && cliError.sqlstate === psqlError?.sqlstate) {
    return { result: "MATCH", divergence: null };
  }
  let divergence = "DIFFERENT_POSTGRES_FAILURES";
  if (cliStatus === "FAIL" && psqlStatus === "PASS") divergence = "CLI_FAILS_PSQL_PASSES";
  else if (cliStatus === "PASS" && psqlStatus === "FAIL") divergence = "CLI_PASSES_PSQL_FAILS";
  return { result: "DIVERGED", divergence };
}

export function buildSupplementalPsqlInvocation(sql, dbContainer) {
  return {
    args: ["exec", "-i", dbContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"],
    input: String(sql ?? ""),
  };
}

function collectStructuredErrorFields(output) {
  const text = String(output ?? "").trim();
  const objects = [];
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") objects.push(parsed);
  } catch {
    for (const line of text.split(/\r?\n/u)) {
      const jsonStart = line.indexOf("{");
      if (jsonStart < 0) continue;
      try {
        const parsed = JSON.parse(line.slice(jsonStart));
        if (parsed && typeof parsed === "object") objects.push(parsed);
      } catch {
        // Non-JSON CLI progress lines are ignored; only structured fields below are used.
      }
    }
  }
  let fallback = { sqlstate: null, position: null, message: "" };
  for (const rootObject of objects) {
    const fields = { sqlstate: null, position: null, message: "" };
    const visit = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 8) return;
    for (const [key, nested] of Object.entries(value)) {
      if (/^(?:sqlstate|sql_state|sql_state_code|state_code|code)$/iu.test(key) && /^[0-9A-Z]{5}$/iu.test(String(nested ?? ""))) {
        fields.sqlstate ??= String(nested).toUpperCase();
      } else if (/^(?:position|internalposition|internal_position|character_position|statement_position)$/iu.test(key) && Number.isSafeInteger(Number(nested)) && Number(nested) > 0) {
        fields.position ??= Number(nested);
      } else if (/^(?:message|detail|context|hint)$/iu.test(key) && typeof nested === "string") {
        fields.message = `${fields.message} ${nested}`.trim();
      }
      if (nested && typeof nested === "object") visit(nested, depth + 1);
    }
  };
    visit(rootObject);
    if (fields.sqlstate && fields.sqlstate !== "00000") return fields;
    if (!fallback.sqlstate) fallback.sqlstate = fields.sqlstate;
    if (fallback.position === null) fallback.position = fields.position;
    fallback.message = `${fallback.message} ${fields.message}`.trim();
  }
  return fallback;
}

function collectPrivateStatementFields(value, fields, depth = 0) {
  if (!value || typeof value !== "object" || depth > 8) return;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(?:sqlstate|sql_state|sql_state_code|state_code|code)$/iu.test(key) && /^[0-9A-Z]{5}$/iu.test(String(nested ?? ""))) {
      fields.sqlstate ??= String(nested).toUpperCase();
    } else if (/^(?:statement|query)$/iu.test(key) && typeof nested === "string") {
      fields.statements.push(nested);
    } else if (/^(?:statement_position|internal_position|position|character_position)$/iu.test(key) && Number.isSafeInteger(Number(nested)) && Number(nested) > 0) {
      fields.position ??= Number(nested);
    }
    if (nested && typeof nested === "object") collectPrivateStatementFields(nested, fields, depth + 1);
  }
}

export function locatePrivateStatementSourceLine(output, migrationSql, expectedSqlState) {
  const sqlState = String(expectedSqlState ?? "").toUpperCase();
  if (!/^[0-9A-Z]{5}$/u.test(sqlState)) return null;
  const matches = [];
  for (const line of String(output ?? "").split(/\r?\n/u)) {
    const jsonStart = line.indexOf("{");
    if (jsonStart < 0) continue;
    let parsed;
    try {
      parsed = JSON.parse(line.slice(jsonStart));
    } catch {
      continue;
    }
    const fields = { sqlstate: null, statements: [], position: null };
    collectPrivateStatementFields(parsed, fields);
    if (fields.sqlstate !== sqlState) continue;
    for (const statement of fields.statements) {
      const sourceIndex = String(migrationSql ?? "").indexOf(statement);
      if (sourceIndex < 0 || String(migrationSql).indexOf(statement, sourceIndex + 1) >= 0) continue;
      const sourceLine = String(migrationSql).slice(0, sourceIndex).split("\n").length;
      matches.push({ sourceLine, position: fields.position });
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

function migrationFiles() {
  return readdirSync(migrationDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{14}_.+\.sql$/u.test(entry.name))
    .map((entry) => ({
      version: entry.name.slice(0, 14),
      file: entry.name,
      path: join(migrationDirectory, entry.name),
      sha256: createHash("sha256").update(readFileSync(join(migrationDirectory, entry.name))).digest("hex"),
    }))
    .sort((left, right) => left.version.localeCompare(right.version));
}

function makeTemporaryProject(workdir) {
  const supabaseDir = join(workdir, "supabase");
  mkdirSync(supabaseDir, { recursive: true });
  symlinkSync(migrationDirectory, join(supabaseDir, "migrations"), "dir");
  writeFileSync(join(supabaseDir, "config.toml"), [
    'project_id = "cmm-isolated-replay"',
    "[api]", "enabled = false", "[db]", "major_version = 17", "health_timeout = \"2m\"",
    "[db.migrations]", "enabled = false", "[db.seed]", "enabled = false", "sql_paths = []", "",
  ].join("\n"));
}

function findPostgresContainer() {
  const containerList = run("docker", [
    "ps", "--filter", `label=com.supabase.cli.project=cmm-isolated-replay`, "--format", "{{.ID}} {{.Names}}",
  ], { cwd: root, allowFailure: true }).output;
  return containerList.split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u))
    .find(([, name]) => name?.startsWith("supabase_db_"))?.[0];
}

function readPrivatePostgresLogs(since, privateLog, dbContainer = findPostgresContainer()) {
  if (!dbContainer) return { containerFound: false, dockerOutput: "", serverOutput: "" };
  const log = run("docker", ["logs", "--since", since, dbContainer], { cwd: root, allowFailure: true }).output;
  writeFileSync(privateLog, log, { mode: 0o600 });
  const serverLog = run("docker", ["exec", dbContainer, "sh", "-c", "for file in /var/log/postgresql/*.json /var/lib/postgresql/data/log/*.json; do if [ -f \"$file\" ]; then tail -n 300 \"$file\"; fi; done"], {
    cwd: root,
    allowFailure: true,
    privateLog: join(dirname(privateLog), "postgres-server-query.jsonl"),
  }).output;
  return { containerFound: true, dockerOutput: log, serverOutput: serverLog };
}

function runSupplementalPsqlDiagnostic(migration, migrationIndex, privateDir, replayPrefix) {
  const psqlBase = replayPrefix(migrationIndex, "psql-base-reconstruction");
  if (psqlBase.outcome !== "PASS") {
    return { status: "NOT_RUN_PREDECESSOR_REPLAY_FAILED", exitCode: psqlBase.exitCode, error: null };
  }

  let dbContainer = null;
  try {
    dbContainer = findPostgresContainer() ?? null;
  } catch {
    // The canonical Supabase replay remains authoritative if Docker inspection fails.
  }
  const statementLog = join(privateDir, "statement.log");
  if (!dbContainer) {
    writeFileSync(statementLog, "", { mode: 0o600 });
    return { status: "NOT_RUN_NO_DATABASE", exitCode: null, error: null };
  }

  const originalSql = readFileSync(migration.path, "utf8");
  const invocation = buildSupplementalPsqlInvocation(originalSql, dbContainer);
  const queryStartedAt = new Date(Date.now() - 1000).toISOString();
  let statementRun;
  try {
    statementRun = run("docker", invocation.args, {
      cwd: root,
      allowFailure: true,
      privateLog: statementLog,
      input: invocation.input,
    });
  } catch {
    statementRun = { status: null, commandError: true };
  }
  if (statementRun.commandError) writeFileSync(statementLog, "", { mode: 0o600 });
  const psqlOutput = readFileSync(statementLog, "utf8");
  let postgresLogs = { containerFound: true, dockerOutput: "", serverOutput: "" };
  try {
    postgresLogs = readPrivatePostgresLogs(queryStartedAt, join(privateDir, "postgres-query.jsonl"), dbContainer);
  } catch {
    // PostgreSQL logs supplement psql and never replace its isolated diagnostic.
  }
  const commandError = Boolean(statementRun.commandError);
  const combinedErrorOutput = `${psqlOutput}\n${postgresLogs.serverOutput}`;
  const error = commandError || statementRun.status === 0 ? null : extractSafePostgresError(combinedErrorOutput, migration.version);
  if (error) {
    const sourceLocation = locatePrivateStatementSourceLine(postgresLogs.serverOutput, originalSql, error.sqlstate);
    if (sourceLocation) error.migrationSourceLine = sourceLocation.sourceLine;
  }
  let status = "FAIL";
  if (commandError) status = "COMMAND_ERROR";
  else if (statementRun.status === 0) status = "PASS";
  return {
    status,
    exitCode: commandError ? null : statementRun.status,
    error,
    failureClass: commandError || statementRun.status === 0 ? null : classifyPrivateFailure(psqlOutput),
    postgresContainerFound: postgresLogs.containerFound,
    postgresDockerLogObserved: postgresLogs.dockerOutput.trim().length > 0,
    postgresServerLogObserved: postgresLogs.serverOutput.trim().length > 0,
  };
}

function runMigrationExecutorComparison(migrations, privateDir, replayPrefix) {
  const migrationIndex = migrations.findIndex(({ version }) => version === comparisonMigrationVersion);
  if (migrationIndex < 0) {
    return {
      migrationVersion: null,
      predecessorVersion: null,
      cliStatus: "NOT_RUN",
      psqlStatus: "NOT_RUN",
      result: "INCONCLUSIVE",
    };
  }

  const migration = migrations[migrationIndex];
  const predecessorVersion = migrations[migrationIndex - 1]?.version ?? null;
  const cliAttempt = replayPrefix(migrationIndex + 1, "target-migration-cli-comparison");
  let cliStatus = cliAttempt.outcome;
  if (cliAttempt.outcome === "PASS") cliStatus = "PASS";
  else if (cliAttempt.outcome === "POSTGRES_FAIL") cliStatus = "FAIL";
  const cliError = cliStatus === "FAIL"
    ? extractSafePostgresError(readFileSync(cliAttempt.logPath, "utf8"), migration.version)
    : null;

  let psqlDiagnostic;
  try {
    psqlDiagnostic = runSupplementalPsqlDiagnostic(migration, migrationIndex, privateDir, replayPrefix);
  } catch {
    psqlDiagnostic = { status: "COMMAND_ERROR", exitCode: null, error: null };
  }
  return {
    migrationVersion: migration.version,
    predecessorVersion,
    cliStatus,
    cliError,
    psqlStatus: psqlDiagnostic.status,
    psqlError: psqlDiagnostic.error,
    ...compareMigrationExecutors({
      cliStatus,
      cliError,
      psqlStatus: psqlDiagnostic.status,
      psqlError: psqlDiagnostic.error,
    }),
  };
}

export function findFirstFailedPrefix(length, resetPrefix) {
  if (length < 1) return null;
  if (resetPrefix(length)) return null;
  let low = 0;
  let high = length;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    const success = resetPrefix(middle);
    if (success) low = middle;
    else high = middle;
  }
  return high - 1;
}

export function verifyFailedPrefixBoundary(migrations, firstFailedIndex, replayPrefix) {
  if (!Number.isInteger(firstFailedIndex) || firstFailedIndex < 0 || firstFailedIndex >= migrations.length) {
    return {
      status: "INCONCLUSIVE",
      reason: "NO_CANDIDATE_BOUNDARY",
      migrationVersion: null,
      predecessor: null,
      failing: null,
    };
  }

  const predecessor = replayPrefix(firstFailedIndex, "boundary-predecessor");
  const failing = replayPrefix(firstFailedIndex + 1, "boundary-failure");
  const predecessorPassed = predecessor.outcome === "PASS";
  const failingFailed = failing.outcome === "POSTGRES_FAIL";
  const status = predecessorPassed && failingFailed ? "CONFIRMED" : "INCONCLUSIVE";
  let reason = null;
  if (!predecessorPassed) {
    if (predecessor.outcome === "COMMAND_ERROR") reason = "PREDECESSOR_COMMAND_ERROR";
    else if (predecessor.outcome === "UNPROVEN_FAILURE") reason = "PREDECESSOR_UNPROVEN_FAILURE";
    else reason = "PREDECESSOR_NOT_PASS";
  }
  else if (!failingFailed) {
    if (failing.outcome === "COMMAND_ERROR") reason = "FAILING_PREFIX_COMMAND_ERROR";
    else if (failing.outcome === "UNPROVEN_FAILURE") reason = "FAILING_PREFIX_UNPROVEN_FAILURE";
    else reason = "FAILING_PREFIX_DID_NOT_FAIL";
  }

  return {
    status,
    reason,
    migrationVersion: status === "CONFIRMED" ? migrations[firstFailedIndex].version : null,
    predecessor: {
      prefixLength: firstFailedIndex,
      version: firstFailedIndex > 0 ? migrations[firstFailedIndex - 1].version : null,
      outcome: predecessor.outcome,
      exitCode: predecessor.exitCode,
    },
    failing: {
      prefixLength: firstFailedIndex + 1,
      version: migrations[firstFailedIndex].version,
      outcome: failing.outcome,
      exitCode: failing.exitCode,
    },
    failingAttempt: failing,
  };
}

export function writePrivatePrefixAttempt({ privateDir, attempt, phase, prefixLength, version, result }) {
  const outcome = classifyPrefixReplayAttempt(result);
  const logFile = `prefix-${String(attempt).padStart(3, "0")}-${phase}-${version ?? "empty"}.log`;
  const logPath = join(privateDir, logFile);
  const record = {
    attempt,
    phase,
    prefixLength,
    version,
    outcome,
    exitCode: Number.isInteger(result.status) ? result.status : null,
    logFile,
  };
  writeFileSync(logPath, String(result.output ?? ""), { mode: 0o600 });
  appendFileSync(join(privateDir, "prefix-attempts.jsonl"), `${JSON.stringify(record)}\n`, { mode: 0o600 });
  return { ...record, logPath };
}

export function buildSafeIsolationDiagnostic({ candidateSha, bootstrap, replay, migrationCount, boundary, canonicalError, psqlDiagnostic, migrationComparison }) {
  const confirmed = boundary?.status === "CONFIRMED"
    && boundary.predecessor?.outcome === "PASS"
    && boundary.failing?.outcome === "POSTGRES_FAIL"
    && boundary.failing?.version === boundary.migrationVersion
    && boundary.failing?.prefixLength === boundary.predecessor?.prefixLength + 1;
  const canonical = canonicalError ?? { sqlstate: "unavailable", expectedType: "unavailable", statementPosition: null };
  const psql = psqlDiagnostic ?? { status: "NOT_RUN", exitCode: null, error: null };
  const allowedReasons = new Set([
    "NO_CANDIDATE_BOUNDARY", "PREDECESSOR_COMMAND_ERROR", "PREDECESSOR_NOT_PASS", "PREDECESSOR_UNPROVEN_FAILURE",
    "FAILING_PREFIX_COMMAND_ERROR", "FAILING_PREFIX_UNPROVEN_FAILURE", "FAILING_PREFIX_DID_NOT_FAIL",
    "FULL_PREFIX_SUCCEEDED", "NO_BOUNDARY_RESULT",
  ]);
  const safeAttempt = (attempt) => attempt ? {
    prefixLength: Number.isInteger(attempt.prefixLength) ? attempt.prefixLength : null,
    version: /^\d{14}$/u.test(String(attempt.version ?? "")) ? attempt.version : null,
    outcome: ["PASS", "POSTGRES_FAIL", "COMMAND_ERROR", "UNPROVEN_FAILURE"].includes(attempt.outcome) ? attempt.outcome : "UNKNOWN",
    exitCode: Number.isInteger(attempt.exitCode) ? attempt.exitCode : null,
  } : null;
  const safeVersion = confirmed && /^\d{14}$/u.test(String(boundary.migrationVersion ?? ""))
    ? boundary.migrationVersion
    : null;
  const safeDiagnostic = (error) => ({
    sqlstate: /^[0-9A-Z]{5}$/u.test(String(error?.sqlstate ?? "")) ? error.sqlstate : "unavailable",
    expectedType: allowedTypes.has(String(error?.expectedType ?? "")) ? error.expectedType : "unavailable",
    statementPosition: Number.isSafeInteger(error?.statementPosition) && error.statementPosition > 0 ? error.statementPosition : null,
    migrationSourceLine: Number.isSafeInteger(error?.migrationSourceLine) && error.migrationSourceLine > 0 ? error.migrationSourceLine : null,
  });
  const safeMigrationComparison = (value) => {
    const safeVersion = (version) => /^\d{14}$/u.test(String(version ?? "")) ? version : null;
    const safeCliStatus = ["NOT_RUN", "PASS", "FAIL", "COMMAND_ERROR", "UNPROVEN_FAILURE"].includes(value?.cliStatus)
      ? value.cliStatus
      : "NOT_RUN";
    const safePsqlStatus = ["NOT_RUN", "NOT_RUN_NO_DATABASE", "NOT_RUN_PREDECESSOR_REPLAY_FAILED", "PASS", "FAIL", "COMMAND_ERROR"].includes(value?.psqlStatus)
      ? value.psqlStatus
      : "NOT_RUN";
    const safeResult = ["MATCH", "DIVERGED", "INCONCLUSIVE"].includes(value?.result)
      ? value.result
      : "NOT_RUN";
    const safeDivergence = ["CLI_FAILS_PSQL_PASSES", "CLI_PASSES_PSQL_FAILS", "DIFFERENT_POSTGRES_FAILURES"].includes(value?.divergence)
      ? value.divergence
      : null;
    return {
      migrationVersion: safeVersion(value?.migrationVersion),
      predecessorVersion: safeVersion(value?.predecessorVersion),
      cliStatus: safeCliStatus,
      cliError: value?.cliError ? safeDiagnostic(value.cliError) : null,
      psqlStatus: safePsqlStatus,
      psqlError: value?.psqlError ? safeDiagnostic(value.psqlError) : null,
      result: safeResult,
      divergence: safeDivergence,
    };
  };
  const safePsqlStatus = ["NOT_RUN", "NOT_RUN_NO_DATABASE", "NOT_RUN_PREDECESSOR_REPLAY_FAILED", "PASS", "FAIL", "COMMAND_ERROR"].includes(psql.status)
    ? psql.status
    : "NOT_RUN";
  const safeFailureClass = [
    "POSTGRES_INVALID_TEXT_REPRESENTATION", "POSTGRES_SQL_DEPENDENCY_OR_SYNTAX",
    "POSTGRES_CHECK_CONSTRAINT_SUBQUERY", "POSTGRES_FEATURE_NOT_SUPPORTED",
    "LOCAL_DATABASE_CONNECTION", "SUPABASE_CLI_USAGE", "LOCAL_DATABASE_PERMISSION",
    "UNCLASSIFIED_COMMAND_FAILURE", "NO_ERROR_TEXT_OBSERVED",
  ].includes(psql.failureClass) ? psql.failureClass : null;
  let safeBoundaryStatus = "INCONCLUSIVE";
  if (confirmed) safeBoundaryStatus = "CONFIRMED";
  else if (boundary?.status === "NOT_APPLICABLE") safeBoundaryStatus = "NOT_APPLICABLE";
  const safeBootstrap = ["NOT_RUN", "NOT_RUN_INFRASTRUCTURE_FAILURE", "FAIL", "PASS"].includes(bootstrap) ? bootstrap : "NOT_RUN";
  const safeReplay = ["NOT_RUN", "NOT_RUN_BOOTSTRAP_FAILED", "FAIL", "PASS"].includes(replay) ? replay : "NOT_RUN";
  const canonicalSafe = safeDiagnostic(canonical);
  const psqlErrorSafe = psql.error ? safeDiagnostic(psql.error) : null;
  let safeReason = "NO_BOUNDARY_RESULT";
  if (confirmed) safeReason = null;
  else if (allowedReasons.has(boundary?.reason)) safeReason = boundary.reason;
  let safeFailing = null;
  if (confirmed) safeFailing = safeAttempt(boundary.failing);
  else if (boundary?.failing) {
    safeFailing = {
      prefixLength: Number.isInteger(boundary.failing.prefixLength) ? boundary.failing.prefixLength : null,
      version: null,
      outcome: ["PASS", "POSTGRES_FAIL", "COMMAND_ERROR", "UNPROVEN_FAILURE"].includes(boundary.failing.outcome) ? boundary.failing.outcome : "UNKNOWN",
      exitCode: Number.isInteger(boundary.failing.exitCode) ? boundary.failing.exitCode : null,
    };
  }
  return {
    candidateSha: /^[0-9a-f]{40}$/iu.test(String(candidateSha ?? "")) ? candidateSha : "unavailable",
    bootstrap: safeBootstrap,
    replay: safeReplay,
    migrationCount: Number.isSafeInteger(migrationCount) && migrationCount >= 0 ? migrationCount : null,
    attribution: {
      status: safeBoundaryStatus,
      reason: safeReason,
      migrationVersion: safeVersion,
      predecessor: safeAttempt(boundary?.predecessor),
      failing: safeFailing,
    },
    canonicalReplayError: {
      source: "SUPABASE_CLI_PREFIX_REPLAY",
      migrationVersion: safeVersion,
      ...canonicalSafe,
      reproducibility: safeBoundaryStatus,
    },
    isolatedPsqlDiagnostic: {
      source: "ISOLATED_PSQL_ONLY",
      status: safePsqlStatus,
      exitCode: Number.isInteger(psql.exitCode) ? psql.exitCode : null,
      error: psqlErrorSafe ? { ...psqlErrorSafe, failureClass: safeFailureClass } : null,
    },
    migrationComparison: safeMigrationComparison(migrationComparison),
  };
}

function main() {
  const migrations = migrationFiles();
  if (!migrations.length) throw new Error("canonical migration inventory is empty");
  const runTemp = process.env.RUNNER_TEMP ?? tmpdir();
  const workdir = mkdtempSync(join(runTemp, "cmm-supabase-isolation-"));
  makeTemporaryProject(workdir);
  const privateDir = mkdtempSync(join(runTemp, "supabase-isolation-private-"));
  mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  const network = `cmm-isolation-${process.env.GITHUB_RUN_ID ?? process.pid}`;
  let networkCreated = false;
  let started = false;
  let currentStage = "EPHEMERAL_DOCKER_NETWORK";
  const outputPath = resolve(root, "artifacts/ci/supabase-isolation-diagnostic.json");
  const evidence = {
    candidateSha: process.env.GITHUB_SHA ?? run("git", ["rev-parse", "HEAD"], { cwd: root }).output.trim(),
    migrations: migrations.length,
    config: "minimal-no-app-migrations-no-seed",
    bootstrap: "NOT_RUN",
    replay: "NOT_RUN",
    seed: "NOT_RUN",
    failure: null,
    hashes: migrations.map(({ version, sha256 }) => ({ version, sha256 })),
  };
  let prefixAttemptNumber = 0;
  let boundary = null;
  let canonicalError = null;
  let psqlDiagnostic = { status: "NOT_RUN", exitCode: null, error: null };
  let migrationComparison = { cliStatus: "NOT_RUN", psqlStatus: "NOT_RUN", result: "INCONCLUSIVE" };

  const replayPrefix = (prefixLength, phase) => {
    const version = prefixLength === 0 ? "00000000000000" : migrations[prefixLength - 1]?.version;
    const attemptNumber = ++prefixAttemptNumber;
    let result;
    try {
      result = run(cli, [
        "db", "reset", "--local", "--workdir", workdir, "--yes", "--no-seed",
        "--version", version, `--network-id=${network}`,
      ], { cwd: root, allowFailure: true });
    } catch {
      result = { status: null, output: "", commandError: true };
    }
    const attempt = writePrivatePrefixAttempt({
      privateDir,
      attempt: attemptNumber,
      phase,
      prefixLength,
      version: prefixLength === 0 ? null : version,
      result,
    });
    return attempt;
  };

  try {
    run("docker", ["network", "create", "--driver", "bridge", "--label", "com.cleanmymap.ci=ephemeral", network], { cwd: root });
    networkCreated = true;
    currentStage = "MINIMAL_SUPABASE_BOOTSTRAP";
    const start = run(cli, ["start", "--workdir", workdir, "--yes", "--output-format", "json", `--network-id=${network}`], {
      cwd: root,
      allowFailure: true,
      privateLog: join(privateDir, "bootstrap.log"),
    });
    if (start.status !== 0) {
      evidence.bootstrap = "FAIL";
      evidence.replay = "NOT_RUN_BOOTSTRAP_FAILED";
      evidence.failure = {
        stage: "SUPABASE_BOOTSTRAP_WITH_APP_MIGRATIONS_DISABLED",
        ...extractSafePostgresError(readFileSync(join(privateDir, "bootstrap.log"), "utf8"), null),
      };
    } else {
      started = true;
      evidence.bootstrap = "PASS";
      const configPath = join(workdir, "supabase/config.toml");
      let config = readFileSync(configPath, "utf8");
      config = config.replace("[db.migrations]\nenabled = false", "[db.migrations]\nenabled = true");
      writeFileSync(configPath, config);

      currentStage = "CANONICAL_MIGRATION_PREFIX_REPLAY";
      const firstFailed = findFirstFailedPrefix(migrations.length, (prefixLength) =>
        replayPrefix(prefixLength, "binary-search").outcome === "PASS");

      if (firstFailed === null) {
        evidence.replay = "PASS";
        evidence.seed = "NOT_RUN_DIAGNOSTIC_MODE";
        boundary = { status: "NOT_APPLICABLE", reason: "FULL_PREFIX_SUCCEEDED", migrationVersion: null };
      } else {
        evidence.replay = "FAIL";
        boundary = verifyFailedPrefixBoundary(migrations, firstFailed, replayPrefix);
        if (boundary.status === "CONFIRMED") {
          canonicalError = extractSafePostgresError(readFileSync(boundary.failingAttempt.logPath, "utf8"), boundary.migrationVersion);
          evidence.failure = { stage: "CANONICAL_MIGRATION_REPLAY", ...canonicalError, reproducible: true };

          // psql is supplemental only. Reconstruct the confirmed predecessor using the same CLI command first.
          currentStage = "ISOLATED_MIGRATION_STATEMENT";
          try {
            psqlDiagnostic = runSupplementalPsqlDiagnostic(migrations[firstFailed], firstFailed, privateDir, replayPrefix);
          } catch {
            psqlDiagnostic = { status: "COMMAND_ERROR", exitCode: null, error: null };
          }
        } else {
          const candidateAttempt = boundary.failingAttempt;
          if (["POSTGRES_FAIL", "UNPROVEN_FAILURE"].includes(candidateAttempt.outcome)) {
            canonicalError = extractSafePostgresError(readFileSync(candidateAttempt.logPath, "utf8"), null);
          }
          evidence.failure = {
            stage: "CANONICAL_MIGRATION_REPLAY_INCONCLUSIVE",
            ...(canonicalError ?? { migrationVersion: null, sqlstate: "unavailable", expectedType: "unavailable", statementPosition: null }),
            migrationVersion: null,
            reproducible: false,
            reason: boundary.reason,
          };
        }
      }
      currentStage = "TARGET_MIGRATION_CLI_PSQL_COMPARISON";
      migrationComparison = runMigrationExecutorComparison(migrations, privateDir, replayPrefix);
    }
  } catch {
    evidence.failure = {
      stage: currentStage,
      sqlstate: "unavailable",
      expectedType: "unavailable",
      statementPosition: null,
    };
    if (currentStage === "EPHEMERAL_DOCKER_NETWORK") evidence.bootstrap = "NOT_RUN_INFRASTRUCTURE_FAILURE";
    else if (currentStage === "MINIMAL_SUPABASE_BOOTSTRAP") evidence.bootstrap = "FAIL";
    else evidence.replay = "FAIL";
  } finally {
    if (started) run(cli, ["stop", "--workdir", workdir, "--no-backup"], { cwd: root, allowFailure: true, privateLog: join(privateDir, "stop.log") });
    if (networkCreated) run("docker", ["network", "rm", network], { cwd: root, allowFailure: true, privateLog: join(privateDir, "network-cleanup.log") });
    rmSync(workdir, { recursive: true, force: true });
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  evidence.diagnostic = buildSafeIsolationDiagnostic({
    candidateSha: evidence.candidateSha,
    bootstrap: evidence.bootstrap,
    replay: evidence.replay,
    migrationCount: evidence.migrations,
    boundary,
    canonicalError,
    psqlDiagnostic,
    migrationComparison,
  });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    ephemeralInfrastructure: networkCreated ? "PASS" : "FAIL",
    ...evidence.diagnostic,
    seed: evidence.seed,
    rawLogs: "runner-private-only",
  }, null, 2));
  if (
    evidence.bootstrap === "FAIL"
    || evidence.bootstrap === "NOT_RUN_INFRASTRUCTURE_FAILURE"
    || evidence.replay === "FAIL"
    || migrationComparison.result !== "MATCH"
  ) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
