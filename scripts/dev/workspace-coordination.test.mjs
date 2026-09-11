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
    calls: [],
    branches: new Set(["main"]),
  };
  const command = (cwd, args) => {
    const worktree = path.resolve(cwd);
    state.calls.push({ cwd: worktree, args: [...args] });
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
      state.branches.add(branch.replace("refs/heads/", ""));
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
      state.branches.delete(args[2]);
      return "";
    }
    if (args[0] === "branch" && args[1] === "-d") {
      state.branches.delete(args[2]);
      return "";
    }
    if (args[0] === "merge-base") {
      const key = `${args[2]}..${args[3]}`;
      if ((options.ancestorFailures ?? []).includes(key)) throw new Error("not an ancestor");
      return "";
    }
    if (args[0] === "merge" && options.mergeError) throw new Error("CONFLICT (content): merge conflict");
    if (args[0] === "merge") return "";
    if (args[0] === "commit") {
      const commit = `commit-${state.calls.length}`;
      state.heads.set(worktree, commit);
      return commit;
    }
    if (args[0] === "push") {
      state.origin = state.heads.get(worktree) ?? state.origin;
      return "";
    }
    throw new Error(`Unexpected fake git call: ${args.join(" ")}`);
  };
  state.worktreesHasBranch = (branch) => state.branches.has(branch) || [...state.worktrees.values()].includes(`refs/heads/${branch}`);
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

test("release refuses dirty or unpublished work and preserves the active run", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const dirtyRun = coordinator.start({ runId: "dirty-run", domain: "ROUTE" });
    gitRunner.state.status.set(path.resolve(dirtyRun.worktreePath), " M src/dirty.ts\n");
    assert.throws(() => coordinator.release({ runId: "dirty-run" }), /WORKTREE_DIRTY/);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "dirty-run.json")), true);

    const committedRun = coordinator.start({ runId: "committed-run", domain: "ROUTE" });
    gitRunner.state.heads.set(path.resolve(committedRun.worktreePath), "unpublished-sha");
    assert.throws(() => coordinator.release({ runId: "committed-run" }), /UNPUBLISHED_WORK/);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "committed-run.json")), true);
  } finally { cleanup(root); }
});

test("release cleans an actually empty abandoned run", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "empty-run", domain: "ROUTE" });
    const result = coordinator.release({ runId: "empty-run" });
    assert.equal(result.released, true);
    assert.equal(fs.existsSync(run.worktreePath), false);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "empty-run.json")), false);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "closed-runs", "empty-run.json")), true);
  } finally { cleanup(root); }
});

test("resume reopens a closed unpublished run only with a concordant worktree", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "recoverable-run", domain: "NAVIGATION_UI" });
    coordinator.claim({ runId: "recoverable-run", paths: ["src/navigation.ts"] });
    const activePath = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "recoverable-run.json");
    const closedPath = path.join(root, ".git", ...COORDINATION_ROOT, "closed-runs", "recoverable-run.json");
    const saved = JSON.parse(fs.readFileSync(activePath, "utf8"));
    saved.state = "WORK";
    saved.closedAt = "2026-01-01T00:00:00.000Z";
    fs.mkdirSync(path.dirname(closedPath), { recursive: true });
    fs.writeFileSync(closedPath, JSON.stringify(saved));
    fs.unlinkSync(activePath);
    gitRunner.state.status.set(path.resolve(run.worktreePath), " M src/navigation.ts\n");

    const resumed = coordinator.resume({ runId: "recoverable-run" });
    assert.equal(resumed.runId, "recoverable-run");
    assert.equal(resumed.state, "WORK");
    assert.equal(fs.existsSync(activePath), true);
    assert.equal(fs.existsSync(closedPath), false);
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

