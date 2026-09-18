#!/usr/bin/env node

import { ESLint } from "eslint";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  baselineKey,
  classifyComplexityCategory,
  classifyFileKind,
  compareLegacyValue,
  COMPLEXITY_THRESHOLDS,
  evaluateNewMetric,
  evaluateNewFileLength,
  FILE_LENGTH_THRESHOLDS,
  FUNCTION_LENGTH_THRESHOLDS,
  validateBaselineShape,
} from "./complexity-policy.mjs";
import { measureContent } from "./top-heavy-measurement.mjs";

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

function walkSourceFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!new Set([".next", "generated", "vendor", "node_modules"]).has(entry.name)) walkSourceFiles(absolute, result);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) result.push(absolute);
  }
  return result;
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
    for (const message of result.messages) {
      const complexity = message.ruleId === "complexity" && message.message.match(/complexity of (\d+)/i);
      const functionLength = message.ruleId === "max-lines-per-function" && message.message.match(/too many lines \((\d+)\)/i);
      if (!complexity && !functionLength) continue;
      const metric = complexity ? "complexity" : "functionLength";
      metrics.push({
        metric,
        path: file,
        line: message.line,
        endLine: message.endLine ?? message.line,
        value: Number((complexity ?? functionLength)[1]),
        category: classifyComplexityCategory(file),
        key: baselineKey(metric, file, message.line),
      });
    }
  }
  return metrics;
}

function measureFiles() {
  return walkSourceFiles(path.join(webRoot, "src"))
    .map((absolute) => {
      const file = `apps/web/${sourcePath(absolute)}`;
      const kind = classifyFileKind(sourcePath(absolute));
      const measured = measureContent(fs.readFileSync(absolute));
      return { path: file, kind, lines: measured.lines, bytes: measured.bytes };
    })
    .filter((row) => row.kind !== "generated");
}

function baselineEntriesByKey(baseline) {
  return new Map(baseline.entries.map((entry) => [baselineKey(entry.metric, entry.path, entry.line ?? null), entry]));
}

function evaluateMetrics({ metrics, files, baseline, changedRanges }) {
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

  for (const row of files) {
    const entry = baselineByKey.get(baselineKey("fileLength", row.path));
    const changed = (changedRanges.get(row.path.replace(/^apps\/web\//, "")) ?? []).length > 0;
    const threshold = FILE_LENGTH_THRESHOLDS[row.kind];
    if (!threshold || threshold.excluded) continue;
    if (row.kind === "data/config") {
      const fileResult = evaluateNewFileLength(row.kind, row.lines);
      if (fileResult.status === "REVIEW") reviews.push({ ...row, metric: "fileLength", reason: "data/config review signal" });
      continue;
    }
    if (entry && !changed) {
      const result = compareLegacyValue(row.lines, entry.ceiling);
      if (result.status === "FAIL") failures.push({ ...row, metric: "fileLength", reason: result.reason, ceiling: entry.ceiling });
      if (result.status === "IMPROVEMENT") improvements.push({ ...row, metric: "fileLength", ceiling: entry.ceiling });
      continue;
    }
    if (entry && changed && row.lines > entry.ceiling) {
      failures.push({ ...row, metric: "fileLength", reason: "legacy file ceiling increased", ceiling: entry.ceiling });
      continue;
    }
    if (!entry && row.lines > threshold.reviewAbove && !changed) {
      failures.push({ ...row, metric: "fileLength", reason: "baseline missing for an existing historical file review" });
      continue;
    }
    const fileResult = evaluateNewFileLength(row.kind, row.lines);
    if (fileResult.status === "FAIL") failures.push({ ...row, metric: "fileLength", reason: "new file exceeds blocking threshold", limit: fileResult.limit });
    else if (fileResult.status === "REVIEW") reviews.push({ ...row, metric: "fileLength", reason: "file review signal" });
  }

  const stale = [];
  for (const entry of baseline.entries) {
    const current = entry.metric === "fileLength" ? files.find((row) => row.path === entry.path)?.lines : currentByKey.get(baselineKey(entry.metric, entry.path, entry.line ?? null));
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
  const files = measureFiles();
  const result = evaluateMetrics({ metrics, files, baseline, changedRanges });

  console.log(`Complexity policy: ${metrics.length} function metrics, ${files.length} files measured.`);
  if (result.reviews.length > 0) console.log(`REVIEW_REQUIRED: ${result.reviews.length} review signals.`);
  if (result.improvements.length > 0) console.log(`IMPROVEMENT_AVAILABLE: ${result.improvements.length} lower measurements; update the baseline explicitly to acquire them.`);
  if (result.stale.length > 0) {
    console.error(`BASELINE_STALE: ${result.stale.length} entries no longer match measured functions/files.`);
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
