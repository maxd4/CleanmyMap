import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync as readFileSyncFromFs } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  classifySupabaseStartFailure,
  collectBoundedStartEvidence,
  collectStartProgressSnapshot,
  parseFirstDockerFailureEvent,
  parseDockerLifecycleEvents,
  readProgressSnapshots,
  renderSupabaseStartDiagnostic,
  SUPABASE_START_CATEGORIES,
} from "./diagnose-supabase-start.mjs";
import { parseSupabaseBootstrapJobs } from "./supabase-start-bootstrap.mjs";

const sqlWorkflow = readFileSyncFromFs(resolve(".github", "workflows", "supabase-sql-proof.yml"), "utf8");
const appWorkflow = readFileSyncFromFs(resolve(".github", "workflows", "e2e-supabase.yml"), "utf8");
const restoreWorkflow = readFileSyncFromFs(resolve(".github", "workflows", "supabase-backup-restore-proof.yml"), "utf8");
const startScript = readFileSyncFromFs(resolve("scripts", "ci", "start-supabase-ephemeral.sh"), "utf8");
const dockerContainersCommand = "docker ps -a --filter name=supabase_ --format {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}";
const dockerImagesCommand = "docker images --format {{.Repository}}\t{{.Tag}}";
const dockerNetworksCommand = "docker network ls --format {{.Name}}\t{{.Driver}}";
const listeningPortsCommand = "ss -ltnH";

function createProbeCommand({
  dockerVersion = { available: true, output: "Docker version 28.0.4" },
  dockerDaemon = { available: true, output: "28.0.4" },
  dockerInfo = { available: true, output: JSON.stringify({ NCPU: 4, MemTotal: 8_000_000_000 }) },
  dockerContainers = { available: true, output: "" },
  dockerImages = { available: true, output: "supabase/postgres\t17" },
  dockerNetworks = { available: true, output: "bridge\tbridge" },
  listeningPorts = { available: true, output: "" },
  supabaseCli = { available: true, output: "2.117.0" },
  supabaseStatus = { available: false, output: "status unavailable" },
  dbDockerHealth = { available: true, output: "healthy" },
  dbPostgresInternal = { available: true, output: "ready" },
  dbHostTcp = { available: true, output: "tcp=connected" },
} = {}) {
  const probeOutputs = new Map([
    ["docker --version", dockerVersion],
    ["docker info --format {{.ServerVersion}}", dockerDaemon],
    ["docker info --format {{json .}}", dockerInfo],
    [dockerContainersCommand, dockerContainers],
    [dockerImagesCommand, dockerImages],
    [dockerNetworksCommand, dockerNetworks],
    [listeningPortsCommand, listeningPorts],
    ["npx --no-install supabase --version", supabaseCli],
    ["npx --no-install supabase status --workdir apps/web --output json", supabaseStatus],
  ]);
  return (command, args) => {
    if (command === "docker" && args[0] === "inspect") return dbDockerHealth;
    if (command === "docker" && args[0] === "exec") return dbPostgresInternal;
    if (command === "node" && args[0] === "-e") return dbHostTcp;
    return probeOutputs.get([command, ...args].join(" ")) ?? { available: false, output: "unexpected" };
  };
}

