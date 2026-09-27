#!/usr/bin/env node
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PERFORMANCE_ADVISOR_COMMAND_OPTIONS = Object.freeze([
  "--type",
  "performance",
  "--level",
  "info",
  "--fail-on",
  "none",
  "--output-format",
  "json",
]);

export const RECENT_FK_PROTECTION_INDEXES = Object.freeze([
  Object.freeze({ name: "idx_action_share_contact_requests_action_id", table: "action_share_contact_requests", columns: ["action_id"] }),
  Object.freeze({ name: "idx_app_messages_feedback_reply_feedback_id", table: "app_messages", columns: ["feedback_reply_feedback_id"] }),
  Object.freeze({ name: "idx_badge_events_user_id", table: "badge_events", columns: ["user_id"] }),
  Object.freeze({ name: "idx_chat_dm_read_states_peer_id", table: "chat_dm_read_states", columns: ["peer_id"] }),
  Object.freeze({ name: "idx_missions_created_by", table: "missions", columns: ["created_by"] }),
  Object.freeze({ name: "idx_missions_volunteer_id", table: "missions", columns: ["volunteer_id"] }),
]);

export const EXPLICIT_PENDING_WORKLOAD_INDEXES = Object.freeze([
  Object.freeze({ name: "idx_messages_dm", table: "app_messages" }),
  Object.freeze({ name: "idx_user_points", table: "points_ledger" }),
  Object.freeze({ name: "idx_progression_events_user_type", table: "progression_events" }),
]);

const recentFkProtectionByName = new Map(
  RECENT_FK_PROTECTION_INDEXES.map((entry) => [entry.name, entry]),
);
const explicitPendingWorkloadByName = new Map(
  EXPLICIT_PENDING_WORKLOAD_INDEXES.map((entry) => [entry.name, entry]),
);

