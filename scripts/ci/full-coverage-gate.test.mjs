import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFullCoverageJobs,
  parseCoverageJobResults,
  validateFullCoverageArtifacts,
} from "./full-coverage-gate.mjs";

const successJobs = Object.fromEntries([
  ["web-tests", "success"],
  ["web-coverage", "success"],
  ["mobile-validation", "success"],
  ["node-coverage", "success"],
  ["python-validation", "success"],
].map(([id, result]) => [id, { result }]));

test("FULL requires Web, mobile, Node and Python jobs to succeed", () => {
  assert.equal(assertFullCoverageJobs(successJobs).length, 5);
  for (const failedJob of ["web-tests", "web-coverage", "mobile-validation", "node-coverage", "python-validation"]) {
    const jobs = structuredClone(successJobs);
    jobs[failedJob].result = "failure";
    assert.throws(() => assertFullCoverageJobs(jobs), new RegExp(failedJob));
  }
});

test("FULL rejects skipped, cancelled, missing and malformed job results", () => {
  for (const status of ["skipped", "cancelled", undefined]) {
    const jobs = structuredClone(successJobs);
    if (status === undefined) delete jobs["node-coverage"];
    else jobs["node-coverage"].result = status;
    assert.throws(() => assertFullCoverageJobs(jobs), /node-coverage/);
  }
  assert.throws(() => parseCoverageJobResults("not-json"), /valid GitHub needs/);
});

test("FULL validates each canonical report exactly once after job success", () => {
  const proofCalls = [];
  const reportCalls = [];
  const result = validateFullCoverageArtifacts({
    candidateSha: "a".repeat(40),
    jobResults: successJobs,
    validateProof: ({ scope }) => {
      proofCalls.push(scope);
      return { proof: { candidateSha: "a".repeat(40), scope } };
    },
    validateReports: ({ reports }) => {
      reportCalls.push(reports[0].scope);
      return [{ scope: reports[0].scope, files: 1 }];
    },
  });
  assert.deepEqual(proofCalls, ["web", "mobile", "node", "python"]);
  assert.deepEqual(reportCalls, proofCalls);
  assert.equal(result.reports.length, 4);
});

test("FULL keeps report, provenance and artifact failures fail-closed", () => {
  for (const failure of [
    new Error("report is missing"),
    new Error("report is empty"),
    new Error("report changed or falsified"),
    new Error("not attached to the analyzed SHA/run"),
  ]) {
    assert.throws(
      () => validateFullCoverageArtifacts({
        candidateSha: "b".repeat(40),
        jobResults: successJobs,
        validateProof: () => { throw failure; },
        validateReports: () => [{ scope: "web", files: 1 }],
      }),
      new RegExp(failure.message.split(" ")[0]),
    );
  }
});
