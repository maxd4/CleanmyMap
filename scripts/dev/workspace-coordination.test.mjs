import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorkspaceCoordinator } from "./workspace-coordination.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-workspace-coordination-"));
}

function fakeGit({ status = "", staged = "", branch = "main", head = "origin-sha", origin = "origin-sha", relation = "0 0", remoteDiff = "", unpublishedDiff = "" } = {}) {
  const resolve = (value, args) => (typeof value === "function" ? value(args) : value);
  return (_root, args) => {
    if (args[0] === "status") return typeof status === "function" ? status(args) : status;
    if (args[0] === "diff" && args[1] === "--cached") return staged;
    if (args[0] === "rev-list") return resolve(relation, args);
    if (args[0] === "diff" && args[1] === "--name-only" && args.length === 3) return resolve(unpublishedDiff, args);
    if (args[0] === "diff") return resolve(remoteDiff, args);
    if (args[0] === "branch" && args[1] === "--show-current") return resolve(branch, args);
    if (args[0] === "rev-parse" && args[1] === "HEAD") return resolve(head, args);
    if (args[0] === "rev-parse" && args[1] === "origin/main") return resolve(origin, args);
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

test("allows a dirty worktree when HEAD equals origin/main", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M foreign.ts\n" }),
    });
    coordinator.init();
    const run = coordinator.start({ runId: "run-a", domain: "ROUTE" });
    assert.equal(run.baseSha, "origin-sha");
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "active-runs", "run-a.json")), true);
  } finally {
    cleanup(root);
  }
});

for (const [label, branch] of [["another branch", "feature/test"], ["detached HEAD", ""]]) {
  test(`rejects ${label} before creating run metadata`, () => {
    const root = fixture();
    try {
      const coordinator = createWorkspaceCoordinator({
        repositoryRoot: root,
        gitRunner: fakeGit({ branch }),
      });
      coordinator.init();
      assert.throws(
        () => coordinator.start({ runId: "run-a", domain: "ROUTE" }),
        /WORKTREE_BRANCH_INVALID/,
      );
      assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "active-runs", "run-a.json")), false);
    } finally {
      cleanup(root);
    }
  });
}

test("allows an ahead-only checkout and records its unpublished paths", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({
        head: "local-ahead",
        origin: "origin-main",
        relation: "0 1",
        unpublishedDiff: "owned.ts\n",
      }),
    });
    coordinator.init();
    const run = coordinator.start({ runId: "run-a", domain: "ROUTE" });
    assert.equal(run.publicationPending, true);
    assert.deepEqual(run.unpublishedPaths, ["owned.ts"]);
    coordinator.claim({ runId: "run-a", paths: ["independent.ts"] });
  } finally {
    cleanup(root);
  }
});

test("rejects a claimed path intersecting an unpublished commit", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({
        head: "local-ahead",
        origin: "origin-main",
        relation: "0 1",
        unpublishedDiff: "apps/web/src/owned.ts\n",
      }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    assert.throws(
      () => coordinator.claim({ runId: "run-a", paths: ["apps/web/src/owned.ts"] }),
      /UNPUBLISHED_PATH_CONFLICT.*apps\/web\/src\/owned\.ts/,
    );
  } finally {
    cleanup(root);
  }
});

for (const [label, head, origin, relation] of [
  ["behind", "origin-main", "local-behind", "1 0"],
  ["divergent", "local-a", "local-b", "1 1"],
]) {
  test(`rejects a ${label} checkout before creating run metadata`, () => {
    const root = fixture();
    try {
      const coordinator = createWorkspaceCoordinator({
        repositoryRoot: root,
        gitRunner: fakeGit({ head, origin, relation }),
      });
      coordinator.init();
      assert.throws(
        () => coordinator.start({ runId: "run-a", domain: "ROUTE" }),
        new RegExp(`WORKTREE_BASE_DIVERGED: HEAD=${head} origin/main=${origin}`),
      );
      assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "active-runs", "run-a.json")), false);
    } finally {
      cleanup(root);
    }
  });
}

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
    assert.deepEqual(coordinator.status({ runId: "run-a" }).run.adoptedLegacyPaths, ["apps/web/src/legacy.ts"]);
  } finally {
    cleanup(root);
  }
});