test("permits simultaneous staged work and local commits before the publication mutex", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const first = coordinator.start({ runId: "run-a", domain: "ROUTE" });
    const second = coordinator.start({ runId: "run-b", domain: "LEARN" });
    coordinator.claim({ runId: "run-a", paths: ["src/a.ts"] });
    coordinator.claim({ runId: "run-b", paths: ["src/b.ts"] });
    gitRunner.state.staged.set(first.worktreePath, "src/a.ts\0");
    gitRunner.state.staged.set(second.worktreePath, "src/b.ts\0");
    assert.deepEqual(coordinator.checkStaged({ runId: "run-a" }).stagedPaths, ["src/a.ts"]);
    assert.deepEqual(coordinator.checkStaged({ runId: "run-b" }).stagedPaths, ["src/b.ts"]);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "publication.lock")), false);
    gitRunner(first.worktreePath, ["commit", "-S", "-m", "run a"]);
    gitRunner(second.worktreePath, ["commit", "-S", "-m", "run b"]);
    assert.equal(gitRunner.state.heads.get(path.resolve(first.worktreePath)).startsWith("commit-"), true);
    assert.equal(gitRunner.state.heads.get(path.resolve(second.worktreePath)).startsWith("commit-"), true);
  } finally { cleanup(root); }
});

test("does not reject an intended path changed remotely when Git can integrate it", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root, { remoteDiff: "src/shared.ts\n" });
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["src/shared.ts"] });
    assert.doesNotThrow(() => coordinator.publicationAcquire({ runId: "run-a" }));
  } finally { cleanup(root); }
});

test("integrates a changed origin/main before the run branch", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root, { ancestorFailures: ["origin-sha..HEAD"], origin: "origin-sha" });
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    coordinator.publicationIntegrate({ runId: "run-a", push: false });
    const originMerge = gitRunner.state.calls.findIndex(({ args }) => args[0] === "merge" && args.at(-1) === "origin/main");
    const runMerge = gitRunner.state.calls.findIndex(({ args }) => args[0] === "merge" && args.at(-1) === "codex/run-a");
    assert.ok(originMerge >= 0);
    assert.ok(runMerge > originMerge);
  } finally { cleanup(root); }
});

test("publicationComplete finalizes a run, including claims, locks and worktrees, and is idempotent", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "run-a", domain: "AUTHZ_SECURITY" });
    coordinator.claim({ runId: "run-a", paths: ["src/authz.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "base-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));
    const result = coordinator.publicationComplete({ runId: "run-a" });
    assert.equal(result.completed, true);
    assert.equal(fs.existsSync(runFile), false);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "claims")), true);
    assert.equal(fs.readdirSync(path.join(root, ".git", ...COORDINATION_ROOT, "claims")).length, 0);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "locks", "scope-AUTHZ_SECURITY.json")), false);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "publication.lock")), false);
    assert.equal(fs.existsSync(run.worktreePath), false);
    assert.equal(fs.existsSync(path.join(root, ".git", ...COORDINATION_ROOT, "closed-runs", "run-a.json")), true);
    const removals = gitRunner.state.calls.filter(({ args }) => args[0] === "worktree" && args[1] === "remove");
    assert.ok(removals.length > 0);
    assert.equal(removals.every(({ cwd }) => path.resolve(cwd) === path.resolve(root)), true);
    assert.equal(coordinator.publicationComplete({ runId: "run-a" }).idempotent, true);
  } finally { cleanup(root); }
});

test("publicationComplete fast-forwards a clean bootstrap without copying files", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "base-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));

    const result = coordinator.publicationComplete({ runId: "run-a" });

    assert.equal(result.bootstrapSync.state, "SYNCED");
    assert.equal(result.bootstrapSync.path, path.resolve(root));
    assert.equal(gitRunner.state.calls.some(({ cwd, args }) => path.resolve(cwd) === path.resolve(root) && args.join(" ") === "merge --ff-only origin/main"), true);
    assert.equal(gitRunner.state.calls.some(({ cwd, args }) => path.resolve(cwd) !== path.resolve(root) && args[0] === "copy"), false);
  } finally { cleanup(root); }
});

