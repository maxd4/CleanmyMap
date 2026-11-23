import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildSafeIsolationDiagnostic,
  buildSupplementalPsqlInvocation,
  classifyPrefixReplayAttempt,
  classifyPrivateFailure,
  extractSafePostgresError,
  findFirstFailedPrefix,
  verifyFailedPrefixBoundary,
  writePrivatePrefixAttempt,
} from "./isolate-supabase-migration-failure.mjs";

test("binary prefix isolation tests the full candidate, then returns its exact first failing migration", () => {
  const versions = [];
  for (const expected of [0, 1, 27, 498]) {
    versions.length = 0;
    const firstFailed = findFirstFailedPrefix(499, (prefixLength) => {
      versions.push(prefixLength);
      return prefixLength <= expected;
    });
    assert.equal(firstFailed, expected);
    assert.equal(versions[0], 499, "the canonical full prefix must be tested before binary search");
    assert.ok(versions.includes(expected + 1), "the failing prefix must be tested");
    if (expected > 0) assert.ok(versions.includes(expected), "the preceding successful prefix must be tested");
  }
});

test("binary prefix isolation returns no failure when every prefix succeeds", () => {
  const attempts = [];
  assert.equal(findFirstFailedPrefix(499, (prefixLength) => {
    attempts.push(prefixLength);
    return true;
  }), null);
  assert.deepEqual(attempts, [499], "the full canonical prefix is explicitly confirmed");
});

test("a candidate migration is attributed only when adjacent prefixes reproduce pass then fail", () => {
  const migrations = [{ version: "20261121000001" }, { version: "20261121000002" }, { version: "20261121000003" }];
  const calls = [];
  const boundary = verifyFailedPrefixBoundary(migrations, 1, (prefixLength, phase) => {
    calls.push({ prefixLength, phase });
    return { outcome: prefixLength === 1 ? "PASS" : "POSTGRES_FAIL", exitCode: prefixLength === 1 ? 0 : 1 };
  });
  assert.deepEqual(calls, [
    { prefixLength: 1, phase: "boundary-predecessor" },
    { prefixLength: 2, phase: "boundary-failure" },
  ]);
  assert.equal(boundary.status, "CONFIRMED");
  assert.equal(boundary.migrationVersion, "20261121000002");
  assert.equal(boundary.predecessor.outcome, "PASS");
  assert.equal(boundary.failing.outcome, "POSTGRES_FAIL");
});

test("the first migration can be confirmed only against a successful empty prefix", () => {
  const migrations = [{ version: "20261121000001" }];
  const boundary = verifyFailedPrefixBoundary(migrations, 0, (prefixLength) => ({
    outcome: prefixLength === 0 ? "PASS" : "POSTGRES_FAIL",
    exitCode: prefixLength === 0 ? 0 : 1,
  }));
  assert.equal(boundary.status, "CONFIRMED");
  assert.equal(boundary.migrationVersion, "20261121000001");
  assert.equal(boundary.predecessor.version, null);
});