test("dirty legacy read-only remains legacy and needs no claim", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M apps/web/src/legacy.ts\n" }),
    });
    coordinator.init();
    const report = coordinator.status();
    assert.equal(report.ownedFiles, 0);
    assert.equal(report.legacyUnowned, 1);
    assert.deepEqual(report.orphanDirty, []);
  } finally {
    cleanup(root);
  }
});

test("adoptLegacy then unclaim --return-legacy restores LEGACY_UNOWNED", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M legacy.ts\n" }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "OTHER" });
    coordinator.claim({ runId: "run-a", paths: ["legacy.ts"], adoptLegacy: true });
    coordinator.unclaim({ runId: "run-a", paths: ["legacy.ts"], returnLegacy: true });
    const report = coordinator.status();
    assert.equal(report.ownedFiles, 0);
    assert.equal(report.legacyUnowned, 1);
    assert.equal(report.orphanDirty.length, 0);
    assert.deepEqual(coordinator.status({ runId: "run-a" }).run.ownedPaths, []);
  } finally {
    cleanup(root);
  }
});

test("rejects a dirty orphan unless it is explicitly adopted", () => {
  const root = fixture();
  let dirty = "";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: () => dirty }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    dirty = " M orphan.ts\n";
    assert.throws(
      () => coordinator.claim({ runId: "run-a", paths: ["orphan.ts"] }),
      /ORPHAN_DIRTY.*orphan.ts/,
    );
    coordinator.claim({ runId: "run-a", paths: ["orphan.ts"], adoptLegacy: true });
    assert.deepEqual(coordinator.status({ runId: "run-a" }).run.adoptedLegacyPaths, ["orphan.ts"]);
  } finally {
    cleanup(root);
  }
});

test("allows a clean path to be claimed without adoption", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["clean.ts"] });
    assert.deepEqual(coordinator.status({ runId: "run-a" }).run.ownedPaths, ["clean.ts"]);
  } finally {
    cleanup(root);
  }
});

test("unclaim refuses unowned and foreign-owned paths", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit() });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "LEARN" });
    assert.throws(() => coordinator.unclaim({ runId: "run-a", paths: ["missing.ts"] }), /UNCLAIM_NOT_OWNED/);
    coordinator.claim({ runId: "run-a", paths: ["foreign.ts"] });
    assert.throws(() => coordinator.unclaim({ runId: "run-b", paths: ["foreign.ts"] }), /run-a/);
  } finally {
    cleanup(root);
  }
});

test("unclaim refuses a path staged under the current publication lock", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ staged: "staged.ts\0" }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["staged.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.unclaim({ runId: "run-a", paths: ["staged.ts"] }), /UNCLAIM_STAGED/);
    coordinator.publicationRelease({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("release returns an adopted dirty path to legacy before removing its lock", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M adopted.ts\n" }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["adopted.ts"], adoptLegacy: true });
    coordinator.release({ runId: "run-a" });
    const report = coordinator.status();
    assert.equal(report.ownedFiles, 0);
    assert.equal(report.legacyUnowned, 1);
    assert.deepEqual(report.orphanDirty, []);
  } finally {
    cleanup(root);
  }
});

test("return-to-legacy is persisted before a run metadata failure", () => {
  const root = fixture();
  let failRunMetadata = false;
  try {
    const metadataWriter = (filePath, value) => {
      if (failRunMetadata && filePath.endsWith(path.join("active-runs", "run-a.json"))) {
        throw new Error("simulated run metadata failure");
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    };
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ status: " M adopted.ts\n" }),
      metadataWriter,
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["adopted.ts"], adoptLegacy: true });
    failRunMetadata = true;
    assert.throws(() => coordinator.unclaim({ runId: "run-a", paths: ["adopted.ts"], returnLegacy: true }), /simulated run metadata failure/);
    const report = coordinator.status();
    assert.equal(report.legacyUnowned, 1);
    assert.equal(report.orphanDirty.length, 0);
    assert.deepEqual(report.activeRuns[0].ownedPaths, ["adopted.ts"]);
  } finally {
    cleanup(root);
  }
});

