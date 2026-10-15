#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildJscpdArguments,
  compareDuplicationMetrics,
  readJscpdFingerprints,
  readJscpdMetrics,
  readJscpdOccurrences,
} from "../checks/duplication-policy.mjs";
import { validateCoverageEvidence } from "../checks/coverage-evidence.mjs";
import { createGitRepositoryView } from "../checks/repository-view.mjs";

export const MODULE_TEST_METRICS_SCHEMA_VERSION = 2;
export const MODULE_TEST_METRICS_OUTPUT = "documentation/operations/audits/module-test-metrics.json";
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const COVERAGE_METRICS = ["lines", "functions", "branches", "statements"];
const SOURCE_ROOTS = ["apps/web/src", "apps/mobile", "scripts"];
const IGNORED_PARTS = new Set(["node_modules", ".next", "dist", "build", "coverage", "vendor", "android"]);

function git(args, root) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function normalize(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function isIgnored(file) {
  return normalize(file).split("/").some((part) => IGNORED_PARTS.has(part));
}

function isTestFile(file) {
  const normalized = normalize(file);
  return /(?:(?:^|\/)(?:__tests__|tests)(?:\/|$)|\.(?:test|spec)(?:\.[^.]+)*\.(?:js|jsx|ts|tsx|mjs|cjs)$)/i.test(normalized);
}

function isGeneratedFile(file, content) {
  const normalized = normalize(file);
  return /(?:(?:^|\/)(?:generated|__generated__)(?:\/|$)|(?:^|\/)next-env\.d\.ts$)/i.test(normalized)
    || /@generated\b|generated\s+(?:file|source)|do not edit|ne pas modifier/i.test(content.slice(0, 4096));
}

function physicalLines(content) {
  return content.replaceAll("\r\n", "\n").split("\n").length;
}

function webDomain(file) {
  const normalized = normalize(file);
  const relative = normalized.replace(/^apps\/web\/src\//, "");
  const rules = [
    ["spogomi", /(?:^|\/)(?:spogomi)(?:\/|$)/i],
    ["reports", /(?:^|\/)(?:reports?|reporting)(?:\/|$)/i],
    ["account", /(?:^|\/)(?:account|profile)(?:\/|$)/i],
    ["actions", /(?:^|\/)(?:actions?)(?:\/|$)/i],
    ["maps-location", /(?:^|\/)(?:maps?|location|geo|geocod)(?:[-_]|\/|$)/i],
    ["learning", /(?:^|\/)(?:learning|quiz|pedagogical)(?:[-_]|\/|$)/i],
    ["import-export", /(?:^|\/)(?:import|export)(?:[-_]|\/|$)/i],
    ["payments", /(?:^|\/)(?:payment|payments|billing|stripe)(?:[-_]|\/|$)/i],
    ["auth-authz", /(?:^|\/)(?:auth|authz|proxy)(?:[-_]|\/|$)/i],
  ];
  const matched = rules.find(([, expression]) => expression.test(relative));
  if (matched) return matched[0];
  if (relative.startsWith("app/api/")) return "api";
  return `web/${relative.split("/")[0] || "root"}`;
}

function mobileDomain(file) {
  const relative = normalize(file).replace(/^apps\/mobile\//, "");
  const top = relative.split("/")[0] || "root";
  if (top === "lib") return "mobile/services";
  if (top === "screens") return "mobile/screens";
  if (top === "hooks") return "mobile/hooks";
  if (top === "tasks") return "mobile/tasks";
  if (top === "security") return "mobile/security";
  if (top === "types") return "mobile/types";
  if (top === "tests") return "mobile/tests";
  return `mobile/${top}`;
}

function sourceDomain(file) {
  const normalized = normalize(file);
  if (normalized.startsWith("apps/web/src/")) return webDomain(normalized);
  if (normalized.startsWith("apps/mobile/")) return mobileDomain(normalized);
  if (normalized.startsWith("scripts/")) return `scripts/${normalized.split("/")[1] || "root"}`;
  return "other";
}

function listTrackedSourceFiles(sourceView) {
  return sourceView.listFiles().map(normalize).filter((file) => {
    if (!file || isIgnored(file) || !SOURCE_EXTENSIONS.has(path.posix.extname(file))) return false;
    return SOURCE_ROOTS.some((sourceRoot) => file === sourceRoot || file.startsWith(`${sourceRoot}/`));
  });
}

function resolveImport(importer, specifier, files) {
  const normalizedImporter = normalize(importer);
  let base = null;
  if (specifier.startsWith("@/") && normalizedImporter.startsWith("apps/web/")) {
    base = `apps/web/src/${specifier.slice(2)}`;
  } else if (specifier.startsWith(".")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(normalizedImporter), specifier));
  }
  if (!base) return null;
  const candidates = [base, ...[...SOURCE_EXTENSIONS].map((extension) => `${base}${extension}`), ...[...SOURCE_EXTENSIONS].map((extension) => `${base}/index${extension}`)];
  return candidates.find((candidate) => files.has(candidate)) ?? null;
}

function importSpecifiers(content) {
  const patterns = [
    /\bfrom[ \t]+["']([^"']+)["']/g,
    /\bimport[ \t]+["']([^"']+)["']/g,
    /\bimport[ \t]*\([ \t]*["']([^"']+)["']/g,
    /\brequire[ \t]*\([ \t]*["']([^"']+)["']/g,
  ];
  return patterns.flatMap((pattern) => [...content.matchAll(pattern)].map((match) => match[1]));
}

function readSourceFiles(sourceView, files) {
  const records = new Map();
  for (const file of files) {
    const content = sourceView.readText(file);
    const generated = isGeneratedFile(file, content);
    records.set(file, {
      file,
      domain: sourceDomain(file),
      kind: isTestFile(file) ? "test" : generated ? "generated" : "runtime",
      lines: physicalLines(content),
      imports: importSpecifiers(content),
    });
  }
  return records;
}

function directTestAssociations(records) {
  const fileSet = new Set(records.keys());
  const importedByTests = new Map();
  for (const record of records.values()) {
    if (record.kind !== "test") continue;
    for (const specifier of record.imports) {
      const target = resolveImport(record.file, specifier, fileSet);
      if (!target || records.get(target)?.kind !== "runtime") continue;
      importedByTests.set(target, (importedByTests.get(target) ?? 0) + 1);
    }
  }

  const testsByStem = new Set();
  for (const file of fileSet) {
    if (records.get(file)?.kind !== "test") continue;
    const normalized = file.replace(/\.(?:test|spec)(?:\.[^.]+)*\.(?=[^.]+$)/i, ".");
    testsByStem.add(normalized);
  }
  const associated = new Set(importedByTests.keys());
  for (const record of records.values()) {
    if (record.kind !== "runtime") continue;
    const extension = path.posix.extname(record.file);
    const stem = record.file.slice(0, -extension.length);
    const candidates = [...fileSet].filter((file) => file.startsWith(`${stem}.test.`) || file.startsWith(`${stem}.spec.`) || file.startsWith(`${stem}/__tests__/`));
    if (candidates.some((candidate) => records.get(candidate)?.kind === "test") || testsByStem.has(record.file)) associated.add(record.file);
  }
  return { associated, importedByTests };
}

function emptyMetrics() {
  return Object.fromEntries(COVERAGE_METRICS.map((metric) => [metric, { total: 0, covered: 0, pct: null }]));
}

function addCoverageRow(target, row) {
  for (const metric of COVERAGE_METRICS) {
    target[metric].total += Number(row?.[metric]?.total ?? 0);
    target[metric].covered += Number(row?.[metric]?.covered ?? 0);
  }
}

function finalizeMetrics(metrics) {
  return Object.fromEntries(COVERAGE_METRICS.map((metric) => {
    const value = metrics[metric];
    return [metric, { ...value, pct: value.total > 0 ? Number(((value.covered / value.total) * 100).toFixed(2)) : null }];
  }));
}

function normalizeCoverageFile(file, scope) {
  const normalized = normalize(file);
  const marker = scope === "web" ? "apps/web/" : "apps/mobile/";
  const index = normalized.indexOf(marker);
  if (index >= 0) return normalized.slice(index);
  if (scope === "web" && normalized.startsWith("src/")) return `apps/web/${normalized}`;
  if (scope === "mobile" && !normalized.startsWith("apps/")) return `apps/mobile/${normalized}`;
  return normalized;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readCoverage(root, scope, requestedStatus, auditedSha) {
  const summaryPath = path.join(root, scope === "web" ? "apps/web/coverage/coverage-summary.json" : "apps/mobile/coverage/coverage-summary.json");
  const relativeSummaryPath = normalize(path.relative(root, summaryPath));
  if (!fs.existsSync(summaryPath)) {
    return {
      status: "NOT_RUN",
      executionStatus: requestedStatus,
      attestationStatus: "NOT_ATTESTED",
      sourceSha: null,
      reason: "COVERAGE_SUMMARY_MISSING",
      summaryPath: relativeSummaryPath,
      files: 0,
      metrics: null,
    };
  }

  const summary = readJson(summaryPath);
  if (!summary) {
    return {
      status: "INVALID",
      executionStatus: requestedStatus,
      attestationStatus: "NOT_ATTESTED",
      sourceSha: null,
      reason: "COVERAGE_SUMMARY_INVALID",
      summaryPath: relativeSummaryPath,
      files: 0,
      metrics: null,
    };
  }

  const evidencePath = path.join(root, scope === "web" ? "apps/web/coverage/coverage-evidence.json" : "apps/mobile/coverage/coverage-evidence.json");
  const evidence = readJson(evidencePath);
  const evidenceSourceSha = evidence?.gitHead ?? evidence?.candidateSha ?? null;
  const currentHead = git(["rev-parse", "HEAD"], root);
  const worktreeClean = git(["status", "--short"], root).length === 0;
  let attestationStatus = "NOT_ATTESTED";
  let reason;

  if (scope !== "web") {
    reason = "NO_CANONICAL_MOBILE_COVERAGE_ATTESTATION";
  } else if (requestedStatus !== "PASS") {
    reason = "COVERAGE_EXECUTION_NOT_ATTESTED";
  } else if (auditedSha !== currentHead) {
    reason = "AUDITED_SHA_IS_NOT_CURRENT_HEAD";
  } else if (!worktreeClean) {
    reason = "WORKTREE_NOT_CLEAN";
  } else if (!evidence) {
    reason = "COVERAGE_EVIDENCE_MISSING";
  } else if (evidenceSourceSha !== auditedSha) {
    reason = "COVERAGE_EVIDENCE_SHA_MISMATCH";
  } else {
    try {
      validateCoverageEvidence({ repositoryRoot: root });
      attestationStatus = "ATTESTED";
      reason = null;
    } catch {
      reason = "COVERAGE_EVIDENCE_INVALID_OR_INCOHERENT";
    }
  }

  return {
    status: attestationStatus === "ATTESTED" ? "AVAILABLE" : "PRESENT_NOT_ATTESTED",
    executionStatus: requestedStatus,
    attestationStatus,
    sourceSha: evidenceSourceSha,
    reason,
    summaryPath: relativeSummaryPath,
    summary,
  };
}

function coverageByDomain(root, scope, coverage, runtimeRecords) {
  const result = new Map();
  if (!coverage.summary) return result;
  for (const [file, row] of Object.entries(coverage.summary)) {
    if (file === "total") continue;
    const repoFile = normalizeCoverageFile(file, scope);
    const domain = runtimeRecords.get(repoFile)?.domain ?? sourceDomain(repoFile);
    if (!result.has(domain)) result.set(domain, { status: coverage.status, files: 0, metrics: emptyMetrics(), measuredFiles: [] });
    const entry = result.get(domain);
    entry.files += 1;
    entry.measuredFiles.push(repoFile);
    addCoverageRow(entry.metrics, row);
  }
  for (const entry of result.values()) entry.metrics = finalizeMetrics(entry.metrics);
  return result;
}

function runTestDuplication(root, auditedSha) {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-module-test-metrics-"));
  try {
    const observedSha = git(["rev-parse", "HEAD"], root);
    const worktreeClean = git(["status", "--short"], root).length === 0;
    const attestationStatus = observedSha === auditedSha && worktreeClean ? "ATTESTED" : "NOT_ATTESTED";
    const provenanceReason = attestationStatus === "ATTESTED"
      ? null
      : observedSha !== auditedSha
        ? "JSCPD_OBSERVED_ON_DIFFERENT_SHA"
        : "JSCPD_OBSERVED_ON_DIRTY_WORKTREE";
    const runner = path.join(root, "node_modules", "jscpd", "run-jscpd.js");
    const nativeBaseline = path.join(root, "scripts/checks/duplication-tests-baseline.json");
    const metricsBaseline = path.join(root, "scripts/checks/duplication-metrics-baseline.json");
    if (!fs.existsSync(runner)) return {
      status: "NOT_AVAILABLE",
      attestationStatus,
      observedSha,
      provenance: "working-tree",
      reason: "jscpd 5.3.0 is not installed.",
    };
    const result = spawnSync(process.execPath, [runner, ...buildJscpdArguments("tests", nativeBaseline, outputDirectory, "json,sarif")], { cwd: root, encoding: "utf8", windowsHide: true });
    const jsonPath = path.join(outputDirectory, "jscpd-report.json");
    const sarifPath = path.join(outputDirectory, "jscpd-report.sarif");
    if (!fs.existsSync(jsonPath) || !fs.existsSync(sarifPath)) return {
      status: "INVALID",
      attestationStatus,
      observedSha,
      provenance: "working-tree",
      provenanceReason,
      reason: "jscpd did not produce both reports.",
    };
    const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const sarif = JSON.parse(fs.readFileSync(sarifPath, "utf8"));
    const metrics = readJscpdMetrics(report);
    const fingerprints = readJscpdFingerprints(sarif);
    const occurrences = readJscpdOccurrences(report, sarif, "tests");
    const baselineData = JSON.parse(fs.readFileSync(metricsBaseline, "utf8"));
    return {
      status: result.status === 0 ? "AVAILABLE" : "AVAILABLE_WITH_TOOL_FAILURE",
      attestationStatus,
      observedSha,
      provenance: "working-tree",
      provenanceReason,
      metrics,
      fingerprints: [...fingerprints].sort((left, right) => left.localeCompare(right, "en")),
      occurrences,
      comparison: compareDuplicationMetrics(metrics, baselineData.scopes.tests, "tests"),
      toolExitCode: result.status,
    };
  } catch (error) {
    return {
      status: "INVALID",
      attestationStatus: "NOT_ATTESTED",
      provenance: "working-tree",
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}

function resolveOccurrencePath(value, records) {
  const normalized = normalize(value);
  const candidates = [
    normalized,
    `apps/web/src/${normalized}`,
    `apps/mobile/${normalized}`,
    `scripts/${normalized}`,
  ];
  return candidates.find((candidate) => records.has(candidate)) ?? normalized;
}

function duplicationByDomain(duplication, records) {
  const result = new Map();
  if (!duplication.occurrences) return result;
  for (const occurrence of duplication.occurrences) {
    const leftPath = resolveOccurrencePath(occurrence.occurrenceA.path, records);
    const rightPath = resolveOccurrencePath(occurrence.occurrenceB.path, records);
    const left = sourceDomain(leftPath);
    const right = sourceDomain(rightPath);
    const domain = left === right ? left : "cross-domain-tests";
    const entry = result.get(domain) ?? { clonePairs: 0, pairedLines: 0, testFiles: new Set() };
    entry.clonePairs += 1;
    entry.pairedLines += Math.max(0, occurrence.occurrenceA.endLine - occurrence.occurrenceA.startLine + 1)
      + Math.max(0, occurrence.occurrenceB.endLine - occurrence.occurrenceB.startLine + 1);
    entry.testFiles.add(leftPath);
    entry.testFiles.add(rightPath);
    result.set(domain, entry);
  }
  for (const entry of result.values()) entry.testFiles = [...entry.testFiles].sort((left, right) => left.localeCompare(right, "en"));
  return result;
}

function parseOption(args, name, fallback) {
  return args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
}

export function buildModuleTestMetrics({ root = process.cwd(), sourceSha = null, timestamp = new Date().toISOString(), webTestsStatus = "NOT_RUN", mobileTestsStatus = "NOT_RUN", webCoverageStatus = "NOT_RUN", mobileCoverageStatus = "NOT_RUN", webRatchetStatus = "NOT_RUN", mobileRatchetStatus = "NOT_RUN", duplicationPolicyStatus = "NOT_RUN", duplicationPolicyReason = null, testFilesModifiedStatus = "NOT_ATTESTED" } = {}) {
  const auditedSha = sourceSha ?? git(["rev-parse", "HEAD"], root);
  const sourceView = createGitRepositoryView(auditedSha, root);
  const files = listTrackedSourceFiles(sourceView);
  const records = readSourceFiles(sourceView, files);
  const { associated, importedByTests } = directTestAssociations(records);
  const domains = new Map();
  for (const record of records.values()) {
    if (!["runtime", "test"].includes(record.kind)) continue;
    const domain = record.kind === "test" && importedByTests.size > 0
      ? (() => {
        const importedDomains = record.imports.map((specifier) => resolveImport(record.file, specifier, new Set(records.keys())))
          .map((target) => target && records.get(target)?.kind === "runtime" ? records.get(target).domain : null)
          .filter(Boolean);
        return importedDomains.length === 1 ? importedDomains[0] : importedDomains.length > 1 ? "cross-domain-tests" : sourceDomain(record.file);
      })()
      : sourceDomain(record.file);
    const entry = domains.get(domain) ?? { runtimeFiles: 0, runtimeLines: 0, testFiles: 0, testLines: 0, runtimeFilesWithoutDirectTest: 0, runtimeFilesWithDirectTest: 0, runtimeFilesWithoutDirectTestExamples: [] };
    if (record.kind === "runtime") {
      entry.runtimeFiles += 1;
      entry.runtimeLines += record.lines;
      if (associated.has(record.file)) entry.runtimeFilesWithDirectTest += 1;
      else {
        entry.runtimeFilesWithoutDirectTest += 1;
        if (entry.runtimeFilesWithoutDirectTestExamples.length < 20) entry.runtimeFilesWithoutDirectTestExamples.push(record.file);
      }
    } else {
      entry.testFiles += 1;
      entry.testLines += record.lines;
    }
    domains.set(domain, entry);
  }

  const webCoverage = readCoverage(root, "web", webCoverageStatus, auditedSha);
  const mobileCoverage = readCoverage(root, "mobile", mobileCoverageStatus, auditedSha);
  const coverage = new Map([
    ...coverageByDomain(root, "web", webCoverage, records),
    ...coverageByDomain(root, "mobile", mobileCoverage, records),
  ]);
  const duplication = runTestDuplication(root, auditedSha);
  const duplicationDomains = duplicationByDomain(duplication, records);

  for (const [domain, entry] of domains) {
    entry.testRuntimeRatio = {
      files: entry.runtimeFiles > 0 ? Number((entry.testFiles / entry.runtimeFiles).toFixed(4)) : null,
      lines: entry.runtimeLines > 0 ? Number((entry.testLines / entry.runtimeLines).toFixed(4)) : null,
    };
    entry.coverage = coverage.get(domain) ? {
      status: coverage.get(domain).files > 0 ? coverage.get(domain).status : "NOT_AVAILABLE",
      files: coverage.get(domain).files,
      metrics: coverage.get(domain).metrics,
    } : { status: "NOT_RUN", files: 0, metrics: null };
    entry.testDuplication = duplicationDomains.get(domain) ?? { clonePairs: 0, pairedLines: 0, testFiles: [] };
    entry.runtimeFilesWithoutDirectTestExamples.sort((left, right) => left.localeCompare(right, "en"));
  }

  const totalRuntime = [...domains.values()].reduce((sum, entry) => sum + entry.runtimeFiles, 0);
  const totalTests = [...domains.values()].reduce((sum, entry) => sum + entry.testFiles, 0);
  const highPriority = ["auth-authz", "api", "actions", "account", "maps-location", "payments", "import-export", "learning", "spogomi", "mobile/services"]
    .filter((domain) => domains.has(domain));

  return {
    schemaVersion: MODULE_TEST_METRICS_SCHEMA_VERSION,
    sourceSha: auditedSha,
    timestamp,
    methodology: {
      source: "git-tracked-source-at-sourceSha",
      physicalLines: "UTF-8 lines after CRLF normalization; trailing split line retained, matching repository quality measurement.",
      runtimeFiles: "tracked source files under apps/web/src, apps/mobile and scripts, excluding tests and generated files",
      testFiles: "tracked files identified by tests/__tests__ paths or .test/.spec filename markers",
      directAssociation: "same-stem test beside the runtime file or a test import resolving directly to the runtime file; absence is not a coverage claim",
      coverageTruth: "coverage-summary.json grouped by the discovered domain; AVAILABLE requires canonical Web evidence for the audited sourceSha, a clean checkout and a PASS execution status; other summaries remain PRESENT_NOT_ATTESTED observations",
      testDuplication: "raw jscpd test-scope clone pairs measured from the checkout; the report records working-tree provenance and does not attribute the observation to sourceSha unless the checkout is clean at that SHA",
      provenance: "structural metrics are read from the exact Git tree at sourceSha; coverage and jscpd are checkout observations and are attested only when their candidate evidence matches sourceSha",
      noThresholdIntroduced: true,
    },
    discovery: {
      roots: SOURCE_ROOTS,
    domains: [...new Set([...domains.keys()])].sort((left, right) => left.localeCompare(right, "en")),
      highPriorityDomains: highPriority,
      domainAssignment: "current repository path organization with semantic path rules for web and top-level module rules for mobile/scripts",
    },
    totals: {
      runtimeFiles: totalRuntime,
      runtimeLines: [...domains.values()].reduce((sum, entry) => sum + entry.runtimeLines, 0),
      testFiles: totalTests,
      testLines: [...domains.values()].reduce((sum, entry) => sum + entry.testLines, 0),
      testRuntimeRatio: {
        files: totalRuntime > 0 ? Number((totalTests / totalRuntime).toFixed(4)) : null,
        lines: totalRuntime > 0 ? Number(([...domains.values()].reduce((sum, entry) => sum + entry.testLines, 0) / [...domains.values()].reduce((sum, entry) => sum + entry.runtimeLines, 0)).toFixed(4)) : null,
      },
    },
    execution: {
      webTests: webTestsStatus,
      mobileTests: mobileTestsStatus,
      webCoverage: {
        execution: webCoverage.executionStatus,
        ratchet: webRatchetStatus,
        status: webCoverage.status,
        attestation: webCoverage.attestationStatus,
        sourceSha: webCoverage.sourceSha,
        reason: webCoverage.reason,
      },
      mobileCoverage: {
        execution: mobileCoverage.executionStatus,
        ratchet: mobileRatchetStatus,
        status: mobileCoverage.status,
        attestation: mobileCoverage.attestationStatus,
        sourceSha: mobileCoverage.sourceSha,
        reason: mobileCoverage.reason,
      },
      duplication: { policy: duplicationPolicyStatus, reason: duplicationPolicyReason },
      testFilesModified: testFilesModifiedStatus,
    },
    duplication: {
      tests: duplication.status === "AVAILABLE" || duplication.status === "AVAILABLE_WITH_TOOL_FAILURE"
        ? {
          status: duplication.attestationStatus === "ATTESTED" ? duplication.status : "AVAILABLE_NOT_ATTESTED",
          attestation: duplication.attestationStatus,
          observedSha: duplication.observedSha,
          provenance: duplication.provenance,
          provenanceReason: duplication.provenanceReason,
          metrics: duplication.metrics,
          comparison: duplication.comparison,
          clonePairsByDomain: Object.fromEntries([...duplicationDomains.entries()].sort(([left], [right]) => left.localeCompare(right))),
        }
        : { ...duplication, attestation: duplication.attestationStatus ?? "NOT_ATTESTED" },
    },
    domains: Object.fromEntries([...domains.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function main(args = process.argv.slice(2)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const report = buildModuleTestMetrics({
    root,
    sourceSha: parseOption(args, "source-sha", null),
    timestamp: parseOption(args, "timestamp", new Date().toISOString()),
    webTestsStatus: parseOption(args, "web-tests", "NOT_RUN"),
    mobileTestsStatus: parseOption(args, "mobile-tests", "NOT_RUN"),
    webCoverageStatus: parseOption(args, "web-coverage", "NOT_RUN"),
    mobileCoverageStatus: parseOption(args, "mobile-coverage", "NOT_RUN"),
    webRatchetStatus: parseOption(args, "web-ratchet", "NOT_RUN"),
    mobileRatchetStatus: parseOption(args, "mobile-ratchet", "NOT_RUN"),
    duplicationPolicyStatus: parseOption(args, "duplication-policy", "NOT_RUN"),
    duplicationPolicyReason: parseOption(args, "duplication-reason", null),
    testFilesModifiedStatus: parseOption(args, "test-files-modified", "NOT_ATTESTED"),
  });
  const output = path.resolve(root, parseOption(args, "output", MODULE_TEST_METRICS_OUTPUT));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`MODULE_TEST_METRICS_SHA: ${report.sourceSha}`);
  console.log(`MODULE_TEST_METRICS_OUTPUT: ${output}`);
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