test("publicationComplete preserves a dirty bootstrap and reports BOOTSTRAP_DIRTY", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    gitRunner.state.status.set(path.resolve(root), " M legacy.ts\n");
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "base-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));

    const result = coordinator.publicationComplete({ runId: "run-a" });

    assert.equal(result.bootstrapSync.state, "BOOTSTRAP_DIRTY");
    assert.equal(result.bootstrapSync.dirtyPaths.includes("legacy.ts"), true);
    assert.equal(gitRunner.state.calls.some(({ cwd, args }) => path.resolve(cwd) === path.resolve(root) && args[0] === "merge"), false);
  } finally { cleanup(root); }
});

test("publicationComplete releases the run worktree when invoked from its cwd", () => {
  const root = fixture();
  const previousDirectory = process.cwd();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "run-from-cwd", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-from-cwd" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-from-cwd.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "base-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));

    process.chdir(run.worktreePath);
    const result = coordinator.publicationComplete({ runId: "run-from-cwd" });

    assert.equal(result.completed, true);
    assert.equal(fs.existsSync(run.worktreePath), false);
    assert.equal(process.cwd(), path.resolve(root));
  } finally {
    process.chdir(previousDirectory);
    cleanup(root);
  }
});

test("accepts an already-published ancestor after another remote publication", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root, { origin: "new-origin" });
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.claim({ runId: "run-a", paths: ["owned.ts"] });
    coordinator.publicationAcquire({ runId: "run-a" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "published-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));
    assert.doesNotThrow(() => coordinator.publicationComplete({ runId: "run-a" }));
  } finally { cleanup(root); }
});

test("refuses a published SHA that is not an ancestor", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root, { origin: "new-origin", ancestorFailures: ["published-sha..new-origin"] });
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "ROUTE" });
    coordinator.publicationAcquire({ runId: "run-a" });
    const runFile = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json");
    const saved = JSON.parse(fs.readFileSync(runFile, "utf8"));
    saved.publication = { state: "PUSHED_PENDING_COMPLETE", publishedSha: "published-sha" };
    fs.writeFileSync(runFile, JSON.stringify(saved));
    assert.throws(() => coordinator.publicationComplete({ runId: "run-a" }), /PUBLICATION_NOT_CONVERGED/);
  } finally { cleanup(root); }
});

test("doctor detects and safely recovers an abandoned critical scope, but not a live one", () => {
  const root = fixture();
  try {
    let clock = Date.parse("2026-01-01T00:00:00.000Z");
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner, now: () => clock, leaseMs: 10 });
    coordinator.init();
    coordinator.start({ runId: "run-a", domain: "AUTHZ_SECURITY" });
    const lockFile = path.join(root, ".git", ...COORDINATION_ROOT, "locks", "scope-AUTHZ_SECURITY.json");
    fs.writeFileSync(lockFile, JSON.stringify({ version: 3, kind: "critical-scope", scope: "AUTHZ_SECURITY", runId: "missing", heartbeatAt: "2025-01-01T00:00:00.000Z" }));
    assert.equal(coordinator.doctor().staleLocks.some((item) => item.kind === "critical-scope"), true);
    assert.equal(coordinator.recoverAbandonedLocks().some((item) => item.kind === "critical-scope"), true);
    const live = JSON.parse(fs.readFileSync(path.join(root, ".git", ...COORDINATION_ROOT, "runs", "run-a.json"), "utf8"));
    fs.writeFileSync(lockFile, JSON.stringify({ version: 3, kind: "critical-scope", scope: "AUTHZ_SECURITY", runId: "run-a", heartbeatAt: live.heartbeatAt }));
    clock += 1;
    assert.equal(coordinator.recoverAbandonedLocks().some((item) => item.kind === "critical-scope"), false);
    assert.equal(fs.existsSync(lockFile), true);
  } finally { cleanup(root); }
});

