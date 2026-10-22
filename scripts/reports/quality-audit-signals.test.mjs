import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  HOTSPOT_HISTORY_WINDOW_DAYS,
  HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD,
  HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD,
  buildQualityHotspotsReport,
  buildQualityTestabilityReport,
} from "./quality-audit-signals.mjs";

const auditedSha = "a".repeat(40);

function historyFixture() {
  const files = ["apps/web/src/hot.ts", "apps/web/src/linear.ts"];
  const commits = Array.from({ length: HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD }, (_, index) => {
    const commitSha = String(index + 1).repeat(40);
    const hotChange = index === 0
      ? `${HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD}\t0\tapps/web/src/hot.ts`
      : `1\t1\tapps/web/src/hot.ts`;
    return `commit\0${commitSha}${String.fromCharCode(0)}2026-10-${String(index + 1).padStart(2, "0")}T00:00:00+00:00\n${hotChange}\n`;
  }).join("");
  return { files, commits };
}

function hotspotReport(reports = {}) {
  const fixture = historyFixture();
  const gitRunner = (args) => {
    if (args[0] === "show") return "2026-10-21T00:00:00+00:00";
    if (args[0] === "log") return fixture.commits;
    if (args[0] === "ls-tree") return fixture.files.join("\n");
    throw new Error(`commande inattendue: ${args.join(" ")}`);
  };
  return buildQualityHotspotsReport({ auditedSha, gitRunner, reports });
}

function completeCleanStructuralReports() {
  return {
    complexity: { metrics: [], result: { failures: [], reviews: [], improvements: [], stale: [] } },
    maintainability: { metrics: [], findings: [], diagnostics: [] },
    "type-safety": { findings: [], coverage: [], diagnostics: [] },
    "top-heavy": { evaluation: {
      hardOffenders: [], newHardOffenders: [], ratchetViolations: [], reviewWarnings: [],
      newReviewOffenders: [], reviewRatchetViolations: [], blockingFindings: [],
    } },
    "dead-code": { comparison: { newFindings: [], historicalActionableFindings: [] }, currentFindings: [] },
    duplication: { results: [] },
    cycles: { cycles: [], cycleObjects: [], comparison: { added: [], stale: [] } },
  };
}

test("hotspots mesure l'activité Git et ne transforme pas l'activité seule en dette", () => {
  const fixture = historyFixture();
  const calls = [];
  const gitRunner = (args) => {
    calls.push(args);
    if (args[0] === "show") return "2026-10-21T00:00:00+00:00";
    if (args[0] === "log") return fixture.commits;
    if (args[0] === "ls-tree") return fixture.files.join("\n");
    throw new Error(`commande inattendue: ${args.join(" ")}`);
  };
  const report = buildQualityHotspotsReport({
    auditedSha,
    gitRunner,
    reports: {
      complexity: { result: { failures: [{ path: "apps/web/src/hot.ts" }], reviews: [] }, metrics: [] },
      maintainability: { findings: [{ category: "local-maintainability", file: "apps/web/src/hot.ts" }] },
    },
  });

  assert.equal(report.methodology.historyWindowDays, HOTSPOT_HISTORY_WINDOW_DAYS);
  assert.equal(report.methodology.substantiveChangeMinimumLines, HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD);
  assert.equal(report.summary.regressionRecurrence, "NOT_MEASURED");
  const hot = report.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(hot.activity.commits, HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD);
  assert.equal(hot.activity.substantiveChanges, 1);
  assert.equal(hot.hotspotCandidate, true);
  assert.deepEqual(hot.structuralDebt.signals, ["complexity", "local-maintainability"]);
  assert.equal(hot.structuralDebt.signalCount, 2);
  assert.equal(calls.some((args) => args[0] === "log" && args.includes("--since=2026-04-24T00:00:00.000Z")), true);
});

test("hotspots ne qualifie la longueur de fonction que sur dépassement de cible ou finding", () => {
  const file = "apps/web/src/hot.ts";
  const base = (metrics, result = {}) => hotspotReport({ complexity: {
    metrics,
    result: { failures: [], reviews: [], improvements: [], stale: [], ...result },
  } }).files.find((entry) => entry.file === file);

  const belowTarget = base([{ metric: "functionLength", path: file, value: 99, category: "runtime/services/orchestration" }]);
  assert.deepEqual(belowTarget.structuralDebt.signals, []);

  const exceedingTarget = base([{ metric: "functionLength", path: file, value: 101, category: "runtime/services/orchestration" }]);
  assert.deepEqual(exceedingTarget.structuralDebt.signals, ["function-length"]);

  const noApplicableTarget = base([{ metric: "functionLength", path: file, value: 999, category: "category-not-covered-by-policy" }]);
  assert.deepEqual(noApplicableTarget.structuralDebt.signals, []);

  const finding = base(
    [{ metric: "functionLength", path: file, value: 1, category: "category-not-covered-by-policy" }],
    { reviews: [{ metric: "functionLength", path: file, value: 1 }] },
  );
  assert.deepEqual(finding.structuralDebt.signals, ["function-length"]);

  const multipleFunctions = base([
    { metric: "functionLength", path: file, value: 101, category: "runtime/services/orchestration" },
    { metric: "functionLength", path: file, value: 102, category: "runtime/services/orchestration" },
  ], { failures: [{ metric: "complexity", path: file, value: 26 }] });
  assert.deepEqual(multipleFunctions.structuralDebt.signals, ["complexity", "function-length"]);
  assert.equal(multipleFunctions.structuralDebt.signalCount, 2);
});

