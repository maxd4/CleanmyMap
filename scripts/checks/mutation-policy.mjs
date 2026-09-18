import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const MUTATION_POLICY_VERSION = 1;
export const MUTATION_TOOL = "stryker";
export const MUTATION_TOOL_VERSION = "10.0.0";
export const MUTATION_RUNNER_VERSION = "10.0.0";
export const MUTATION_STATUSES = Object.freeze([
  "Killed",
  "Survived",
  "NoCoverage",
  "Timeout",
  "error",
]);

export function normalizeMutationStatus(status) {
  if (status === "Killed" || status === "Survived" || status === "NoCoverage" || status === "Timeout") {
    return status;
  }
  return "error";
}

export function getMutationScope(config) {
  if (!config || !Array.isArray(config.mutate) || !Array.isArray(config.testFiles)) {
    throw new Error("Mutation configuration malformed: mutate and testFiles are required.");
  }
  return {
    mutate: [...config.mutate],
    testFiles: [...config.testFiles],
  };
}

export function mutationScopeFingerprint(config) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      policyVersion: MUTATION_POLICY_VERSION,
      tool: MUTATION_TOOL,
      toolVersion: MUTATION_TOOL_VERSION,
      runnerVersion: MUTATION_RUNNER_VERSION,
      scope: getMutationScope(config),
    }))
    .digest("hex");
}

function emptyCounts() {
  return Object.fromEntries(MUTATION_STATUSES.map((status) => [status, 0]));
}

function scoreForCounts(counts) {
  const executable = counts.Killed + counts.Survived + counts.Timeout + counts.error;
  return executable === 0 ? 100 : (counts.Killed / executable) * 100;
}

function summarizeMutants(mutants) {
  const counts = emptyCounts();
  for (const mutant of mutants) counts[normalizeMutationStatus(mutant.status)] += 1;
  return {
    total: mutants.length,
    counts,
    score: scoreForCounts(counts),
  };
}

export function summarizeMutationReport(report) {
  if (!report || typeof report !== "object" || !report.files || typeof report.files !== "object") {
    throw new Error("Mutation report malformed: files are required.");
  }
  const byFile = Object.fromEntries(
    Object.entries(report.files).map(([file, entry]) => {
      if (!Array.isArray(entry?.mutants)) throw new Error(`Mutation report malformed: mutants missing for ${file}.`);
      return [file, summarizeMutants(entry.mutants)];
    }),
  );
  const mutants = Object.values(report.files).flatMap((entry) => entry.mutants);
  const summary = summarizeMutants(mutants);
  return { ...summary, files: byFile };
}

function assertInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Mutation baseline malformed: ${label} must be a non-negative integer.`);
}

function validateSummary(summary, label) {
  if (!summary || typeof summary !== "object" || !summary.counts) throw new Error(`Mutation baseline malformed: ${label} summary missing.`);
  for (const status of MUTATION_STATUSES) assertInteger(summary.counts[status], `${label}.${status}`);
  assertInteger(summary.total, `${label}.total`);
  if (summary.total !== Object.values(summary.counts).reduce((sum, value) => sum + value, 0)) {
    throw new Error(`Mutation baseline malformed: ${label}.total does not match counts.`);
  }
  if (typeof summary.score !== "number" || summary.score < 0 || summary.score > 100) {
    throw new Error(`Mutation baseline malformed: ${label}.score is invalid.`);
  }
}

export function validateMutationBaseline(baseline, config) {
  if (!baseline || baseline.schemaVersion !== MUTATION_POLICY_VERSION) {
    throw new Error("Mutation baseline malformed: unsupported schemaVersion.");
  }
  if (baseline.tool !== MUTATION_TOOL || baseline.toolVersion !== MUTATION_TOOL_VERSION || baseline.runnerVersion !== MUTATION_RUNNER_VERSION) {
    throw new Error("Mutation baseline stale: tool or runner version mismatch.");
  }
  if (typeof baseline.sourceCommit !== "string" || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) {
    throw new Error("Mutation baseline malformed: full sourceCommit required.");
  }
  if (baseline.scopeFingerprint !== mutationScopeFingerprint(config)) {
    throw new Error("Mutation baseline stale: mutation scope changed.");
  }
  validateSummary(baseline.summary, "summary");
  const scope = getMutationScope(config);
  for (const file of scope.mutate.map((entry) => entry.split(":", 1)[0])) {
    if (!baseline.files?.[file]) throw new Error(`Mutation baseline malformed: missing file ${file}.`);
    validateSummary(baseline.files[file], `files.${file}`);
  }
  return baseline;
}

export function assertMutationBaselineFresh(baseline, { currentCommit, repositoryRoot }) {
  const head = currentCommit ?? execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error(`Mutation baseline stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
  return head;
}

function scoreDecreased(current, baseline) {
  const currentExecutable = current.counts.Killed + current.counts.Survived + current.counts.Timeout + current.counts.error;
  const baselineExecutable = baseline.counts.Killed + baseline.counts.Survived + baseline.counts.Timeout + baseline.counts.error;
  return current.counts.Killed * baselineExecutable < baseline.counts.Killed * currentExecutable;
}

export function compareMutationSummary(current, baseline) {
  const failures = [];
  if (scoreDecreased(current, baseline)) failures.push(`mutation score decreased from ${baseline.score.toFixed(2)}% to ${current.score.toFixed(2)}%`);
  if (current.counts.NoCoverage > baseline.counts.NoCoverage) failures.push(`no coverage increased from ${baseline.counts.NoCoverage} to ${current.counts.NoCoverage}`);
  if (current.counts.Timeout > 0) failures.push(`${current.counts.Timeout} mutant(s) timed out`);
  if (current.counts.error > 0) failures.push(`${current.counts.error} mutant execution error(s)`);
  return failures;
}

export function compareMutationReport(current, baseline) {
  const failures = compareMutationSummary(current, baseline.summary);
  for (const [file, baselineFile] of Object.entries(baseline.files)) {
    const currentFile = current.files[file];
    if (!currentFile) {
      failures.push(`mutation report missing baseline file ${file}`);
      continue;
    }
    failures.push(...compareMutationSummary(currentFile, baselineFile).map((failure) => `${file}: ${failure}`));
  }
  return failures;
}
