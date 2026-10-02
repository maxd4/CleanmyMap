import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const AUDIT_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "checks", "secret-audit.mjs"), "utf8");

function runGit(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeFixture(root, relativePath, content) {
  const targetPath = join(root, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function runAudit({
  candidatePath = "candidate.md",
  candidateContent,
  foreignPath = "foreign.md",
  foreignContent,
  mode = "candidate",
  mutateWorkingTree = false,
}) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-secret-audit-"));
  const scriptsRoot = join(testRoot, "scripts", "checks");
  mkdirSync(scriptsRoot, { recursive: true });
  writeFileSync(join(scriptsRoot, "secret-audit.mjs"), AUDIT_SOURCE);

  try {
    runGit(testRoot, ["init", "--quiet"]);
    runGit(testRoot, ["config", "user.email", "codex@example.com"]);
    runGit(testRoot, ["config", "user.name", "Codex Test"]);
    writeFixture(testRoot, candidatePath, "baseline\n");
    writeFixture(testRoot, foreignPath, foreignContent);
    runGit(testRoot, ["add", "--", candidatePath, foreignPath]);
    runGit(testRoot, ["commit", "--quiet", "-m", "baseline"]);
    const base = runGit(testRoot, ["rev-parse", "HEAD"]);

    writeFixture(testRoot, candidatePath, candidateContent);
    runGit(testRoot, ["add", "--", candidatePath]);
    runGit(testRoot, ["commit", "--quiet", "-m", "candidate"]);
    const candidate = runGit(testRoot, ["rev-parse", "HEAD"]);

    if (mutateWorkingTree) {
      writeFixture(testRoot, candidatePath, "worktree content must be ignored\n");
    }

    const args = [join(scriptsRoot, "secret-audit.mjs")];
    if (mode === "ref") {
      args.push(`--ref=${candidate}`);
    } else {
      args.push(`--candidate-ref=${candidate}`, `--candidate-range=${base}..${candidate}`);
    }

    return spawnSync(
      process.execPath,
      args,
      { cwd: testRoot, encoding: "utf8", windowsHide: true },
    );
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

test("candidate secret is detected", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /AWS access key/);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
});

test("a synthetic secret in a Python file is detected", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidatePath: "maintenance/python/src/secret_fixture.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /secret_fixture\.py/);
  assert.match(result.stderr, /AWS access key/);
});

test("a clean Python file passes", () => {
  const result = runAudit({
    candidatePath: "maintenance/python/src/clean_fixture.py",
    candidateContent: "def clean_fixture():\n    return True\n",
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /1 file\(s\) scanned/);
});

test("--ref scans the targeted commit instead of the mutated worktree", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    mode: "ref",
    mutateWorkingTree: true,
    candidatePath: "maintenance/python/src/ref_fixture.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /ref_fixture\.py/);
  assert.match(result.stderr, /AWS access key/);
});

test("generated path exclusions remain effective for Python files", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    mode: "ref",
    candidatePath: ".next-codex-secret/sentinel.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignPath: ".artifacts/apps-web-node_modules-incomplete-0830/sentinel.py",
    foreignContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /0 file\(s\) scanned/);
});

test("secret in a foreign tree file does not affect candidate scan", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidateContent: "documentation only\n",
    foreignContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
  assert.match(result.stdout, /1 file\(s\) scanned/);
});

test("asset integrity SHA-256 is allowed", () => {
  const assetDigest = "a".repeat(64);
  const result = runAudit({
    candidateContent: `asset: { "sha256": "${assetDigest}" }\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
});

test("a hash next to a password or token remains blocked", () => {
  const sensitiveDigest = "b".repeat(64);
  const result = runAudit({
    candidateContent: `passwordHash=${sensitiveDigest}\nTOKEN_DIGEST=${sensitiveDigest}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Hash digest/);
});

test("a real token pattern remains blocked", () => {
  const syntheticToken = [
    "eyJaaaaaaaaaa",
    "eyJbbbbbbbbbb",
    "eyJcccccccccc",
  ].join(".");
  const result = runAudit({
    candidateContent: `ACCESS_TOKEN=${syntheticToken}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /JWT token/);
});