test("doctor reports a coordinator worktree without an active run and a missing run worktree", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "run-a", domain: "ROUTE" });
    fs.rmSync(run.worktreePath, { recursive: true, force: true });
    gitRunner.state.worktrees.set(path.join(path.dirname(root), "CleanMyMap-worktrees", "orphan"), "refs/heads/codex/orphan");
    const report = coordinator.doctor();
    assert.equal(report.missingWorktrees.some((item) => item.runId === "run-a"), true);
    assert.equal(report.orphanWorktrees.some((item) => item.branch === "refs/heads/codex/orphan"), true);
  } finally { cleanup(root); }
});

test("doctor reports closed-run worktrees and prematurely closed work", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const run = coordinator.start({ runId: "closed-dirty", domain: "ROUTE" });
    const activePath = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "closed-dirty.json");
    const closedPath = path.join(root, ".git", ...COORDINATION_ROOT, "closed-runs", "closed-dirty.json");
    const saved = JSON.parse(fs.readFileSync(activePath, "utf8"));
    saved.state = "WORK";
    fs.mkdirSync(path.dirname(closedPath), { recursive: true });
    fs.writeFileSync(closedPath, JSON.stringify(saved));
    fs.unlinkSync(activePath);
    gitRunner.state.status.set(path.resolve(run.worktreePath), " M src/dirty.ts\n");
    gitRunner.state.heads.set(path.resolve(run.worktreePath), "unpublished-sha");

    const report = coordinator.doctor();
    assert.equal(report.closedRunWorktrees.some((item) => item.runId === "closed-dirty"), true);
    assert.equal(report.worktreesWithoutActiveMetadata.some((item) => item.branch === "refs/heads/codex/closed-dirty"), true);
    assert.equal(report.prematurelyClosedRuns.some((item) => item.runId === "closed-dirty"), true);
    assert.equal(report.abandonedUnpublishedCommits.some((item) => item.runId === "closed-dirty"), true);
    assert.equal(report.ok, false);
  } finally { cleanup(root); }
});

test("doctor reports bootstrap, acquired metadata and completed dirty worktree anomalies", () => {
  const root = fixture();
  try {
    const gitRunner = fakeGit(root);
    const coordinator = createWorkspaceCoordinator({ repositoryRoot: root, gitRunner });
    coordinator.init();
    const acquired = coordinator.start({ runId: "acquired-without-lock", domain: "ROUTE" });
    const acquiredPath = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "acquired-without-lock.json");
    const acquiredMetadata = JSON.parse(fs.readFileSync(acquiredPath, "utf8"));
    acquiredMetadata.publication = { state: "ACQUIRED" };
    fs.writeFileSync(acquiredPath, JSON.stringify(acquiredMetadata));

    const completed = coordinator.start({ runId: "completed-dirty", domain: "ROUTE" });
    const completedPath = path.join(root, ".git", ...COORDINATION_ROOT, "runs", "completed-dirty.json");
    const completedMetadata = JSON.parse(fs.readFileSync(completedPath, "utf8"));
    completedMetadata.publication = { state: "COMPLETE", publishedSha: "base-sha" };
    const closedPath = path.join(root, ".git", ...COORDINATION_ROOT, "closed-runs", "completed-dirty.json");
    fs.mkdirSync(path.dirname(closedPath), { recursive: true });
    fs.writeFileSync(closedPath, JSON.stringify(completedMetadata));
    fs.unlinkSync(completedPath);
    gitRunner.state.status.set(path.resolve(root), " M bootstrap-legacy.ts\n");
    gitRunner.state.status.set(path.resolve(completed.worktreePath), " M completed.ts\n");

    const report = coordinator.doctor();

    assert.equal(report.bootstrap.state, "BOOTSTRAP_DIRTY");
    assert.equal(report.metadataAcquiredWithoutMutex.some((item) => item.runId === acquired.runId), true);
    assert.equal(report.completedRunWorktreesDirty.some((item) => item.runId === completed.runId), true);
    assert.equal(report.ok, false);
  } finally { cleanup(root); }
});
