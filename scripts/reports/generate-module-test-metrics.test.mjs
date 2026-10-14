import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildModuleTestMetrics } from "./generate-module-test-metrics.mjs";

function writeFile(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-module-test-metrics-"));
  writeFile(root, "apps/web/src/app/api/email/test/route.ts", "export const GET = () => new Response(\"ok\");\n");
  writeFile(root, "apps/web/src/lib/widget.ts", "export const widget = true;\n");
  writeFile(root, "apps/web/src/lib/widget.test.ts", "import { widget } from \"./widget\";\nexport const result = widget;\n");
  writeFile(root, "apps/web/src/tests/fixture.ts", "export const fixture = true;\n");
  writeFile(root, "apps/web/src/components/__tests__/component.ts", "export const componentFixture = true;\n");
  git(root, ["init", "-q"]);
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=fixture", "-c", "user.email=fixture", "commit", "-qm", "fixture v1"]);
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("structural metrics read the exact Git tree, not dirty checkout content", () => {
  const root = fixture();
  try {
    const sourceSha = git(root, ["rev-parse", "HEAD"]);
    writeFile(root, "apps/web/src/app/api/email/test/route.ts", "export const GET = () => {\n  const dirty = true;\n  const extra = dirty;\n  return new Response(String(extra));\n};\n");
    writeFile(root, "apps/web/src/lib/untracked.ts", "export const untracked = true;\n");

    const report = buildModuleTestMetrics({ root, sourceSha, timestamp: "2026-10-14T00:00:00.000Z" });

    assert.equal(report.sourceSha, sourceSha);
    assert.equal(report.domains.api.runtimeFiles, 1);
    assert.equal(report.domains.api.runtimeLines, 2);
    assert.equal(report.domains.api.testFiles, 0);
    assert.equal(report.execution.webTests, "NOT_RUN");
    assert.equal(report.execution.mobileTests, "NOT_RUN");
    assert.equal(report.execution.webCoverage.execution, "NOT_RUN");
    assert.equal(report.execution.mobileCoverage.execution, "NOT_RUN");
    assert.equal(report.execution.testFilesModified, "NOT_ATTESTED");
  } finally {
    cleanup(root);
  }
});

test("API route under a test segment stays runtime while test conventions remain recognized", () => {
  const root = fixture();
  try {
    const report = buildModuleTestMetrics({ root, timestamp: "2026-10-14T00:00:00.000Z" });

    assert.equal(report.domains.api.runtimeFiles, 1);
    assert.equal(report.domains.api.testFiles, 0);
    assert.equal(report.domains["web/lib"].testFiles, 1);
    assert.equal(report.domains["web/tests"].testFiles, 1);
    assert.equal(report.domains["web/components"].testFiles, 1);
    assert.equal(report.domains["web/lib"].runtimeFilesWithDirectTest, 1);
  } finally {
    cleanup(root);
  }
});

test("coverage and jscpd observations cannot be attributed to another audited SHA", () => {
  const root = fixture();
  try {
    const sourceSha = git(root, ["rev-parse", "HEAD"]);
    writeFile(root, "apps/web/src/lib/widget.ts", "export const widget = false;\n");
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=fixture", "-c", "user.email=fixture", "commit", "-qm", "fixture v2"]);
    const observedSha = git(root, ["rev-parse", "HEAD"]);
    writeFile(root, "apps/web/coverage/coverage-summary.json", JSON.stringify({
      total: { lines: { total: 1, covered: 1 } },
      "apps/web/src/lib/widget.ts": { lines: { total: 1, covered: 1 } },
    }));
    writeFile(root, "apps/web/coverage/coverage-evidence.json", JSON.stringify({ gitHead: observedSha }));

    const report = buildModuleTestMetrics({
      root,
      sourceSha,
      webCoverageStatus: "PASS",
      timestamp: "2026-10-14T00:00:00.000Z",
    });

    assert.equal(report.execution.webCoverage.status, "PRESENT_NOT_ATTESTED");
    assert.equal(report.execution.webCoverage.attestation, "NOT_ATTESTED");
    assert.notEqual(report.execution.webCoverage.sourceSha, sourceSha);
    assert.equal(report.duplication.tests.attestation, "NOT_ATTESTED");
    assert.equal(report.duplication.tests.observedSha, observedSha);
  } finally {
    cleanup(root);
  }
});
