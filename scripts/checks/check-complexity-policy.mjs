#!/usr/bin/env node

import { ESLint } from "eslint";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import tseslint from "typescript-eslint";
import {
  baselineKey,
  classifyComplexityCategory,
  createFunctionMetadataResolver,
  evaluateBaselinedMetric,
  evaluateNewMetric,
  intersectsChangedFunction,
  validateBaselineShape,
} from "./complexity-policy.mjs";
import { createGitRepositoryView } from "./repository-view.mjs";
import { resolveCandidateSha, writeQualityEvidence } from "./quality-evidence.mjs";

const repositoryRoot = process.cwd();
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "complexity-baseline.json");
const args = new Set(process.argv.slice(2));
const changedOnly = args.has("--changed-only");
const stagedOnly = args.has("--staged");
const changedFromArgument = process.argv.slice(2).find((argument) => argument.startsWith("--changed-from="))?.slice("--changed-from=".length);
const sourceRoots = (process.argv.slice(2).find((argument) => argument.startsWith("--roots="))?.slice("--roots=".length) ?? "apps/web/src,apps/mobile")
  .split(",")
  .map((root) => root.replaceAll("\\", "/").trim())
  .filter(Boolean);

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

export function parseChangedDiffText(diff) {
  const ranges = new Map();
  const hunks = new Map();
  const changedPaths = new Set();
  const deletedPaths = new Set();
  let currentPath = null;
  let previousPath = null;
  let currentHunk = null;
  for (const line of diff.split(/\r?\n/)) {
    const diffHeader = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffHeader) {
      previousPath = normalizeRepositoryPath(diffHeader[1]);
      currentPath = normalizeRepositoryPath(diffHeader[2]);
      changedPaths.add(currentPath);
      currentHunk = null;
      continue;
    }
    if (!currentHunk) {
      const oldFile = line.match(/^--- (.+)$/);
      if (oldFile) {
        previousPath = oldFile[1] === "/dev/null"
          ? null
          : normalizeRepositoryPath(oldFile[1].replace(/^a\//, ""));
        currentHunk = null;
        continue;
      }
      const newFile = line.match(/^\+\+\+ (.+)$/);
      if (newFile) {
        if (newFile[1] === "/dev/null") {
          currentPath = previousPath ?? currentPath;
          if (currentPath) deletedPaths.add(currentPath);
        } else {
          currentPath = normalizeRepositoryPath(newFile[1].replace(/^b\//, ""));
        }
        if (currentPath) changedPaths.add(currentPath);
        currentHunk = null;
        continue;
      }
    }
    const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && currentPath) {
      const oldStart = Number(hunk[1]);
      const oldCount = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const newStart = Number(hunk[3]);
      const newCount = hunk[4] === undefined ? 1 : Number(hunk[4]);
      currentHunk = {
        oldStart,
        oldEnd: oldStart + Math.max(oldCount, 1) - 1,
        newStart,
        newEnd: newStart + Math.max(newCount, 1) - 1,
        added: 0,
        deleted: 0,
        addedLines: [],
        deletedLines: [],
      };
      if (!ranges.has(currentPath)) ranges.set(currentPath, []);
      ranges.get(currentPath).push({ start: currentHunk.newStart, end: currentHunk.newEnd });
      if (!hunks.has(currentPath)) hunks.set(currentPath, []);
      hunks.get(currentPath).push(currentHunk);
      continue;
    }
    if (!currentHunk) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.added += 1;
      currentHunk.addedLines.push(line.slice(1));
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.deleted += 1;
      currentHunk.deletedLines.push(line.slice(1));
    }
  }

  for (const fileHunks of hunks.values()) {
    for (const hunk of fileHunks) {
      const added = hunk.addedLines.map(normalizePresentationLine);
      const deleted = hunk.deletedLines.map(normalizePresentationLine);
      hunk.styleOnly = added.length > 0
        && added.length === deleted.length
        && added.every(Boolean)
        && deleted.every(Boolean)
        && [...added].sort().join("\n") === [...deleted].sort().join("\n");
      delete hunk.addedLines;
      delete hunk.deletedLines;
    }
  }

  return { ranges, hunks, changedPaths, deletedPaths };
}

export function resolveChangedFrom({
  stagedOnly,
  changedOnly,
  changedFromArgument,
  environmentChangedFrom,
  headParent,
  baselineSourceCommit,
}) {
  if (stagedOnly) return "HEAD";
  if (changedFromArgument) return changedFromArgument;
  if (environmentChangedFrom) return environmentChangedFrom;
  if (changedOnly) return "HEAD";
  return headParent ?? baselineSourceCommit;
}

function normalizePresentationLine(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("className=\"") || trimmed.includes("style=")) return null;
  return trimmed.replace(/className=\"[^\"]*\"/g, "className=\"__STYLE__\"");
}

