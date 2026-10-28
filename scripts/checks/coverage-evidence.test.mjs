import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COVERAGE_LCOV_RELATIVE_PATH,
  COVERAGE_SUMMARY_RELATIVE_PATH,
  MOBILE_COVERAGE_EVIDENCE_RELATIVE_PATH,
  MOBILE_COVERAGE_LCOV_RELATIVE_PATH,
  MOBILE_COVERAGE_SUMMARY_RELATIVE_PATH,
  computeConfigurationFingerprint,
  computeCoverageEnvironmentFingerprint,
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
  fs.writeFileSync(path.join(root, ...COVERAGE_LCOV_RELATIVE_PATH.split("/")), "TN:\nSF:src/example.ts\nDA:1,1\nend_of_record\n", "utf8");
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

function mobileFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-mobile-coverage-evidence-"));
  fs.mkdirSync(path.join(root, "apps", "mobile", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "mobile"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts", "checks"), { recursive: true });
  for (const relativePath of [
    "apps/mobile/vitest.config.ts",
    "apps/mobile/package.json",
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
    path.join(root, ...MOBILE_COVERAGE_SUMMARY_RELATIVE_PATH.split("/")),
    JSON.stringify({ total: { lines: { total: 2, covered: 1, pct: 50 } } }),
    "utf8",
  );
  fs.writeFileSync(path.join(root, ...MOBILE_COVERAGE_LCOV_RELATIVE_PATH.split("/")), "TN:\nSF:src/example.ts\nDA:1,1\nend_of_record\n", "utf8");
  fs.writeFileSync(path.join(root, ".gitignore"), "apps/mobile/coverage/\n", "utf8");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture", "commit", "-qm", "fixture"], { cwd: root });
  return root;
}

test("coverage evidence accepts the same candidate/configuration", () => {
  const root = fixture();
  try {
    writeCoverageEvidence({ repositoryRoot: root });
    assert.doesNotThrow(() => validateCoverageEvidence({ repositoryRoot: root }));
    const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    assert.doesNotThrow(() => validateCoverageEvidence({ repositoryRoot: root, expectedCandidateSha: candidateSha }));
    assert.throws(() => validateCoverageEvidence({ repositoryRoot: root, expectedCandidateSha: "f".repeat(40) }), /candidate mismatch/);
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

test("coverage evidence accepts a compatible producer and rejects a different consumer runtime", () => {
  const root = fixture();
  try {
    writeCoverageEvidence({ repositoryRoot: root });
    assert.doesNotThrow(() => validateCoverageEvidence({ repositoryRoot: root }));
    const evidencePath = path.join(root, ..."apps/web/coverage/coverage-evidence.json".split("/"));
    const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    const producerEnvironment = {
      nodeVersion: "v24.22.1",
      environment: { ...process.env, TZ: "UTC" },
    };
    const consumerEnvironment = {
      nodeVersion: "v24.21.0",
      environment: { ...process.env, TZ: "Europe/Paris" },
    };
    const producerFingerprint = computeCoverageEnvironmentFingerprint(producerEnvironment);
    const consumerFingerprint = computeCoverageEnvironmentFingerprint(consumerEnvironment);
    assert.notEqual(producerFingerprint, consumerFingerprint);
    evidence.environmentFingerprint = producerFingerprint;
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence)}\n`, "utf8");

    assert.throws(
      () => validateCoverageEvidence({ repositoryRoot: root }),
      /environmentFingerprint/,
    );
  } finally {
    cleanup(root);
  }
});

test("mobile coverage evidence binds the candidate, mobile configuration, summary, and LCOV", () => {
  const root = mobileFixture();
  try {
    writeCoverageEvidence({ repositoryRoot: root, scope: "mobile" });
    const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    assert.doesNotThrow(() => validateCoverageEvidence({ repositoryRoot: root, scope: "mobile", expectedCandidateSha: candidateSha }));

    fs.appendFileSync(path.join(root, ...MOBILE_COVERAGE_LCOV_RELATIVE_PATH.split("/")), "TN:changed\n", "utf8");
    assert.throws(() => validateCoverageEvidence({ repositoryRoot: root, scope: "mobile" }), /lcovSha256/);

    const configurationRoot = mobileFixture();
    try {
      writeCoverageEvidence({ repositoryRoot: configurationRoot, scope: "mobile" });
      fs.appendFileSync(path.join(configurationRoot, "apps", "mobile", "vitest.config.ts"), "changed\n", "utf8");
      assert.throws(() => validateCoverageEvidence({ repositoryRoot: configurationRoot, scope: "mobile" }), /configurationFingerprint/);
    } finally {
      cleanup(configurationRoot);
    }

    assert.equal(path.join("apps", "mobile", "coverage", "coverage-evidence.json"), MOBILE_COVERAGE_EVIDENCE_RELATIVE_PATH);
  } finally {
    cleanup(root);
  }
});

test("rejects unsafe Git refs and redirected external report roots", (t) => {
  const root = fixture();
  try {
    assert.throws(
      () => computeConfigurationFingerprint({ repositoryRoot: root, candidateRef: "--upload-pack=evil" }),
      /Unsafe coverage candidate ref/,
    );
    const linkedRoot = path.join(path.dirname(root), `${path.basename(root)}-linked`);
    try {
      fs.symlinkSync(root, linkedRoot, "junction");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }
    writeCoverageEvidence({ repositoryRoot: root });
    assert.throws(
      () => validateCoverageEvidence({ repositoryRoot: root, reportRoot: linkedRoot }),
      /symbolic-link|redirected/,
    );
    fs.rmSync(linkedRoot, { recursive: true, force: true });
  } finally {
    cleanup(root);
  }
});
