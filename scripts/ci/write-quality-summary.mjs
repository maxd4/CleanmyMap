#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  QUALITY_EVIDENCE_RELATIVE_ROOT,
  QUALITY_EVIDENCE_SCHEMA_VERSION,
  QUALITY_EVIDENCE_STATUSES,
  readQualityEvidence,
  resolveCandidateSha,
  validateQualityEvidenceForGate,
} from "../checks/quality-evidence.mjs";

const repositoryRoot = process.cwd();
const EXPECTED_GATES = [
  { key: "dead-code", label: "dead-code", fileKey: "dead-code" },
  { key: "complexity", label: "complexity", fileKey: "complexity" },
  { key: "duplication-runtime", label: "duplication/runtime", fileKey: "duplication-runtime" },
  { key: "duplication-tests", label: "duplication/tests", fileKey: "duplication-tests" },
  { key: "duplication-fixtures-data", label: "duplication/fixtures-data", fileKey: "duplication-fixtures-data" },
  { key: "cycles", label: "cycles", fileKey: "cycles" },
];

function display(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function evidenceIsUsable(evidence, candidateSha) {
  return Boolean(
    evidence
      && evidence.schemaVersion === QUALITY_EVIDENCE_SCHEMA_VERSION
      && evidence.candidateSha === candidateSha
      && evidence.executed === true
      && QUALITY_EVIDENCE_STATUSES.includes(evidence.status)
      && evidence.status !== "NOT_RUN",
  );
}

export function validateQualityEvidence({
  candidateSha,
  evidenceByKey,
  repositoryRoot = process.cwd(),
  gitRunner,
}) {
  const failures = [];
  if (!/^[0-9a-f]{40}$/i.test(candidateSha ?? "")) {
    failures.push(`candidate SHA is invalid: ${candidateSha ?? "<missing>"}`);
    return failures;
  }

  for (const gate of EXPECTED_GATES) {
    const evidence = evidenceByKey[gate.key];
    for (const failure of validateQualityEvidenceForGate({
      evidence,
      candidateSha,
      repositoryRoot,
      gitRunner,
    })) failures.push(`${gate.label}: ${failure}`);
  }
  return failures;
}

function rowForGate(gate, evidence, candidateSha) {
  if (!evidenceIsUsable(evidence, candidateSha)) {
    return { gate: gate.label, status: "NOT_RUN", current: "—", delta: "—", newFindings: "—" };
  }
  const metrics = evidence.metrics ?? {};
  if (gate.key === "dead-code") {
    return {
      gate: gate.label,
      status: evidence.status,
      current: `current ${display(metrics.currentFindings)}, historical ${display(metrics.historicalActionable)}`,
      delta: `resolved ${display(evidence.resolvedFindings)}`,
      newFindings: display(evidence.newFindings),
    };
  }
  if (gate.key === "complexity") {
    return {
      gate: gate.label,
      status: evidence.status,
      current: `${display(metrics.measuredFunctions)} functions; ${display(metrics.violations)} violations; ${display(metrics.baselineStale)} stale`,
      delta: `improvements ${display(metrics.improvementsDetected)}`,
      newFindings: display(evidence.newFindings),
    };
  }
  if (gate.key.startsWith("duplication-")) {
    return {
      gate: gate.label,
      status: evidence.status,
      current: `${display(metrics.clones)} clones / ${display(metrics.duplicatedLines)} lines / ${display(metrics.duplicatedTokens)} tokens (${display(metrics.percentage, "%")})`,
      delta: `${display(metrics.deltaDuplicatedLines)} lines / ${display(metrics.deltaDuplicatedTokens)} tokens / ${display(metrics.deltaLinePercentagePoints, " pp")}`,
      newFindings: display(evidence.newFindings),
    };
  }
  return {
    gate: gate.label,
    status: evidence.status,
    current: `${display(metrics.currentCycles)} current; ${display(metrics.baselineStale)} stale`,
    delta: `new ${display(metrics.newCycles)}`,
    newFindings: display(evidence.newFindings),
  };
}

function baselineIdentity(evidence) {
  if (!evidence?.baseline) return null;
  const values = Object.entries(evidence.baseline)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  return values.length > 0 ? `${evidence.gate}${evidence.scope ? `/${evidence.scope}` : ""}: ${values.join(", ")}` : null;
}

export function buildQualitySummary({ candidateSha, evidenceByKey }) {
  const rows = EXPECTED_GATES.map((gate) => rowForGate(gate, evidenceByKey[gate.key], candidateSha));
  const identities = EXPECTED_GATES.map((gate) => baselineIdentity(evidenceByKey[gate.key])).filter(Boolean);
  const lines = [
    "## Web quality evidence",
    "",
    `Candidate SHA: \`${candidateSha}\``,
    "",
    "Evidence is projected from the single execution of each gate; missing, malformed, or mismatched evidence is `NOT_RUN`.",
    "",
    "| Gate | Status | Current | Delta | New findings |",
    "| --- | --- | --- | --- | ---: |",
    ...rows.map((row) => `| ${row.gate} | ${row.status} | ${row.current} | ${row.delta} | ${row.newFindings} |`),
    "",
    `Baseline identities: ${identities.length > 0 ? identities.join("; ") : "NOT_RUN"}`,
    "",
  ];
  return lines.join("\n");
}

export function collectQualityEvidence({ repositoryRoot: root = repositoryRoot, evidenceRoot = process.env.QUALITY_EVIDENCE_ROOT ?? QUALITY_EVIDENCE_RELATIVE_ROOT }) {
  return Object.fromEntries(EXPECTED_GATES.map((gate) => [gate.key, readQualityEvidence({ repositoryRoot: root, evidenceRoot, fileKey: gate.fileKey })]));
}

function appendSummary(summaryPath, content) {
  if (summaryPath) fs.appendFileSync(summaryPath, `${content}\n`, "utf8");
  else process.stdout.write(content);
}

async function main() {
  let candidateSha = "unavailable";
  let evidence = {};
  try {
    candidateSha = resolveCandidateSha(repositoryRoot);
    evidence = collectQualityEvidence({});
    appendSummary(process.env.GITHUB_STEP_SUMMARY, buildQualitySummary({ candidateSha, evidenceByKey: evidence }));
    const failures = validateQualityEvidence({ candidateSha, evidenceByKey: evidence, repositoryRoot });
    if (failures.length > 0) {
      console.error("Web quality ratchet summary failed:");
      for (const failure of failures) console.error(`- ${failure}`);
      process.exitCode = 1;
    }
  } catch (error) {
    const fallback = `## Web quality evidence\n\nSummary unavailable: ${error instanceof Error ? error.message : String(error)}\n`;
    try { appendSummary(process.env.GITHUB_STEP_SUMMARY, fallback); } catch { process.stdout.write(fallback); }
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) await main();
