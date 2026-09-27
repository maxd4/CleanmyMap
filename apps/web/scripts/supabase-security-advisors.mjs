#!/usr/bin/env node
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SECURITY_ADVISOR_COMMAND_OPTIONS = Object.freeze([
  "--type",
  "security",
  "--level",
  "info",
  "--fail-on",
  "none",
  "--output-format",
  "json",
]);

const RLS_ADVISOR_NAMES = new Set([
  "rls_disabled_in_public",
  "rls_enabled_no_policy",
  "policy_exists_rls_disabled",
]);

export const ALLOWED_SERVER_ONLY_RLS_INFO_TABLES = Object.freeze([
  "action_conversation_exclusions",
  "action_share_contact_requests",
  "legal_content_reports",
  "legal_content_report_decisions",
  "user_points",
  "points_ledger",
  "user_badge_totals",
  "badge_events",
]);

const allowedServerOnlyRlsInfoTables = new Set(ALLOWED_SERVER_ONLY_RLS_INFO_TABLES);

function normalizeAdvisorName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function advisorFindingsFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of ["advisors", "findings", "results", "data", "issues"]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
}

export function parseSecurityAdvisorOutput(output) {
  const trimmed = String(output ?? "").trim();
  if (trimmed.length === 0) {
    return [];
  }

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `Supabase security advisors did not return JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return advisorFindingsFromPayload(payload);
}

function findingName(finding) {
  if (!finding || typeof finding !== "object") {
    return "";
  }

  for (const key of ["name", "id", "slug", "key", "code"]) {
    if (typeof finding[key] === "string" && finding[key].trim().length > 0) {
      return finding[key];
    }
  }

  return "";
}

function isAllowedServerOnlyRlsInfo(finding) {
  const name = normalizeAdvisorName(findingName(finding));
  const level = typeof finding?.level === "string" ? finding.level.trim().toUpperCase() : "";
  const metadata = finding?.metadata;
  const tableName = typeof metadata?.name === "string" ? metadata.name : "";
  const detail =
    typeof finding?.detail === "string"
      ? finding.detail.replaceAll("\\`", "`")
      : "";

  return (
    name === "rls_enabled_no_policy" &&
    level === "INFO" &&
    metadata?.type === "table" &&
    allowedServerOnlyRlsInfoTables.has(tableName) &&
    detail === `Table \`public.${tableName}\` has RLS enabled, but no policies exist`
  );
}

function isRlsContractFinding(finding) {
  const name = normalizeAdvisorName(findingName(finding));
  if (isAllowedServerOnlyRlsInfo(finding)) {
    return false;
  }

  if (RLS_ADVISOR_NAMES.has(name)) {
    return true;
  }

  // Keep the filter explicit while accepting renamed Supabase equivalents
  // that still describe a disabled RLS contract or a missing policy.
  return (
    name.includes("rls") &&
    (name.includes("disabled") || name.includes("no_policy") || name.includes("policy_exists"))
  );
}

export function findRlsContractFindings(output) {
  return parseSecurityAdvisorOutput(output).filter(isRlsContractFinding);
}

function findAcceptedInfoContractIssues(findings) {
  const acceptedFindings = findings.filter(isAllowedServerOnlyRlsInfo);
  const countsByTable = new Map();
  for (const finding of acceptedFindings) {
    const tableName = finding.metadata.name;
    countsByTable.set(tableName, (countsByTable.get(tableName) ?? 0) + 1);
  }

  const missingTables = ALLOWED_SERVER_ONLY_RLS_INFO_TABLES.filter(
    (tableName) => !countsByTable.has(tableName),
  );
  const duplicateTables = ALLOWED_SERVER_ONLY_RLS_INFO_TABLES.filter(
    (tableName) => (countsByTable.get(tableName) ?? 0) > 1,
  );

  return { acceptedFindings, missingTables, duplicateTables };
}

function summarizeFindings(findings) {
  const { acceptedFindings, missingTables, duplicateTables } = findAcceptedInfoContractIssues(findings);
  const rlsContractFindings = findings.filter(isRlsContractFinding);
  const otherSecurityFindings = findings.filter(
    (finding) => !isAllowedServerOnlyRlsInfo(finding) && !isRlsContractFinding(finding),
  );
  const rlsContractActionable =
    rlsContractFindings.length + missingTables.length + duplicateTables.length;

  return {
    acceptedInfoCount: acceptedFindings.length,
    duplicateTables,
    missingTables,
    otherSecurityFindings,
    rlsContractActionable,
    rlsContractFindings,
  };
}

export function summarizeSecurityAdvisorOutput(output) {
  return summarizeFindings(parseSecurityAdvisorOutput(output));
}

