#!/usr/bin/env node

import { ESLint } from "eslint";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  baselineKey,
  classifyComplexityCategory,
  compareLegacyValue,
  COMPLEXITY_THRESHOLDS,
  createFunctionIdentityResolver,
  evaluateNewMetric,
  FUNCTION_LENGTH_THRESHOLDS,
  validateBaselineShape,
} from "./complexity-policy.mjs";

const repositoryRoot = process.cwd();
const webRoot = path.join(repositoryRoot, "apps", "web");
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "complexity-baseline.json");
const args = new Set(process.argv.slice(2));
const changedOnly = args.has("--changed-only");

function normalizeRepositoryPath(file) {
  return file.replaceAll("\\", "/");
}

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function currentCommit() {
  return git(["rev-parse", "HEAD"]);
}

function assertBaselineFresh(baseline) {
  validateBaselineShape(baseline);
  const head = currentCommit();
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error(`complexity baseline stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
}

function sourcePath(absolute) {
  return normalizeRepositoryPath(path.relative(webRoot, absolute));
}

function parseChangedRanges() {
  const ranges = new Map();
  const diff = execFileSync("git", ["diff", "--unified=0", baselineSourceCommit, "--", "apps/web/src"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  let currentPath = null;
  for (const line of diff.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentPath = normalizeRepositoryPath(fileMatch[1]).replace(/^apps\/web\//, "");
      continue;
    }
    const hunk = line.match(/^@@ .* \+(\d+)(?:,(\d+))? @@/);
    if (!currentPath || !hunk) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count > 0) {
      if (!ranges.has(currentPath)) ranges.set(currentPath, []);
      ranges.get(currentPath).push({ start, end: start + count - 1 });
    }
  }

  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "apps/web/src"])
    .split(/\r?\n/).filter(Boolean)
    .map(normalizeRepositoryPath)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => file.replace(/^apps\/web\//, ""));
  for (const file of untracked) ranges.set(file, [{ start: 1, end: Number.MAX_SAFE_INTEGER }]);
  return ranges;
}

function intersectsChangedLines(ranges, pathName, start, end) {
  return (ranges.get(pathName) ?? []).some((range) => range.start <= end && range.end >= start);
}

function parseFunctionMessages(results) {
  const metrics = [];
  for (const result of results) {
    const file = sourcePath(result.filePath);
    const source = fs.readFileSync(result.filePath, "utf8");
    const resolveFunctionIdentity = createFunctionIdentityResolver(file, source);
    for (const message of result.messages) {
      const complexity = message.ruleId === "complexity" && message.message.match(/complexity of (\d+)/i);
      const functionLength = message.ruleId === "max-lines-per-function" && message.message.match(/too many lines \((\d+)\)/i);
      if (!complexity && !functionLength) continue;
      const metric = complexity ? "complexity" : "functionLength";
      const functionIdentity = resolveFunctionIdentity(message.line, message.message);
      metrics.push({
        metric,
        path: file,
        functionIdentity,
        line: message.line,
        endLine: message.endLine ?? message.line,
        value: Number((complexity ?? functionLength)[1]),
        category: classifyComplexityCategory(file),
        key: baselineKey(metric, file, functionIdentity),
      });
    }
  }
  return metrics;
}

function baselineEntriesByKey(baseline) {
  return new Map(baseline.entries.map((entry) => [baselineKey(entry.metric, entry.path, entry.functionIdentity), entry]));
}

function evaluateMetrics({ metrics, baseline, changedRanges }) {
  const baselineByKey = baselineEntriesByKey(baseline);
  const currentByKey = new Map();
  const failures = [];
  const reviews = [];
  const improvements = [];

  for (const metric of metrics) {
    currentByKey.set(metric.key, metric.value);
    const entry = baselineByKey.get(metric.key);
    const changed = intersectsChangedLines(changedRanges, metric.path, metric.line, metric.endLine);
    if (entry) {
      const result = compareLegacyValue(metric.value, entry.ceiling);
      if (result.status === "FAIL") failures.push({ ...metric, reason: result.reason, ceiling: entry.ceiling });
      if (result.status === "IMPROVEMENT") improvements.push({ ...metric, ceiling: entry.ceiling });
      continue;
    }
    if (!entry && !changed && metric.value > (metric.metric === "complexity" ? COMPLEXITY_THRESHOLDS[metric.category]?.target : FUNCTION_LENGTH_THRESHOLDS[metric.category]?.target ?? Number.MAX_SAFE_INTEGER)) {
      failures.push({ ...metric, reason: "baseline missing for an existing historical violation" });
      continue;
    }
    const result = evaluateNewMetric(metric.metric, metric.category, metric.value);
    if (result.status === "FAIL") failures.push({ ...metric, reason: result.reason, limit: result.limit });
    if (result.status === "REVIEW") reviews.push({ ...metric, reason: "above target but below blocking threshold" });
  }

  const stale = [];
  for (const entry of baseline.entries) {
    const current = currentByKey.get(baselineKey(entry.metric, entry.path, entry.functionIdentity));
    if (current === undefined) stale.push(entry);
  }
  return { failures, reviews, improvements, stale };
}

const baselineSourceCommit = (() => {
  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8")).sourceCommit;
  } catch {
    return null;
  }
})();

async function main() {
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    assertBaselineFresh(baseline);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const changedRanges = parseChangedRanges();
  if (changedOnly && changedRanges.size === 0) {
    console.log("PASS: no changed apps/web/src files for targeted complexity policy.");
    return;
  }

  const appConfig = (await import(pathToFileURL(path.join(webRoot, "eslint.config.mjs")).href)).default;
  const eslint = new ESLint({
    cwd: webRoot,
    overrideConfigFile: true,
    overrideConfig: [
      ...appConfig,
      {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
          complexity: ["error", 0],
          "max-lines-per-function": ["error", { max: 0, skipBlankLines: true, skipComments: true }],
        },
      },
    ],
  });
  const lintTargets = changedOnly
    ? [...changedRanges.keys()].filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => `src/${file.replace(/^src\//, "")}`)
    : ["src/**/*.{ts,tsx}"];
  const lintResults = await eslint.lintFiles(lintTargets);
  const metrics = parseFunctionMessages(lintResults);
  const result = evaluateMetrics({ metrics, baseline, changedRanges });

  console.log(`Complexity policy: ${metrics.length} function metrics measured.`);
  if (result.reviews.length > 0) console.log(`REVIEW_REQUIRED: ${result.reviews.length} review signals.`);
  if (result.improvements.length > 0) console.log(`IMPROVEMENT_AVAILABLE: ${result.improvements.length} lower measurements; update the baseline explicitly to acquire them.`);
  if (result.stale.length > 0) {
    console.error(`BASELINE_STALE: ${result.stale.length} entries no longer match measured functions.`);
    for (const entry of result.stale.slice(0, 20)) console.error(` - ${entry.metric}:${entry.path}:${entry.line ?? ""}`);
  }
  if (result.failures.length > 0) {
    console.error(`FAIL: ${result.failures.length} complexity/length ratchet violations.`);
    for (const failure of result.failures.slice(0, 40)) console.error(` - ${failure.metric}:${failure.path}:${failure.line ?? ""} value=${failure.value ?? failure.lines} reason=${failure.reason}`);
    process.exitCode = 1;
    return;
  }
  if (result.stale.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("PASS: new-code thresholds and legacy ceilings respected.");
}

await main();