async function withTempConfig(config, callback) {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-"));
  await mkdir(resolve(root, "apps", "web", "supabase"), { recursive: true });
  await writeFile(resolve(root, "apps", "web", "supabase", "config.toml"), config);
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("classifies a failed start without exposing the raw Docker message", () => {
  const secretLog = "Error: pull access denied for private/image token=super-secret-jwt";
  const category = classifySupabaseStartFailure({ log: secretLog, exitCode: 1 });
  const diagnostic = renderSupabaseStartDiagnostic({
    category,
    exitCode: 1,
    dockerVersion: "Docker version 27.0.1, build secret-build",
    supabaseCliVersion: "2.117.0",
    dockerDaemonAvailable: true,
  });

  assert.equal(category, SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE);
  assert.match(diagnostic, /category=IMAGE_UNAVAILABLE/);
  assert.match(diagnostic, /docker_version=27\.0\.1/);
  assert.doesNotMatch(diagnostic, /private\/image|super-secret-jwt|secret-build/);
});

test("keeps classification safe when bounded startup evidence is absent", () => {
  const input = { log: "opaque startup failure", exitCode: 1 };

  assert.equal(classifySupabaseStartFailure({ ...input, evidence: null }), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.equal(classifySupabaseStartFailure(input), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.equal(
    classifySupabaseStartFailure({
      ...input,
      evidence: { timeoutObserved: true, durationSeconds: 95, dockerContainers: 0, supabaseStatus: "unavailable" },
    }),
    SUPABASE_START_CATEGORIES.START_TIMEOUT,
  );
});

test("classifies Docker, port, healthcheck, resources and CLI failures", () => {
  const cases = [
    ["Cannot connect to the Docker daemon", SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE],
    ["failed to resolve registry network: i/o timeout", SUPABASE_START_CATEGORIES.NETWORK_FAILURE],
    ["connect ECONNREFUSED 127.0.0.1:54322", SUPABASE_START_CATEGORIES.NETWORK_FAILURE],
    ["connect ETIMEDOUT 127.0.0.1:54322", SUPABASE_START_CATEGORIES.NETWORK_FAILURE],
    ["Error: port is already allocated", SUPABASE_START_CATEGORIES.PORT_CONFLICT],
    ["password authentication failed for user private_role", SUPABASE_START_CATEGORIES.AUTHENTICATION_FAILURE],
    ["container db is unhealthy", SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE],
    ["no space left on device", SUPABASE_START_CATEGORIES.INSUFFICIENT_RESOURCES],
    ["unknown flag: --workdir", SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY],
    ["", SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY, { supabaseCliAvailable: false }],
    ["unexpected opaque startup failure", SUPABASE_START_CATEGORIES.UNCLASSIFIED],
  ];

  for (const [log, expected, options = {}] of cases) {
    assert.equal(
      classifySupabaseStartFailure({ log, exitCode: 1, ...options }),
      expected,
      `expected ${expected} for ${log}`,
    );
  }
});

test("classifies SQLSTATE migration failures without publishing private error text", () => {
  const cases = [
    ["42601", SUPABASE_START_CATEGORIES.MIGRATION_SQL_SYNTAX, "MIGRATION_SQL_SYNTAX"],
    ["42P01", SUPABASE_START_CATEGORIES.MIGRATION_SQL_DEPENDENCY, "MIGRATION_SQL_DEPENDENCY"],
    ["23505", SUPABASE_START_CATEGORIES.MIGRATION_SQL_DATA, "MIGRATION_SQL_DATA"],
    ["42501", SUPABASE_START_CATEGORIES.MIGRATION_RLS_PERMISSION, "MIGRATION_RLS_PERMISSION"],
    ["40001", SUPABASE_START_CATEGORIES.MIGRATION_SQL_CONCURRENCY, "MIGRATION_SQL_CONCURRENCY"],
    ["08006", SUPABASE_START_CATEGORIES.DATABASE_CONNECTION_FAILURE, "MIGRATION_DATABASE_CONNECTION"],
  ];
  for (const [sqlState, category, failedStep] of cases) {
    const log = [
      "Applying database migrations",
      "Applying migration 20261122000014_private_action_attendance_registry.sql...",
      "failed to apply migration 20261122000014_private_action_attendance_registry.sql",
      JSON.stringify({ level: "error", error: { code: sqlState, message: "private table and token=secret" } }),
    ].join("\n");
    const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
    const diagnostic = renderSupabaseStartDiagnostic({
      category: classifySupabaseStartFailure({ log, exitCode: 1, evidence }),
      exitCode: 1,
      dockerVersion: evidence.dockerServerVersion,
      supabaseCliVersion: evidence.supabaseCliVersion,
      dockerDaemonAvailable: evidence.dockerDaemonAvailable,
      evidence,
    });
    assert.equal(classifySupabaseStartFailure({ log, exitCode: 1, evidence }), category);
    assert.equal(evidence.firstFailedStep, failedStep);
    assert.equal(evidence.firstFailedMigrationId, "20261122000014");
    assert.equal(evidence.firstErrorSqlState, sqlState);
    assert.match(diagnostic, new RegExp(`first_error_sqlstate=${sqlState}`));
    assert.doesNotMatch(diagnostic, /private table|token=secret|secret/);
  }
});

test("finds SQLSTATE and an explicitly failed migration ID in structured private CLI logs", () => {
  const log = [
    "Applying database migrations",
    "Applying migration 20261122000014_private_action_attendance_registry.sql...",
    "failed to apply migration 20261122000014_private_action_attendance_registry.sql",
    JSON.stringify({ level: "debug", context: { sqlstate: "22P02", detail: "private table token=secret" } }),
  ].join("\n");
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log, exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstErrorSignal, "SQLSTATE_DATA");
  assert.equal(evidence.firstErrorSqlState, "22P02");
  assert.equal(evidence.firstFailedStep, "MIGRATION_SQL_DATA");
  assert.equal(evidence.firstFailedMigrationId, "20261122000014");
  assert.match(diagnostic, /category=MIGRATION_SQL_DATA/);
  assert.match(diagnostic, /first_failed_migration_id=20261122000014/);
  assert.doesNotMatch(diagnostic, /private table|token=secret|secret/);
});

test("does not attribute a SQL error to a nearby migration without explicit failure correlation", () => {
  const log = [
    "Applying migration 20261121000002_personal_ai_declarations.sql...",
    JSON.stringify({ level: "debug", context: { sqlstate: "22P02" } }),
  ].join("\n");
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  assert.equal(evidence.firstFailedMigrationId, null);
});

test("reports only the data error type for invalid text representations", () => {
  const log = [
    "Applying database migrations",
    "Applying migration 20261121000002_personal_ai_declarations.sql...",
    "failed to apply migration 20261121000002_personal_ai_declarations.sql",
    JSON.stringify({ level: "debug", context: { sqlstate: "22P02" } }),
    JSON.stringify({ level: "debug", context: { message: 'invalid input syntax for type timestamp with time zone: "private-value"' } }),
  ].join("\n");
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log, exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstFailedMigrationId, "20261121000002");
  assert.equal(evidence.firstErrorDetail, "INVALID_TEXT_REPRESENTATION;type=timestamp_with_time_zone");
  assert.match(diagnostic, /first_error_detail=INVALID_TEXT_REPRESENTATION;type=timestamp_with_time_zone/);
  assert.doesNotMatch(diagnostic, /private-value/);
});

test("extracts allowlisted PostgreSQL type and numeric instruction location without exposing database log text", () => {
  const postgresLog = [
    'ERROR: invalid input syntax for type timestamp with time zone: "private-user-value" SQLSTATE 22P02 at character 129',
    'STATEMENT: insert into private_table(value) values (\'private-user-value\')',
  ].join("\n");
  const evidence = collectBoundedStartEvidence({
    log: "migration execution failed SQLSTATE 22P02",
    postgresLog,
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log: "migration execution failed SQLSTATE 22P02", exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstErrorSqlState, "22P02");
  assert.equal(evidence.postgresLogObserved, true);
  assert.equal(evidence.firstErrorDetail, "INVALID_TEXT_REPRESENTATION;type=timestamp_with_time_zone");
  assert.equal(evidence.firstErrorInstructionLocation, "character_129");
  assert.match(diagnostic, /type=timestamp_with_time_zone/);
  assert.match(diagnostic, /first_error_instruction_location=character_129/);
  assert.match(diagnostic, /postgres_log_observed=true/);
  assert.doesNotMatch(diagnostic, /private-user-value|private_table|insert into/);
});

test("reads nested PostgreSQL JSON SQLSTATE, type and statement position without exposing values", () => {
  const postgresLog = JSON.stringify({
    record: {
      error_severity: "ERROR",
      sql_state_code: "22P02",
      message: 'invalid input syntax for type uuid: "private-identity"',
      detail: "private detail value",
      statement_position: "87",
      statement: "select private column from private table",
    },
  });
  const evidence = collectBoundedStartEvidence({ log: "start failed", postgresLog, postgresServerLog: postgresLog, exitCode: 1, probeCommand: createProbeCommand() });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log: "start failed", exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstErrorSqlState, "22P02");
  assert.equal(evidence.firstErrorDetail, "INVALID_TEXT_REPRESENTATION;type=uuid");
  assert.equal(evidence.firstErrorInstructionLocation, "character_87");
  assert.equal(evidence.firstErrorSource, "POSTGRES_LOG");
  assert.equal(evidence.postgresServerLogObserved, true);
  assert.match(diagnostic, /postgres_log_observed=true/);
  assert.doesNotMatch(diagnostic, /private-identity|private detail value|select private column|private table/);
});

test("extracts a type without SQLSTATE and correlates a logged statement to one migration privately", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-statement-correlation-"));
  try {
    const migrations = resolve(root, "apps", "web", "supabase", "migrations");
    await mkdir(migrations, { recursive: true });
    await writeFile(resolve(migrations, "20261121000002_private_fixture.sql"), "select gen_random_uuid()::uuid;\n", "utf8");
    const postgresLog = [
      'ERROR: invalid input syntax for type uuid: "private-value"',
      "STATEMENT: select gen_random_uuid()::uuid;",
      "LOCATION: exec_simple_query, postgres.c:1234",
    ].join("\n");
    const evidence = collectBoundedStartEvidence({
      log: "Applying database migrations\nSQLSTATE 22P02",
      postgresLog,
      exitCode: 1,
      root,
      probeCommand: createProbeCommand(),
    });
    const diagnostic = renderSupabaseStartDiagnostic({
      category: classifySupabaseStartFailure({ log: "Applying database migrations\nSQLSTATE 22P02", exitCode: 1, evidence }),
      exitCode: 1,
      dockerVersion: evidence.dockerServerVersion,
      supabaseCliVersion: evidence.supabaseCliVersion,
      dockerDaemonAvailable: evidence.dockerDaemonAvailable,
      evidence,
    });

    assert.equal(evidence.firstErrorDetail, "INVALID_TEXT_REPRESENTATION;type=uuid");
    assert.equal(evidence.firstFailedMigrationId, "20261121000002");
    assert.doesNotMatch(diagnostic, /private-value|select gen_random_uuid/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unallowlisted PostgreSQL type names in safe diagnostics", () => {
  const evidence = collectBoundedStartEvidence({
    log: "invalid input syntax for type custom_sensitive_type: private-value SQLSTATE 22P02",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  assert.equal(evidence.firstErrorDetail, "INVALID_TEXT_REPRESENTATION");
  assert.doesNotMatch(JSON.stringify(evidence), /custom_sensitive_type|private-value/);
});

test("turns a long failed start with no containers into an actionable bounded code", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    durationSeconds: 95,
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.schemaVersion, 8);
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque startup failure", exitCode: 1, evidence }),
    SUPABASE_START_CATEGORIES.UNCLASSIFIED,
  );
  assert.ok(evidence.evidenceCodes.includes("REQUIRED_SERVICES_MISSING"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_MISSING"));
  assert.equal(evidence.startPhase, "UNKNOWN");
});

test("collects a public-safe startup progress snapshot without raw Docker output", () => {
  const snapshot = collectStartProgressSnapshot({
    elapsedSeconds: 10,
    probeCommand: createProbeCommand({
      dockerDaemon: { available: true, output: "28.0.4 DockerRootDir=/secret" },
      dockerImages: { available: true, output: "private/image\tlatest\nsecond/image\tstable" },
      dockerNetworks: { available: true, output: "cleanmymap-sql-123\tbridge" },
      dockerContainers: { available: true, output: "supabase_db_web\tprivate/image\tUp 1 second\t" },
    }),
    expectedNetwork: "cleanmymap-sql-123",
  });

  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    elapsedSeconds: 10,
    dockerDaemon: "available",
    dockerImages: 2,
    dockerContainers: 1,
    dockerContainerStates: { running: 1, exited: 0, created: 0, restarting: 0, other: 0 },
    dockerContainerServices: { db: "running" },
    dbDockerHealth: "healthy",
    dbPostgresInternal: "ready",
    dbHostTcp: "connected",
    requiredServicesState: "incomplete",
    networkState: "observed",
    observationState: "CONTAINERS_OBSERVED",
  });
  assert.doesNotMatch(JSON.stringify(snapshot), /private\/image|DockerRootDir|supabase_db_web/);
});

test("does not infer timeout from elapsed duration alone", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    durationSeconds: 88,
    probeCommand: createProbeCommand(),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "opaque startup failure", exitCode: 1, evidence }),
    SUPABASE_START_CATEGORIES.UNCLASSIFIED,
  );
});