function formatSecurityFinding(finding) {
  const name = findingName(finding) || "unknown";
  const title = typeof finding?.title === "string" ? finding.title : "";
  const detail = typeof finding?.detail === "string" ? finding.detail : "";
  const level = typeof finding?.level === "string" ? ` [${finding.level}]` : "";
  const description = title || detail;
  return `${name}${level}${description ? ` — ${description}` : ""}`;
}

export function formatSecurityAdvisorSummary(summary) {
  const lines = [
    `RLS_CONTRACT_STATUS: ${summary.rlsContractActionable === 0 ? "PASS" : "FAIL"}`,
    `RLS_CONTRACT_ACTIONABLE: ${summary.rlsContractActionable}`,
    `RLS_ACCEPTED_INFO: ${summary.acceptedInfoCount}`,
  ];

  if (summary.otherSecurityFindings.length > 0) {
    lines.push(
      `OTHER_SECURITY_FINDINGS: ${summary.otherSecurityFindings.length}`,
      "OTHER_SECURITY_FINDINGS_DETAIL:",
      ...summary.otherSecurityFindings.map(formatSecurityFinding),
    );
  }

  if (summary.rlsContractActionable > 0) {
    lines.push("RLS_CONTRACT_FINDINGS:");
    lines.push(...summary.rlsContractFindings.map(formatSecurityFinding));
    lines.push(
      ...summary.missingTables.map(
        (tableName) => `missing accepted INFO [${tableName}] — allowlisted finding not returned`,
      ),
      ...summary.duplicateTables.map(
        (tableName) => `duplicate accepted INFO [${tableName}] — allowlisted finding returned more than once`,
      ),
    );
  }

  return lines.join("\n");
}

function assertRlsContractClear(summary) {
  if (summary.rlsContractActionable > 0) {
    throw new Error(formatSecurityAdvisorSummary(summary));
  }
}

export function renderSecurityAdvisorOutput(output, options = {}) {
  const summary = summarizeSecurityAdvisorOutput(output);
  assertRlsContractClear(summary);
  if (options.raw === true) {
    return String(output);
  }
  return `${formatSecurityAdvisorSummary(summary)}\n`;
}

export function parseSecurityAdvisorArgs(argv) {
  const out = {
    mode: "linked",
    raw: false,
  };

  for (const arg of argv) {
    if (arg === "--local") {
      out.mode = "unsupported-local";
      continue;
    }
    if (arg === "--linked") {
      out.mode = "linked";
      continue;
    }
    if (arg === "--raw") {
      out.raw = true;
      continue;
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

  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function runSupabase(args, cwd) {
  return run("npx", ["supabase", ...args], cwd);
}

function formatError(title, result) {
  const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return details ? `${title}\n${details}` : title;
}

function formatLinked403Help(result) {
  const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const accessTokenHelp = [
    "Supabase linked security advisors require an authenticated CLI session with project access and the minimum `Advisors Read` permission.",
    "Authenticate with the secure Supabase CLI login or a scoped PAT through `SUPABASE_ACCESS_TOKEN`; never expose the credential.",
    "If the project is not visible, verify the project ref, account, organization, and scoped permissions; Owner/Admin is not intrinsically required.",
    "A local containerized runtime is not supported by the CURRENT workflow; use the explicitly linked project instead.",
  ].join(" ");

  if (!details) {
    return accessTokenHelp;
  }

  return `${details}\n\n${accessTokenHelp}`;
}

function runLinkedAdvisors(cwd, options) {
  const advisors = runSupabase(
    ["db", "advisors", "--linked", ...SECURITY_ADVISOR_COMMAND_OPTIONS],
    cwd,
  );
  if (advisors.status !== 0) {
    const combinedOutput = `${advisors.stdout || ""}\n${advisors.stderr || ""}`;
    if (
      advisors.status === 403 ||
      combinedOutput.includes("necessary privileges to access this endpoint") ||
      combinedOutput.includes("LegacyDbConfigLoginRoleStatusError")
    ) {
      throw new Error(`Supabase linked security advisors failed with 403.\n${formatLinked403Help(advisors)}`);
    }

    throw new Error(formatError("Supabase linked security advisors failed", advisors));
  }

  process.stdout.write(renderSecurityAdvisorOutput(advisors.stdout || "", options));
}

function main() {
  const cwd = process.cwd();
  const args = parseSecurityAdvisorArgs(process.argv.slice(2));

  try {
    if (args.mode === "unsupported-local") {
      throw new Error(
        "Supabase local security advisors are unsupported in the CURRENT workflow; use the explicitly linked project.",
      );
    }

    runLinkedAdvisors(cwd, args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
