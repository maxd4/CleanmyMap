#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_BASELINE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "ci-timing-baseline.json");

export function loadTimingBaseline(baselinePath = DEFAULT_BASELINE_PATH) {
  try {
    if (!existsSync(baselinePath)) return {};
    const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
    return parsed?.baselineDurationsMs && typeof parsed.baselineDurationsMs === "object"
      ? parsed.baselineDurationsMs
      : {};
  } catch {
    return {};
  }
}

const FORBIDDEN_PUBLIC_TERMS = /\b(?:authorization|cookie|set-cookie|bearer|storageState|access_token|refresh_token|session(?:_?id|_?token)?|clerk(?:_?session)?|supabase(?:_?service)?_?role)\b/gi;

export function sanitizeTimingLabel(value) {
  return String(value ?? "")
    .replace(FORBIDDEN_PUBLIC_TERMS, "<redacted-term>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function summarizeTimings(entries, {
  slowThresholdMs = 30_000,
  baselineDurationsMs = {},
  regressionMultiplier = 1.5,
  topCount = 5,
} = {}) {
  const normalized = entries
    .map((entry) => ({
      name: sanitizeTimingLabel(entry.name),
      ...(entry.project ? { project: sanitizeTimingLabel(entry.project) } : {}),
      ...(entry.category ? { category: sanitizeTimingLabel(entry.category) } : {}),
      outcome: String(entry.outcome ?? "unknown"),
      durationMs: Math.max(0, Math.round(Number(entry.durationMs) || 0)),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  const totalDurationMs = normalized.reduce((sum, entry) => sum + entry.durationMs, 0);
  const slowest = normalized.slice(0, topCount);
  const regressions = [];

  for (const entry of normalized) {
    const baseline = Number(baselineDurationsMs[entry.name]);
    if (Number.isFinite(baseline) && baseline > 0 && entry.durationMs > baseline * regressionMultiplier) {
      regressions.push({
        ...entry,
        reason: "exceeded-baseline",
        baselineMs: Math.round(baseline),
      });
    } else if (entry.durationMs >= slowThresholdMs) {
      regressions.push({
        ...entry,
        reason: "exceeded-threshold",
        thresholdMs: slowThresholdMs,
      });
    }
  }

  return {
    count: normalized.length,
    totalDurationMs,
    slowest,
    regressions,
  };
}

function collectSuiteTests(suite, projectName, out) {
  const suiteProject = suite.projectName || projectName || "";
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const effectiveProject = test.projectName || spec.projectName || suiteProject;
      const results = test.results ?? [];
      const durationMs = results.reduce((sum, r) => sum + (Number(r.duration) || 0), 0);
      const lastStatus = results.at(-1)?.status ?? test.status ?? "unknown";
      out.push({
        name: `${effectiveProject ? `[${effectiveProject}] ` : ""}${spec.title ?? "unnamed"}`,
        project: effectiveProject,
        outcome: lastStatus,
        durationMs,
      });
    }
  }
  for (const child of suite.suites ?? []) {
    collectSuiteTests(child, suiteProject, out);
  }
}

export function parsePlaywrightJsonReport(report) {
  const entries = [];
  for (const suite of report?.suites ?? []) {
    collectSuiteTests(suite, "", entries);
  }
  return entries;
}

export function formatTimingMarkdown(title, summary) {
  const lines = [
    `### ${sanitizeTimingLabel(title)}`,
    "",
    `- Scenarios/Proofs: **${summary.count}** | Sum duration: **${(summary.totalDurationMs / 1000).toFixed(1)}s** | Regressions/Slow: **${summary.regressions.length}**`,
    "",
    "| Item | Outcome | Duration |",
    "| --- | --- | ---: |",
  ];
  for (const item of summary.slowest) {
    lines.push(`| ${item.name} | ${item.outcome} | ${(item.durationMs / 1000).toFixed(2)}s |`);
  }
  if (summary.regressions.length > 0) {
    lines.push("");
    lines.push("**Slow / Regression alerts:**");
    for (const reg of summary.regressions) {
      lines.push(`- ${reg.name}: ${(reg.durationMs / 1000).toFixed(2)}s (${reg.reason})`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.split("=", 2);
      return [key, value ?? "true"];
    }),
  );
  const playwrightJsonPath = args.get("--playwright-json");
  const outputPath = args.get("--output");
  const slowThresholdMs = Number(process.env.CMM_E2E_REGRESSION_THRESHOLD_MS ?? 45_000);

  if (!playwrightJsonPath || !existsSync(resolve(playwrightJsonPath))) {
    console.log("[ci-timing-report] Playwright JSON report not found; skipping timing summary.");
    return;
  }

  const raw = JSON.parse(readFileSync(resolve(playwrightJsonPath), "utf8"));
  const entries = parsePlaywrightJsonReport(raw);
  const baselineDurationsMs = loadTimingBaseline(args.get("--baseline") ? resolve(args.get("--baseline")) : DEFAULT_BASELINE_PATH);
  const summary = summarizeTimings(entries, { slowThresholdMs, baselineDurationsMs });
  const payload = {
    schemaVersion: 1,
    kind: "cleanmymap-e2e-timing-summary",
    ...summary,
  };

  if (outputPath) {
    const resolvedOut = resolve(outputPath);
    mkdirSync(dirname(resolvedOut), { recursive: true });
    writeFileSync(resolvedOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  const markdown = formatTimingMarkdown("Playwright E2E Timing Summary (Sanitized)", summary);
  if (args.has("--append-step-summary") && process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, "utf8");
  }
  console.log(`E2E_TIMING_SUMMARY count=${summary.count} totalMs=${summary.totalDurationMs} regressions=${summary.regressions.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