test("never reports success for a non-zero Supabase start result", () => {
  assert.notEqual(
    classifySupabaseStartFailure({ log: "", exitCode: 1 }),
    SUPABASE_START_CATEGORIES.START_INCOMPLETE,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "", exitCode: 0 }),
    SUPABASE_START_CATEGORIES.START_INCOMPLETE,
  );
});

test("emits bounded machine evidence without returning Docker or Supabase output", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure private-token",
    exitCode: 1,
    durationSeconds: 91,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output: "supabase_db\tpostgres\tExited (1)\t" } }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.configContract, "valid");
  assert.equal(evidence.dockerContainers, 1);
  assert.deepEqual(evidence.dockerContainerStates, { running: 0, exited: 1, created: 0, restarting: 0, other: 0 });
  assert.ok(evidence.evidenceCodes.includes("START_DURATION_OVER_80_SECONDS"));
  assert.ok(evidence.evidenceCodes.includes("NO_CLASSIFIABLE_START_LOG_SIGNAL"));
  assert.equal(evidence.requiredServicesState, "incomplete");
  assert.equal(evidence.healthState, "failed");
  assert.equal(evidence.firstErrorSignal, "NONE");
  assert.equal(evidence.firstErrorExcerpt, "none");
  assert.match(diagnostic, /evidence_codes=/);
  assert.doesNotMatch(diagnostic, /private-token|DockerRootDir|supabase_db/);
});

