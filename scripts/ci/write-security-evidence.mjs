#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveCandidateShaFromRef,
  writeQualityEvidence,
} from "../checks/quality-evidence.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SECURITY_EVIDENCE_ROOT = process.env.SECURITY_EVIDENCE_ROOT ?? "artifacts/security-evidence";

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const gate = argument("gate");
const status = argument("status");
const candidateRef = argument("candidate-ref", process.env.CANDIDATE_SHA ?? "HEAD");
if (gate !== "dependencies" || status !== "SKIPPED_BY_SCOPE") {
  throw new Error("This scope evidence writer only records the dependency SKIPPED_BY_SCOPE contract.");
}

const candidateSha = resolveCandidateShaFromRef(repositoryRoot, candidateRef);
writeQualityEvidence({
  repositoryRoot,
  evidenceRoot: SECURITY_EVIDENCE_ROOT,
  fileKey: "dependency-advisory",
  gate,
  candidateSha,
  candidateRef,
  status,
  findings: null,
  metrics: { dependencyGraphChanged: false },
  details: { reason: "dependency graph unchanged" },
});