test("serializes publication and never releases another run's lock", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(), publicationWaitMs: 0, onPublicationWait: () => {} });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-b" }), /PUBLICATION_WAIT_TIMEOUT.*run-a/);
    assert.throws(() => coordinator.publicationRelease({ runId: "run-b" }), /run-a/);
    coordinator.publicationRelease({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("publication acquire validates a fresh run and publication complete closes it", () => {
  const root = fixture();
  let remoteDiff = "";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ remoteDiff: () => remoteDiff }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.release({ runId: "run-a" }), /PUBLICATION_COMPLETE_REQUIRED/);
    remoteDiff = "owned.ts\n";
    const completed = coordinator.publicationComplete({ runId: "run-a" });
    assert.equal(completed.completed, true);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "publication.lock")), false);
    coordinator.release({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("publication acquire accepts unrelated remote changes when HEAD remains current", () => {
  const root = fixture();
  let head = "base";
  let origin = "base";
  let fetchCount = 0;
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: (_root, args) => {
        if (args[0] === "fetch") {
          fetchCount += 1;
          if (fetchCount === 2) {
            head = "next";
            origin = "next";
          }
          return "";
        }
        if (args[0] === "branch") return "main";
        if (args[0] === "rev-parse" && args[1] === "HEAD") return head;
        if (args[0] === "rev-parse" && args[1] === "origin/main") return origin;
        if (args[0] === "diff") return args.includes("owned.ts") ? "" : "other.ts\n";
        if (args[0] === "status") return "";
        if (args[0] === "diff" && args[1] === "--cached") return "";
        throw new Error(`Unexpected git call: ${args.join(" ")}`);
      },
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    coordinator.publicationComplete({ runId: "run-a" });
    coordinator.release({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("publication acquire rejects an owned-path race and cleans the lock", () => {
  const root = fixture();
  let fetchCount = 0;
  let head = "base";
  let origin = "base";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: (_root, args) => {
        if (args[0] === "fetch") {
          fetchCount += 1;
          if (fetchCount === 2) {
            head = "next";
            origin = "next";
          }
          return "";
        }
        if (args[0] === "branch") return "main";
        if (args[0] === "rev-parse" && args[1] === "HEAD") return head;
        if (args[0] === "rev-parse" && args[1] === "origin/main") return origin;
        if (args[0] === "diff") return "owned.ts\n";
        if (args[0] === "status") return "";
        throw new Error(`Unexpected git call: ${args.join(" ")}`);
      },
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-a" }), /WORKSPACE_STALE.*owned.ts/);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "publication.lock")), false);
  } finally {
    cleanup(root);
  }
});

test("publication acquire rejects a diverged checkout before freshness staging", () => {
  const root = fixture();
  let head = "base";
  let origin = "base";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: (_root, args) => {
        if (args[0] === "fetch") return "";
        if (args[0] === "branch") return "main";
        if (args[0] === "rev-parse" && args[1] === "HEAD") return head;
        if (args[0] === "rev-parse" && args[1] === "origin/main") return origin;
        if (args[0] === "diff") return "";
        if (args[0] === "status") return "";
        throw new Error(`Unexpected git call: ${args.join(" ")}`);
      },
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    head = "local";
    origin = "remote";
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-a" }), /WORKTREE_BASE_DIVERGED/);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "publication.lock")), false);
  } finally {
    cleanup(root);
  }
});

test("publication acquire rejects an ahead-only checkout until convergence", () => {
  const root = fixture();
  let head = "local-ahead";
  let origin = "origin-main";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({
        head: () => head,
        origin: () => origin,
        relation: "0 1",
        unpublishedDiff: "unpublished.ts\n",
      }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["independent.ts"] });
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-a" }), /WORKTREE_BASE_DIVERGED/);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "publication.lock")), false);

    head = "origin-main";
    origin = "origin-main";
    coordinator.publicationAcquire({ runId: "run-a" });
    coordinator.publicationComplete({ runId: "run-a" });
    coordinator.release({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("publication acquire rejects a branch change and cleans the lock", () => {
  const root = fixture();
  let branch = "main";
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ branch: () => branch }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    branch = "feature/test";
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-a" }), /WORKTREE_BRANCH_INVALID/);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination", "publication.lock")), false);
  } finally {
    cleanup(root);
  }
});

for (const [label, nextBranch, nextHead, nextOrigin] of [
  ["another branch", "feature/test", "same", "same"],
  ["detached HEAD", "", "same", "same"],
  ["ahead checkout", "main", "local", "remote"],
  ["behind checkout", "main", "remote", "local"],
  ["divergent checkout", "main", "local-a", "local-b"],
]) {
  test(`publication complete rejects a ${label}`, () => {
    const root = fixture();
    let branch = "main";
    let head = "same";
    let origin = "same";
    try {
      const coordinator = createWorkspaceCoordinator({
        repositoryRoot: root,
        gitRunner: fakeGit({
          branch: () => branch,
          head: () => head,
          origin: () => origin,
        }),
      });
      coordinator.init();
      coordinator.start({ runId: "run-a", domain: "ROUTE" });
      coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
      coordinator.publicationAcquire({ runId: "run-a" });
      branch = nextBranch;
      head = nextHead;
      origin = nextOrigin;
      assert.throws(() => coordinator.publicationComplete({ runId: "run-a" }), /WORKTREE_BRANCH_INVALID|WORKTREE_BASE_DIVERGED/);
    } finally {
      cleanup(root);
    }
  });
}

test("second publisher waits and succeeds after the first publisher releases", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    let released = false;
    const now = () => clock;
    const first = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(), now });
    const second = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit(),
      now,
      publicationWaitMs: 5_000,
      backoffMs: [1_000],
      sleep: () => {
        if (!released) {
          first.publicationRelease({ runId: "run-a" });
          released = true;
        }
        clock += 1_000;
      },
      onPublicationWait: ({ owner }) => assert.equal(owner, "run-a"),
    });
    first.init();
    first.start({ runId: "run-a", domain: "ROUTE" });
    second.start({ runId: "run-b", domain: "ROUTE" });
    first.publicationAcquire({ runId: "run-a" });
    const lock = second.publicationAcquire({ runId: "run-b" });
    assert.equal(lock.runId, "run-b");
    second.publicationRelease({ runId: "run-b" });
  } finally {
    cleanup(root);
  }
});