test("publishes only the first bounded startup error signal", () => {
  const evidence = collectBoundedStartEvidence({
    log: [
      "supabase start: preparing services",
      "Error: failed to create container db: password=do-not-publish",
      "Error: container db exited with code 1",
    ].join("\n"),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstErrorSignal, "CONTAINER_CREATE");
  assert.equal(evidence.firstErrorExcerpt, "class=container_create;service=db");
  assert.match(diagnostic, /first_error_signal=CONTAINER_CREATE/);
  assert.match(diagnostic, /first_error_excerpt=class=container_create;service=db/);
  assert.doesNotMatch(diagnostic, /password=do-not-publish|<redacted-secret>|Error:/);
});

test("classifies only allowlisted service and exit details from the first Docker failure event", () => {
  const event = parseFirstDockerFailureEvent([
    JSON.stringify({ Action: "start", Actor: { Attributes: { name: "supabase_db_web", image: "private/image" } } }),
    JSON.stringify({ Action: "oom", Actor: { Attributes: { name: "supabase_db_web", exitCode: "1", image: "private/image", token: "secret" } } }),
    JSON.stringify({ Action: "oom", Actor: { Attributes: { name: "supabase_rest_web", exitCode: "2" } } }),
  ].join("\n"));
  assert.deepEqual(event, { signal: "DOCKER_OOM", excerpt: "event=oom;service=db;exit_code=1" });
  assert.doesNotMatch(JSON.stringify(event), /private\/image|secret/);
});

test("does not mistake a clean container stop or destroy cleanup for the startup failure", () => {
  const events = [
    JSON.stringify({ Action: "die", Actor: { Attributes: { name: "supabase_db_web", exitCode: "0" } } }),
    JSON.stringify({ Action: "destroy", Actor: { Attributes: { name: "supabase_db_web" } } }),
  ].join("\n");

  assert.deepEqual(parseFirstDockerFailureEvent(events), { signal: "NONE", excerpt: "none" });
  assert.deepEqual(parseDockerLifecycleEvents(events), [
    "event=die;service=db;exit_code=0;kind=normal_exit",
    "event=destroy;service=db;exit_code=unknown;kind=cleanup",
  ]);
  assert.deepEqual(parseFirstDockerFailureEvent(JSON.stringify({ Action: "die", Actor: { Attributes: { "com.docker.compose.service": "db", exitCode: "137", id: "private-id" } } })), {
    signal: "DOCKER_CONTAINER_EXIT",
    excerpt: "event=die;service=db;exit_code=137",
  });
});

test("ignores Realtime health_check calls and normal health progress as failure evidence", () => {
  const log = [
    "Waiting for health checks...",
    '{:ok, _} = Realtime.Tenants.health_check("realtime-dev")',
    "Initializing schema...",
  ].join("\n");

  assert.equal(classifySupabaseStartFailure({ log, exitCode: 1 }), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  assert.equal(evidence.firstErrorSignal, "NONE");
  assert.equal(evidence.startPhase, "SCHEMA_INITIALIZATION");
  assert.equal(evidence.failureService, null);
});

test("identifies only a failed allowlisted bootstrap job for the exact Supabase project", () => {
  const label = { "com.supabase.cli.project": "web" };
  const events = [
    { Action: "start", Actor: { ID: "private-job-id", Attributes: { name: "/random_name", image: "public.ecr.aws/supabase/realtime:v2", labels: label } } },
    { Action: "die", Actor: { ID: "private-job-id", Attributes: { exitCode: "1", token: "private-token" } } },
    { Action: "start", Actor: { ID: "foreign-job-id", Attributes: { name: "/other_job", image: "supabase/storage-api:v1", labels: { "com.supabase.cli.project": "another-project" } } } },
    { Action: "die", Actor: { ID: "foreign-job-id", Attributes: { name: "/other_job", image: "supabase/storage-api:v1", exitCode: "7", labels: { "com.supabase.cli.project": "another-project" } } } },
  ].map(JSON.stringify).join("\n");
  const jobs = parseSupabaseBootstrapJobs(events, "web");
  const evidence = collectBoundedStartEvidence({ log: "Initialising schema...", dockerEvents: events, exitCode: 1, probeCommand: createProbeCommand() });
  const category = classifySupabaseStartFailure({ log: "Initialising schema...", exitCode: 1, evidence });
  const diagnostic = renderSupabaseStartDiagnostic({ category, exitCode: 1, dockerVersion: "28.0.4", supabaseCliVersion: "2.117.0", dockerDaemonAvailable: true, evidence });

  assert.deepEqual(jobs, {
    lastStartedJob: "realtime",
    lastStartedJobExitCode: "1",
    firstFailedJob: { service: "realtime", exitCode: "1", signal: "JOB_EXIT" },
    jobs: ["realtime:failed:exit_1"],
    observed: true,
  });
  assert.equal(category, SUPABASE_START_CATEGORIES.BOOTSTRAP_JOB_FAILURE);
  assert.equal(evidence.startPhase, "BOOTSTRAP_REALTIME_JOB");
  assert.equal(evidence.firstFailedStep, "BOOTSTRAP_REALTIME_JOB");
  assert.equal(evidence.confirmedService, "realtime");
  assert.equal(evidence.firstErrorSignal, "BOOTSTRAP_JOB_EXIT");
  assert.match(diagnostic, /bootstrap_first_failed_job=realtime;exit_code=1/);
  assert.match(diagnostic, /bootstrap_last_started_job_exit_code=1/);
  assert.doesNotMatch(diagnostic, /private-job-id|foreign-job-id|random_name|private-token|another-project|public\.ecr\.aws|token=/);
});

test("keeps an unknown start error unclassified when no allowlisted bootstrap job failed", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: opaque bootstrap failure private-token",
    dockerEvents: JSON.stringify({
      Action: "die",
      Actor: { ID: "unknown-job-id", Attributes: { name: "/unknown", image: "supabase/custom-job:v1", exitCode: "9", labels: { "com.supabase.cli.project": "web" } } },
    }),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  assert.equal(evidence.firstFailedBootstrapJob, null);
  assert.equal(evidence.firstFailedStep, "UNPROVEN");
  assert.equal(classifySupabaseStartFailure({ log: "Error: opaque bootstrap failure private-token", exitCode: 1, evidence }), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.equal(evidence.firstErrorSignal, "UNKNOWN_ERROR");
  assert.doesNotMatch(evidence.firstErrorExcerpt, /private-token|unknown-job-id|custom-job/);
});

test("follows the CLI bootstrap order through Realtime, Storage and Auth jobs", () => {
  const labels = { "com.supabase.cli.project": "web" };
  const definitions = [["realtime", "realtime", "0"], ["storage-api", "storage", "0"], ["gotrue", "auth", "4"]];
  const events = definitions.flatMap(([image, , exitCode], index) => {
    const attributes = { name: `/temporary-${index}`, image: `supabase/${image}:v1`, labels };
    return [
      { Action: "start", Actor: { ID: `job-${index}`, Attributes: attributes } },
      { Action: "die", Actor: { ID: `job-${index}`, Attributes: { exitCode } } },
    ];
  });
  events.unshift({ Action: "die", Actor: { ID: "persistent-realtime", Attributes: { name: "supabase_realtime_web", image: "supabase/realtime:v1", exitCode: "9", labels } } });

  assert.deepEqual(parseSupabaseBootstrapJobs(events.map(JSON.stringify).join("\n"), "web"), {
    lastStartedJob: "auth",
    lastStartedJobExitCode: "4",
    firstFailedJob: { service: "auth", exitCode: "4", signal: "JOB_EXIT" },
    jobs: ["realtime:succeeded:exit_0", "storage:succeeded:exit_0", "auth:failed:exit_4"],
    observed: true,
  });
});

test("extracts an allowlisted failure step from structured debug errors without publishing its message", () => {
  const secretMigrationName = "20261122000002_private_migration.sql";
  const log = [
    JSON.stringify({ level: "debug", msg: "Waiting for health checks" }),
    JSON.stringify({ level: "debug", msg: "Realtime.Tenants.health_check returned ok" }),
    JSON.stringify({ level: "error", msg: `failed to apply migration ${secretMigrationName} token=private-token` }),
  ].join("\n");
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  const category = classifySupabaseStartFailure({ log, exitCode: 1, evidence });
  const diagnostic = renderSupabaseStartDiagnostic({ category, exitCode: 1, dockerVersion: "28.0.4", supabaseCliVersion: "2.117.0", dockerDaemonAvailable: true, evidence });

  assert.equal(evidence.firstErrorSignal, "UNKNOWN_ERROR");
  assert.equal(evidence.firstFailedStep, "MIGRATIONS");
  assert.equal(category, SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.match(diagnostic, /first_failed_step=MIGRATIONS/);
  assert.doesNotMatch(diagnostic, new RegExp(`${secretMigrationName}|private-token|Realtime\\.Tenants`));
});

test("captures allowlisted health and lifecycle transitions without private Docker fields", () => {
  const raw = [
    { Action: "start", Actor: { Attributes: { name: "supabase_db_web", image: "private/image", token: "private-token" } } },
    { Action: "health_status: unhealthy", Actor: { Attributes: { name: "supabase_db_web", health: "password=private" } } },
  ].map(JSON.stringify).join("\n");
  const summaries = parseDockerLifecycleEvents(raw);
  assert.deepEqual(summaries, [
    "event=start;service=db;exit_code=unknown;kind=transition",
    "event=health_status: unhealthy;service=db;exit_code=unknown;kind=health",
  ]);
  assert.doesNotMatch(JSON.stringify(summaries), /private|password|image|token/);
});

test("reports container die events separately from the sanitized initial error", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: startup failed private-token",
    dockerEvents: JSON.stringify({ Action: "die", Actor: { Attributes: { name: "supabase_db_web", exitCode: "0", token: "private-token", labels: { "com.supabase.cli.project": "web" } } } }),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.firstErrorSignal, "UNKNOWN_ERROR");
  assert.equal(evidence.firstErrorSource, "SUPABASE_CLI_LOG");
  assert.deepEqual(evidence.dockerLifecycleEvents, ["event=die;service=db;exit_code=0;kind=normal_exit"]);
  assert.match(diagnostic, /docker_lifecycle_events=event=die;service=db;exit_code=0;kind=normal_exit/);
  assert.doesNotMatch(diagnostic, /private-token|supabase_db_web|token=/);
});

test("keeps a later specific CLI failure instead of an earlier generic error", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: Supabase start failed\nError: no space left on device",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.firstErrorSource, "SUPABASE_CLI_LOG");
  assert.equal(evidence.firstErrorSignal, "RESOURCE");
  assert.equal(evidence.confirmedService, null);
  assert.equal(evidence.firstErrorExcerpt, "class=resource;service=unavailable");
  assert.equal(evidence.dockerMemoryBytes, 8_000_000_000);
});

