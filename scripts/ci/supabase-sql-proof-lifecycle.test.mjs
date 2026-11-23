import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  WORKFLOW_STAGES,
  createEvidenceReport,
  finalizeWorkflowEvidence,
  runCanonicalReset,
  verifyCanonicalSchemaSeed,
} from "./supabase-sql-proof-lifecycle.mjs";

const candidate = "b".repeat(40);

function makeTempReport(context, report) {
  const root = resolve("artifacts/ci");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(resolve(root, "sql-proof-lifecycle-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const evidencePath = resolve(directory, "evidence.json");
  writeFileSync(evidencePath, JSON.stringify(report));
  return {
    evidencePath,
    read: () => JSON.parse(readFileSync(evidencePath, "utf8")),
    write: (value) => writeFileSync(evidencePath, JSON.stringify(value)),
  };
}

function baseReport() {
  return {
    kind: "cleanmymap-supabase-sql-evidence",
    candidateSha: candidate,
    headSha: candidate,
    outcome: "NOT_RUN",
    migrations: [{ id: "20261123000005", path: "apps/web/supabase/migrations/20261123000005_example.sql" }],
    records: [],
    workflowStages: WORKFLOW_STAGES.map((stage) => ({ stage, status: "NOT_RUN", origin: "UNPROVEN" })),
  };
}

test("initial lifecycle evidence contains one NOT_RUN record per upstream stage", () => {
  const report = createEvidenceReport(candidate, {
    inventorySqlProofs: () => ({ pgtap: ["test.pgtap.sql"], contracts: ["contract.sql"], multisession: ["concurrency.mjs"], unregistered: ["unknown.sql"] }),
    prioritizePaths: (paths) => paths,
    baseRecord: (path, category) => ({ path, category, status: "NOT_RUN", outcome: "NOT_RUN" }),
    migrationEvidence: () => [],
    env: {},
  });
  assert.deepEqual(report.workflowStages.map(({ stage, status }) => [stage, status]), WORKFLOW_STAGES.map((stage) => [stage, "NOT_RUN"]));
  assert.ok(report.records.some(({ category }) => category === "UNREGISTERED_SQL_PROOF"));
});

test("canonical reset records pass without changing the reset command contract", async (context) => {
  const temp = makeTempReport(context, baseReport());
  let invocation;
  const result = await runCanonicalReset({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: temp.evidencePath,
    commandName: () => "supabase",
    runCommand: async (command, args, options) => { invocation = { command, args, options }; return { code: 0, output: "" }; },
    writeReport: temp.write,
  });
  assert.equal(result, 0);
  assert.deepEqual(invocation.args.slice(0, 5), ["db", "reset", "--local", "--workdir", "apps/web"]);
  assert.ok(invocation.args.includes("--yes"));
  assert.deepEqual(temp.read().workflowStages.filter(({ stage }) => ["dbReset", "migrations", "seed"].includes(stage)).map(({ status }) => status), ["PASS", "PASS", "PASS"]);
});

test("canonical reset classifies the failed phase without guessing an ambiguous migration ID", async (context) => {
  const migrationReport = makeTempReport(context, baseReport());
  await runCanonicalReset({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: migrationReport.evidencePath,
    commandName: () => "supabase",
    runCommand: async () => ({ code: 1, output: "Applying migration 20261123000005\nERROR: invalid input SQLSTATE 22P02\nsecret=must-not-publish" }),
    writeReport: migrationReport.write,
  });
  const migrationEvidence = migrationReport.read();
  assert.equal(migrationEvidence.firstFailure.file, "apps/web/supabase/migrations/20261123000005_example.sql");
  assert.equal(migrationEvidence.firstFailure.sqlstate, "22P02");
  assert.equal(migrationEvidence.workflowStages.find(({ stage }) => stage === "seed").status, "NOT_RUN");
  assert.doesNotMatch(JSON.stringify(migrationEvidence), /must-not-publish/);

  const seedReport = makeTempReport(context, baseReport());
  await runCanonicalReset({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: seedReport.evidencePath,
    commandName: () => "supabase",
    runCommand: async () => ({ code: 1, output: "Seeding data from seed.sql\nERROR: duplicate SQLSTATE 23505" }),
    writeReport: seedReport.write,
  });
  assert.deepEqual(seedReport.read().workflowStages.filter(({ stage }) => ["migrations", "seed"].includes(stage)).map(({ status }) => status), ["PASS", "FAIL"]);

  const ambiguousReport = makeTempReport(context, baseReport());
  await runCanonicalReset({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: ambiguousReport.evidencePath,
    commandName: () => "supabase",
    runCommand: async () => ({ code: 1, output: "Applying migration 20261123000005\nApplying migration 20261123000006\nERROR: invalid input SQLSTATE 22P02" }),
    writeReport: ambiguousReport.write,
  });
  assert.equal(ambiguousReport.read().firstFailure.origin, "MIGRATION_REPLAY");
  assert.equal(ambiguousReport.read().firstFailure.migrationId, null);
  assert.equal(ambiguousReport.read().firstFailure.file, undefined);
  assert.deepEqual(ambiguousReport.read().workflowStages.filter(({ stage }) => ["migrations", "seed"].includes(stage)).map(({ status }) => status), ["FAIL", "NOT_RUN"]);
});

test("schema and seed verification stays local, bounded, and publishes no raw CLI output", async (context) => {
  const temp = makeTempReport(context, baseReport());
  const calls = [];
  const result = await verifyCanonicalSchemaSeed({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: temp.evidencePath,
    commandName: () => "supabase",
    networkArgs: () => ["--network-id=test-network"],
    runCommand: async (command, args, options) => {
      calls.push({ command, args, options });
      return args[0] === "status"
        ? { code: 0, output: JSON.stringify({ DB_URL: "postgresql://localhost:5432/postgres" }) }
        : { code: 0, output: "PASS" };
    },
    writeReport: temp.write,
  });
  assert.equal(result, 0);
  assert.ok(calls[0].args.includes("--output"));
  assert.ok(calls[1].args.includes("--local"));
  assert.ok(calls.every(({ args }) => args.includes("--network-id=test-network")));
  assert.equal(temp.read().workflowStages.find(({ stage }) => stage === "schemaSeedValidation").status, "PASS");

  const privateReport = makeTempReport(context, baseReport());
  const callsOnNonLocal = [];
  await verifyCanonicalSchemaSeed({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: privateReport.evidencePath,
    commandName: () => "supabase",
    networkArgs: () => [],
    runCommand: async (_command, args) => {
      callsOnNonLocal.push(args);
      return { code: 0, output: JSON.stringify({ DB_URL: "postgresql://remote.example:5432/postgres" }) };
    },
    writeReport: privateReport.write,
  });
  assert.equal(callsOnNonLocal.length, 1, "remote target must be rejected before db query");
  assert.equal(privateReport.read().firstFailure.category, "NON_LOCAL_DATABASE_URL");
  assert.doesNotMatch(JSON.stringify(privateReport.read()), /remote\.example/);
});

test("a timed out reset and skipped schema validation remain non-passing", async (context) => {
  const temp = makeTempReport(context, baseReport());
  await runCanonicalReset({
    assertEphemeralSupabaseTestEnvironment: () => true,
    candidateSha: () => candidate,
    evidencePath: temp.evidencePath,
    commandName: () => "supabase",
    runCommand: async () => ({ code: 124, timedOut: true, output: "private" }),
    writeReport: temp.write,
  });
  const report = temp.read();
  assert.equal(report.workflowStages.find(({ stage }) => stage === "dbReset").failure.category, "RESET_TIMEOUT");
  const environment = {
    CMM_STEP_BOOTSTRAP: process.env.CMM_STEP_BOOTSTRAP,
    CMM_STEP_DB_RESET: process.env.CMM_STEP_DB_RESET,
    CMM_STEP_SCHEMA_SEED: process.env.CMM_STEP_SCHEMA_SEED,
  };
  process.env.CMM_STEP_BOOTSTRAP = "success";
  process.env.CMM_STEP_DB_RESET = "failure";
  process.env.CMM_STEP_SCHEMA_SEED = "skipped";
  try {
    const status = finalizeWorkflowEvidence({
      candidateSha: () => candidate,
      evidencePath: temp.evidencePath,
      readFileSync,
      writeReport: temp.write,
      createEvidenceReport: () => baseReport(),
      repositoryRoot: process.cwd(),
    });
    assert.equal(status, 1);
    assert.notEqual(temp.read().workflowStages.find(({ stage }) => stage === "schemaSeedValidation").status, "PASS");
  } finally {
    for (const [key, value] of Object.entries(environment)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test("bootstrap failure imports only allowlisted diagnostic fields and leaves reset stages unrun", (context) => {
  const temp = makeTempReport(context, baseReport());
  const repositoryRoot = resolve(temp.evidencePath, "..", "private-repo");
  const diagnosticPath = resolve(repositoryRoot, "artifacts/ci/supabase-start-diagnostic.txt");
  mkdirSync(resolve(diagnosticPath, ".."), { recursive: true });
  writeFileSync(diagnosticPath, "category=MIGRATION_SQL_DATA\ndiagnostic_code=SUPABASE_START_MIGRATION_SQL_DATA\nfirst_error_sqlstate=22P02\nfirst_error_detail=private SQL and secret");
  context.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  const environment = {
    CMM_STEP_BOOTSTRAP: process.env.CMM_STEP_BOOTSTRAP,
    CMM_STEP_DB_RESET: process.env.CMM_STEP_DB_RESET,
    CMM_STEP_SCHEMA_SEED: process.env.CMM_STEP_SCHEMA_SEED,
  };
  process.env.CMM_STEP_BOOTSTRAP = "failure";
  process.env.CMM_STEP_DB_RESET = "skipped";
  process.env.CMM_STEP_SCHEMA_SEED = "skipped";
  try {
    finalizeWorkflowEvidence({
      candidateSha: () => candidate,
      evidencePath: temp.evidencePath,
      readFileSync,
      writeReport: temp.write,
      createEvidenceReport: () => baseReport(),
      repositoryRoot,
    });
    const report = temp.read();
    assert.equal(report.firstFailure.stage, "bootstrap");
    assert.equal(report.firstFailure.sqlstate, "22P02");
    assert.equal(report.workflowStages.find(({ stage }) => stage === "migrations").status, "NOT_RUN");
    assert.equal(report.workflowStages.find(({ stage }) => stage === "seed").status, "NOT_RUN");
    assert.equal(report.workflowStages.find(({ stage }) => stage === "dbReset").status, "NOT_RUN");
    assert.doesNotMatch(JSON.stringify(report), /private SQL|secret/);
  } finally {
    for (const [key, value] of Object.entries(environment)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test("workflow cancellation is recorded as an interruption and never as a pass", (context) => {
  const temp = makeTempReport(context, baseReport());
  const names = ["BOOTSTRAP", "DB_RESET", "SCHEMA_SEED", "SQL_PROOF"];
  const environment = Object.fromEntries(names.map((name) => [`CMM_STEP_${name}`, process.env[`CMM_STEP_${name}`]]));
  process.env.CMM_STEP_BOOTSTRAP = "success";
  for (const name of names.slice(1)) process.env[`CMM_STEP_${name}`] = "cancelled";
  try {
    finalizeWorkflowEvidence({
      candidateSha: () => candidate,
      evidencePath: temp.evidencePath,
      readFileSync,
      writeReport: temp.write,
      createEvidenceReport: () => baseReport(),
      repositoryRoot: process.cwd(),
    });
    const report = temp.read();
    assert.deepEqual(report.workflowStages.map(({ status }) => status), ["PASS", "INCONCLUSIVE", "INCONCLUSIVE", "INCONCLUSIVE", "INCONCLUSIVE", "INCONCLUSIVE"]);
    assert.ok(report.workflowStages.every(({ failure }) => failure?.category === "PROCESS_INTERRUPTED" || failure?.category === undefined));
    assert.equal(report.outcome, "FAIL");
  } finally {
    for (const [key, value] of Object.entries(environment)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});
