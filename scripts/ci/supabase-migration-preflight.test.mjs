import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReadOnlyCommandArgs,
  evaluatePreflight,
} from "./supabase-migration-preflight.mjs";

const compatibleRuntime = {
  status: "COMPATIBLE",
  sha: "a".repeat(40),
  migrationVersion: "20261114000001",
  source: "deployed-runtime-manifest",
};

function alignedHistory(localIds = ["20261113000001", "20261114000001"], remoteIds = localIds) {
  return {
    localIds,
    remoteIds,
    pending: localIds.slice(remoteIds.length),
    aligned: remoteIds.every((id, index) => id === localIds[index]),
  };
}

test("returns ALIGNED when the complete local queue is already remote and compatible", () => {
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: true,
    authSource: "NATIVE_CREDENTIAL_STORE",
    history: alignedHistory(),
    dryRunIds: [],
    runtimeEvidence: compatibleRuntime,
  });

  assert.equal(summary.status, "ALIGNED");
  assert.deepEqual(summary.pending, []);
});

test("returns READY_TO_APPLY for several ordered pending migrations", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002", "20261114000003"];
  const pending = localIds.slice(2);
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: true,
    authSource: "ENV_SECRET",
    history: alignedHistory(localIds, localIds.slice(0, 2)),
    dryRunIds: pending,
    runtimeEvidence: { ...compatibleRuntime, migrationVersion: localIds[1] },
    analyses: pending.map((id) => ({ id, dataMutation: false, destructive: false, forwardDependencies: [] })),
  });

  assert.equal(summary.status, "READY_TO_APPLY");
  assert.deepEqual(summary.pending, pending);
  assert.equal(summary.firstBlockingMigration, "NONE");
  assert.equal(summary.actionRequired, "Aucune action requise.");
});

test("returns DIVERGED when the remote sequence is not a local prefix", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002"];
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: true,
    authSource: "NATIVE_CREDENTIAL_STORE",
    history: { ...alignedHistory(localIds, [localIds[0], "20261114000099"]), pending: [localIds[2]], aligned: false },
    dryRunIds: [localIds[2]],
    runtimeEvidence: compatibleRuntime,
  });

  assert.equal(summary.status, "DIVERGED");
  assert.ok(summary.causes.some((cause) => cause.code === "MIGRATION_HISTORY_DIVERGED"));
  assert.equal(summary.firstBlockingMigration, localIds[2]);
});

test("blocks an unverified CLI target instead of treating failed access as aligned", () => {
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: false,
    authSource: "UNKNOWN",
    history: alignedHistory(),
    dryRunIds: [],
    runtimeEvidence: compatibleRuntime,
  });

  assert.equal(summary.status, "BLOCKED");
  assert.ok(summary.causes.some((cause) => cause.code === "CLI_AUTH_OR_TARGET_UNVERIFIED"));
});

test("blocks a pending migration with data risk", () => {
  const pending = ["20261114000002"];
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: true,
    authSource: "NATIVE_CREDENTIAL_STORE",
    history: alignedHistory(["20261114000001", ...pending], ["20261114000001"]),
    dryRunIds: pending,
    analyses: [{ id: pending[0], dataMutation: true, destructive: false, forwardDependencies: [] }],
    runtimeEvidence: compatibleRuntime,
  });

  assert.equal(summary.status, "BLOCKED");
  assert.ok(summary.causes.some((cause) => cause.code === "MIGRATION_DATA_RISK"));
  assert.equal(summary.firstBlockingMigration, pending[0]);
  assert.match(summary.actionRequired, /preuve SQL/);
});

test("blocks an incompatible deployed runtime", () => {
  const summary = evaluatePreflight({
    projectRef: "a".repeat(20),
    projectMatched: true,
    authSource: "NATIVE_CREDENTIAL_STORE",
    history: alignedHistory(),
    dryRunIds: [],
    runtimeEvidence: { status: "INCOMPATIBLE", reason: "deployed SHA is older than the SQL contract" },
  });

  assert.equal(summary.status, "BLOCKED");
  assert.ok(summary.causes.some((cause) => cause.code === "RUNTIME_INCOMPATIBLE"));
  assert.equal(summary.firstBlockingMigration, "NONE");
  assert.match(summary.actionRequired, /déploiement applicatif/);
});

test("exposes only read-only Supabase commands", () => {
  const commands = buildReadOnlyCommandArgs("a".repeat(20));
  const rendered = commands.flat().join(" ").toLowerCase();
  assert.equal(commands.some((command) => command.includes("--yes")), false);
  assert.equal(rendered.includes("migration repair"), false);
  assert.equal(rendered.includes("reset"), false);
  assert.equal(rendered.includes("db push --dry-run"), true);
});