test("discordant adjacent prefix replays remain inconclusive without a migration attribution", () => {
  const migrations = [{ version: "20261121000001" }, { version: "20261121000002" }];
  const predecessorFailed = verifyFailedPrefixBoundary(migrations, 1, (prefixLength) => ({
    outcome: "POSTGRES_FAIL",
    exitCode: prefixLength,
  }));
  assert.equal(predecessorFailed.status, "INCONCLUSIVE");
  assert.equal(predecessorFailed.reason, "PREDECESSOR_NOT_PASS");
  assert.equal(predecessorFailed.migrationVersion, null);

  const candidateRecovered = verifyFailedPrefixBoundary(migrations, 1, (prefixLength) => ({
    outcome: "PASS",
    exitCode: 0,
  }));
  assert.equal(candidateRecovered.status, "INCONCLUSIVE");
  assert.equal(candidateRecovered.reason, "FAILING_PREFIX_DID_NOT_FAIL");
  assert.equal(candidateRecovered.migrationVersion, null);

  const commandMismatch = verifyFailedPrefixBoundary(migrations, 1, (prefixLength) => prefixLength === 1
    ? { outcome: "PASS", exitCode: 0 }
    : { outcome: "COMMAND_ERROR", exitCode: null });
  assert.equal(commandMismatch.status, "INCONCLUSIVE");
  assert.equal(commandMismatch.reason, "FAILING_PREFIX_COMMAND_ERROR");

  const unprovenReplayFailure = verifyFailedPrefixBoundary(migrations, 1, (prefixLength) => prefixLength === 1
    ? { outcome: "PASS", exitCode: 0 }
    : { outcome: "UNPROVEN_FAILURE", exitCode: 1 });
  assert.equal(unprovenReplayFailure.status, "INCONCLUSIVE");
  assert.equal(unprovenReplayFailure.reason, "FAILING_PREFIX_UNPROVEN_FAILURE");

  const commandFailure = verifyFailedPrefixBoundary(migrations, 1, () => ({
    outcome: "COMMAND_ERROR",
    exitCode: null,
  }));
  assert.equal(commandFailure.status, "INCONCLUSIVE");
  assert.equal(commandFailure.reason, "PREDECESSOR_COMMAND_ERROR");
  assert.equal(commandFailure.migrationVersion, null);
});

test("every prefix attempt has a distinct private log and a versioned exit record", () => {
  const privateDir = mkdtempSync(join(tmpdir(), "cmm-isolation-test-"));
  try {
    const first = writePrivatePrefixAttempt({
      privateDir,
      attempt: 1,
      phase: "binary-search",
      prefixLength: 2,
      version: "20261121000002",
      result: { status: 1, output: 'ERROR: 22P02: invalid input syntax for type bigint: "private-value-one"' },
    });
    const second = writePrivatePrefixAttempt({
      privateDir,
      attempt: 2,
      phase: "boundary-failure",
      prefixLength: 2,
      version: "20261121000002",
      result: { status: 1, output: 'ERROR: 22P02: invalid input syntax for type bigint: "private-value-two"' },
    });
    assert.notEqual(first.logPath, second.logPath);
    assert.match(readFileSync(first.logPath, "utf8"), /private-value-one/u);
    assert.match(readFileSync(second.logPath, "utf8"), /private-value-two/u);
    const manifest = readFileSync(join(privateDir, "prefix-attempts.jsonl"), "utf8")
      .trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(manifest.map(({ version, outcome, exitCode }) => ({ version, outcome, exitCode })), [
      { version: "20261121000002", outcome: "POSTGRES_FAIL", exitCode: 1 },
      { version: "20261121000002", outcome: "POSTGRES_FAIL", exitCode: 1 },
    ]);
    assert.equal(readdirSync(privateDir).filter((name) => name.endsWith(".log")).length, 2);
  } finally {
    rmSync(privateDir, { recursive: true, force: true });
  }
});

test("safe PostgreSQL attribution keeps only allowlisted type and position", () => {
  const result = extractSafePostgresError(
    'ERROR: invalid input syntax for type bigint: "private-rejected-value" SQL state: 22P02 Position: 187',
    "20261121000002",
  );

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "bigint",
    statementPosition: 187,
  });
  assert.equal(JSON.stringify(result).includes("private-rejected-value"), false);
});

test("unknown types and missing positions are omitted", () => {
  const result = extractSafePostgresError(
    'invalid input syntax for type secret_domain: "do-not-publish" SQLSTATE=22P02',
    null,
  );
  assert.deepEqual(result, {
    migrationVersion: null,
    sqlstate: "22P02",
    expectedType: "unavailable",
    statementPosition: null,
  });
  assert.equal(JSON.stringify(result).includes("do-not-publish"), false);
});

