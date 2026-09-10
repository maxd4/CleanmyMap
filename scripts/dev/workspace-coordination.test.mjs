import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { COORDINATION_ROOT, createWorkspaceCoordinator } from "./workspace-coordination.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coordination-"));
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  return root;
}

function fakeGit(root, options = {}) {
  const state = {
    head: options.head ?? "base-sha",
    origin: options.origin ?? "base-sha",
    remoteDiff: options.remoteDiff ?? "",
    status: new Map(),
    staged: new Map(),
    heads: new Map(),
    worktrees: new Map([[path.resolve(root), "refs/heads/main"]]),
    tracked: new Set(options.tracked ?? []),
  };
  const command = (cwd, args) => {
    const worktree = path.resolve(cwd);
    if (args[0] === "rev-parse" && args[1] === "--git-common-dir") return ".git";
    if (args[0] === "rev-parse" && args[1] === "HEAD") return state.worktrees.get(worktree) === "refs/heads/main" ? state.head : state.heads.get(worktree) ?? state.head;
    if (args[0] === "rev-parse" && args[1] === "origin/main") return state.origin;
    if (args[0] === "branch" && args[1] === "--show-current") return worktree === path.resolve(root) ? "main" : (state.worktrees.get(worktree)?.replace("refs/heads/", "") ?? "main");
    if (args[0] === "fetch") return "";
    if (args[0] === "status") return state.status.get(worktree) ?? "";
    if (args[0] === "diff" && args[1] === "--cached") return state.staged.get(worktree) ?? "";
    if (args[0] === "diff" && args[1] === "--name-only") return args[2] === `${options.base ?? "base-sha"}..${state.origin}` ? state.remoteDiff : "";
    if (args[0] === "diff-tree") return "owned.ts\n";
    if (args[0] === "ls-files") {
      const item = args.at(-1);
      if (state.tracked.size === 0 || state.tracked.has(item)) return item;
      throw new Error("not tracked");
    }
    if (args[0] === "worktree" && args[1] === "list") {
      return [...state.worktrees.entries()].map(([item, branch]) => `worktree ${item}\nHEAD ${state.head}\nbranch ${branch}\n`).join("\n");
    }
    if (args[0] === "worktree" && args[1] === "add") {
      const branchIndex = args.indexOf("-b");
      const branch = branchIndex >= 0 ? `refs/heads/${args[branchIndex + 1]}` : `refs/heads/${args.at(-1)}`;
      const worktree = path.resolve(branchIndex >= 0 ? args[branchIndex + 2] : args[2]);
      fs.mkdirSync(worktree, { recursive: true });
      state.worktrees.set(worktree, branch);
      state.heads.set(worktree, state.head);
      return "";
    }
    if (args[0] === "worktree" && args[1] === "remove") {
      const worktree = path.resolve(args.at(-1));
      state.worktrees.delete(worktree);
      fs.rmSync(worktree, { recursive: true, force: true });
      return "";
    }
    if (args[0] === "show-ref") {
      const ref = args.at(-1).replace("refs/heads/", "");
      if (!state.worktreesHasBranch(ref)) throw new Error("missing branch");
      return ref;
    }
    if (args[0] === "branch" && args[1] === "-D") {
      state.heads.delete(args[2]);
      return "";
    }
    if (args[0] === "merge-base") return "";
    if (args[0] === "merge" && options.mergeError) throw new Error("CONFLICT (content): merge conflict");
    if (args[0] === "merge" || args[0] === "push") return "";
    throw new Error(`Unexpected fake git call: ${args.join(" ")}`);
  };
  state.worktreesHasBranch = (branch) => [...state.worktrees.values()].includes(`refs/heads/${branch}`) || state.heads.has(branch);
  command.state = state;
  return command;
}

function cleanup(root) { fs.rmSync(root, { recursive: true, force: true }); }

test("stores metadata below git-common-dir and creates one branch/worktree per run", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const first = coordinator.start({ runId: "run-a", domain: "ROUTE" });
    const second = coordinator.start({ runId: "run-b", domain: "LEARN" });
    assert.equal(first.branchName, "codex/run-a");
    assert.equal(second.branchName, "codex/run-b");
    assert.notEqual(first.worktreePath, second.worktreePath);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json")), true);
    assert.equal(fs.existsSync(path.join(root, ".artifacts", "coordination")), false);
  } finally { cleanup(root); }
});

