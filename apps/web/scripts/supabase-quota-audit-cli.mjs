import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

import { resolveValidationCommand } from "../../../scripts/ci/validation-process.mjs";
import {
  DB_ADVISOR_TYPES,
  listFilesRecursive,
  readText,
  splitLines,
  resolveWebRoot,
} from "./supabase-quota-audit-source.mjs";
import { analyzeFile } from "./supabase-quota-audit-analysis.mjs";
import { buildReport, formatMarkdownReport } from "./supabase-quota-audit-report.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, value, "utf8");
}

function readEnvFileValue(filePath, key) {
  if (!existsSync(filePath)) {
    return null;
  }

  const text = readText(filePath);
  for (const rawLine of splitLines(text)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const prefix = `${key}=`;
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    }
  }
  return null;
}

function resolveDbUrl(rootDir) {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    readEnvFileValue(join(rootDir, ".env.local"), "POSTGRES_URL_NON_POOLING") ||
    readEnvFileValue(join(rootDir, ".env.local"), "SUPABASE_DB_URL")
  );
}

function run(command, args, cwd) {
  const resolved = resolveValidationCommand({ executable: command, args });
  return spawnSync(resolved.executable, resolved.args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function runSupabase(args, cwd) {
  return run("npx", ["supabase", ...args], cwd);
}

function saveAdvisorSnapshot(rootDir, outputRoot, type, dbUrl) {
  const result = runSupabase(["db", "advisors", "--db-url", dbUrl, "--type", type], rootDir);
  const suffix = `supabase-db-advisors-${type}`;
  writeText(join(outputRoot, `${suffix}.stdout.txt`), result.stdout || "");
  writeText(join(outputRoot, `${suffix}.stderr.txt`), result.stderr || "");
  writeJson(join(outputRoot, `${suffix}.json`), {
    type,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  });
  return result.status === 0;
}

function saveLintSnapshot(rootDir, outputRoot, dbUrl) {
  const result = runSupabase(["db", "lint", "--db-url", dbUrl, "--schema", "public"], rootDir);
  writeText(join(outputRoot, "supabase-db-lint.stdout.txt"), result.stdout || "");
  writeText(join(outputRoot, "supabase-db-lint.stderr.txt"), result.stderr || "");
  writeJson(join(outputRoot, "supabase-db-lint.json"), {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  });
  return result.status === 0;
}

function main() {
  const cwd = process.cwd();
  const rootDir = resolveWebRoot(cwd);
  const outputRoot = resolve(rootDir, "..", "..", "artifacts", "supabase", "quota-audit");
  const withDb = process.argv.includes("--with-db");

  const files = listFilesRecursive(rootDir);
  const fileReports = files.map((filePath) => analyzeFile(filePath, rootDir));
  const summary = buildReport(rootDir, fileReports);

  ensureDir(outputRoot);
  writeJson(join(outputRoot, "repo-audit.json"), summary);
  writeText(join(outputRoot, "repo-audit.md"), formatMarkdownReport(summary));

  writeJson(join(outputRoot, "table-risk-report.json"), {
    generatedAt: summary.generatedAt,
    tables: summary.tables,
  });

  const tableRiskLines = [
    "# Table risk report",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    "| Table | Priorité | Risk | Reads | Writes | Star selects | Unbounded | Client | Mount | Files |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summary.tables.map(
      (table) =>
        `| \`${table.table}\` | ${table.priorityLabel} (${table.priorityScore}) | ${table.riskLevel} (${table.riskScore}) | ${table.readCount} | ${table.writeCount} | ${table.selectStarCount} | ${table.unboundedSelectCount} | ${table.clientExposureCount} | ${table.mountTriggeredCount} | ${table.files.length} |`,
    ),
    "",
  ];
  writeText(join(outputRoot, "table-risk-report.md"), `${tableRiskLines.join("\n")}`);

  const dbUrl = resolveDbUrl(rootDir);
  if (withDb) {
    if (!dbUrl) {
      writeText(
        join(outputRoot, "db-snapshot-skipped.txt"),
        "Skipped Supabase advisor snapshot because POSTGRES_URL_NON_POOLING/SUPABASE_DB_URL was not available.\n",
      );
    } else {
      const dbOk = DB_ADVISOR_TYPES.map((type) => saveAdvisorSnapshot(rootDir, outputRoot, type, dbUrl)).every(Boolean);
      const lintOk = saveLintSnapshot(rootDir, outputRoot, dbUrl);
      writeJson(join(outputRoot, "db-snapshot-status.json"), {
        generatedAt: new Date().toISOString(),
        dbOk,
        lintOk,
        dbUrlPresent: true,
      });
    }
  }

  console.log(`Supabase quota audit written to ${outputRoot}`);
}

export { main, resolveDbUrl };