test("observes the exact isolated runner network without disclosing its name", () => {
  const expectedNetwork = "cleanmymap-sql-run-42";
  const evidence = collectBoundedStartEvidence({
    log: "Error: start failed",
    exitCode: 1,
    durationSeconds: 88,
    expectedNetwork,
    probeCommand: createProbeCommand({
      dockerNetworks: { available: true, output: "bridge\tbridge\ncleanmymap-sql-run-42\tbridge" },
    }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log: "Error: start failed", exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.networkState, "observed");
  assert.ok(!evidence.evidenceCodes.includes("SUPABASE_NETWORK_MISSING"));
  assert.equal(classifySupabaseStartFailure({ log: "Error: start failed", exitCode: 1, evidence }), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.doesNotMatch(diagnostic, new RegExp(expectedNetwork));
});

test("prefers a specific sanitized Docker CLI error over later Docker lifecycle events", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: no space left on device",
    dockerEvents: JSON.stringify({ Action: "oom", Actor: { Attributes: { name: "supabase_db_web", exitCode: "1", labels: { "com.supabase.cli.project": "web" } } } }),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  assert.equal(evidence.firstErrorSource, "SUPABASE_CLI_LOG");
  assert.equal(evidence.firstErrorSignal, "RESOURCE");
});

test("uses an OOM Docker event when the first CLI error is generic", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: start failed",
    dockerEvents: JSON.stringify({ Action: "oom", Actor: { Attributes: { name: "supabase_db_web", exitCode: "1", labels: { "com.supabase.cli.project": "web" } } } }),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  assert.equal(evidence.firstErrorSource, "DOCKER_EVENT");
  assert.equal(evidence.firstErrorSignal, "DOCKER_OOM");
  assert.equal(evidence.firstErrorExcerpt, "event=oom;service=db;exit_code=1");
  assert.equal(evidence.failureService, "db");
  assert.equal(evidence.serviceAttribution, "confirmed");
});

test("separates healthy PostgreSQL from a refused runner TCP connection and redacts debug details", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: health check failed for supabase_db_web at 127.0.0.1:54322 token=private-token",
    exitCode: 1,
    startProgressSnapshots: [{
      schemaVersion: 1, elapsedSeconds: 35, observationState: "SERVICES_READY",
      dbDockerHealth: "healthy", dbPostgresInternal: "ready", dbHostTcp: "refused",
    }],
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({ category: SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE, exitCode: 1, dockerVersion: "28.0.4", supabaseCliVersion: "2.117.0", dockerDaemonAvailable: true, evidence });

  assert.equal(evidence.dbConnectivity, "host_tcp_refused");
  assert.equal(evidence.confirmedService, null);
  assert.equal(evidence.suspectedService, "db");
  assert.equal(evidence.serviceAttribution, "suspected");
  assert.match(diagnostic, /db_docker_health=healthy/);
  assert.match(diagnostic, /db_postgres_internal=ready/);
  assert.match(diagnostic, /db_host_tcp=refused/);
  assert.match(diagnostic, /confirmed_service=unavailable/);
  assert.match(diagnostic, /suspected_service=db/);
  assert.doesNotMatch(diagnostic, /127\.0\.0\.1|private-token|supabase_db_web/);
  assert.equal(evidence.firstErrorSource, "SUPABASE_CLI_LOG");
});

test("reports Docker health and internal PostgreSQL failures as separate signals", () => {
  const snapshots = [
    { schemaVersion: 1, elapsedSeconds: 10, observationState: "CONTAINERS_OBSERVED", dbDockerHealth: "starting", dbPostgresInternal: "not_ready", dbHostTcp: "refused" },
    { schemaVersion: 1, elapsedSeconds: 15, observationState: "CONTAINERS_OBSERVED", dbDockerHealth: "unhealthy", dbPostgresInternal: "not_ready", dbHostTcp: "refused" },
  ];
  const evidence = collectBoundedStartEvidence({ log: "Error: health check failed", exitCode: 1, startProgressSnapshots: snapshots, probeCommand: createProbeCommand() });

  assert.equal(evidence.dbConnectivity, "docker_unhealthy");
  assert.equal(evidence.confirmedService, null);
  assert.equal(evidence.suspectedService, "db");
  assert.equal(evidence.dbConnectivityTimeline, "10:docker=starting;postgres=not_ready;host_tcp=refused,15:docker=unhealthy;postgres=not_ready;host_tcp=refused");
});

test("distinguishes a runner TCP timeout from PostgreSQL readiness", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Error: connection timed out",
    exitCode: 1,
    startProgressSnapshots: [{
      schemaVersion: 1, elapsedSeconds: 25, observationState: "SERVICES_READY",
      dbDockerHealth: "healthy", dbPostgresInternal: "ready", dbHostTcp: "timeout",
    }],
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.dbConnectivity, "host_tcp_timeout");
  assert.equal(evidence.dbDockerHealth, "healthy");
  assert.equal(evidence.dbPostgresInternal, "ready");
  assert.equal(evidence.dbHostTcp, "timeout");
  assert.equal(evidence.serviceAttribution, "suspected");
});

test("classifies a terminal PostgreSQL authentication error without exposing its message", () => {
  const log = "FATAL: password authentication failed for user private_role token=private-token";
  const evidence = collectBoundedStartEvidence({ log, exitCode: 1, probeCommand: createProbeCommand() });
  const diagnostic = renderSupabaseStartDiagnostic({ category: classifySupabaseStartFailure({ log, exitCode: 1, evidence }), exitCode: 1, dockerVersion: "28.0.4", supabaseCliVersion: "2.117.0", dockerDaemonAvailable: true, evidence });

  assert.equal(evidence.firstErrorSignal, "AUTHENTICATION");
  assert.equal(evidence.firstErrorExcerpt, "class=authentication;service=unavailable");
  assert.match(diagnostic, /category=AUTHENTICATION_FAILURE/);
  assert.doesNotMatch(diagnostic, /private_role|private-token|password authentication/);
});