test("allows advisory overlap while preserving canonical intendedPaths", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(root) });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.start({ runId: "run-b", domain: "LEARN" });
    const first = coordinator.claim({ runId: "run-a", paths: ["src/shared.ts"] });
    const second = coordinator.claim({ runId: "run-b", paths: ["src/shared.ts"] });
    assert.deepEqual(first.intendedPaths, ["src/shared.ts"]);
    assert.deepEqual(second.intendedPaths, ["src/shared.ts"]);
    const saved = JSON.parse(fs.readFileSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json"), "utf8"));
    assert.deepEqual(saved.intendedPaths, ["src/shared.ts"]);
    assert.equal(Object.hasOwn(saved, "ownedPaths"), false);
  } finally { cleanup(root); }
});

test("keeps AUTHZ_SECURITY scope exclusive", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(root) });
    coordinator.init();
    coordinator.start({ runId: "security-a", domain: "AUTHZ_SECURITY" });
    coordinator.start({ runId: "security-b", domain: "AUTHZ_SECURITY" });
    coordinator.claim({ runId: "security-a", paths: ["src/authz.ts"] });
    assert.throws(() => coordinator.claim({ runId: "security-b", paths: ["src/other-authz.ts"] }), /CRITICAL_SCOPE_CONFLICT/);
  } finally { cleanup(root); }
});

test("detects legacy shared coordination state without writing to it", () => {
  const root = fixture();
  try {
    const legacy = path.join(root, ".artifacts", "coordination");
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, "marker.json"), "legacy\n");
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(root) });
    const report = coordinator.status();
    assert.equal(report.legacyCoordinationState.status, "LEGACY_COORDINATION_STATE");
    assert.equal(fs.readFileSync(path.join(legacy, "marker.json"), "utf8"), "legacy\n");
  } finally { cleanup(root); }
});

test("serializes publication with a global mutex and bounded wait", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    const gitRunner = fakeGit(root);
    const first = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner, now: () => clock, publicationWaitMs: 1, backoffMs: [1], sleep: (ms) => { clock += ms; } });
    first.init();
    first.start({ runId: "run-a", domain: "ROUTE" });
    first.start({ runId: "run-b", domain: "LEARN" });
    first.publicationAcquire({ runId: "run-a" });
    assert.throws(() => first.publicationAcquire({ runId: "run-b" }), /PUBLICATION_WAIT_TIMEOUT/);
    assert.throws(() => first.publicationRelease({ runId: "run-a" }), /PUBLICATION_COMPLETE_REQUIRED/);
  } finally { cleanup(root); }
});

test("resume returns the same run identity and reads legacy ownedPaths compatibly", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    delete saved.intendedPaths;
    saved.ownedPaths = ["src/owned.ts"];
    fs.writeFileSync(runFile, JSON.stringify(saved));
    const resumed = coordinator.resume({ runId: "run-a" });
    assert.equal(resumed.runId, "run-a");
    assert.equal(resumed.state, "WORK");
    assert.deepEqual(resumed.candidatePaths, []);
  } finally { cleanup(root); }
});

test("foreign staged files are rejected from a resumed run", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    gitRunner.state.staged.set(path.join(path.dirname(root), "CleanMyMap-worktrees", "run-a"), "M foreign.ts\0");
    assert.throws(() => coordinator.resume({ runId: "run-a" }), /PUBLICATION_RESUME_FOREIGN_STAGED/);
  } finally { cleanup(root); }
});

test("publication complete requires remote convergence and closes only after integration proof", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["src/owned.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.publicationComplete({ runId: "run-a" }), /PUBLICATION_NOT_CONVERGED/);
  } finally { cleanup(root); }
});

test("reacquires a published run after its original base becomes stale", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root, { remoteDiff: "owned.ts\n" });
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner, publicationWaitMs: 1, backoffMs: [1] });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "base-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));
    assert.doesNotThrow(() => coordinator.publicationAcquire({ runId: "run-a" }));
  } finally { cleanup(root); }
});

test("integrates through the dedicated publish worktree and keeps fast-forward", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(root) });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    const result = coordinator.publicationIntegrate({ runId: "run-a", push: false });
    assert.equal(result.fastForward, true);
    assert.match(result.publishPath, /CleanMyMap-worktrees/);
    assert.equal(result.publishBranchName, "publish/run-a");
  } finally { cleanup(root); }
});

test("turns a real Git integration failure into INTEGRATION_CONFLICT", () => {
  const root = fixture();
  try {
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner: fakeGit(root, { mergeError: true }) });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    assert.throws(() => coordinator.publicationIntegrate({ runId: "run-a", push: false }), /INTEGRATION_CONFLICT/);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "publication.lock")), true);
  } finally { cleanup(root); }
});