function normalizeAdvisorName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findingsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  for (const key of ["advisors", "findings", "results", "data", "issues"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return null;
}

export function parsePerformanceAdvisorOutput(output) {
  const trimmed = String(output ?? "").trim();
  if (trimmed.length === 0) {
    throw new Error("Supabase performance advisors did not return JSON.");
  }

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `Supabase performance advisors did not return JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const findings = findingsFromPayload(payload);
  if (!findings) {
    throw new Error("Supabase performance advisors JSON did not contain a findings array.");
  }
  return findings;
}

function findingName(finding) {
  if (!finding || typeof finding !== "object") return "";
  for (const key of ["name", "id", "slug", "key", "code"]) {
    if (typeof finding[key] === "string" && finding[key].trim().length > 0) return finding[key];
  }
  return "";
}

function findingLevel(finding) {
  return typeof finding?.level === "string" ? finding.level.trim().toUpperCase() : "UNKNOWN";
}

function textForFinding(finding) {
  return [finding?.title, finding?.detail, finding?.description]
    .filter((value) => typeof value === "string")
    .join(" ");
}

function extractIndexName(finding) {
  const metadata = finding?.metadata;
  const candidates = [
    metadata?.index,
    metadata?.index_name,
    metadata?.name,
    finding?.index,
    finding?.index_name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0 && normalizeAdvisorName(candidate) !== "unused_index") {
      return candidate.trim();
    }
  }

  return textForFinding(finding).match(/\bidx_[a-z0-9_]+\b/i)?.[0] ?? "";
}

function metadataValue(finding, keys) {
  const metadata = finding?.metadata;
  for (const key of keys) {
    if (typeof metadata?.[key] === "string" && metadata[key].trim().length > 0) return metadata[key].trim();
  }
  return "";
}

function columnsFromFinding(finding) {
  const metadata = finding?.metadata;
  const columns = metadata?.columns ?? metadata?.column ?? finding?.columns ?? finding?.column;
  if (Array.isArray(columns)) return columns.map(String);
  if (typeof columns === "string" && columns.trim().length > 0) return [columns.trim()];
  return [];
}

function knownIndexContractIssues(finding, contract) {
  const issues = [];
  const type = metadataValue(finding, ["type"]);
  const schema = metadataValue(finding, ["schema", "schema_name"]);
  const table = metadataValue(finding, ["table", "table_name"]);
  const columns = columnsFromFinding(finding);

  if (type && normalizeAdvisorName(type) !== "index") issues.push(`metadata.type=${type}`);
  if (schema && schema !== "public") issues.push(`metadata.schema=${schema}`);
  if (table && table !== contract.table) issues.push(`metadata.table=${table}`);
  if (columns.length > 0 && columns.join("|") !== contract.columns?.join("|") && contract.columns) {
    issues.push(`metadata.columns=${columns.join(",")}`);
  }
  return issues;
}

function classifyFinding(finding) {
  const advisorName = normalizeAdvisorName(findingName(finding));
  const level = findingLevel(finding);
  if (advisorName !== "unused_index" || level !== "INFO") {
    return {
      category: "unexpected",
      finding,
      advisorName,
      level,
      indexName: extractIndexName(finding),
      issues: [],
    };
  }

  const indexName = extractIndexName(finding);
  if (!indexName) {
    return {
      category: "unexpected",
      finding,
      advisorName,
      level,
      indexName: "",
      issues: ["unused_index finding has no identifiable index name"],
    };
  }

  const recentContract = recentFkProtectionByName.get(indexName);
  if (recentContract) {
    return {
      category: "recent-fk-protection",
      finding,
      advisorName,
      level,
      indexName,
      issues: knownIndexContractIssues(finding, recentContract),
    };
  }

  const pendingContract = explicitPendingWorkloadByName.get(indexName);
  if (pendingContract) {
    return {
      category: "explicit-pending-workload",
      finding,
      advisorName,
      level,
      indexName,
      issues: knownIndexContractIssues(finding, pendingContract),
    };
  }

  return {
    category: "other-needs-workload-evidence",
    finding,
    advisorName,
    level,
    indexName,
    issues: [],
  };
}

export function summarizePerformanceAdvisorOutput(output) {
  const findings = parsePerformanceAdvisorOutput(output);
  const classifiedFindings = findings.map(classifyFinding);
  const performanceError = classifiedFindings.filter(({ level }) => level === "ERROR").length;
  const performanceWarn = classifiedFindings.filter(({ level }) => level === "WARN").length;
  const unusedIndexInfo = classifiedFindings.filter(
    ({ advisorName, level }) => advisorName === "unused_index" && level === "INFO",
  ).length;
  const recentFkProtection = classifiedFindings.filter(({ category }) => category === "recent-fk-protection").length;
  const explicitPendingWorkload = classifiedFindings.filter(({ category }) => category === "explicit-pending-workload").length;
  const otherNeedsWorkloadEvidence = classifiedFindings.filter(
    ({ category }) => category === "other-needs-workload-evidence",
  ).length;
  const unexpectedFindings = classifiedFindings.filter(
    ({ category, issues }) => category === "unexpected" || issues.length > 0,
  );

  return {
    classifiedFindings,
    explicitPendingWorkload,
    immediateIndexRemoval: 0,
    otherNeedsWorkloadEvidence,
    performanceError,
    performanceWarn,
    recentFkProtection,
    unexpectedFindings,
    unusedIndexInfo,
    status: unexpectedFindings.length === 0 ? "PASS" : "FAIL",
  };
}

function formatFinding(finding) {
  const name = findingName(finding.finding) || "unknown";
  const level = finding.level ? ` [${finding.level}]` : "";
  const index = finding.indexName ? ` (${finding.indexName})` : "";
  const title = typeof finding.finding?.title === "string" ? finding.finding.title : "";
  const detail = typeof finding.finding?.detail === "string" ? finding.finding.detail : "";
  const description = title || detail;
  const issues = finding.issues.length > 0 ? ` — contract: ${finding.issues.join(", ")}` : "";
  return `${name}${level}${index}${description ? ` — ${description}` : ""}${issues}`;
}

export function formatPerformanceAdvisorSummary(summary) {
  const lines = [
    `PERFORMANCE_STATUS: ${summary.status}`,
    `PERFORMANCE_ERROR: ${summary.performanceError}`,
    `PERFORMANCE_WARN: ${summary.performanceWarn}`,
    `UNUSED_INDEX_INFO: ${summary.unusedIndexInfo}`,
    `RECENT_FK_PROTECTION: ${summary.recentFkProtection}`,
    `EXPLICIT_PENDING_WORKLOAD: ${summary.explicitPendingWorkload}`,
    `OTHER_NEEDS_WORKLOAD_EVIDENCE: ${summary.otherNeedsWorkloadEvidence}`,
    `IMMEDIATE_INDEX_REMOVAL: ${summary.immediateIndexRemoval}`,
  ];

  if (summary.unexpectedFindings.length > 0) {
    lines.push(
      `PERFORMANCE_NEEDS_ANALYSIS: ${summary.unexpectedFindings.length}`,
      "PERFORMANCE_FINDINGS:",
      ...summary.unexpectedFindings.map(formatFinding),
    );
  }

  return lines.join("\n");
}

export function renderPerformanceAdvisorOutput(output, options = {}) {
  const summary = summarizePerformanceAdvisorOutput(output);
  if (options.raw === true) {
    if (summary.status !== "PASS") throw new Error(formatPerformanceAdvisorSummary(summary));
    return String(output);
  }
  return `${formatPerformanceAdvisorSummary(summary)}\n`;
}

export function parsePerformanceAdvisorArgs(argv) {
  const out = { mode: "linked", raw: false };
  for (const arg of argv) {
    if (arg === "--local") {
      out.mode = "unsupported-local";
    } else if (arg === "--linked") {
      out.mode = "linked";
    } else if (arg === "--raw") {
      out.raw = true;
    }
  }
  return out;
}

function run(command, args, cwd) {
  if (process.platform === "win32") {
    const commandLine = [command, ...args].join(" ");
    return spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    });
  }
  return spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
}

function main() {
  const args = parsePerformanceAdvisorArgs(process.argv.slice(2));
  try {
    if (args.mode === "unsupported-local") {
      throw new Error(
        "Supabase local performance advisors are unsupported in the CURRENT workflow; use the explicitly linked project.",
      );
    }

    const result = run("npx", ["supabase", "db", "advisors", "--linked", ...PERFORMANCE_ADVISOR_COMMAND_OPTIONS], process.cwd());
    if (result.status !== 0) {
      const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
      throw new Error(details ? `Supabase linked performance advisors failed\n${details}` : "Supabase linked performance advisors failed.");
    }

    const summary = summarizePerformanceAdvisorOutput(result.stdout || "");
    process.stdout.write(args.raw && summary.status === "PASS" ? result.stdout || "" : `${formatPerformanceAdvisorSummary(summary)}\n`);
    if (summary.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
