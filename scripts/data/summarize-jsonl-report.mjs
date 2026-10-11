import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function escapeCell(value) {
  return String(value ?? "n/a").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(new RegExp(String.fromCharCode(96), "g"), "\\" + String.fromCharCode(96)).replace(/\r?\n/g, " ");
}

export function table(headers, rows) {
  const head = "| " + headers.map(escapeCell).join(" | ") + " |";
  const sep = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows.map((row) => "| " + row.map(escapeCell).join(" | ") + " |");
  return [head, sep, ...body].join("\n");
}

function formatPeriodMarkdown(period) {
  return table(["metric", "value", "available sessions", "missing sessions", "status"], Object.entries(period.fields).map(([field, value]) => [field, value.value, value.availableSessionCount, value.missingSessionCount, value.status]));
}

export function printMarkdown(report) {
  const lines = [
    "# Local Codex telemetry",
    "",
    "This report contains metadata and token aggregates only; prompts, responses and file contents are excluded.",
    "",
    "- first available trace: " + report.firstAvailableTrace,
    "- last available trace: " + report.lastAvailableTrace,
    "- trace span days: " + report.traceSpanDays,
    "- six-month coverage: " + report.sixMonthWindowCoverage.status,
    "- raw rollout files: " + report.deduplication.rawRolloutFiles,
    "- unique sessions: " + report.deduplication.uniqueSessions,
    "- duplicate session copies: " + report.deduplication.duplicateSessionCopies,
    "- active-only sessions: " + report.deduplication.activeOnlySessions,
    "- archived-only sessions: " + report.deduplication.archivedOnlySessions,
    "- exact / derived / partial / unusable: " + report.quality.exactSessionCount + " / " + report.quality.derivedFromCumulativeCounterSessionCount + " / " + report.quality.partialSessionCount + " / " + report.quality.unusableSessionCount,
    "",
    "## FULL_LOCAL_HISTORY totals",
    "",
    formatPeriodMarkdown(report.fullHistoryTotals),
    "",
    "## REFERENCE_6_MONTH_WINDOW totals",
    "",
    formatPeriodMarkdown(report.sixMonthTotals),
    "",
    "## Coverage",
    "",
    report.sixMonthWindowCoverage.note,
    "",
    "## Limitations",
    "",
    "Uncovered periods are not interpreted as zero. No CLEANMYMAP, OTHER_PROJECT or AMBIGUOUS classification is performed in this lot.",
  ];
  console.log(lines.join("\n"));
}

export function writeArtifacts(report, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const normalized = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    source: "local Codex rollout metadata and token aggregates",
    sessions: report.sessions,
  };
  const summary = { ...report };
  delete summary.sessions;
  delete summary.schemaAudit;
  writeFileSync(path.join(outputDir, "normalized-sessions.json"), JSON.stringify(normalized, null, 2) + "\n", "utf8");
  writeFileSync(path.join(outputDir, "schema-audit.json"), JSON.stringify(report.schemaAudit, null, 2) + "\n", "utf8");
  writeFileSync(path.join(outputDir, "telemetry-summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  const markdown = [];
  const originalLog = console.log;
  console.log = (value = "") => markdown.push(String(value));
  try { printMarkdown(report); } finally { console.log = originalLog; }
  writeFileSync(path.join(outputDir, "telemetry-summary.md"), markdown.join("\n") + "\n", "utf8");
  return ["normalized-sessions.json", "schema-audit.json", "telemetry-summary.json", "telemetry-summary.md"].map((name) => path.join(outputDir, name));
}
