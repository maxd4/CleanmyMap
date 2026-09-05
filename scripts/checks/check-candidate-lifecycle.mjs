#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findCandidateResidues } from "../ci/candidate-lifecycle.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = new URL("./candidate-lifecycle-baseline.json", import.meta.url);

function loadBaseline() {
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function relativePath(repositoryRoot, value) {
  return path.relative(repositoryRoot, value).replaceAll("\\", "/");
}

function baselinePaths(entries = []) {
  return entries.map((entry) => (typeof entry === "string" ? entry : entry.path));
}

function newEntries(entries, baselineEntries) {
  const baseline = new Set(baselineEntries);
  return entries.filter((entry) => !baseline.has(entry));
}

export function buildCandidateLifecycleReport(repositoryRoot, baseline) {
  const residues = findCandidateResidues(repositoryRoot);
  const configuredBaseline = baseline ?? { version: 1, legacy: {} };
  const legacy = configuredBaseline.legacy ?? {};
  const generatedCandidates = residues.generated.map((value) => relativePath(repositoryRoot, value));
  const unknownCanonicalEntries = residues.unknown.map((value) => relativePath(repositoryRoot, value));
  const adHocEntries = residues.adHoc.map((value) => relativePath(repositoryRoot, value));
  const legacyGeneratedCandidates = baselinePaths(legacy.generatedCandidates);
  const legacyUnknownCanonicalEntries = baselinePaths(legacy.unknownCanonicalEntries);
  const legacyAdHocEntries = baselinePaths(legacy.adHocEntries);

  return {
    validationRoot: relativePath(repositoryRoot, residues.validationRoot),
    baseline: {
      generatedCandidates: legacyGeneratedCandidates,
      unknownCanonicalEntries: legacyUnknownCanonicalEntries,
      adHocEntries: legacyAdHocEntries,
    },
    generatedCandidates,
    unknownCanonicalEntries,
    adHocEntries,
    newGeneratedCandidates: newEntries(generatedCandidates, legacyGeneratedCandidates),
    newUnknownCanonicalEntries: newEntries(unknownCanonicalEntries, legacyUnknownCanonicalEntries),
    newAdHocEntries: newEntries(adHocEntries, legacyAdHocEntries),
  };
}

export function getStrictViolations(report) {
  return {
    generatedCandidates: report.newGeneratedCandidates,
    unknownCanonicalEntries: report.newUnknownCanonicalEntries,
    adHocEntries: report.newAdHocEntries,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes("--strict");
  const report = buildCandidateLifecycleReport(repositoryRoot, loadBaseline());
  const strictViolations = getStrictViolations(report);

  console.log(JSON.stringify({ ...report, strictViolations }, null, 2));

  const violationCount = Object.values(strictViolations).reduce(
    (total, entries) => total + entries.length,
    0,
  );
  if (strict && violationCount > 0) {
    console.error(
      `Strict candidate lifecycle check failed: ${violationCount} new residue(s) detected; no deletion was attempted.`,
    );
    process.exitCode = 1;
  } else if (report.adHocEntries.length > 0) {
    console.warn(
      `Candidate cleanup check reported ${report.adHocEntries.length} ad hoc validation entr${report.adHocEntries.length === 1 ? "y" : "ies"}; no deletion was attempted.`,
    );
  }
}
