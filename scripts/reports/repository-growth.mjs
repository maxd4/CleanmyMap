#!/usr/bin/env node

/**
 * Mesure l'evolution versionnee du depot sans checkout historique.
 *
 * Le script lit uniquement les arbres Git resolus par SHA. Les valeurs ne
 * contiennent donc aucune date d'execution et restent reproductibles pour une
 * meme histoire Git. Il ne modifie jamais l'index, le worktree ou une ref.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createGitRepositoryView } from "../checks/repository-view.mjs";
import {
  collectMeasuredRows,
} from "../checks/top-heavy-measurement.mjs";
import {
  isAboveHard,
  isAboveReview,
  isInPreventiveZone,
} from "../checks/top-heavy-policy.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OUTPUT_DIR = "artifacts/repository-growth";
const DEFAULT_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const CATEGORY_ORDER = Object.freeze([
  "web_runtime",
  "mobile_runtime",
  "web_tests",
  "mobile_tests",
  "e2e_and_script_tests",
  "documentation",
  "scripts_ci",
  "sql_migrations",
  "data_configuration",
  "media_binaries",
  "vendored_generated_lockfiles",
  "other_text",
  "submodules",
]);

const CATEGORY_LABELS = Object.freeze({
  web_runtime: "Web runtime",
  mobile_runtime: "Mobile runtime",
  web_tests: "Web tests",
  mobile_tests: "Mobile tests",
  e2e_and_script_tests: "E2E / script tests",
  documentation: "Documentation",
  scripts_ci: "Scripts / CI",
  sql_migrations: "SQL / migrations",
  data_configuration: "Data / configuration",
  media_binaries: "Media / binaries",
  vendored_generated_lockfiles: "Vendored / generated / lockfiles",
  other_text: "Other text",
  submodules: "Submodules",
});

const DEFINITIONS = Object.freeze({
  physicalLines: "A non-empty blob has one line per CRLF, LF or lone CR terminator, plus one final line when the blob does not end in a line terminator. An empty blob has zero lines.",
  bytes: "Raw Git blob bytes, not decoded character count.",
  monthlyPoint: "The first-parent commit reached by the canonical branch at or before the UTC end of the requested month; the exact SHA is retained.",
  ratios: "Test/runtime volume ratios use physical lines and are not code coverage measurements.",
});

function git(args, root = REPOSITORY_ROOT) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function resolveCommit(ref, root = REPOSITORY_ROOT) {
  if (!ref) throw new Error("Une ref Git est requise.");
  return git(["rev-parse", "--verify", `${ref}^{commit}`], root).trim();
}

function commitDate(ref, root = REPOSITORY_ROOT) {
  const seconds = Number(git(["show", "-s", "--format=%ct", ref], root).trim());
  if (!Number.isSafeInteger(seconds)) throw new Error(`Date Git invalide pour ${ref}.`);
  return {
    epochSeconds: seconds,
    utc: new Date(seconds * 1000).toISOString(),
  };
}

function parseTreeEntries(raw) {
  return raw.split("\0").filter(Boolean).map((record) => {
    const separator = record.indexOf("\t");
    if (separator < 0) throw new Error(`Entree Git illisible: ${record}`);
    const header = record.slice(0, separator).split(/\s+/);
    const size = header[1] === "blob" ? Number(header[3]) : 0;
    if (header[1] === "blob" && (!Number.isSafeInteger(size) || size < 0)) {
      throw new Error(`Taille de blob invalide pour ${record.slice(separator + 1)}.`);
    }
    return {
      mode: header[0],
      type: header[1],
      objectId: header[2],
      size,
      path: record.slice(separator + 1).replaceAll("\\", "/"),
    };
  });
}

function listTreeEntries(ref, root = REPOSITORY_ROOT) {
  return parseTreeEntries(git(["ls-tree", "--full-tree", "-r", "-l", "-z", ref, "--"], root));
}

function isLockfile(file) {
  return /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.ya?ml|bun\.lock(?:b)?|composer\.lock|Gemfile\.lock)$/i.test(file);
}

function isGeneratedOrVendored(file) {
  return /(?:^|\/)(?:node_modules|vendor|third_party|\.next|dist|build|coverage|artifacts)(?:\/|$)/i.test(file)
    || /(?:^|\/)(?:generated|__generated__)(?:\/|$)|\.generated\./i.test(file)
    || /(?:^|\/)next-env\.d\.ts$/i.test(file);
}

function isKnownMedia(file) {
  return /\.(?:avif|bmp|gif|ico|jpeg|jpg|mp3|mp4|mov|ogg|otf|pdf|png|psd|ttf|wav|webm|webp|woff2?|zip|gz|7z|tar|wasm|bin)$/i.test(file);
}

function isTestPath(file) {
  return /(?:^|\/)(?:__tests__|tests?|fixtures?)(?:\/|$)|\.(?:test|spec)(?:\.[^.]+)*\.[^.]+$/i.test(file);
}

function isDocumentation(file) {
  return /^(?:documentation\/|docs\/)/i.test(file)
    || /(?:^|\/)(?:README|CHANGELOG|CONTRIBUTING|SECURITY)(?:\.[^.]+)?$/i.test(file)
    || /\.(?:md|mdx|rst|adoc|txt)$/i.test(file);
}

function isDataOrConfiguration(file) {
  return /(?:^|\/)(?:package\.json|tsconfig(?:\.[^.]+)?\.json|\.env(?:\.[^.]+)?|Dockerfile|Makefile)$/i.test(file)
    || /\.(?:json|jsonc|ya?ml|toml|ini|xml|csv|properties)$/i.test(file)
    || /(?:^|\/)(?:config|configs|constants|data)(?:\/|$)/i.test(file);
}

export function classifyPath(file) {
  const normalized = String(file ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (isLockfile(normalized) || isGeneratedOrVendored(normalized)) return "vendored_generated_lockfiles";
  if (isDocumentation(normalized)) return "documentation";
  if (/^e2e(?:\/|$)/i.test(normalized)) return "e2e_and_script_tests";
  if (/^apps\/web\//i.test(normalized) && isTestPath(normalized)) return "web_tests";
  if (/^apps\/mobile\//i.test(normalized) && isTestPath(normalized)) return "mobile_tests";
  if (/^(?:scripts\/.*\.(?:test|spec)\.|scripts\/.*\/tests?\/)/i.test(normalized)) return "e2e_and_script_tests";
  if (/\.sql$/i.test(normalized) || /(?:^|\/)supabase\/migrations(?:\/|$)/i.test(normalized)) return "sql_migrations";
  if (/^\.github(?:\/|$)/i.test(normalized) || /^scripts(?:\/|$)/i.test(normalized)) return "scripts_ci";
  if (isDataOrConfiguration(normalized)) return "data_configuration";
  if (isKnownMedia(normalized)) return "media_binaries";
  if (/^apps\/web(?:\/|$)/i.test(normalized)) return "web_runtime";
  if (/^apps\/mobile(?:\/|$)/i.test(normalized)) return "mobile_runtime";
  return "other_text";
}

export function countPhysicalLines(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (buffer.length === 0) return 0;
  let lines = 0;
  let index = 0;
  let endedWithTerminator = false;
  while (index < buffer.length) {
    const byte = buffer[index];
    if (byte === 13) {
      lines += 1;
      endedWithTerminator = true;
      index += buffer[index + 1] === 10 ? 2 : 1;
      continue;
    }
    if (byte === 10) {
      lines += 1;
      endedWithTerminator = true;
      index += 1;
      continue;
    }
    endedWithTerminator = false;
    index += 1;
  }
  return endedWithTerminator ? lines : lines + 1;
}

function hasNulByte(content) {
  return content.includes(0);
}

function emptyMeasure() {
  return { files: 0, bytes: 0, physicalLines: 0, lineMeasuredFiles: 0, lineNotApplicableFiles: 0 };
}

function addMeasure(target, entry, lineCount) {
  target.files += 1;
  target.bytes += entry.size;
  if (lineCount === null) {
    target.lineNotApplicableFiles += 1;
  } else {
    target.physicalLines += lineCount;
    target.lineMeasuredFiles += 1;
  }
}

function normalizeMeasure(measure) {
  return {
    files: measure.files,
    bytes: measure.bytes,
    physicalLines: measure.lineMeasuredFiles > 0 ? measure.physicalLines : null,
    lineMeasuredFiles: measure.lineMeasuredFiles,
    lineNotApplicableFiles: measure.lineNotApplicableFiles,
  };
}

export function measureEntries(entries, readBinary) {
  const categories = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, emptyMeasure()]));
  for (const entry of entries) {
    let category = entry.type === "commit" ? "submodules" : classifyPath(entry.path);
    let lineCount = category === "media_binaries" || category === "submodules" ? null : 0;
    if (entry.type === "blob" && lineCount !== null) {
      const content = readBinary(entry.path);
      if (hasNulByte(content)) {
        category = "media_binaries";
        lineCount = null;
      } else {
        lineCount = countPhysicalLines(content);
      }
    }
    addMeasure(categories[category], entry, lineCount);
  }

  const normalizedCategories = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, { label: CATEGORY_LABELS[category], ...normalizeMeasure(categories[category]) }]),
  );
  const total = emptyMeasure();
  for (const category of CATEGORY_ORDER) {
    const measure = categories[category];
    total.files += measure.files;
    total.bytes += measure.bytes;
    total.physicalLines += measure.physicalLines;
    total.lineMeasuredFiles += measure.lineMeasuredFiles;
    total.lineNotApplicableFiles += measure.lineNotApplicableFiles;
  }
  return {
    categories: normalizedCategories,
    totals: normalizeMeasure(total),
  };
}

function measureTopHeavy(ref, root = REPOSITORY_ROOT) {
  const view = createGitRepositoryView(ref, root);
  const rows = collectMeasuredRows(view, ["apps/web/src", "apps/mobile"]);
  return {
    status: "MEASURED",
    source: "scripts/checks/top-heavy-measurement.mjs + top-heavy-policy.mjs",
    filesOverReview: rows.filter(isAboveReview).length,
    filesOverHard: rows.filter(isAboveHard).length,
    filesPreventive: rows.filter(isInPreventiveZone).length,
  };
}

function readCommitLog(ref, root = REPOSITORY_ROOT) {
  return git(["log", "--first-parent", "--format=%H%x09%ct", ref], root)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, secondsText] = line.split("\t");
      return { sha, epochSeconds: Number(secondsText) };
    });
}

export function selectCommitAtOrBefore(commits, epochSeconds) {
  return commits.find((commit) => commit.epochSeconds <= epochSeconds) ?? null;
}

function monthEndEpochSeconds(year, monthIndex) {
  return Math.floor(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999) / 1000);
}

function monthLabel(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function completeMonthAnchor(epochSeconds) {
  const date = new Date(epochSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const end = monthEndEpochSeconds(year, month);
  if (epochSeconds < end) {
    return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  }
  return { year, month };
}

function buildMonthlySeries({ commits, anchorEpochSeconds, months, measureRef }) {
  const anchor = completeMonthAnchor(anchorEpochSeconds);
  const points = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(anchor.year, anchor.month - offset, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const endEpochSeconds = monthEndEpochSeconds(year, month);
    const selected = selectCommitAtOrBefore(commits, endEpochSeconds);
    if (!selected) {
      points.push({ month: monthLabel(year, month), monthEndUtc: new Date(endEpochSeconds * 1000).toISOString(), status: "MISSING_HISTORY", commit: null, inventory: null, quality: null });
      continue;
    }
    const measured = measureRef(selected.sha);
    points.push({
      month: monthLabel(year, month),
      monthEndUtc: new Date(endEpochSeconds * 1000).toISOString(),
      status: "MEASURED",
      commit: { sha: selected.sha, committedAtUtc: new Date(selected.epochSeconds * 1000).toISOString() },
      inventory: measured.inventory,
      quality: measured.quality,
    });
  }
  return points;
}

function metricDelta(current, base) {
  if (current === null || base === null || current === undefined || base === undefined) {
    return { absolute: null, relative: null };
  }
  return {
    absolute: current - base,
    relative: base === 0 ? null : (current - base) / base,
  };
}

function compareMeasures(current, base) {
  const categories = {};
  for (const category of CATEGORY_ORDER) {
    const currentCategory = current.categories[category];
    const baseCategory = base.categories[category];
    categories[category] = {
      files: metricDelta(currentCategory.files, baseCategory.files),
      bytes: metricDelta(currentCategory.bytes, baseCategory.bytes),
      physicalLines: metricDelta(currentCategory.physicalLines, baseCategory.physicalLines),
    };
  }
  return {
    files: metricDelta(current.totals.files, base.totals.files),
    bytes: metricDelta(current.totals.bytes, base.totals.bytes),
    physicalLines: metricDelta(current.totals.physicalLines, base.totals.physicalLines),
    categories,
  };
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function testRuntimeRatio(inventory) {
  const web = inventory.categories.web_runtime.physicalLines;
  const mobile = inventory.categories.mobile_runtime.physicalLines;
  const webTests = inventory.categories.web_tests.physicalLines;
  const mobileTests = inventory.categories.mobile_tests.physicalLines;
  const e2e = inventory.categories.e2e_and_script_tests.physicalLines;
  return {
    web: ratio(webTests, web),
    mobile: ratio(mobileTests, mobile),
    allRuntime: ratio((webTests ?? 0) + (mobileTests ?? 0) + (e2e ?? 0), (web ?? 0) + (mobile ?? 0)),
    interpretation: DEFINITIONS.ratios,
  };
}

function notMeasuredQuality(reason) {
  return { status: "NOT_MEASURED", reason };
}

function buildQuality(ref, root = REPOSITORY_ROOT) {
  return {
    topHeavy: measureTopHeavy(ref, root),
    complexity: notMeasuredQuality("Aucune preuve quality:complexity attribuable a cette SHA sans reconstruire un checkout AST.") ,
    cycles: notMeasuredQuality("Aucune preuve quality:cycles attribuable a cette SHA sans reconstruire son index GitNexus.") ,
    duplication: notMeasuredQuality("Aucune preuve quality:duplication attribuable a cette SHA sans executer jscpd sur un arbre materialise."),
    deadCode: notMeasuredQuality("Aucune preuve quality:dead-code attribuable a cette SHA sans executer Knip sur un arbre materalise.") ,
  };
}

function measureRef(ref, root = REPOSITORY_ROOT) {
  const resolved = resolveCommit(ref, root);
  const entries = listTreeEntries(resolved, root);
  const view = createGitRepositoryView(resolved, root);
  const inventory = measureEntries(entries, (file) => view.readBinary(file));
  return {
    ref: { requested: ref, resolved, committedAtUtc: commitDate(resolved, root).utc },
    inventory,
    quality: buildQuality(resolved, root),
    ratios: testRuntimeRatio(inventory),
  };
}

function parseOption(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const option = args.find((arg) => arg.startsWith(prefix));
  return option ? option.slice(prefix.length) : fallback;
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} doit etre un entier positif.`);
  return parsed;
}

function parseAsOf(value, fallbackEpochSeconds) {
  if (!value) return fallbackEpochSeconds;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("--as-of doit utiliser YYYY-MM-DD.");
  const epoch = Date.parse(`${value}T23:59:59.999Z`);
  if (!Number.isFinite(epoch)) throw new Error(`Date --as-of invalide: ${value}.`);
  return Math.floor(epoch / 1000);
}

function formatInteger(value) {
  return value === null || value === undefined ? "n/a" : new Intl.NumberFormat("fr-FR").format(value);
}

function formatPercent(value) {
  return value === null || value === undefined ? "n/a" : `${(value * 100).toFixed(1)} %`;
}

function formatDelta(delta) {
  if (!delta || delta.absolute === null) return "n/a";
  const sign = delta.absolute > 0 ? "+" : "";
  return `${sign}${formatInteger(delta.absolute)} (${formatPercent(delta.relative)})`;
}

function buildMarkdown(report) {
  const lines = [
    "# Repository growth — CleanMyMap",
    "",
    `- Current ref: \`${report.current.ref.resolved}\` (${report.current.ref.committedAtUtc})`,
    `- Comparison ref: ${report.comparison ? `\`${report.comparison.base.resolved}\` (${report.comparison.base.committedAtUtc})` : "not available"}`,
    `- Monthly branch: \`${report.monthly.branch.resolved}\``,
    `- Monthly anchor: ${report.monthly.anchorUtc}; points are complete UTC months only`,
    "",
    "This report is generated from Git trees by SHA. It does not measure executable LOC and it does not commit, push, checkout or mutate a repository ref.",
    "",
    "## Current inventory",
    "",
    "| Category | Files | Bytes | Physical lines |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const category of CATEGORY_ORDER) {
    const measure = report.current.inventory.categories[category];
    lines.push(`| ${measure.label} | ${formatInteger(measure.files)} | ${formatInteger(measure.bytes)} | ${formatInteger(measure.physicalLines)} |`);
  }
  lines.push(`| **Total** | **${formatInteger(report.current.inventory.totals.files)}** | **${formatInteger(report.current.inventory.totals.bytes)}** | **${formatInteger(report.current.inventory.totals.physicalLines)}** |`);
  lines.push("", "## Comparison", "");
  if (!report.comparison) {
    lines.push("Comparison unavailable: the selected current ref has no parent.");
  } else {
    lines.push("| Scope | Files | Bytes | Physical lines |", "| --- | ---: | ---: | ---: |");
    lines.push(`| Total | ${formatDelta(report.comparison.delta.files)} | ${formatDelta(report.comparison.delta.bytes)} | ${formatDelta(report.comparison.delta.physicalLines)} |`);
    for (const category of CATEGORY_ORDER) {
      const delta = report.comparison.delta.categories[category];
      lines.push(`| ${report.current.inventory.categories[category].label} | ${formatDelta(delta.files)} | ${formatDelta(delta.bytes)} | ${formatDelta(delta.physicalLines)} |`);
    }
  }
  lines.push(
    "",
    "## Tests / runtime volume ratio",
    "",
    `- Web tests / web runtime: **${formatPercent(report.current.ratios.web)}**`,
    `- Mobile tests / mobile runtime: **${formatPercent(report.current.ratios.mobile)}**`,
    `- All listed tests / all runtime: **${formatPercent(report.current.ratios.allRuntime)}**`,
    "",
    "These ratios describe repository volume only; they are not coverage.",
    "",
    "## Quality evidence",
    "",
    `- Top-heavy: **${report.current.quality.topHeavy.status}** — ${formatInteger(report.current.quality.topHeavy.filesOverReview)} REVIEW, ${formatInteger(report.current.quality.topHeavy.filesOverHard)} HARD, ${formatInteger(report.current.quality.topHeavy.filesPreventive)} preventive.`,
    `- Complexity: **${report.current.quality.complexity.status}** — ${report.current.quality.complexity.reason}`,
    `- Cycles: **${report.current.quality.cycles.status}** — ${report.current.quality.cycles.reason}`,
    `- Duplication: **${report.current.quality.duplication.status}** — ${report.current.quality.duplication.reason}`,
    `- Dead code: **${report.current.quality.deadCode.status}** — ${report.current.quality.deadCode.reason}`,
    "",
    "## Monthly history",
    "",
    "| Month | Status | Commit SHA | Runtime lines | Test lines | Docs lines | Top-heavy REVIEW/HARD |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
  );
  for (const point of report.monthly.points) {
    if (!point.inventory) {
      lines.push(`| ${point.month} | ${point.status} | n/a | n/a | n/a | n/a | n/a |`);
      continue;
    }
    const categories = point.inventory.categories;
    const runtime = (categories.web_runtime.physicalLines ?? 0) + (categories.mobile_runtime.physicalLines ?? 0);
    const tests = (categories.web_tests.physicalLines ?? 0) + (categories.mobile_tests.physicalLines ?? 0) + (categories.e2e_and_script_tests.physicalLines ?? 0);
    const docs = categories.documentation.physicalLines;
    lines.push(`| ${point.month} | ${point.status} | \`${point.commit.sha}\` | ${formatInteger(runtime)} | ${formatInteger(tests)} | ${formatInteger(docs)} | ${formatInteger(point.quality.topHeavy.filesOverReview)} / ${formatInteger(point.quality.topHeavy.filesOverHard)} |`);
  }
  lines.push("", "## 30 / 90 day changes", "", "| Window | Base commit | Base date | Files | Bytes | Physical lines |", "| --- | --- | --- | ---: | ---: | ---: |");
  for (const window of [30, 90]) {
    const point = report.windows[String(window)];
    if (!point || point.status !== "MEASURED") {
      lines.push(`| ${window} days | n/a | n/a | n/a | n/a | n/a |`);
      continue;
    }
    lines.push(`| ${window} days | \`${point.base.resolved}\` | ${point.base.committedAtUtc} | ${formatDelta(point.delta.files)} | ${formatDelta(point.delta.bytes)} | ${formatDelta(point.delta.physicalLines)} |`);
  }
  lines.push("", "## Definitions and limits", "", `- Physical lines: ${DEFINITIONS.physicalLines}`, `- Bytes: ${DEFINITIONS.bytes}`, `- Monthly point: ${DEFINITIONS.monthlyPoint}`, "- Missing months and insufficient history are reported explicitly; no estimate is substituted.", "- Complexity, cycles, duplication and dead-code are not projected across history. They remain NOT_MEASURED unless an exact-SHA compatible proof is available.", "- No threshold, baseline, coverage result or automatic repository change is created by this report.", "");
  return `${lines.join("\n")}\n`;
}

export function createReport({ root = REPOSITORY_ROOT, ref = "HEAD", compare = null, branch = "main", months = DEFAULT_MONTHS, asOf = null } = {}) {
  const current = measureRef(ref, root);
  const compareRef = compare ?? `${current.ref.resolved}^`;
  let comparison = null;
  try {
    const base = measureRef(compareRef, root);
    comparison = { base: base.ref, current: current.ref, delta: compareMeasures(current.inventory, base.inventory) };
  } catch (error) {
    if (compare) throw error;
  }

  const branchResolved = resolveCommit(branch, root);
  const branchCommits = readCommitLog(branchResolved, root);
  const currentEpochSeconds = Math.floor(Date.parse(current.ref.committedAtUtc) / 1000);
  const anchorEpochSeconds = parseAsOf(asOf, currentEpochSeconds);
  const monthlyCache = new Map();
  const measureMonthlyRef = (sha) => {
    if (!monthlyCache.has(sha)) monthlyCache.set(sha, measureRef(sha, root));
    return monthlyCache.get(sha);
  };
  const monthly = {
    branch: { requested: branch, resolved: branchResolved },
    anchorUtc: new Date(anchorEpochSeconds * 1000).toISOString(),
    months,
    points: buildMonthlySeries({ commits: branchCommits, anchorEpochSeconds, months, measureRef: measureMonthlyRef }),
  };

  const currentCommits = readCommitLog(current.ref.resolved, root);
  const windows = {};
  for (const days of [30, 90]) {
    const selected = selectCommitAtOrBefore(currentCommits, currentEpochSeconds - days * 24 * 60 * 60);
    if (!selected) {
      windows[String(days)] = { status: "INSUFFICIENT_HISTORY", reason: `Aucun commit reachable at or before ${days} days before the current ref.` };
      continue;
    }
    const base = measureRef(selected.sha, root);
    windows[String(days)] = {
      status: "MEASURED",
      base: base.ref,
      current: current.ref,
      delta: compareMeasures(current.inventory, base.inventory),
    };
  }

  return {
    schemaVersion: 1,
    definitions: DEFINITIONS,
    current,
    comparison,
    monthly,
    windows,
  };
}

export function main(args = process.argv.slice(2)) {
  const options = {
    ref: parseOption(args, "ref", "HEAD"),
    compare: parseOption(args, "compare"),
    branch: parseOption(args, "branch", "main"),
    months: parsePositiveInteger(parseOption(args, "months", String(DEFAULT_MONTHS)), "months"),
    asOf: parseOption(args, "as-of"),
    outputDir: parseOption(args, "output-dir", DEFAULT_OUTPUT_DIR),
  };
  const report = createReport(options);
  const outputDir = path.resolve(REPOSITORY_ROOT, options.outputDir);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "repository-growth.json");
  const markdownPath = path.join(outputDir, "repository-growth.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, buildMarkdown(report), "utf8");
  process.stdout.write(`Repository growth mesure: ${jsonPath}\nRepository growth rapport: ${markdownPath}\n`);
  return report;
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  }
}
