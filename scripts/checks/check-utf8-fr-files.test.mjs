import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const CHECK_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "checks", "check-utf8-fr-files.mjs"), "utf8");
const GIT_EXECUTABLE_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "ci", "git-executable.mjs"), "utf8");

function runGit(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeFixture(root, relativePath, content) {
  const targetPath = join(root, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function runCheck(files) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-utf8-fr-"));
  const scriptPath = join(testRoot, "scripts", "checks", "check-utf8-fr-files.mjs");
  mkdirSync(dirname(scriptPath), { recursive: true });
  mkdirSync(join(testRoot, "scripts", "ci"), { recursive: true });
  writeFileSync(scriptPath, CHECK_SOURCE, "utf8");
  writeFileSync(join(testRoot, "scripts", "ci", "git-executable.mjs"), GIT_EXECUTABLE_SOURCE, "utf8");

  try {
    runGit(testRoot, ["init", "--quiet"]);
    runGit(testRoot, ["config", "user.email", "codex@example.com"]);
    runGit(testRoot, ["config", "user.name", "Codex Test"]);
    for (const [relativePath, content] of Object.entries(files)) writeFixture(testRoot, relativePath, content);
    runGit(testRoot, ["add", "."]);
    runGit(testRoot, ["commit", "--quiet", "-m", "fixture"]);
    return spawnSync(process.execPath, [scriptPath], {
      cwd: testRoot,
      encoding: "utf8",
      windowsHide: true,
    });
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

test("valid mobile, script, Web and documentation text files pass", () => {
  const result = runCheck({
    "apps/mobile/components/fixture.tsx": "export const label = 'Été';\n",
    "scripts/fixture.mjs": "export const label = 'Été';\n",
    "apps/web/src/fixture.ts": "export const label = 'Été';\n",
    "documentation/fixture.md": "# Été\n",
    "apps/mobile/assets/fixture.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]),
    "apps/mobile/vendor/fixture.ts": Buffer.from([0xc3, 0x28]),
    "scripts/.cache/fixture.mjs": Buffer.from([0xc3, 0x28]),
    "scripts/generated/fixture.mjs": Buffer.from([0xc3, 0x28]),
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /6 sensitive French text file\(s\) validated/);
});

test("invalid UTF-8 in a mobile TSX file fails", () => {
  const result = runCheck({
    "apps/mobile/components/invalid.tsx": Buffer.from([0x65, 0x6d, 0x6f, 0x6a, 0x69, 0x3d, 0xc3, 0x28]),
  });

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /1 file\(s\) failed UTF-8 checks/);
});

test("invalid UTF-8 in a Node script fails", () => {
  const result = runCheck({
    "scripts/invalid.mjs": Buffer.from([0x65, 0x78, 0x70, 0x6f, 0x72, 0x74, 0x20, 0xc3, 0x28]),
  });

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /1 file\(s\) failed UTF-8 checks/);
});

test("BOM remains a non-blocking warning", () => {
  const result = runCheck({
    "scripts/bom.mjs": Buffer.from([0xef, 0xbb, 0xbf, 0x65, 0x78, 0x70, 0x6f, 0x72, 0x74]),
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /warning: 1 file\(s\) contain UTF-8 BOM/);
});
