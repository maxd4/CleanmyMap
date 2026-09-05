import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const RUNNER_PATH = join(REPO_ROOT, "scripts", "ci", "run-static-candidate-check.mjs");

function git(fixtureRoot, args) {
  return execFileSync("git", args, { cwd: fixtureRoot, encoding: "utf8" }).trim();
}

function gitFromRepository(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function createFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cleanmymap-static-candidate-"));
  mkdirSync(join(fixtureRoot, "scripts", "checks"), { recursive: true });
  git(fixtureRoot, ["init", "--quiet"]);
  git(fixtureRoot, ["config", "user.email", ["test", "example.invalid"].join("@")]);
  git(fixtureRoot, ["config", "user.name", "Static Candidate Test"]);

  const dependencyPath = join(fixtureRoot, "scripts", "checks", "fixture-dependency.mjs");
  const checkerPath = join(fixtureRoot, "scripts", "checks", "fixture-check.mjs");
  writeFileSync(dependencyPath, "export const verdict = 'PASS';\n");
  writeFileSync(
    checkerPath,
    "import { verdict } from './fixture-dependency.mjs';\nconsole.log(`candidate-check: ${verdict}`);\nprocess.exitCode = verdict === 'PASS' ? 0 : 1;\n",
  );
  git(fixtureRoot, ["add", "scripts/checks/fixture-check.mjs", "scripts/checks/fixture-dependency.mjs"]);
  git(fixtureRoot, ["commit", "--quiet", "-m", "candidate checker passes"]);

  return { fixtureRoot, checkerPath };
}

function runRunner(fixtureRoot, candidateRef, script = "scripts/checks/fixture-check.mjs") {
  return spawnSync(
    process.execPath,
    [
      RUNNER_PATH,
      `--ref=${candidateRef}`,
      `--script=${script}`,
      "--",
      `--ref=${candidateRef}`,
    ],
    { cwd: fixtureRoot, encoding: "utf8", windowsHide: true },
  );
}

function createDocumentationFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cleanmymap-doc-candidate-"));
  const checkerRelativePath = "scripts/checks/check-documentation-governance.mjs";
  const viewRelativePath = "scripts/checks/repository-view.mjs";
  const checkerSource = readFileSync(join(REPO_ROOT, ...checkerRelativePath.split("/")), "utf8");
  const viewSource = readFileSync(join(REPO_ROOT, ...viewRelativePath.split("/")), "utf8").replace(
    '["ls-tree", "-r", "-z", ref, "--"]',
    '["ls-tree", "--full-tree", "-r", "-z", ref, "--"]',
  );

  mkdirSync(join(fixtureRoot, "scripts", "checks"), { recursive: true });
  mkdirSync(join(fixtureRoot, "documentation", "security"), { recursive: true });
  mkdirSync(join(fixtureRoot, "documentation", "ai-guides"), { recursive: true });
  git(fixtureRoot, ["init", "--quiet"]);
  git(fixtureRoot, ["config", "user.email", ["test", "example.invalid"].join("@")]);
  git(fixtureRoot, ["config", "user.name", "Static Candidate Test"]);

  writeFileSync(join(fixtureRoot, "scripts", "checks", "repository-view.mjs"), viewSource);
  writeFileSync(join(fixtureRoot, "scripts", "checks", "check-documentation-governance.mjs"), checkerSource);
  writeFileSync(
    join(fixtureRoot, "documentation", "security", "dependency-advisory-governance.md"),
    [
      "GHSA-w3rx-r6r6-pgpr",
      "CVE-2025-71330",
      "GHSA-5p2g-fcmc-qvqq",
      "CVE-2025-71329",
      "image-size@2.0.3",
      "apps/mobile/vendor/image-size",
      "n'est pas une release npm upstream",
      "metro@0.84.5",
      "metro@0.87.0",
      "version contenant les deux correctifs",
      "apps/web",
      "Aucun asset non fiable ne doit entrer dans un build Metro.",
    ].join("\n"),
  );
  writeFileSync(
    join(fixtureRoot, "documentation", "ai-guides", "AI_MODULARIZATION_PLAN.md"),
    "Ce guide de travail ne contient aucune référence interne interdite.\n",
  );
  git(fixtureRoot, ["add", "."]);
  git(fixtureRoot, ["commit", "--quiet", "-m", "candidate documentation checker"]);

  return { fixtureRoot, checkerSource, checkerRelativePath };
}

test("candidate runner ignores a dirty checker and its dependency comes from the candidate", () => {
  const { fixtureRoot, checkerPath } = createFixture();
  try {
    const candidateRef = git(fixtureRoot, ["rev-parse", "HEAD"]);
    writeFileSync(
      checkerPath,
      "import { verdict } from './fixture-dependency.mjs';\nthrow new Error(`dirty checker must be invisible: ${verdict}`);\n",
    );

    const result = runRunner(fixtureRoot, candidateRef);

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /candidate-check: PASS/);
    assert.equal(existsSync(join(fixtureRoot, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("candidate runner fails when the candidate checker itself fails", () => {
  const { fixtureRoot, checkerPath } = createFixture();
  try {
    writeFileSync(
      checkerPath,
      "import { verdict } from './fixture-dependency.mjs';\nconsole.log(`candidate-check: ${verdict}`);\nprocess.exitCode = 1;\n",
    );
    git(fixtureRoot, ["add", "scripts/checks/fixture-check.mjs"]);
    git(fixtureRoot, ["commit", "--quiet", "-m", "candidate checker fails"]);
    const candidateRef = git(fixtureRoot, ["rev-parse", "HEAD"]);

    const result = runRunner(fixtureRoot, candidateRef);

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /candidate-check: PASS/);
    assert.equal(existsSync(join(fixtureRoot, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("candidate documentation checker scans ai-guides while a dirty checker cannot change the verdict", () => {
  const { fixtureRoot, checkerSource, checkerRelativePath } = createDocumentationFixture();
  try {
    assert.doesNotMatch(checkerSource, /documentation\/ai-guides\//);
    const candidateRef = git(fixtureRoot, ["rev-parse", "HEAD"]);
    assert.match(
      git(fixtureRoot, ["ls-tree", "-r", "--name-only", candidateRef]),
      /documentation\/security\/dependency-advisory-governance\.md/,
    );
    const checkerPath = join(fixtureRoot, ...checkerRelativePath.split("/"));
    writeFileSync(
      checkerPath,
      "console.error('dirty documentation checker failure');\nprocess.exitCode = 1;\n",
    );

    const result = runRunner(fixtureRoot, candidateRef, checkerRelativePath);

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(existsSync(join(fixtureRoot, ".artifacts", "validation", "prepush-candidate")), false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
