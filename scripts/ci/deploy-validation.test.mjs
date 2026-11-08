import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { removePathWithRetry } from "./validation-evidence.mjs";
import { resolveDeployCandidate } from "./deploy-validation.mjs";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function makeRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-deploy-validation-"));
  git(root, ["init", "--initial-branch=main", "--quiet"]);
  git(root, ["config", "user.email", "validation@cleanmymap.local"]);
  git(root, ["config", "user.name", "CleanMyMap validation"]);
  git(root, ["remote", "add", "origin", "https://github.com/maxd4/CleanmyMap.git"]);
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
  git(root, ["add", "--", "."]);
  git(root, ["commit", "--quiet", "-m", "baseline"]);
  return root;
}

test("DEPLOY resolves a verified Web diff from the explicit Git base", () => {
  const root = makeRepository();
  try {
    const baseSha = git(root, ["rev-parse", "HEAD"]);
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export default function Page() {}\n");
    git(root, ["add", "--", "."]);
    git(root, ["commit", "--quiet", "-m", "web change"]);

    const result = resolveDeployCandidate({ repositoryRoot: root, baseRef: baseSha });
    assert.equal(result.valid, true);
    assert.equal(result.baseSha, baseSha);
    assert.deepEqual(result.webChangedFiles, ["apps/web/src/page.tsx"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY refuses a missing exploitable diff and a dirty worktree", () => {
  const root = makeRepository();
  try {
    const candidateSha = git(root, ["rev-parse", "HEAD"]);
    const empty = resolveDeployCandidate({ repositoryRoot: root, baseRef: candidateSha });
    assert.equal(empty.valid, false);
    assert.equal(empty.reason, "DEPLOY_NO_EXPLOITABLE_DIFF");

    fs.writeFileSync(path.join(root, "dirty.txt"), "not committed\n");
    const dirty = resolveDeployCandidate({ repositoryRoot: root, baseRef: candidateSha });
    assert.equal(dirty.valid, false);
    assert.equal(dirty.reason, "DEPLOY_WORKTREE_NOT_CLEAN");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY refuses a candidate that includes an unsupported workspace", () => {
  const root = makeRepository();
  try {
    const baseSha = git(root, ["rev-parse", "HEAD"]);
    fs.mkdirSync(path.join(root, "apps", "mobile"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "mobile", "App.tsx"), "export default null;\n");
    git(root, ["add", "--", "."]);
    git(root, ["commit", "--quiet", "-m", "mobile change"]);

    const result = resolveDeployCandidate({ repositoryRoot: root, baseRef: baseSha });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "DEPLOY_SCOPE_NOT_WEB_ONLY");
    assert.deepEqual(result.unsupportedFiles, ["apps/mobile/App.tsx"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});