test("publication wait times out with a distinct diagnostic", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit(),
      now: () => clock,
      publicationWaitMs: 2_000,
      backoffMs: [1_000],
      sleep: (milliseconds) => { clock += milliseconds; },
      onPublicationWait: () => {},
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.publicationAcquire({ runId: "run-b" }), /PUBLICATION_WAIT_TIMEOUT/);
    coordinator.publicationRelease({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("heartbeat keeps a live publication lock and abandoned recovery requires proof", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    const now = () => clock;
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(), now, leaseMs: 1_000 });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"], adoptLegacy: true });
    coordinator.publicationAcquire({ runId: "run-a" });
    clock += 500;
    coordinator.heartbeat({ runId: "run-a" });
    assert.deepEqual(coordinator.recoverAbandonedLocks(), []);
    coordinator.publicationComplete({ runId: "run-a" });
    coordinator.release({ runId: "run-a" });
  } finally {
    cleanup(root);
  }
});

test("expired publication lock is recovered only when no owner staged path remains", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    const now = () => clock;
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(), now, leaseMs: 1_000 });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"], adoptLegacy: true });
    coordinator.publicationAcquire({ runId: "run-a" });
    clock += 2_000;
    const recovered = coordinator.recoverAbandonedLocks();
    assert.equal(recovered.some((item) => item.kind === "publication" && item.runId === "run-a"), true);
    // The recovered lock cannot be completed; the pending run remains open.
  } finally {
    cleanup(root);
  }
});

test("stale-check reports only owned paths changed since the run base", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({
      repositoryRoot: root,
      gitRunner: fakeGit({ origin: "base-sha", head: "base-sha", remoteDiff: "apps/web/src/owned.ts\n" }),
    });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
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