function parseChangedDiff({ from = baselineSourceCommit, to = null } = {}) {
  const diffArguments = ["diff", "--unified=0", from];
  if (to) diffArguments.push(to);
  diffArguments.push("--", ...sourceRoots);
  const diff = execFileSync("git", diffArguments, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return parseChangedDiffText(diff);
}

function changedFunctionLines(changedHunks, path, functionStartLine, functionEndLine) {
  return (changedHunks?.get(path) ?? [])
    .filter((hunk) => hunk.newStart <= functionEndLine && hunk.newEnd >= functionStartLine)
    .reduce((total, hunk) => total + (hunk.styleOnly ? 0 : hunk.added + hunk.deleted), 0);
}

function parseFunctionMessages(results, view = null) {
  const metrics = [];
  for (const result of results) {
    const file = normalizeRepositoryPath(path.relative(repositoryRoot, result.filePath));
    const source = view ? view.readText(file) : fs.readFileSync(result.filePath, "utf8");
    const resolveFunctionMetadata = createFunctionMetadataResolver(file, source);
    for (const message of result.messages) {
      const complexity = message.ruleId === "complexity" && message.message.match(/complexity of (\d+)/i);
      const functionLength = message.ruleId === "max-lines-per-function" && message.message.match(/too many lines \((\d+)\)/i);
      if (!complexity && !functionLength) continue;
      const metric = complexity ? "complexity" : "functionLength";
      const match = complexity || functionLength;
      const functionMetadata = resolveFunctionMetadata(message.line, message.message);
      if (!functionMetadata) continue;
      metrics.push({
        metric,
        path: file,
        functionIdentity: functionMetadata.functionIdentity,
        line: message.line,
        endLine: message.endLine ?? message.line,
        functionStartLine: functionMetadata.startLine,
        functionEndLine: functionMetadata.endLine,
        value: Number(match[1]),
        category: classifyComplexityCategory(file),
        key: baselineKey(metric, file, functionMetadata.functionIdentity),
      });
    }
  }
  return metrics;
}

function baselineEntriesByKey(baseline) {
  return new Map(baseline.entries.map((entry) => [baselineKey(entry.metric, entry.path, entry.functionIdentity), entry]));
}

export function evaluateMetrics({ metrics, baseline, changedRanges, changedHunks = new Map(), sourceRoots = null, stalePaths = null }) {
  const baselineByKey = baselineEntriesByKey(baseline);
  const currentByKey = new Map();
  const failures = [];
  const reviews = [];
  const improvements = [];

  for (const metric of metrics) {
    currentByKey.set(metric.key, metric.value);
    const entry = baselineByKey.get(metric.key);
    const changed = intersectsChangedFunction(changedRanges, metric.path, metric.functionStartLine, metric.functionEndLine);
    if (entry) {
      const result = evaluateBaselinedMetric(
        metric.metric,
        metric.category,
        metric.value,
        entry.ceiling,
        changed,
        {
          changedLines: changedFunctionLines(changedHunks, metric.path, metric.functionStartLine, metric.functionEndLine),
          functionStartLine: metric.functionStartLine,
          functionEndLine: metric.functionEndLine,
        },
      );
      if (result.status === "FAIL") failures.push({ ...metric, reason: result.reason, ceiling: entry.ceiling });
      if (result.status === "IMPROVEMENT") improvements.push({ ...metric, ceiling: entry.ceiling });
      continue;
    }
    if (!changed) continue;
    const result = evaluateNewMetric(metric.metric, metric.category, metric.value);
    if (result.status === "FAIL") failures.push({ ...metric, reason: result.reason, limit: result.limit });
    if (result.status === "REVIEW") reviews.push({ ...metric, reason: "above target but below blocking threshold" });
  }

  const stale = [];
  for (const entry of (stagedOnly ? [] : baseline.entries)) {
    if (sourceRoots && !sourceRoots.some((root) => entry.path === root || entry.path.startsWith(`${root}/`))) continue;
    if (stalePaths && !stalePaths.has(entry.path)) continue;
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

export async function runComplexityPolicy() {
  let view = null;
  let stagedTree = null;
  if (stagedOnly) {
    stagedTree = git(["write-tree"]);
    view = createGitRepositoryView(stagedTree, repositoryRoot);
  }

  let baseline;
  try {
    baseline = JSON.parse(view ? view.readText("scripts/checks/complexity-baseline.json") : fs.readFileSync(baselinePath, "utf8"));
    assertBaselineFresh(baseline);
  } catch (error) {
    throw error;
  }

  let headParent;
  try { headParent = git(["rev-parse", "--verify", "HEAD^"]); }
  catch { headParent = null; }
  const changedFrom = resolveChangedFrom({
    stagedOnly,
    changedOnly,
    changedFromArgument,
    environmentChangedFrom: process.env.COMPLEXITY_CHANGED_FROM,
    headParent,
    baselineSourceCommit,
  });
  const changedDiff = stagedOnly
    ? parseChangedDiff({ from: "HEAD", to: stagedTree })
    : parseChangedDiff({ from: changedFrom });
  const changedRanges = changedDiff.ranges;
  const changedHunks = changedDiff.hunks;
  const changedPaths = changedDiff.changedPaths;
  if (!stagedOnly) {
    const untracked = git(["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots])
      .split(/\r?\n/).filter(Boolean)
      .map(normalizeRepositoryPath)
      .filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of untracked) {
      changedRanges.set(file, [{ start: 1, end: Number.MAX_SAFE_INTEGER }]);
      changedPaths.add(file);
    }
  }
  if (changedOnly && changedRanges.size === 0) {
    return {
      baseline,
      metrics: [],
      result: { failures: [], reviews: [], improvements: [], stale: [] },
      changedPaths,
      sourceFiles: [],
      status: "PASS",
    };
  }

  const eslint = new ESLint({
    cwd: repositoryRoot,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: { parser: tseslint.parser },
        rules: {
          complexity: ["error", 0],
          "max-lines-per-function": ["error", { max: 0, skipBlankLines: true, skipComments: true }],
        },
      },
    ],
  });
  const sourceFiles = view
      ? sourceRoots.flatMap((root) => view.listFiles(root)).filter((file) => /\.(ts|tsx)$/.test(file) && (!(changedOnly || stagedOnly) || changedRanges.has(file)))
      : (changedOnly
        ? [...changedRanges.keys()].filter((file) => /\.(ts|tsx)$/.test(file) && fs.existsSync(path.join(repositoryRoot, file)))
        : git(["ls-files", "--", ...sourceRoots]).split(/\r?\n/).filter((file) => /\.(ts|tsx)$/.test(file) && fs.existsSync(path.join(repositoryRoot, file))));
  const lintResults = await Promise.all(sourceFiles.map((file) => {
    const filePath = path.join(repositoryRoot, file);
    const source = view ? view.readText(file) : fs.readFileSync(filePath, "utf8");
    return eslint.lintText(source, { filePath });
  }));
  const metrics = parseFunctionMessages(lintResults.flat(), view);
  const result = evaluateMetrics({
    metrics,
    baseline,
    changedRanges,
    changedHunks,
    sourceRoots,
    stalePaths: changedOnly ? changedPaths : null,
  });
  const blocking = result.failures.length > 0 || result.stale.length > 0;
  return {
    baseline,
    metrics,
    result,
    changedPaths,
    sourceFiles,
    status: blocking ? "FAIL" : "PASS",
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const report = await runComplexityPolicy();
    const result = report.result;
    writeQualityEvidence({
      gate: "complexity",
      candidateSha: resolveCandidateSha(repositoryRoot),
      status: report.status,
      metrics: {
        measuredFunctions: report.metrics.length,
        violations: result.failures.length,
        baselineStale: result.stale.length,
        improvementsDetected: result.improvements.length,
        reviewSignals: result.reviews.length,
      },
      newFindings: result.failures.length,
      resolvedFindings: null,
      historicalFindings: null,
      baseline: { sourceCommit: report.baseline.sourceCommit, policyFingerprint: report.baseline.policyFingerprint },
      details: {
        failureKeys: result.failures.map((failure) => failure.key),
        improvementKeys: result.improvements.map((improvement) => improvement.key),
        staleKeys: result.stale.map((entry) => baselineKey(entry.metric, entry.path, entry.functionIdentity)),
      },
    });
    console.log(`Complexity policy: ${report.metrics.length} function metrics measured.`);
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
    } else if (result.stale.length > 0) {
      process.exitCode = 1;
    } else {
      console.log("PASS: new-code thresholds and legacy ceilings respected.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
