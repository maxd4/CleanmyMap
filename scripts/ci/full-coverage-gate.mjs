#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  REPORT_DEFINITIONS,
  validateSonarCoverageReports,
} from "../checks/prepare-sonarqube-coverage.mjs";
import { validateCoveragePublicationProof } from "./coverage-publication.mjs";

const REQUIRED_JOBS = Object.freeze([
  "web-tests",
  "web-coverage",
  "mobile-validation",
  "node-coverage",
  "python-validation",
]);

function assertCandidateSha(candidateSha) {
  if (!/^[0-9a-f]{40}$/i.test(String(candidateSha ?? ""))) {
    throw new Error(`FULL coverage gate requires a full candidate SHA (received ${candidateSha || "<missing>"}).`);
  }
  return candidateSha;
}

export function parseCoverageJobResults(value) {
  if (typeof value === "object" && value !== null) return value;
  try {
    const parsed = JSON.parse(String(value ?? ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new Error("FULL coverage gate received no valid GitHub needs result set.");
  }
}

export function assertFullCoverageJobs(jobResults) {
  const results = parseCoverageJobResults(jobResults);
  const failures = [];
  for (const jobId of REQUIRED_JOBS) {
    const result = results[jobId]?.result;
    if (result !== "success") failures.push(`${jobId}=${result ?? "NOT_RUN"}`);
  }
  if (failures.length > 0) {
    throw new Error(`FULL coverage gate rejected incomplete or unsuccessful jobs: ${failures.join(", ")}.`);
  }
  return REQUIRED_JOBS.map((jobId) => ({ jobId, status: results[jobId].result }));
}

export function validateFullCoverageArtifacts({
  repositoryRoot = process.cwd(),
  candidateSha,
  jobResults,
  validateProof = validateCoveragePublicationProof,
  validateReports = validateSonarCoverageReports,
} = {}) {
  const sha = assertCandidateSha(candidateSha);
  assertFullCoverageJobs(jobResults);
  const reports = [];
  for (const definition of REPORT_DEFINITIONS) {
    const proof = validateProof({ repositoryRoot, candidateSha: sha, scope: definition.scope });
    const validated = validateReports({ root: repositoryRoot, reports: [definition], write: false });
    reports.push({
      scope: definition.scope,
      proof: proof.proof ?? proof,
      validation: validated[0],
    });
  }
  return { candidateSha: sha, jobs: REQUIRED_JOBS, reports };
}

function main() {
  const candidateSha = process.env.CANDIDATE_SHA;
  const jobResults = process.env.FULL_COVERAGE_RESULTS;
  try {
    const result = validateFullCoverageArtifacts({
      repositoryRoot: process.cwd(),
      candidateSha,
      jobResults,
    });
    console.log(`FULL_COVERAGE_GATE: PASS (${result.reports.map((report) => report.scope).join(", ")})`);
    console.log(`CANDIDATE_SHA: ${result.candidateSha}`);
  } catch (error) {
    console.error(`FULL_COVERAGE_GATE: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