test("nested CLI JSON errors expose only safe PostgreSQL diagnostics", () => {
  const result = extractSafePostgresError(`2026-11-23T00:00:00Z ${JSON.stringify({
    error_severity: "ERROR",
    state_code: "22P02",
    detail: { message: 'invalid input syntax for type uuid: "private-identity-value"' },
    statement_position: 71,
  })}`, "20261121000002");

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "uuid",
    statementPosition: 71,
  });
  assert.equal(JSON.stringify(result).includes("private-identity-value"), false);
});

test("psql verbose errors expose only SQLSTATE, type and instruction position", () => {
  const result = extractSafePostgresError('ERROR: 22P02: invalid input syntax for type bigint: "private-integer"\nPOSITION: 43', "20261121000002");
  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "bigint",
    statementPosition: 43,
  });
  assert.equal(JSON.stringify(result).includes("private-integer"), false);
});

test("supplemental psql uses client verbosity without a privileged SQL SET", () => {
  const sql = "CREATE TABLE proof_target(id integer);";
  const invocation = buildSupplementalPsqlInvocation(sql, "container-id");
  assert.ok(invocation.args.includes("VERBOSITY=verbose"));
  assert.ok(invocation.args.includes("ON_ERROR_STOP=1"));
  assert.equal(invocation.args[2], "container-id");
  assert.equal(invocation.input, sql);
  assert.doesNotMatch(invocation.input, /SET\s+log_error_verbosity/iu);
});

test("the parser skips ordinary JSON log rows and selects the structured error row", () => {
  const output = [
    JSON.stringify({ error_severity: "LOG", state_code: "00000", message: "connection authorized" }),
    JSON.stringify({ error_severity: "ERROR", state_code: "22P02", message: 'invalid input syntax for type bigint: "private-number"', statement_position: 19 }),
  ].join("\n");
  const result = extractSafePostgresError(output, "20261121000002");

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "bigint",
    statementPosition: 19,
  });
  assert.equal(JSON.stringify(result).includes("private-number"), false);
});

test("private failure classification is finite and never returns command text", () => {
  assert.equal(classifyPrivateFailure('ERROR: invalid input syntax for type bigint: "private-value"'), "POSTGRES_INVALID_TEXT_REPRESENTATION");
  assert.equal(classifyPrivateFailure("ERROR: 42501: permission denied"), "LOCAL_DATABASE_PERMISSION");
  assert.equal(classifyPrivateFailure("Error: unknown flag --file"), "SUPABASE_CLI_USAGE");
  assert.equal(classifyPrivateFailure("failed without a recognized signature"), "UNCLASSIFIED_COMMAND_FAILURE");
});

test("prefix replay failures require a PostgreSQL SQLSTATE; CLI and unknown errors stay distinct", () => {
  assert.equal(classifyPrefixReplayAttempt({ status: 0, output: "" }), "PASS");
  assert.equal(classifyPrefixReplayAttempt({ status: 1, output: "ERROR: 22P02: invalid input syntax for type bigint" }), "POSTGRES_FAIL");
  assert.equal(classifyPrefixReplayAttempt({ status: 1, output: "unknown flag --workdir" }), "COMMAND_ERROR");
  assert.equal(classifyPrefixReplayAttempt({ status: 1, output: "connection refused" }), "COMMAND_ERROR");
  assert.equal(classifyPrefixReplayAttempt({ status: 1, output: "failed without a recognized signature" }), "UNPROVEN_FAILURE");
  assert.equal(classifyPrefixReplayAttempt({ commandError: true, status: null, output: "" }), "COMMAND_ERROR");
});

