import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorkspaceCoordinator } from "./workspace-coordination.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-workspace-coordination-"));
}

function fakeGit({ status = "", staged = "", origin = "origin-sha", remoteDiff = "" } = {}) {
  return (_root, args) => {
    if (args[0] === "status") return status;
    if (args[0] === "diff" && args[1] === "--cached") return staged;
    if (args[0] === "diff") return remoteDiff;
    if (args[0] === "rev-parse") return origin;
    if (args[0] === "fetch") return "";
    throw new Error(`Unexpected git call: ${args.join(" ")}`);
  };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("allows independent runs and claims normalized repository-relative paths", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "LEARN" });
    coordinator.claim({ runId: "run-a", paths: ["apps/web/src/./route.ts"] });
    coordinator.claim({ runId: "run-b", paths: ["apps/web/src/learn.ts"] });
    assert.deepEqual(coordinator.status().overlaps, []);
  } finally {
    cleanup(root);
  }
});

test("rejects same-file and critical-scope collisions with the existing owner", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "security-a", domain: "AUTHZ_SECURITY" });
    coordinator.start({ runId: "security-b", domain: "AUTHZ_SECURITY" });
    coordinator.claim({ runId: "security-a", paths: ["apps/web/src/lib/authz.ts"] });
    assert.throws(() => coordinator.claim({ runId: "security-b", paths: ["apps/web/src/lib/authz.ts"] }), /security-a/);
    assert.throws(() => coordinator.claim({ runId: "security-b", paths: ["apps/web/src/lib/other-authz.ts"] }), /scope AUTHZ_SECURITY.*security-a/);
  } finally {
    cleanup(root);
  }
});

test("rejects traversal and preserves legacy ownership until explicit adoption", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M apps/web/src/legacy.ts\n" }),
    });
    const migration = coordinator.init();
    assert.deepEqual(migration.legacyUnowned, ["apps/web/src/legacy.ts"]);
    coordinator.start({ runId: "run-a", domain: "OTHER" });
    assert.throws(() => coordinator.claim({ runId: "run-a", paths: ["../secret"] }), /traversal/);
    assert.throws(() => coordinator.claim({ runId: "run-a", paths: ["apps/web/src/legacy.ts"] }), /LEGACY_UNOWNED/);
    coordinator.claim({ runId: "run-a", paths: ["apps/web/src/legacy.ts"], adoptLegacy: true });
    assert.equal(coordinator.status().legacyUnowned, 0);
  } finally {
    cleanup(root);
  }
});

test("serializes publication and never releases another run's lock", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-b" }), /run-a/);
    assert.throws(() => coordinator.publicationRelease({ runId: "run-b" }), /run-a/);
    coordinator.publicationRelease({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("stale-check reports only owned paths changed since the run base", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ remoteDiff: "apps/web/src/owned.ts\n" }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE", baseSha: "base-sha" });
    coordinator.claim({ runId: "run-a", paths: ["apps/web/src/owned.ts", "apps/web/src/unchanged.ts"] });
    const result = coordinator.staleCheck({ runId: "run-a", fetch: true });
    assert.equal(result.staleScope, "FAIL");
    assert.deepEqual(result.changedPaths, ["apps/web/src/owned.ts"]);
  } finally {
    cleanup(root);
  }
});

test("status does not read source contents and release preserves foreign locks", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit({ status: " M owned.ts\n M foreign.ts\n" }) });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"], adoptLegacy: true });
    coordinator.claim({ runId: "run-b", paths: ["foreign.ts"], adoptLegacy: true });
    const status = coordinator.status();
    assert.deepEqual(status.orphanDirty, []);
    coordinator.release({ runId: "run-a" });
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "active-runs", "run-b.json")), true);
    assert.equal(coordinator.status().activeRuns[0]?.runId, "run-b");
  } finally {
    cleanup(root);
  }
});

test("precommit rejects staged paths without the publication owner", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit({ staged: "foreign.ts\0" }) });
    coordinator.init();
    assert.throws(() => coordinator.checkStaged(), /FOREIGN_STAGED/);
  } finally {
    cleanup(root);
  }
});

test("doctor reports stale locks without deleting them", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "stale-run", domain: "ROUTE" });
    coordinator.claim({ runId: "stale-run", paths: ["stale.ts"], adoptLegacy: true });
    const lockName = fs.readdirSync(path.join(root, ".artifacts", "coordination", "locks")).find((name) => name.startsWith("path-"));
    assert.ok(lockName);
    const lockPath = path.join(root, ".artifacts", "coordination", "locks", lockName);
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    lock.startedAt = "2000-01-01T00:00:00.000Z";
    fs.writeFileSync(lockPath, JSON.stringify(lock));
    fs.rmSync(path.join(root, ".artifacts", "coordination", "active-runs", "stale-run.json"));
    const report = coordinator.doctor();
    assert.equal(report.staleLocks.includes("stale.ts"), true);
    assert.equal(fs.existsSync(lockPath), true);
  } finally {
    cleanup(root);
  }
});
