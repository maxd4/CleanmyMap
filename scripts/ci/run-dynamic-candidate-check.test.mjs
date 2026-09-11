import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const RUNNER_PATH = join(REPO_ROOT, "scripts", "ci", "run-dynamic-candidate-check.mjs");

function git(root, args) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return execFileSync("git", args, { cwd: root, env, encoding: "utf8" }).trim();
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-dynamic-candidate-"));
  const checkerPath = join(root, "scripts", "checks", "dynamic-check.mjs");
  mkdirSync(join(root, "scripts", "checks"), { recursive: true });
  mkdirSync(join(root, "apps", "web", "src"), { recursive: true });
  mkdirSync(join(root, "apps", "mobile"), { recursive: true });
  writeFileSync(join(root, "apps", "web", "src", "candidate.ts"), "export const candidate = true;\n");
  writeFileSync(join(root, "package.json"), '{"name":"dynamic-fixture","private":true,"workspaces":["apps/web","apps/mobile"]}\n');
  writeFileSync(join(root, "package-lock.json"), '{"name":"dynamic-fixture","lockfileVersion":3,"requires":true,"packages":{"":{"name":"dynamic-fixture","workspaces":["apps/web","apps/mobile"]}}}\n');
  writeFileSync(join(root, "apps", "web", "package.json"), '{"name":"dynamic-web","private":true}\n');
  writeFileSync(join(root, "apps", "mobile", "package.json"), '{"name":"dynamic-mobile","private":true}\n');
  writeFileSync(
    checkerPath,
    [
      'import { existsSync } from "node:fs";',
      'import { execFileSync } from "node:child_process";',
      'if (existsSync("foreign-worktree.ts")) process.exit(11);',
      'if (!existsSync("apps/web/src/candidate.ts")) process.exit(13);',
      'if (existsSync("apps/web/src/foreign-invalid.test.ts")) process.exit(14);',
      'if (existsSync("artifacts/foreign/package-lock.json")) process.exit(15);',
      'const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], { encoding: "utf8" }).trim();',
      'if (gitDir !== ".git" && !gitDir.replaceAll("\\\\", "/").endsWith("/.git")) process.exit(12);',
      'console.log("dynamic candidate passed");',
    ].join("\n") + "\n",
  );
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex.invalid"]);
  git(root, ["config", "user.name", "Dynamic Candidate Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "candidate dynamic checker"]);
  mkdirSync(join(root, "node_modules", "eslint"), { recursive: true });
  writeFileSync(join(root, "node_modules", "eslint", "package.json"), '{"name":"eslint","version":"fixture"}\n');
  mkdirSync(join(root, "apps", "web", "node_modules", "workspace-only"), { recursive: true });
  writeFileSync(join(root, "apps", "web", "node_modules", "workspace-only", "package.json"), '{"name":"workspace-only","version":"fixture"}\n');
  mkdirSync(join(root, "apps", "mobile", "node_modules", "mobile-only"), { recursive: true });
  writeFileSync(join(root, "apps", "mobile", "node_modules", "mobile-only", "package.json"), '{"name":"mobile-only","version":"fixture"}\n');
  return root;
}

function runRunner(root, ref, command, args = []) {
  return spawnSync(
    process.execPath,
    [RUNNER_PATH, "--ref=" + ref, "--command=" + command, "--", ...args],
    {
      cwd: root,
      env: Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"].includes(name)),
      ),
      encoding: "utf8",
      windowsHide: true,
    },
  );
}

