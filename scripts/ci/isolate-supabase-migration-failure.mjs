#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationDirectory = resolve(root, "apps/web/supabase/migrations");
const cli = resolve(root, "node_modules/.bin/supabase");
const allowedTypes = new Set([
  "smallint", "integer", "bigint", "numeric", "real", "double precision", "boolean",
  "character", "character varying", "text", "uuid", "json", "jsonb", "date", "time",
  "timestamp", "timestamp with time zone", "timestamp without time zone", "interval",
  "inet", "cidr", "macaddr", "bytea", "enum", "array",
]);

function run(command, args, { cwd, env = process.env, privateLog, allowFailure = false } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
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
  if (/\b22P02\b|invalid input syntax for type/iu.test(text)) return "POSTGRES_INVALID_TEXT_REPRESENTATION";
  if (/\bSQLSTATE\s*[:=]?\s*42/iu.test(text)) return "POSTGRES_SQL_DEPENDENCY_OR_SYNTAX";
  if (/connection refused|could not connect|connection timed out/iu.test(text)) return "LOCAL_DATABASE_CONNECTION";
  if (/unknown flag|unknown command|flag provided but not defined/iu.test(text)) return "SUPABASE_CLI_USAGE";
  if (/permission denied|insufficient privilege/iu.test(text)) return "LOCAL_DATABASE_PERMISSION";
  if (/error|failed|fatal/iu.test(text)) return "UNCLASSIFIED_COMMAND_FAILURE";
  return "NO_ERROR_TEXT_OBSERVED";
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

function readPrivatePostgresLogs(since, privateLog) {
  const containerList = run("docker", [
    "ps", "--filter", `label=com.supabase.cli.project=cmm-isolated-replay`, "--format", "{{.ID}} {{.Names}}",
  ], { cwd: root, allowFailure: true }).output;
  const dbContainer = containerList.split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u))
    .find(([, name]) => name?.startsWith("supabase_db_"))?.[0];
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

export function findFirstFailedPrefix(length, resetPrefix) {
  if (resetPrefix(length)) return null;
  let low = 0;
  let high = length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const success = resetPrefix(middle);
    if (success) low = middle + 1;
    else high = middle;
  }
  return high - 1;
}

function main() {
  const migrations = migrationFiles();
  if (!migrations.length) throw new Error("canonical migration inventory is empty");
  const runTemp = process.env.RUNNER_TEMP ?? tmpdir();
  const workdir = mkdtempSync(join(runTemp, "cmm-supabase-isolation-"));
  makeTemporaryProject(workdir);
  const privateDir = join(runTemp, "supabase-isolation-private");
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
  const prefixLog = join(privateDir, "prefix.log");
  const statementLog = join(privateDir, "statement.log");

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
      const firstFailed = findFirstFailedPrefix(migrations.length, (index) => {
        if (index === 0) return true;
        const prefix = migrations[index - 1];
        return run(cli, ["db", "reset", "--local", "--workdir", workdir, "--yes", "--no-seed", "--version", prefix.version, `--network-id=${network}`], {
          cwd: root,
          allowFailure: true,
          privateLog: prefixLog,
        }).status === 0;
      });

      if (firstFailed === null) {
        evidence.replay = "PASS";
        evidence.seed = "NOT_RUN_DIAGNOSTIC_MODE";
      } else {
        evidence.replay = "FAIL";
        const failing = migrations[firstFailed];
        let isolatedPrefixReady = firstFailed === 0;
        evidence.failure = {
          stage: "CANONICAL_MIGRATION_PREFIX",
          ...extractSafePostgresError(readFileSync(prefixLog, "utf8"), failing.version),
        };
        if (firstFailed > 0) {
          const previous = migrations[firstFailed - 1];
          const prefixReset = run(cli, ["db", "reset", "--local", "--workdir", workdir, "--yes", "--no-seed", "--version", previous.version, `--network-id=${network}`], { cwd: root, allowFailure: true, privateLog: prefixLog });
          isolatedPrefixReady = prefixReset.status === 0;
        }
        if (firstFailed === 0) {
          config = config.replace("[db.migrations]\nenabled = true", "[db.migrations]\nenabled = false");
          writeFileSync(configPath, config);
          run(cli, ["db", "reset", "--local", "--workdir", workdir, "--yes", "--no-seed", `--network-id=${network}`], {
            cwd: root,
            privateLog: prefixLog,
          });
          config = config.replace("[db.migrations]\nenabled = false", "[db.migrations]\nenabled = true");
          writeFileSync(configPath, config);
        }
        if (isolatedPrefixReady) {
          currentStage = "ISOLATED_MIGRATION_STATEMENT";
          const verbosityRun = run(cli, ["db", "query", "--local", "--workdir", workdir, "ALTER SYSTEM SET log_error_verbosity = 'verbose'; SELECT pg_reload_conf();", "--output-format", "json"], {
            cwd: root,
            allowFailure: true,
            privateLog: join(privateDir, "set-log-verbosity.log"),
          });
          const queryStartedAt = new Date(Date.now() - 1000).toISOString();
          const statementRun = run(cli, ["db", "query", "--local", "--workdir", workdir, "--file", failing.path, "--output-format", "json", "--debug"], {
            cwd: root,
            allowFailure: true,
            privateLog: statementLog,
          });
          const cliOutput = readFileSync(statementLog, "utf8");
          const postgresLogs = readPrivatePostgresLogs(queryStartedAt, join(privateDir, "postgres-query.jsonl"));
          const postgresOutput = `${postgresLogs.dockerOutput}\n${postgresLogs.serverOutput}`;
          const combinedPrivateOutput = `${cliOutput}\n${postgresOutput}`;
          writeFileSync(statementLog, combinedPrivateOutput, { mode: 0o600 });
          const safePostgresError = extractSafePostgresError(combinedPrivateOutput, failing.version);
          evidence.failure = {
            stage: statementRun.status === 0 ? "ISOLATED_MIGRATION_UNEXPECTED_PASS" : "ISOLATED_MIGRATION_STATEMENT",
            ...safePostgresError,
            isolatedStatementFailureClass: classifyPrivateFailure(combinedPrivateOutput),
            isolatedStatementExitCode: statementRun.status,
            logVerbosityEnabled: verbosityRun.status === 0,
            postgresContainerFound: postgresLogs.containerFound,
            postgresDockerLogObserved: postgresLogs.dockerOutput.trim().length > 0,
            postgresServerLogObserved: postgresLogs.serverOutput.trim().length > 0,
          };
          const statementPosition = evidence.failure.statementPosition;
          if (statementPosition !== null) {
            const sql = readFileSync(failing.path, "utf8");
            evidence.failure.instructionLine = sql.slice(0, statementPosition - 1).split("\n").length;
          } else {
            evidence.failure.instructionLine = null;
          }
        } else {
          evidence.failure.stage = "FAILED_PREFIX_COULD_NOT_BE_RECONSTRUCTED";
        }
      }
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
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    candidateSha: evidence.candidateSha,
    ephemeralInfrastructure: networkCreated ? "PASS" : "FAIL",
    bootstrap: evidence.bootstrap,
    replay: evidence.replay,
    migrationCount: evidence.migrations,
    firstFailure: evidence.failure,
    seed: evidence.seed,
    rawLogs: "runner-private-only",
  }, null, 2));
  if (evidence.bootstrap === "FAIL" || evidence.bootstrap === "NOT_RUN_INFRASTRUCTURE_FAILURE" || evidence.replay === "FAIL") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
