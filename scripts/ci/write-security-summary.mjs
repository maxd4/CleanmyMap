#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  QUALITY_EVIDENCE_SCHEMA_VERSION,
  QUALITY_EVIDENCE_STATUSES,
  readQualityEvidence,
  resolveCandidateSha,
} from "../checks/quality-evidence.mjs";

const repositoryRoot = process.cwd();
const SECURITY_EVIDENCE_ROOT = process.env.SECURITY_EVIDENCE_ROOT ?? "artifacts/security-evidence";
const GATES = Object.freeze([
  { key: "secrets", label: "Secrets", fileKey: "secret-audit" },
  { key: "github-actions-security", label: "GitHub Actions", fileKey: "github-actions-security" },
  { key: "semgrep-architectural", label: "Semgrep architectural", fileKey: "semgrep-architectural" },
  { key: "semgrep-fixtures", label: "Semgrep fixtures", fileKey: "semgrep-fixtures" },
  { key: "dependencies", label: "Dependencies", fileKey: "dependency-advisory" },
]);

function parseGateKeys(argv) {
  const argument = argv.find((value) => value.startsWith("--gates="));
  if (!argument) return GATES.map((gate) => gate.key);
  const requested = argument.slice("--gates=".length).split(",").map((value) => value.trim()).filter(Boolean);
  const known = new Set(GATES.map((gate) => gate.key));
  if (requested.some((gate) => !known.has(gate))) throw new Error(`Unknown security summary gate: ${requested.find((gate) => !known.has(gate))}`);
  return requested;
}

function display(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function isUsable(evidence, candidateSha) {
  return Boolean(
    evidence
      && evidence.schemaVersion === QUALITY_EVIDENCE_SCHEMA_VERSION
      && evidence.candidateSha === candidateSha
      && QUALITY_EVIDENCE_STATUSES.includes(evidence.status),
  );
}

function currentForGate(gate, evidence) {
  if (!evidence) return "—";
  const metrics = evidence.metrics ?? {};
  if (gate.key === "secrets") return `${display(evidence.findings)} finding(s)`;
  if (gate.key === "github-actions-security") return `${display(metrics.workflowCount)} workflows / ${display(metrics.issueCount)} issue(s)`;
  if (gate.key === "semgrep-architectural") return `${display(metrics.blockingFindings ?? evidence.findings)} blocking finding(s)`;
  if (gate.key === "semgrep-fixtures") return `${display(metrics.fixturesPassed)} fixture(s) tested`;
  if (evidence.status === "SKIPPED_BY_SCOPE") return "dependency graph unchanged";
  return `${display(metrics.highCriticalFindings)} high/critical / ${display(metrics.unmitigatedHighCritical)} unmitigated`;
}

export function buildSecuritySummary({ candidateSha, evidenceByKey, gateKeys = GATES.map((gate) => gate.key) }) {
  const selectedGates = GATES.filter((gate) => gateKeys.includes(gate.key));
  const rows = selectedGates.map((gate) => {
    const evidence = evidenceByKey[gate.key];
    const usable = isUsable(evidence, candidateSha);
    return `| ${gate.label} | ${usable ? evidence.status : "NOT_RUN"} | ${usable ? currentForGate(gate, evidence) : "—"} |`;
  });
  return [
    "## Security evidence",
    "",
    `Candidate: \`${candidateSha}\``,
    "",
    "Each row is the result of the existing control execution; no security score is computed.",
    "",
    "| Control | Status | Observed |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export function collectSecurityEvidence({ repositoryRoot: root = repositoryRoot, evidenceRoot = SECURITY_EVIDENCE_ROOT, gateKeys = GATES.map((gate) => gate.key) }) {
  return Object.fromEntries(
    GATES.filter((gate) => gateKeys.includes(gate.key)).map((gate) => [
      gate.key,
      readQualityEvidence({ repositoryRoot: root, evidenceRoot, fileKey: gate.fileKey }),
    ]),
  );
}

function appendSummary(summaryPath, content) {
  if (summaryPath) fs.appendFileSync(summaryPath, `${content}\n`, "utf8");
  else process.stdout.write(content);
}

async function main() {
  try {
    const gateKeys = parseGateKeys(process.argv.slice(2));
    let candidateSha;
    try {
      candidateSha = resolveCandidateSha(repositoryRoot);
    } catch {
      candidateSha = "unavailable";
    }
    const evidence = candidateSha === "unavailable" ? {} : collectSecurityEvidence({ gateKeys });
    appendSummary(process.env.GITHUB_STEP_SUMMARY, buildSecuritySummary({ candidateSha, evidenceByKey: evidence, gateKeys }));
  } catch (error) {
    const fallback = `## Security evidence\n\nSummary unavailable: ${error instanceof Error ? error.message : String(error)}\n`;
    try { appendSummary(process.env.GITHUB_STEP_SUMMARY, fallback); } catch { process.stdout.write(fallback); }
  }
  process.exitCode = 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) await main();
