import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateSonarCoverageReports } from "./prepare-sonarqube-coverage.mjs";

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-"));
  fs.mkdirSync(path.join(root, "apps", "web", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "web", "src", "feature.ts"), "export const feature = 1;\n");
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "coverage-summary.json"), JSON.stringify({
    total: {
      lines: { total: 1, covered: 1 },
      branches: { total: 1, covered: 1 },
      functions: { total: 1, covered: 1 },
    },
    "src/feature.ts": {
      lines: { total: 1, covered: 1 },
      branches: { total: 1, covered: 1 },
      functions: { total: 1, covered: 1 },
    },
  }));
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "lcov.info"), [
    "TN:",
    "SF:src\\feature.ts",
    "FN:1,feature",
    "FNDA:1,feature",
    "FNF:1",
    "FNH:1",
    "DA:1,1",
    "BRDA:1,0,0,1",
    "BRF:1",
    "BRH:1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "",
  ].join("\n"));
  return root;
}

test("normalizes workspace-relative SF paths and verifies LCOV against JSON summary", () => {
  const root = fixtureRoot();
  const result = validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  });
  assert.equal(result[0].normalized, true);
  assert.match(fs.readFileSync(path.join(root, "apps/web/coverage/lcov.info"), "utf8"), /SF:apps\/web\/src\/feature\.ts/);
});

test("fails closed when LCOV points to a missing source", () => {
  const root = fixtureRoot();
  const lcovPath = path.join(root, "apps/web/coverage/lcov.info");
  const original = fs.readFileSync(lcovPath, "utf8");
  fs.writeFileSync(lcovPath, original.replace("src\\feature.ts", "src\\missing.ts"));
  assert.throws(() => validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  }), /do not resolve|does not resolve/);
});

test("fails closed when an LCOV report is absent", () => {
  const root = fixtureRoot();
  fs.rmSync(path.join(root, "apps/web/coverage/lcov.info"));
  assert.throws(() => validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  }), /LCOV report is missing/);
});