test("public evidence separates canonical replay from psql and redacts raw SQL diagnostics", () => {
  const migrations = [{ version: "20261121000001" }, { version: "20261121000002" }];
  const boundary = verifyFailedPrefixBoundary(migrations, 1, (prefixLength) => ({
    outcome: prefixLength === 1 ? "PASS" : "POSTGRES_FAIL",
    exitCode: prefixLength === 1 ? 0 : 1,
    output: 'private SQL "raw rejected value"',
  }));
  const canonicalError = extractSafePostgresError(
    'ERROR: 22P02: invalid input syntax for type bigint: "canonical-secret" POSITION: 47',
    boundary.migrationVersion,
  );
  const psqlError = extractSafePostgresError(
    'ERROR: 42501: permission denied for table "private_table" POSITION: 9',
    "20261121000002",
  );
  const publicEvidence = buildSafeIsolationDiagnostic({
    candidateSha: "a".repeat(40),
    bootstrap: "PASS",
    replay: "FAIL",
    migrationCount: 499,
    boundary,
    canonicalError,
    psqlDiagnostic: {
      status: "FAIL",
      exitCode: 3,
      error: psqlError,
      failureClass: "LOCAL_DATABASE_PERMISSION",
      rawOutput: "psql private diagnostic",
    },
  });
  assert.equal(publicEvidence.canonicalReplayError.sqlstate, "22P02");
  assert.equal(publicEvidence.canonicalReplayError.migrationVersion, "20261121000002");
  assert.equal(publicEvidence.isolatedPsqlDiagnostic.error.sqlstate, "42501");
  assert.equal(JSON.stringify(publicEvidence).includes("canonical-secret"), false);
  assert.equal(JSON.stringify(publicEvidence).includes("private_table"), false);
  assert.equal(JSON.stringify(publicEvidence).includes("raw rejected value"), false);
  assert.equal(JSON.stringify(publicEvidence).includes("psql private diagnostic"), false);
});

test("inconclusive public evidence never publishes a guessed migration version", () => {
  const migrations = [{ version: "20261121000001" }, { version: "20261121000002" }];
  const boundary = verifyFailedPrefixBoundary(migrations, 1, () => ({ outcome: "PASS", exitCode: 0 }));
  const publicEvidence = buildSafeIsolationDiagnostic({
    candidateSha: "b".repeat(40),
    bootstrap: "PASS",
    replay: "FAIL",
    migrationCount: 499,
    boundary,
    canonicalError: { sqlstate: "22P02", expectedType: "bigint", statementPosition: 47, migrationVersion: "20261121000002" },
    psqlDiagnostic: { status: "FAIL", exitCode: 3, error: { sqlstate: "42501" } },
  });
  assert.equal(publicEvidence.attribution.status, "INCONCLUSIVE");
  assert.equal(publicEvidence.attribution.migrationVersion, null);
  assert.equal(publicEvidence.attribution.failing.version, null);
  assert.equal(publicEvidence.canonicalReplayError.migrationVersion, null);
  assert.equal(publicEvidence.canonicalReplayError.sqlstate, "22P02");
  assert.equal(publicEvidence.isolatedPsqlDiagnostic.error.sqlstate, "42501", "the isolated psql error remains separately visible");

  const inconsistentConfirmation = buildSafeIsolationDiagnostic({
    candidateSha: "not-a-sha with private diagnostic",
    bootstrap: "private bootstrap output",
    replay: "private replay output",
    migrationCount: "private count",
    boundary: {
      status: "CONFIRMED",
      migrationVersion: "20261121000002",
      predecessor: { prefixLength: 1, outcome: "PASS", exitCode: 0 },
      failing: { prefixLength: 2, version: "20261121000002", outcome: "UNPROVEN_FAILURE", exitCode: 1 },
    },
  });
  assert.equal(inconsistentConfirmation.attribution.status, "INCONCLUSIVE");
  assert.equal(inconsistentConfirmation.attribution.migrationVersion, null);
  assert.equal(inconsistentConfirmation.bootstrap, "NOT_RUN");
  assert.equal(inconsistentConfirmation.replay, "NOT_RUN");
  assert.equal(inconsistentConfirmation.migrationCount, null);
  assert.equal(JSON.stringify(inconsistentConfirmation).includes("private diagnostic"), false);
  assert.equal(JSON.stringify(inconsistentConfirmation).includes("private bootstrap output"), false);
});
