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
  writeFileSync(join(root, "apps", "web", "src", "candidate.ts"), "export const candidate = true;\n");
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
  } finally {
    rmSync(root, { recursive: true, force: true });
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