test("does not attribute an orderly db stop and cleanup as the startup failure", () => {
  const dockerEvents = [
    { Action: "health_status: healthy", Actor: { Attributes: { name: "supabase_db_web", labels: { "com.supabase.cli.project": "web" } } } },
    { Action: "die", Actor: { Attributes: { name: "supabase_db_web", exitCode: "0", labels: { "com.supabase.cli.project": "web" } } } },
    { Action: "destroy", Actor: { Attributes: { name: "supabase_db_web", labels: { "com.supabase.cli.project": "web" } } } },
  ].map(JSON.stringify).join("\n");
  const evidence = collectBoundedStartEvidence({
    log: "Error: CLI health check failed",
    dockerEvents,
    exitCode: 1,
    startProgressSnapshots: [{ schemaVersion: 1, elapsedSeconds: 20, observationState: "SERVICES_READY", dbDockerHealth: "healthy", dbPostgresInternal: "ready", dbHostTcp: "connected" }],
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({ category: SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE, exitCode: 1, dockerVersion: "28.0.4", supabaseCliVersion: "2.117.0", dockerDaemonAvailable: true, evidence });

  assert.equal(evidence.confirmedService, null);
  assert.equal(evidence.suspectedService, null);
  assert.equal(evidence.serviceAttribution, "unknown");
  assert.equal(evidence.dbConnectivity, "connected");
  assert.match(diagnostic, /docker_lifecycle_events=.*kind=normal_exit.*kind=cleanup/);
  assert.match(diagnostic, /confirmed_service=unavailable/);
  assert.match(diagnostic, /suspected_service=unavailable/);
});

test("uses the first Docker failure event when the CLI log contains no classifiable error", () => {
  const evidence = collectBoundedStartEvidence({
    log: "starting local Supabase",
    dockerEvents: JSON.stringify({ Action: "oom", Actor: { Attributes: { name: "supabase_rest_web", exitCode: "137", image: "private/image", labels: { "com.supabase.cli.project": "web" } } } }),
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });
  assert.equal(evidence.firstErrorSource, "DOCKER_EVENT");
  assert.equal(evidence.firstErrorSignal, "DOCKER_OOM");
  assert.equal(evidence.firstErrorExcerpt, "event=oom;service=rest;exit_code=137");
  assert.ok(evidence.evidenceCodes.includes("DOCKER_FAILURE_EVENT_OBSERVED"));
  assert.doesNotMatch(diagnostic, /private\/image|supabase_rest/);
});

test("publishes only allowlisted error categories for adversarial log formats", async () => {
  const cases = [
    {
      log: "Error: failed to connect postgres://user:synthetic-password@host/db",
      forbidden: ["postgres://", "synthetic-password"],
      expectedService: "db",
    },
    {
      log: 'Error: {"password":"synthetic-pwd-value"}',
      forbidden: ["synthetic-pwd-value", '"password"'],
      expectedService: "unavailable",
    },
    {
      log: "Error: Authorization: Bearer synthetic-auth-token",
      forbidden: ["synthetic-auth-token", "Bearer"],
      expectedService: "unavailable",
    },
    {
      log: "Error: token=synthetic-token-value",
      forbidden: ["synthetic-token-value", "token="],
      expectedService: "unavailable",
    },
    {
      log: "Error: failed to read C:\\Users\\runner\\secrets\\supabase.env",
      forbidden: ["C:\\Users\\runner", "supabase.env"],
      expectedService: "unavailable",
    },
    {
      log: "Error: synthetic unknown diagnostic with private-data-value",
      forbidden: ["private-data-value", "synthetic unknown diagnostic"],
      expectedService: "unavailable",
    },
  ];
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-artifact-"));
  try {
    for (const [index, testCase] of cases.entries()) {
      const evidence = collectBoundedStartEvidence({
        log: testCase.log,
        exitCode: 1,
        probeCommand: createProbeCommand(),
      });
      const diagnostic = renderSupabaseStartDiagnostic({
        category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
        exitCode: 1,
        dockerVersion: evidence.dockerServerVersion,
        supabaseCliVersion: evidence.supabaseCliVersion,
        dockerDaemonAvailable: evidence.dockerDaemonAvailable,
        evidence,
      });
      const artifactPath = resolve(root, `diagnostic-${index}.txt`);
      await writeFile(artifactPath, diagnostic, "utf8");
      const artifact = readFileSyncFromFs(artifactPath, "utf8");

      assert.match(artifact, /first_error_excerpt=class=unknown_error;service=/);
      assert.match(artifact, new RegExp(`service=${testCase.expectedService}`));
      for (const forbidden of testCase.forbidden) {
        assert.doesNotMatch(artifact, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("records an observed migration phase without inferring a network failure", () => {
  const evidence = collectBoundedStartEvidence({
    log: "Applying migration 20261101000004_scientific_projection_volume_proxy_v2.sql...",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.firstErrorSignal, "NONE");
  assert.equal(evidence.firstErrorExcerpt, "none");
  assert.equal(evidence.startPhase, "MIGRATIONS");
});

test("renders the bounded startup observation timeline without publishing raw snapshots", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure private-token",
    exitCode: 1,
    durationSeconds: 12,
    startProgressSnapshots: [
      { schemaVersion: 1, elapsedSeconds: 0, observationState: "DOCKER_READY", dockerDaemon: "available", dockerImages: 0, dockerContainers: 0, requiredServicesState: "missing", networkState: "missing" },
      { schemaVersion: 1, elapsedSeconds: 5, observationState: "NETWORK_OBSERVED", dockerDaemon: "available", dockerImages: 2, dockerContainers: 0, requiredServicesState: "missing", networkState: "observed" },
    ],
    probeCommand: createProbeCommand(),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.startObservationCount, 2);
  assert.equal(evidence.startObservationTimeline, "0:DOCKER_READY,5:NETWORK_OBSERVED");
  assert.match(diagnostic, /start_observation_count=2/);
  assert.match(diagnostic, /start_observation_timeline=0:DOCKER_READY,5:NETWORK_OBSERVED/);
  assert.doesNotMatch(diagnostic, /private-token|DockerRootDir|supabase_db_web/);
});

test("reads a complete NDJSON progress file without changing observation order", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-progress-valid-"));
  const progressFile = resolve(root, "progress.ndjson");
  const snapshots = [
    { schemaVersion: 1, elapsedSeconds: 0, observationState: "DOCKER_READY" },
    { schemaVersion: 1, elapsedSeconds: 5, observationState: "CONTAINERS_OBSERVED" },
  ];
  try {
    await writeFile(progressFile, `${snapshots.map((snapshot) => JSON.stringify(snapshot)).join("\n")}\n`);
    assert.deepEqual(readProgressSnapshots(progressFile), { snapshots, partial: false });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps valid observations when the final NDJSON line is truncated", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-progress-partial-"));
  const progressFile = resolve(root, "progress.ndjson");
  const snapshots = [
    { schemaVersion: 1, elapsedSeconds: 0, observationState: "DOCKER_READY" },
    { schemaVersion: 1, elapsedSeconds: 5, observationState: "CONTAINERS_OBSERVED" },
  ];
  const truncatedLine = '{"schemaVersion":1,"elapsedSeconds":10,"observationState":"CONTAINERS_OBSERVED","privateToken":"private-token","container":"supabase_db_web"';
  try {
    await writeFile(progressFile, `${snapshots.map((snapshot) => JSON.stringify(snapshot)).join("\n")}\n${truncatedLine}`);
    const progress = readProgressSnapshots(progressFile);
    assert.deepEqual(progress.snapshots, snapshots);
    assert.equal(progress.partial, true);

    const evidence = collectBoundedStartEvidence({
      log: "opaque startup failure",
      exitCode: 1,
      durationSeconds: 75,
      startProgressSnapshots: progress.snapshots,
      startProgressPartial: progress.partial,
      probeCommand: createProbeCommand(),
    });
    const diagnostic = renderSupabaseStartDiagnostic({
      category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
      exitCode: 1,
      dockerVersion: evidence.dockerServerVersion,
      supabaseCliVersion: evidence.supabaseCliVersion,
      dockerDaemonAvailable: evidence.dockerDaemonAvailable,
      evidence,
    });

    assert.equal(evidence.startObservationCount, 2);
    assert.equal(evidence.startObservationTimeline, "0:DOCKER_READY,5:CONTAINERS_OBSERVED");
    assert.ok(evidence.evidenceCodes.includes("START_PROGRESS_PARTIAL"));
    assert.match(diagnostic, /evidence_codes=.*START_PROGRESS_PARTIAL/);
    assert.doesNotMatch(diagnostic, /private-token|supabase_db_web|truncated/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores an invalid first NDJSON line while retaining later valid observations", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-progress-invalid-"));
  const progressFile = resolve(root, "progress.ndjson");
  const snapshot = { schemaVersion: 1, elapsedSeconds: 5, observationState: "NETWORK_OBSERVED" };
  try {
    await writeFile(progressFile, `not-json\n${JSON.stringify(snapshot)}\n`);
    assert.deepEqual(readProgressSnapshots(progressFile), { snapshots: [snapshot], partial: false });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns an empty non-partial result for absent or unreadable progress files", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-progress-unavailable-"));
  try {
    assert.deepEqual(readProgressSnapshots(resolve(root, "missing.ndjson")), { snapshots: [], partial: false });
    const directoryPath = resolve(root, "directory");
    await mkdir(directoryPath);
    assert.deepEqual(readProgressSnapshots(directoryPath), { snapshots: [], partial: false });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("confirms zero containers only when docker ps succeeds", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.dockerContainers, 0);
  assert.deepEqual(evidence.dockerContainerStates, { running: 0, exited: 0, created: 0, restarting: 0, other: 0 });
  assert.ok(evidence.evidenceCodes.includes("NO_SUPABASE_CONTAINERS"));
  assert.ok(!evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
});

test("marks container evidence unavailable when docker ps fails", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: false, output: "" } }),
  });

  assert.equal(evidence.dockerContainers, null);
  assert.deepEqual(evidence.dockerContainerStates, {
    running: "unavailable",
    exited: "unavailable",
    created: "unavailable",
    restarting: "unavailable",
    other: "unavailable",
  });
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
  assert.ok(!evidence.evidenceCodes.includes("NO_SUPABASE_CONTAINERS"));
});

