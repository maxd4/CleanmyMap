import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const AUDIT_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "checks", "secret-audit.mjs"), "utf8");

function runGit(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runAudit({ candidateContent, foreignContent }) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-secret-audit-"));
  const scriptsRoot = join(testRoot, "scripts", "checks");
  mkdirSync(scriptsRoot, { recursive: true });
  writeFileSync(join(scriptsRoot, "secret-audit.mjs"), AUDIT_SOURCE);

  try {
    runGit(testRoot, ["init", "--quiet"]);
    runGit(testRoot, ["config", "user.email", "codex@example.com"]);
    runGit(testRoot, ["config", "user.name", "Codex Test"]);
    writeFileSync(join(testRoot, "candidate.md"), "baseline\n");
    writeFileSync(join(testRoot, "foreign.md"), foreignContent);
    runGit(testRoot, ["add", "candidate.md", "foreign.md"]);
    runGit(testRoot, ["commit", "--quiet", "-m", "baseline"]);
    const base = runGit(testRoot, ["rev-parse", "HEAD"]);

    writeFileSync(join(testRoot, "candidate.md"), candidateContent);
    runGit(testRoot, ["add", "candidate.md"]);
    runGit(testRoot, ["commit", "--quiet", "-m", "candidate"]);
    const candidate = runGit(testRoot, ["rev-parse", "HEAD"]);

    return spawnSync(
      process.execPath,
      [
        join(scriptsRoot, "secret-audit.mjs"),
        `--candidate-ref=${candidate}`,
        `--candidate-range=${base}..${candidate}`,
      ],
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