test("hotspots distingue l'activité mesurée de la disponibilité de la dette structurelle", () => {
  const withoutReports = hotspotReport();
  const withoutDebtEvidence = withoutReports.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(withoutDebtEvidence.structuralDebt.state, "NOT_MEASURED");
  assert.equal(withoutDebtEvidence.hotspotCandidate, false);
  assert.equal(withoutReports.structuralDebtAvailability.state, "NOT_MEASURED");

  const clean = hotspotReport(completeCleanStructuralReports());
  const cleanFile = clean.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(cleanFile.structuralDebt.state, "NONE");
  assert.equal(clean.structuralDebtAvailability.state, "COMPLETE");

  const partial = hotspotReport({ complexity: { metrics: [], result: { failures: [], reviews: [], improvements: [], stale: [] } } });
  const partialFile = partial.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(partialFile.structuralDebt.state, "NOT_MEASURED");
  assert.equal(partial.structuralDebtAvailability.state, "PARTIAL");

  const gateError = hotspotReport({ complexity: { error: { message: "gate unavailable" } } });
  const errorFile = gateError.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(errorFile.structuralDebt.state, "NOT_MEASURED");
  assert.deepEqual(gateError.structuralDebtAvailability.invalidReports, ["complexity"]);

  const positivePartial = hotspotReport({
    complexity: { metrics: [], result: { failures: [{ metric: "complexity", path: "apps/web/src/hot.ts" }], reviews: [], improvements: [], stale: [] } },
  });
  const positiveFile = positivePartial.files.find((entry) => entry.file === "apps/web/src/hot.ts");
  assert.equal(positiveFile.structuralDebt.state, "PRESENT");
  assert.equal(positivePartial.structuralDebtAvailability.state, "PARTIAL");
});

test("hotspots publie des compteurs distincts et garde les fichiers sans activité hors du détail", () => {
  const report = hotspotReport(completeCleanStructuralReports());
  assert.equal(report.summary.trackedFilesExamined, 2);
  assert.equal(report.summary.filesReported, 1);
  assert.equal(report.summary.filesMeasured, 1);
  assert.equal(report.summary.highActivityFiles, 1);
  assert.equal(report.summary.hotspotCandidates, 0);
  assert.equal(new Set(report.files.map((entry) => entry.file)).size, report.files.length);
  assert.deepEqual(report.files.map((entry) => entry.file), ["apps/web/src/hot.ts"]);
});

test("testability refuse les preuves absentes, périmées ou non attribuables", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-testability-"));
  try {
    fs.mkdirSync(path.join(root, "artifacts", "quality-hardening", "mutation"), { recursive: true });
    fs.writeFileSync(path.join(root, "artifacts", "quality-hardening", "mutation", "stryker-report.json"), JSON.stringify({ candidateSha: "b".repeat(40), summary: { score: 91 } }));
    const exactMetrics = {
      schemaVersion: 2,
      sourceSha: auditedSha,
      domains: {
        api: {
          runtimeFiles: 2,
          runtimeFilesWithDirectTest: 1,
          runtimeFilesWithoutDirectTest: 1,
          testFiles: 2,
          coverage: {
            status: "AVAILABLE",
            files: 2,
            metrics: { lines: { pct: 80 }, branches: { pct: 60 } },
          },
        },
      },
    };
    const report = buildQualityTestabilityReport({ root, auditedSha, moduleMetrics: exactMetrics });
    assert.equal(report.measurementStatus, "MEASURED");
    assert.equal(report.domains[0].module, "api");
    assert.equal(report.domains[0].coverage.state, "PRESENT");
    assert.equal(report.domains[0].testPresence.runtimeFilesWithoutDirectAssociation, 1);
    assert.equal(report.domains[0].mutation.state, "NOT_MEASURED");
    assert.equal(report.domains[0].criticalEvidence, "NOT_MEASURED");
    assert.match(report.diagnostics.map((entry) => entry.code).join(","), /MUTATION_REPORT_NOT_ATTRIBUTABLE_TO_AUDITED_SHA/);

    const stale = buildQualityTestabilityReport({ root, auditedSha, moduleMetrics: { ...exactMetrics, sourceSha: "b".repeat(40) } });
    assert.equal(stale.measurementStatus, "NOT_MEASURED");
    assert.deepEqual(stale.domains, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