test("executes a committed tree without seeing dirty worktree files", () => {
  const root = createFixture();
  try {
    writeFileSync(join(root, "foreign-worktree.ts"), "const invalid = true;\n");
    writeFileSync(join(root, "apps", "web", "src", "foreign-invalid.test.ts"), "this is not valid TypeScript\n");
    mkdirSync(join(root, "artifacts", "foreign"), { recursive: true });
    writeFileSync(join(root, "artifacts", "foreign", "package-lock.json"), "{\"foreign\":true}\n");
    const ref = git(root, ["rev-parse", "HEAD"]);
    const result = runRunner(root, ref, "node", ["scripts/checks/dynamic-check.mjs"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(root, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("forwards a candidate failure", () => {
  const root = createFixture();
  try {
    const ref = git(root, ["rev-parse", "HEAD"]);
    const result = runRunner(root, ref, "node", ["-e", "process.exitCode = 7"]);
    assert.equal(result.status, 7, result.stderr);
    assert.equal(existsSync(join(root, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolves npm packages from the canonical checkout for a linked worktree", () => {
  const root = createFixture();
  const linked = join(root, "..", "cleanmymap-dynamic-dependency-linked-worktree");
  try {
    git(root, ["worktree", "add", "--detach", linked, "HEAD"]);
    assert.equal(existsSync(join(linked, "node_modules")), false);
    const ref = git(linked, ["rev-parse", "HEAD"]);
    const result = runRunner(linked, ref, "node", ["-e", [
      "const { existsSync, lstatSync } = require('node:fs');",
      "const resolve = (name, from) => require.resolve(name + '/package.json', { paths: [from] });",
      "if (!lstatSync('node_modules').isSymbolicLink()) process.exit(21);",
      "if (!lstatSync('apps/web/node_modules').isSymbolicLink()) process.exit(22);",
      "if (!lstatSync('apps/mobile/node_modules').isSymbolicLink()) process.exit(23);",
      "if (!lstatSync('apps/web/node_modules/workspace-only').isSymbolicLink()) process.exit(24);",
      "if (!lstatSync('apps/mobile/node_modules/mobile-only').isSymbolicLink()) process.exit(25);",
      "if (!existsSync('apps/web/node_modules/workspace-only/package.json')) process.exit(26);",
      "if (!existsSync('apps/mobile/node_modules/mobile-only/package.json')) process.exit(27);",
      "console.log(resolve('eslint', '.'));",
      "console.log(resolve('workspace-only', 'apps/web'));",
      "console.log(resolve('mobile-only', 'apps/mobile'));",
    ].join(" ")]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /node_modules[\\/]eslint[\\/]package\.json/);
    assert.match(result.stdout, /workspace-only[\\/]package\.json/);
    assert.match(result.stdout, /mobile-only[\\/]package\.json/);
    assert.equal(existsSync(join(root, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    try { git(root, ["worktree", "remove", "--", linked]); } catch { /* fixture cleanup is authoritative */ }
    rmSync(root, { recursive: true, force: true });
    rmSync(linked, { recursive: true, force: true });
  }
});

test("cleans the candidate after materialization fails", () => {
  const root = createFixture();
  try {
    const result = runRunner(root, "missing-candidate-ref", "node");
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(root, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cleans an isolated dependency candidate when npm ci fails", () => {
  const root = createFixture();
  const linked = join(root, "..", "cleanmymap-dynamic-dependency-failure-worktree");
  try {
    git(root, ["worktree", "add", "--detach", linked, "HEAD"]);
    writeFileSync(join(linked, "package.json"), '{"name":"dynamic-fixture","private":true,"dependencies":{"package-that-does-not-exist-cleanmymap":"0.0.0"}}\n');
    writeFileSync(join(linked, "package-lock.json"), '{"name":"dynamic-fixture","lockfileVersion":3,"requires":true,"packages":{"":{"name":"dynamic-fixture","dependencies":{"package-that-does-not-exist-cleanmymap":"0.0.0"}}}}\n');
    git(linked, ["add", "package.json", "package-lock.json"]);
    git(linked, ["commit", "--quiet", "-m", "incompatible dependency graph"]);
    const ref = git(linked, ["rev-parse", "HEAD"]);
    const result = runRunner(linked, ref, "node", ["-e", "process.exitCode = 0"]);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(linked, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    try { git(root, ["worktree", "remove", "--", linked]); } catch { /* fixture cleanup is authoritative */ }
    rmSync(root, { recursive: true, force: true });
    rmSync(linked, { recursive: true, force: true });
  }
});

test("reports a missing dynamic tool as HOST_ENVIRONMENT", () => {
  const root = createFixture();
  try {
    const ref = git(root, ["rev-parse", "HEAD"]);
    const result = runRunner(root, ref, "cleanmymap-tool-that-does-not-exist");
    const output = (result.stdout || "") + (result.stderr || "");
    assert.equal(result.status, 127, output);
    assert.match(output, /HOST_ENVIRONMENT/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolves shared Git objects when the source is a linked worktree", () => {
  const root = createFixture();
  const linked = join(root, "..", "cleanmymap-dynamic-linked-worktree");
  try {
    git(root, ["worktree", "add", "--detach", linked, "HEAD"]);
    const ref = git(root, ["rev-parse", "HEAD"]);
    const result = runRunner(linked, ref, "node", ["scripts/checks/dynamic-check.mjs"]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
  } finally {
    try { git(root, ["worktree", "remove", "--", linked]); } catch { /* fixture cleanup is authoritative */ }
    rmSync(root, { recursive: true, force: true });
    rmSync(linked, { recursive: true, force: true });
  }
});