test("does not disclose docker ps stderr when container inspection fails", () => {
  const secret = "docker-secret-jwt";
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: false, output: `permission denied token=${secret}` } }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.dockerContainers, null);
  assert.match(diagnostic, /docker_containers=unavailable/);
  assert.doesNotMatch(diagnostic, new RegExp(secret));
});

test("startup success requires a favorable exit and healthy operational services", () => {
  const evidence = collectBoundedStartEvidence({
    log: "",
    exitCode: 0,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output: "" } }),
  });

  assert.equal(classifySupabaseStartFailure({ log: "", exitCode: 0, evidence }), SUPABASE_START_CATEGORIES.START_INCOMPLETE);
  assert.equal(classifySupabaseStartFailure({ log: "", exitCode: 124, evidence }), SUPABASE_START_CATEGORIES.START_TIMEOUT);
  assert.equal(classifySupabaseStartFailure({ log: "", exitCode: 143, evidence }), SUPABASE_START_CATEGORIES.START_CANCELLED);
  const healthy = { ...evidence, requiredServicesState: "ready", healthState: "healthy", supabaseStatus: "available" };
  assert.equal(classifySupabaseStartFailure({ log: "", exitCode: 0, evidence: healthy }), SUPABASE_START_CATEGORIES.START_SUCCEEDED);
});

test("preserves failure classification when supabase start fails", () => {
  const evidence = collectBoundedStartEvidence({
    log: "failed to pull image from registry",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "failed to pull image from registry", exitCode: 1 }),
    SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
  );
  assert.ok(evidence.evidenceCodes.includes("LOG_SIGNAL_IMAGE_UNAVAILABLE"));
  assert.ok(!evidence.evidenceCodes.includes("START_SUCCEEDED"));
});

test("identifies the configured E2E services and port conflict without publishing names or logs", () => {
  const evidence = collectBoundedStartEvidence({
    log: "failed to bind service kong: address already in use",
    exitCode: 1,
    probeCommand: createProbeCommand({
      dockerContainers: {
        available: true,
        output: [
          "supabase_db_web\tpostgres\tUp 10 seconds\t",
          "supabase_kong_web\tkong\tUp 10 seconds\t0.0.0.0:54321->8000/tcp",
          "supabase_rest_web\tpostgrest\tUp 10 seconds\t",
          "supabase_storage_api_web\tstorage\tUp 10 seconds\t",
        ].join("\n"),
      },
      listeningPorts: { available: true, output: "LISTEN 0 128 127.0.0.1:54321 0.0.0.0:*" },
    }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log: "failed to bind service kong: address already in use", exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.requiredServicesState, "ready");
  assert.equal(evidence.portState, "conflict");
  assert.equal(evidence.failureService, "kong");
  assert.match(diagnostic, /category=PORT_CONFLICT/);
  assert.match(diagnostic, /failure_service=kong/);
  assert.match(diagnostic, /port_conflicts=54321/);
  assert.doesNotMatch(diagnostic, /postgres:|private|token|docker-secret|supabase_db_web/);
});

test("classifies explicit probe failures before log heuristics", () => {
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, dockerCommandAvailable: false }),
    SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, dockerDaemonAvailable: false }),
    SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, supabaseCliAvailable: false }),
    SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 0, dockerCommandAvailable: false }),
    SUPABASE_START_CATEGORIES.START_INCOMPLETE,
  );
});

test("collects unavailable Docker, CLI, status, network and host-port probes as bounded evidence", () => {
  const evidence = collectBoundedStartEvidence({
    log: "DNS resolution failed through proxy",
    exitCode: 1,
    probeCommand: createProbeCommand({
      dockerVersion: { available: false, output: "docker command not found" },
      dockerDaemon: { available: false, output: "Cannot connect to the Docker daemon" },
      dockerInfo: { available: false, output: "DockerRootDir=/sensitive" },
      dockerContainers: { available: false, output: "permission denied" },
      dockerImages: { available: false, output: "manifest unknown" },
      dockerNetworks: { available: false, output: "network secret" },
      listeningPorts: { available: false, output: "ss unavailable" },
      supabaseCli: { available: false, output: "supabase CLI missing" },
      supabaseStatus: { available: false, output: "status secret" },
    }),
  });

  assert.equal(evidence.dockerCommandAvailable, false);
  assert.equal(evidence.dockerDaemonAvailable, false);
  assert.equal(evidence.supabaseCliAvailable, false);
  assert.equal(evidence.dockerContainers, null);
  assert.equal(evidence.dockerImages, null);
  assert.equal(evidence.networkState, "unobserved");
  assert.equal(evidence.portState, "unobserved");
  assert.equal(evidence.requiredServicesState, "unobserved");
  assert.equal(evidence.healthState, "unavailable");
  assert.ok(evidence.evidenceCodes.includes("DOCKER_COMMAND_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("DOCKER_DAEMON_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CLI_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
  assert.ok(evidence.evidenceCodes.includes("HOST_PORTS_UNOBSERVED"));
  assert.equal(evidence.dockerServerVersion, "unavailable");
  assert.equal(evidence.supabaseCliVersion, "unavailable");
});

test("records missing images, absent networks, invalid versions and invalid configuration", async () => {
  const config = [
    'project_id = "wrong"',
    "major_version = 18",
    'health_timeout = "30s"',
    "[api]", "port = 0",
    "[db]", "port = 54321",
    "[studio]", "port = 54321",
  ].join("\n");

  await withTempConfig(config, async (root) => {
    const evidence = collectBoundedStartEvidence({
      root,
      log: "manifest unknown for image",
      exitCode: 1,
      probeCommand: createProbeCommand({
        dockerVersion: { available: true, output: "Docker version invalid" },
        dockerDaemon: { available: true, output: "server-version=bad" },
        dockerImages: { available: true, output: "" },
        dockerNetworks: { available: true, output: "bridge\tbridge" },
      }),
    });
    assert.equal(evidence.configContract, "invalid");
    assert.deepEqual(evidence.configuredPorts, { api: 0, db: 54321, studio: 54321 });
    assert.equal(evidence.dockerImages, 0);
    assert.equal(evidence.networkState, "missing");
    assert.equal(evidence.dockerServerVersion, "unavailable");
    assert.equal(evidence.portState, "clear");
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONFIG_CONTRACT_INVALID"));
    assert.ok(evidence.evidenceCodes.includes("NO_DOCKER_IMAGES"));
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_MISSING"));
    assert.equal(
      classifySupabaseStartFailure({ log: "manifest unknown for image", exitCode: 1, evidence }),
      SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
    );
  });
});

test("marks a missing TOML configuration unavailable without throwing", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-missing-"));
  try {
    const evidence = collectBoundedStartEvidence({ root, log: "opaque", exitCode: 1, probeCommand: createProbeCommand() });
    assert.equal(evidence.configContract, "unavailable");
    assert.deepEqual(evidence.configuredPorts, {});
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONFIG_UNAVAILABLE"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("distinguishes partial, unhealthy, ready and unknown container states", () => {
  const output = [
    "supabase_db_web\tpostgres\tUp 10 seconds\t",
    "supabase_kong_web\tkong\tRestarting (1) 2 seconds ago\t",
    "supabase_rest_web\tpostgrest\tExited (1) 1 second ago\t",
    "supabase_storage_api_web\tstorage\tCreated\t",
    "supabase_studio_web\tstudio\tPaused\t",
  ].join("\n");
  const evidence = collectBoundedStartEvidence({
    log: "container db is unhealthy",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output } }),
  });

  assert.deepEqual(evidence.dockerContainerStates, { running: 1, exited: 1, created: 1, restarting: 1, other: 1 });
  assert.deepEqual(evidence.dockerContainerServices, { db: "running", kong: "restarting", rest: "exited", storage: "created", studio: "other" });
  assert.equal(evidence.requiredServicesState, "unhealthy");
  assert.equal(evidence.healthState, "failed");
  assert.ok(evidence.requiredServicesMissing.length === 0);
  assert.ok(evidence.evidenceCodes.includes("SERVICE_HEALTH_FAILURE"));
  assert.ok(evidence.evidenceCodes.includes("LOG_SIGNAL_HEALTHCHECK_FAILURE"));
});

