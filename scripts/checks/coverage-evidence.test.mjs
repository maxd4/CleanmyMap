import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COVERAGE_SUMMARY_RELATIVE_PATH,
  validateCoverageEvidence,
  writeCoverageEvidence,
} from "./coverage-evidence.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-evidence-"));
  fs.mkdirSync(path.join(root, "apps", "web", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts", "checks"), { recursive: true });
  for (const relativePath of [
    "apps/web/vitest.config.ts",
    "apps/web/package.json",
    "package.json",
    "package-lock.json",
    "scripts/checks/coverage-policy.mjs",
    "scripts/checks/check-coverage.mjs",
    "scripts/checks/coverage-evidence.mjs",
  ]) {
    const target = path.join(root, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, relativePath, "utf8");
  }
  fs.writeFileSync(
    path.join(root, ...COVERAGE_SUMMARY_RELATIVE_PATH.split("/")),
    JSON.stringify({ total: { lines: { total: 1, covered: 1, pct: 100 } } }),
    "utf8",
  );
  fs.writeFileSync(path.join(root, ".gitignore"), "apps/web/coverage/\n", "utf8");
  fs.writeFileSync(path.join(root, "candidate.txt"), "candidate", "utf8");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture", "commit", "-qm", "fixture"], { cwd: root });
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("coverage evidence accepts the same candidate/configuration", () => {
  const root = fixture();
  try {
    writeCoverageEvidence({ repositoryRoot: root });
    assert.doesNotThrow(() => validateCoverageEvidence({ repositoryRoot: root }));
  } finally {
    cleanup(root);
  }
});
test("coverage evidence rejects a changed candidate, configuration, or summary", () => {
  const root = fixture();
  try {
    writeCoverageEvidence({ repositoryRoot: root });
    fs.writeFileSync(path.join(root, "candidate.txt"), "changed candidate", "utf8");
    assert.throws(() => validateCoverageEvidence({ repositoryRoot: root }), /candidateFingerprint/);

    const configurationRoot = fixture();
    try {
      writeCoverageEvidence({ repositoryRoot: configurationRoot });
      fs.writeFileSync(path.join(configurationRoot, "package.json"), "changed", "utf8");
      assert.throws(() => validateCoverageEvidence({ repositoryRoot: configurationRoot }), /configurationFingerprint/);
    } finally {
      cleanup(configurationRoot);
    }

    const cleanRoot = fixture();
    try {
      writeCoverageEvidence({ repositoryRoot: cleanRoot });
      fs.writeFileSync(path.join(cleanRoot, ...COVERAGE_SUMMARY_RELATIVE_PATH.split("/")), "corrupt", "utf8");
      assert.throws(() => validateCoverageEvidence({ repositoryRoot: cleanRoot }), /evidence incomplete or unreadable/);
      fs.writeFileSync(path.join(cleanRoot, ...COVERAGE_SUMMARY_RELATIVE_PATH.split("/")), JSON.stringify({ total: {} }), "utf8");
      assert.throws(() => validateCoverageEvidence({ repositoryRoot: cleanRoot }), /summarySha256/);
    } finally {
      cleanup(cleanRoot);
    }
  } finally {
    cleanup(root);
  }
});

test("missing coverage evidence cannot be treated as checker-only proof", () => {
  const root = fixture();
  try {
    assert.throws(() => validateCoverageEvidence({ repositoryRoot: root }), /evidence incomplete or unreadable/);
  } finally {
    cleanup(root);
  }
});
