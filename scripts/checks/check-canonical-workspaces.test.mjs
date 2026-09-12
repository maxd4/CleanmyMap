import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const CHECK_PATH = path.join(REPO_ROOT, "scripts", "checks", "check-canonical-workspaces.mjs");
const STATIC_RUNNER_PATH = path.join(REPO_ROOT, "scripts", "ci", "run-static-candidate-check.mjs");

function writeFile(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function git(root, argumentsList) {
  return execFileSync("git", argumentsList, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-canonical-workspace-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  git(root, ["config", "user.name", "Canonical Workspace Test"]);
  git(root, ["config", "user.email", "canonical-workspace-test"]);
  writeFile(root, "package.json", JSON.stringify({ name: "fixture", workspaces: ["apps/mobile"] }, null, 2) + "\n");
  writeFile(root, "apps/mobile/package.json", "{\"name\": \"mobile\"}\n");
  writeFile(root, "apps/mobile/AGENTS.md", "# Mobile governance\n");
  writeFile(root, "apps/mobile/src/internal.ts", "export const value = 1;\n");
  writeFile(root, "scripts/checks/check-canonical-workspaces.mjs", fs.readFileSync(CHECK_PATH));
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "canonical workspace baseline"]);
  return root;
}

function runStaged(root) {
  return spawnSync(process.execPath, [CHECK_PATH, "--staged"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
}

function runCandidate(root, ref) {
  return spawnSync(
    process.execPath,
    [
      STATIC_RUNNER_PATH,
      `--ref=${ref}`,
      "--script=scripts/checks/check-canonical-workspaces.mjs",
      "--",
      `--ref=${ref}`,
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
}

function assertPass(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function assertFail(result, message) {
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(message));
}

test("STAGED passes without mobile changes, normal edits, and internal deletion", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assertPass(runStaged(root));

  writeFile(root, "apps/mobile/src/internal.ts", "export const value = 2;\n");
  git(root, ["add", "apps/mobile/src/internal.ts"]);
  assertPass(runStaged(root));

  fs.rmSync(path.join(root, "apps/mobile/src/internal.ts"));
  git(root, ["add", "-u", "apps/mobile/src/internal.ts"]);
  assertPass(runStaged(root));
});

test("STAGED rejects deletion of apps/mobile/package.json", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, "apps/mobile/package.json"));
  git(root, ["add", "-u", "apps/mobile/package.json"]);
  assertFail(runStaged(root), "CANONICAL_WORKSPACE_MISSING: apps/mobile/package.json");
});

test("STAGED rejects deletion of apps/mobile/AGENTS.md", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, "apps/mobile/AGENTS.md"));
  git(root, ["add", "-u", "apps/mobile/AGENTS.md"]);
  assertFail(runStaged(root), "CANONICAL_WORKSPACE_MISSING: apps/mobile/AGENTS.md");
});

test("STAGED rejects complete mobile workspace deletion", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, "apps/mobile"), { recursive: true });
  git(root, ["add", "-u", "apps/mobile"]);
  assertFail(runStaged(root), "CANONICAL_WORKSPACE_MISSING");
});

test("STAGED reads the index and ignores an unrelated dirty working tree", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeFile(root, "apps/mobile/src/internal.ts", "export const value = 2;\n");
  git(root, ["add", "apps/mobile/src/internal.ts"]);
  fs.rmSync(path.join(root, "apps/mobile/package.json"));
  assertPass(runStaged(root));
});

test("PUSH_CANDIDATE validates the exact candidate tree", (t) => {
  const root = createFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseline = git(root, ["rev-parse", "HEAD"]);
  assertPass(runCandidate(root, baseline));

  fs.rmSync(path.join(root, "apps/mobile/AGENTS.md"));
  git(root, ["add", "-u", "apps/mobile/AGENTS.md"]);
  git(root, ["commit", "--quiet", "-m", "remove mobile sentinel"]);
  const candidate = git(root, ["rev-parse", "HEAD"]);
  assertFail(runCandidate(root, candidate), "CANONICAL_WORKSPACE_MISSING: apps/mobile/AGENTS.md");
});