test("emits combined proof codes for ready services, clear ports and available status", () => {
  const evidence = collectBoundedStartEvidence({
    log: "startup complete",
    exitCode: 0,
    durationSeconds: 80,
    probeCommand: createProbeCommand({
      dockerContainers: {
        available: true,
        output: [
          "supabase_db_web\tpostgres\tUp 10 seconds\t",
          "supabase_kong_web\tkong\tUp 10 seconds\t",
          "supabase_rest_web\tpostgrest\tUp 10 seconds\t",
          "supabase_storage_api_web\tstorage\tUp 10 seconds\t",
        ].join("\n"),
      },
      dockerNetworks: { available: true, output: "supabase_network\tbridge" },
      listeningPorts: { available: true, output: "LISTEN 0 128 127.0.0.1:1 0.0.0.0:*" },
      supabaseStatus: { available: true, output: '{"DB": "ready"}' },
    }),
  });
  assert.equal(evidence.requiredServicesState, "ready");
  assert.equal(evidence.healthState, "healthy");
  assert.equal(evidence.supabaseStatus, "available");
  assert.equal(evidence.portState, "clear");
  assert.ok(evidence.evidenceCodes.includes("REQUIRED_SERVICES_READY"));
  assert.ok(evidence.evidenceCodes.includes("SERVICES_HEALTHY"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_OBSERVED"));
  assert.ok(evidence.evidenceCodes.includes("HOST_PORTS_CLEAR"));
  assert.ok(evidence.evidenceCodes.includes("START_SUCCEEDED"));
  assert.ok(evidence.evidenceCodes.includes("START_PHASE_UNOBSERVED"));
  assert.ok(!evidence.evidenceCodes.includes("NONZERO_START_EXIT"));
});

test("renders all evidence fields while withholding raw logs and sensitive container names", () => {
  const evidence = {
    schemaVersion: 2,
    evidenceCodes: ["CODE_A", "CODE_B"],
    startPhase: "UNKNOWN",
    failureService: "db",
    firstErrorSignal: "NONE",
    firstErrorExcerpt: "none",
    dockerContainers: null,
    dockerContainerStates: { running: "unavailable", exited: "unavailable", created: "unavailable", restarting: "unavailable", other: "unavailable" },
    dockerImages: null,
    networkState: "unobserved",
    portState: "unobserved",
    portConflicts: [],
    requiredServicesState: "unobserved",
    requiredServicesMissing: ["db", "kong"],
    healthState: "unavailable",
    dockerCpuCount: null,
    dockerMemoryBytes: null,
    supabaseStatus: "unavailable",
    configContract: "unavailable",
    configuredPorts: {},
    durationSeconds: null,
  };
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: "Docker version 28.0.4 DockerRootDir=/secret",
    supabaseCliVersion: "2.117.0 token=secret",
    dockerDaemonAvailable: false,
    evidence,
  });
  assert.match(diagnostic, /result=failure exit_code=1/);
  assert.match(diagnostic, /docker_container_states=running:unavailable/);
  assert.match(diagnostic, /required_services_missing=db,kong/);
  assert.doesNotMatch(diagnostic, /DockerRootDir|\/secret|token=secret|supabase_db_web/);
});

test("the workflow keeps startup failure blocking and never prints the raw log", () => {
  for (const source of [sqlWorkflow, appWorkflow, restoreWorkflow]) {
    assert.match(source, /bash scripts\/ci\/start-supabase-ephemeral\.sh/);
    assert.doesNotMatch(source, /--ignore-health-check/);
  }
  assert.match(startScript, /set -euo pipefail/);
  assert.match(startScript, /start_exit_code=\$\?/);
  assert.match(startScript, /--watch-pid="\$start_pid"/);
  assert.match(startScript, /--progress-file="\$progress_file"/);
  assert.match(startScript, /--watch-pid="\$start_pid" --progress-file="\$progress_file" --expected-network="\$network" --root="\$root"/);
  assert.match(startScript, /--docker-events-file="\$events_file" \\\s+--expected-network="\$network" \\\s+--root="\$root" \\\s+--exit-code="\$start_exit_code"/);
  assert.match(startScript, /docker events --since "\$1" --filter type=container/);
  assert.match(startScript, /events_pid=\$!/);
  assert.match(startScript, /setsid bash -c 'docker logs --follow --timestamps "\$1" 2>\/dev\/null \| node "\$2\/scripts\/ci\/capture-bounded-log\.mjs" "\$3" 8388608'/);
  assert.match(startScript, /setsid bash -c 'docker exec "\$1" sh -c .*capture-bounded-log\.mjs.*\$3.*8388608'/);
  assert.match(startScript, /timeout --signal=TERM --kill-after=15s "\$start_timeout_seconds"/);
  assert.match(startScript, /capture-bounded-log\.mjs/);
  assert.match(startScript, /--postgres-log-file="\$postgres_log"/);
  assert.match(startScript, /--postgres-server-log-file="\$postgres_server_log"/);
  assert.match(startScript, /rm -f "\$start_log" "\$start_fifo" "\$progress_file" "\$events_file" "\$postgres_log" "\$postgres_server_log"/);
  assert.match(startScript, /stop_pid_or_group/);
  assert.match(startScript, /kill -KILL -- "-\$pid"/);
  assert.match(startScript, /--docker-events-file="\$events_file"/);
  assert.match(startScript, /if \[\[ "\$start_exit_code" -ne 0 \]\]; then\s+exit "\$start_exit_code"/);
  assert.match(startScript, /cat "\$diagnostic_output"/);
  assert.doesNotMatch(startScript, /cat "\$start_log"|cat "\$events_file"/);
});
