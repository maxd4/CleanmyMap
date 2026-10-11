import { normalizePath } from "./supabase-quota-audit-source.mjs";
import {
  aggregateTables,
  aggregateStorage,
  aggregateRpcs,
  aggregateRealtime,
  aggregateAuth,
} from "./supabase-quota-audit-analysis.mjs";

function formatMarkdownReport(summary) {
  const lines = [];
  lines.push("# Supabase quota audit");
  lines.push("");
  lines.push(`- Scan date: ${summary.generatedAt}`);
  lines.push(`- Root: ${summary.rootDir}`);
  lines.push(`- Files scanned: ${summary.fileCount}`);
  lines.push(`- Findings: ${summary.findings.length}`);
  lines.push("");
  lines.push("## Top tables");
  lines.push("");
  lines.push("| Table | Priorité | Risk | Reads | Writes | Star selects | Unbounded | Client | Mount | Files |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");

  for (const table of summary.tables.slice(0, 15)) {
    lines.push(
      `| \`${table.table}\` | ${table.priorityLabel} (${table.priorityScore}) | ${table.riskLevel} (${table.riskScore}) | ${table.readCount} | ${table.writeCount} | ${table.selectStarCount} | ${table.unboundedSelectCount} | ${table.clientExposureCount} | ${table.mountTriggeredCount} | ${table.files.length} |`,
    );
  }

  lines.push("");
  lines.push("## Highest-risk files");
  lines.push("");
  lines.push("| File | Findings | Notes |");
  lines.push("|---|---:|---|");

  for (const file of summary.files.slice(0, 15)) {
    lines.push(`| \`${file.relativePath}\` | ${file.findings.length} | ${file.notes.join("; ")} |`);
  }

  lines.push("");
  lines.push("## Storage buckets");
  lines.push("");
  lines.push("| Bucket | Ops | Files |");
  lines.push("|---|---:|---:|");
  for (const bucket of summary.storageBuckets.slice(0, 15)) {
    const ops = Object.entries(bucket.operations)
      .map(([name, count]) => `${name}:${count}`)
      .join(", ");
    lines.push(`| \`${bucket.bucket}\` | ${ops || "n/a"} | ${bucket.files.length} |`);
  }

  lines.push("");
  lines.push("## RPCs");
  lines.push("");
  lines.push("| RPC | Count | Files |");
  lines.push("|---|---:|---:|");
  for (const rpc of summary.rpcs.slice(0, 15)) {
    lines.push(`| \`${rpc.rpcName}\` | ${rpc.count} | ${rpc.files.length} |`);
  }

  lines.push("");
  lines.push("## Realtime");
  lines.push("");
  lines.push("| Channel | Count | Files |");
  lines.push("|---|---:|---:|");
  for (const channel of summary.realtime.slice(0, 10)) {
    lines.push(`| \`${channel.channel}\` | ${channel.count} | ${channel.files.length} |`);
  }

  lines.push("");
  lines.push("## Auth");
  lines.push("");
  lines.push("| Method | Count | Files |");
  lines.push("|---|---:|---:|");
  for (const auth of summary.auth.slice(0, 10)) {
    lines.push(`| \`${auth.method}\` | ${auth.count} | ${auth.files.length} |`);
  }

  lines.push("");
  lines.push("## Next actions");
  lines.push("");
  lines.push("- prefer explicit column lists for UI routes");
  lines.push("- keep heavy admin scans and exports outside user-facing flows");
  lines.push("- rerun `backend:supabase:quota-audit` after any new data path");

  return `${lines.join("\n")}\n`;
}

function buildReport(rootDir, fileReports) {
  const tables = aggregateTables(fileReports);
  const storageBuckets = aggregateStorage(fileReports);
  const rpcs = aggregateRpcs(fileReports);
  const realtime = aggregateRealtime(fileReports);
  const auth = aggregateAuth(fileReports);
  const findings = fileReports.flatMap((report) => report.findings);

  const files = fileReports
    .map((report) => {
      const notes = [];
      if (report.isClient) {
        notes.push("client component");
      }
      if (report.useEffectNetworkHits.length > 0) {
        notes.push(`mount network hits: ${report.useEffectNetworkHits.length}`);
      }
      return {
        relativePath: report.relativePath,
        filePath: report.filePath,
        findings: report.findings,
        notes,
      };
    })
    .filter((entry) => entry.findings.length > 0)
    .sort((left, right) => right.findings.length - left.findings.length || left.relativePath.localeCompare(right.relativePath));

  return {
    generatedAt: new Date().toISOString(),
    rootDir: normalizePath(rootDir),
    fileCount: fileReports.length,
    findings,
    files,
    tables,
    storageBuckets,
    rpcs,
    realtime,
    auth,
  };
}

export { formatMarkdownReport, buildReport };
