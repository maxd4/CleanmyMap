#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, relative, extname, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const SOURCE_ROOTS = ["src", "scripts"];
const DB_ADVISOR_TYPES = ["performance", "security"];

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function resolveWebRoot(cwd) {
  if (existsSync(join(cwd, "src")) && existsSync(join(cwd, "scripts"))) {
    return cwd;
  }

  const candidate = join(cwd, "apps", "web");
  if (existsSync(join(candidate, "src")) && existsSync(join(candidate, "scripts"))) {
    return candidate;
  }

  throw new Error("Unable to locate the apps/web workspace root for the Supabase quota audit.");
}

function listFilesRecursive(rootDir) {
  const files = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (
        SOURCE_EXTENSIONS.has(extname(entry.name)) &&
        !/\.test\.[^.]+$/i.test(entry.name) &&
        !/\.spec\.[^.]+$/i.test(entry.name)
      ) {
        files.push(fullPath);
      }
    }
  }

  for (const folder of SOURCE_ROOTS) {
    const fullPath = join(rootDir, folder);
    if (existsSync(fullPath)) {
      walk(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function lineNumberFromIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function getStatement(lines, startIndex, maxLookahead = 12) {
  const fragments = [];
  for (let index = startIndex; index < Math.min(lines.length, startIndex + maxLookahead); index += 1) {
    fragments.push(lines[index]);
    if (lines[index].includes(";")) {
      break;
    }
  }
  return fragments.join("\n");
}

function isCountOnlyStatement(statement) {
  return /head\s*:\s*true/.test(statement) && /count\s*:\s*["']exact["']/.test(statement);
}

function hasExplicitLimit(statement) {
  return (
    /\.limit\(/.test(statement) ||
    /\.range\(/.test(statement) ||
    /\.single\(/.test(statement) ||
    /\.maybeSingle\(/.test(statement)
  );
}

function isStarSelect(statement) {
  return /\.select\(\s*["'`]\*\s*["'`]\s*(?:,|\)|$)/.test(statement);
}

function inferOperation(statement) {
  if (/\.insert\(/.test(statement)) return "write";
  if (/\.upsert\(/.test(statement)) return "write";
  if (/\.update\(/.test(statement)) return "write";
  if (/\.delete\(/.test(statement)) return "write";
  if (/\.select\(/.test(statement)) return "read";
  return "unknown";
}

function inferStorageOperation(statement) {
  if (/\.upload\(/.test(statement)) return "upload";
  if (/\.download\(/.test(statement)) return "download";
  if (/\.list\(/.test(statement)) return "list";
  if (/\.remove\(/.test(statement)) return "remove";
  return "storage";
}

function captureEffectWindow(lines, startIndex, maxLookahead = 40) {
  const fragments = [];
  for (let index = startIndex; index < Math.min(lines.length, startIndex + maxLookahead); index += 1) {
    fragments.push(lines[index]);
    if (lines[index].includes("});") || lines[index].includes("}, [")) {
      break;
    }
  }
  return fragments.join("\n");
}

function scoreRisk(bucket) {
  const base =
    bucket.readCount * 2 +
    bucket.writeCount * 4 +
    bucket.rpcCount * 3 +
    bucket.selectStarCount * 8 +
    bucket.unboundedSelectCount * 6 +
    bucket.clientExposureCount * 4 +
    bucket.mountTriggeredCount * 5 +
    bucket.repeatFileCount;

  if (base >= 80) return { score: base, level: "critical" };
  if (base >= 40) return { score: base, level: "high" };
  if (base >= 20) return { score: base, level: "medium" };
  return { score: base, level: "low" };
}

function pushFinding(findings, finding) {
  findings.push(finding);
}

function analyzeFile(filePath, rootDir, sourceText) {
  const absoluteFilePath = resolve(rootDir, filePath);
  const text = typeof sourceText === "string" ? sourceText : readText(absoluteFilePath);
  const lines = splitLines(text);
  const relativePath = normalizePath(relative(rootDir, absoluteFilePath));
  const isClient = lines.slice(0, 10).some((line) => line.includes('"use client"') || line.includes("'use client'"));

  const result = {
    filePath: normalizePath(filePath),
    relativePath,
    isClient,
    findings: [],
    tables: new Map(),
    rpcCalls: new Map(),
    storageBuckets: new Map(),
    realtimeChannels: new Map(),
    authCalls: new Map(),
    useEffectNetworkHits: [],
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    for (const match of line.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
      const table = match[1];
      const statement = getStatement(lines, lineIndex);
      const operation = inferOperation(statement);
      const isRead = operation === "read";
      const isWrite = operation === "write";
      const isCountOnly = isRead && isCountOnlyStatement(statement);
      const selectStar = isRead && isStarSelect(statement) && !isCountOnly;
      const unbounded = isRead && !isCountOnly && !hasExplicitLimit(statement);

      const entry = result.tables.get(table) ?? {
        table,
        readCount: 0,
        writeCount: 0,
        selectStarCount: 0,
        unboundedSelectCount: 0,
        clientExposureCount: 0,
        mountTriggeredCount: 0,
        rpcCount: 0,
        fileCount: 0,
        files: new Set(),
        sampleFindings: [],
      };

      const isNewFile = !entry.files.has(relativePath);
      if (isNewFile) {
        entry.fileCount += 1;
      }
      entry.files.add(relativePath);
      if (isRead) entry.readCount += 1;
      if (isWrite) entry.writeCount += 1;
      if (selectStar) entry.selectStarCount += 1;
      if (unbounded) entry.unboundedSelectCount += 1;
      if (isClient) entry.clientExposureCount += 1;

      if (selectStar) {
        pushFinding(result.findings, {
          type: "select_star",
          resource: table,
          file: relativePath,
          line: lineIndex + 1,
          message: `SELECT * détecté sur ${table}`,
        });
      }

      if (unbounded) {
        pushFinding(result.findings, {
          type: "unbounded_select",
          resource: table,
          file: relativePath,
          line: lineIndex + 1,
          message: `Requête non bornée détectée sur ${table}`,
        });
      }

      result.tables.set(table, entry);
    }

    for (const match of line.matchAll(/\.rpc\(\s*["'`]([^"'`]+)["'`]\s*/g)) {
      const rpcName = match[1];
      const statement = getStatement(lines, lineIndex);
      const entry = result.rpcCalls.get(rpcName) ?? {
        rpcName,
        count: 0,
        files: new Set(),
      };
      entry.count += 1;
      entry.files.add(relativePath);
      result.rpcCalls.set(rpcName, entry);
      pushFinding(result.findings, {
        type: "rpc",
        resource: rpcName,
        file: relativePath,
        line: lineIndex + 1,
        message: `RPC détectée: ${rpcName}`,
      });

      if (/\.rpc\(/.test(statement) && /select\(/.test(statement)) {
        const tableMatch = statement.match(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/);
        if (tableMatch) {
          const table = tableMatch[1];
          const tableEntry = result.tables.get(table);
          if (tableEntry) {
            tableEntry.rpcCount += 1;
          }
        }
      }
    }

    for (const match of line.matchAll(/\.storage\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
      const bucket = match[1];
      const statement = getStatement(lines, lineIndex, 16);
      const operation = inferStorageOperation(statement);
      const entry = result.storageBuckets.get(bucket) ?? {
        bucket,
        count: 0,
        operations: new Map(),
        files: new Set(),
      };
      entry.count += 1;
      entry.files.add(relativePath);
      entry.operations.set(operation, (entry.operations.get(operation) ?? 0) + 1);
      result.storageBuckets.set(bucket, entry);
      pushFinding(result.findings, {
        type: "storage",
        resource: bucket,
        file: relativePath,
        line: lineIndex + 1,
        message: `Storage ${operation} sur ${bucket}`,
      });
    }

    for (const match of line.matchAll(/\.channel\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
      const channel = match[1];
      const entry = result.realtimeChannels.get(channel) ?? {
        channel,
        count: 0,
        files: new Set(),
      };
      entry.count += 1;
      entry.files.add(relativePath);
      result.realtimeChannels.set(channel, entry);
      pushFinding(result.findings, {
        type: "realtime",
        resource: channel,
        file: relativePath,
        line: lineIndex + 1,
        message: `Subscription Realtime détectée: ${channel}`,
      });
    }

    for (const match of line.matchAll(/\bsupabase\.auth\.(getUser|getSession|onAuthStateChange|signInAnonymously|signOut|signInWithPassword|signInWithOtp|signUp)\b/g)) {
      const method = match[1];
      const entry = result.authCalls.get(method) ?? {
        method,
        count: 0,
        files: new Set(),
      };
      entry.count += 1;
      entry.files.add(relativePath);
      result.authCalls.set(method, entry);
      pushFinding(result.findings, {
        type: "auth",
        resource: method,
        file: relativePath,
        line: lineIndex + 1,
        message: `Appel Supabase Auth détecté: ${method}`,
      });
    }

    if (/useEffect\s*\(/.test(line)) {
      const windowText = captureEffectWindow(lines, lineIndex);
      const hasNetworkCall = /fetch\(|\.from\(|\.rpc\(|\.storage\.from\(|\.channel\(/.test(windowText);
      const isMountEffect = /\[\s*\]/.test(windowText);
      if (hasNetworkCall && isMountEffect) {
        for (const match of windowText.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
          const table = match[1];
          const entry = result.tables.get(table);
          if (entry) {
            entry.mountTriggeredCount += 1;
            result.tables.set(table, entry);
          }
        }
        pushFinding(result.findings, {
          type: "mount_network",
          resource: "useEffect",
          file: relativePath,
          line: lineIndex + 1,
          message: "Réseau déclenché au montage détecté",
        });
        result.useEffectNetworkHits.push({
          file: relativePath,
          line: lineIndex + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  for (const [table, entry] of result.tables.entries()) {
    if (entry.selectStarCount > 0 || entry.unboundedSelectCount > 0 || entry.clientExposureCount > 0 || entry.mountTriggeredCount > 0) {
      entry.sampleFindings = result.findings
        .filter((finding) => finding.resource === table)
        .slice(0, 5);
    }
  }

  return {
    ...result,
    tables: [...result.tables.values()].map((entry) => ({
      ...entry,
      files: [...entry.files],
    })),
    rpcCalls: [...result.rpcCalls.values()].map((entry) => ({
      ...entry,
      files: [...entry.files],
    })),
    storageBuckets: [...result.storageBuckets.values()].map((entry) => ({
      ...entry,
      operations: Object.fromEntries(entry.operations.entries()),
      files: [...entry.files],
    })),
    realtimeChannels: [...result.realtimeChannels.values()].map((entry) => ({
      ...entry,
      files: [...entry.files],
    })),
    authCalls: [...result.authCalls.values()].map((entry) => ({
      ...entry,
      files: [...entry.files],
    })),
  };
}

function aggregateTables(fileReports) {
  const tableMap = new Map();

  for (const report of fileReports) {
    for (const table of report.tables) {
      const entry = tableMap.get(table.table) ?? {
        table: table.table,
        readCount: 0,
        writeCount: 0,
        selectStarCount: 0,
        unboundedSelectCount: 0,
        clientExposureCount: 0,
        mountTriggeredCount: 0,
        rpcCount: 0,
        fileCount: 0,
        files: new Set(),
        findings: [],
      };

      entry.readCount += table.readCount;
      entry.writeCount += table.writeCount;
      entry.selectStarCount += table.selectStarCount;
      entry.unboundedSelectCount += table.unboundedSelectCount;
      entry.clientExposureCount += table.clientExposureCount;
      entry.mountTriggeredCount += table.mountTriggeredCount;
      entry.rpcCount += table.rpcCount;
      entry.fileCount += table.fileCount;
      for (const file of table.files) {
        entry.files.add(file);
      }
      entry.findings.push(...report.findings.filter((finding) => finding.resource === table.table));
      tableMap.set(table.table, entry);
    }
  }

  return [...tableMap.values()]
    .map((entry) => {
      const scored = scoreRisk({
        readCount: entry.readCount,
        writeCount: entry.writeCount,
        rpcCount: entry.rpcCount,
        selectStarCount: entry.selectStarCount,
        unboundedSelectCount: entry.unboundedSelectCount,
        clientExposureCount: entry.clientExposureCount,
        mountTriggeredCount: entry.mountTriggeredCount,
        repeatFileCount: Math.max(0, entry.files.size - 1),
      });
      return {
        ...entry,
        files: [...entry.files],
        riskScore: scored.score,
        riskLevel: scored.level,
      };
    })
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) return right.riskScore - left.riskScore;
      if (right.readCount !== left.readCount) return right.readCount - left.readCount;
      if (right.writeCount !== left.writeCount) return right.writeCount - left.writeCount;
      return left.table.localeCompare(right.table);
    });
}

function aggregateStorage(fileReports) {
  const bucketMap = new Map();
  for (const report of fileReports) {
    for (const bucket of report.storageBuckets) {
      const entry = bucketMap.get(bucket.bucket) ?? {
        bucket: bucket.bucket,
        count: 0,
        operations: new Map(),
        files: new Set(),
      };
      entry.count += bucket.count;
      for (const [operation, count] of Object.entries(bucket.operations)) {
        entry.operations.set(operation, (entry.operations.get(operation) ?? 0) + count);
      }
      for (const file of bucket.files) {
        entry.files.add(file);
      }
      bucketMap.set(bucket.bucket, entry);
    }
  }

  return [...bucketMap.values()]
    .map((entry) => ({
      bucket: entry.bucket,
      count: entry.count,
      operations: Object.fromEntries(entry.operations.entries()),
      files: [...entry.files],
    }))
    .sort((left, right) => right.count - left.count || left.bucket.localeCompare(right.bucket));
}

function aggregateRpcs(fileReports) {
  const rpcMap = new Map();
  for (const report of fileReports) {
    for (const rpc of report.rpcCalls) {
      const entry = rpcMap.get(rpc.rpcName) ?? {
        rpcName: rpc.rpcName,
        count: 0,
        files: new Set(),
      };
      entry.count += rpc.count;
      for (const file of rpc.files) {
        entry.files.add(file);
      }
      rpcMap.set(rpc.rpcName, entry);
    }
  }
  return [...rpcMap.values()]
    .map((entry) => ({
      rpcName: entry.rpcName,
      count: entry.count,
      files: [...entry.files],
    }))
    .sort((left, right) => right.count - left.count || left.rpcName.localeCompare(right.rpcName));
}

function aggregateRealtime(fileReports) {
  const channelMap = new Map();
  for (const report of fileReports) {
    for (const channel of report.realtimeChannels) {
      const entry = channelMap.get(channel.channel) ?? {
        channel: channel.channel,
        count: 0,
        files: new Set(),
      };
      entry.count += channel.count;
      for (const file of channel.files) {
        entry.files.add(file);
      }
      channelMap.set(channel.channel, entry);
    }
  }
  return [...channelMap.values()]
    .map((entry) => ({
      channel: entry.channel,
      count: entry.count,
      files: [...entry.files],
    }))
    .sort((left, right) => right.count - left.count || left.channel.localeCompare(right.channel));
}

function aggregateAuth(fileReports) {
  const methodMap = new Map();
  for (const report of fileReports) {
    for (const auth of report.authCalls) {
      const entry = methodMap.get(auth.method) ?? {
        method: auth.method,
        count: 0,
        files: new Set(),
      };
      entry.count += auth.count;
      for (const file of auth.files) {
        entry.files.add(file);
      }
      methodMap.set(auth.method, entry);
    }
  }
  return [...methodMap.values()]
    .map((entry) => ({
      method: entry.method,
      count: entry.count,
      files: [...entry.files],
    }))
    .sort((left, right) => right.count - left.count || left.method.localeCompare(right.method));
}

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
  lines.push("| Table | Risk | Reads | Writes | Star selects | Unbounded | Client | Mount | Files |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");

  for (const table of summary.tables.slice(0, 15)) {
    lines.push(
      `| \`${table.table}\` | ${table.riskLevel} (${table.riskScore}) | ${table.readCount} | ${table.writeCount} | ${table.selectStarCount} | ${table.unboundedSelectCount} | ${table.clientExposureCount} | ${table.mountTriggeredCount} | ${table.files.length} |`,
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
  if (process.platform === "win32") {
    const escapePowershellArg = (value) => {
      const text = String(value);
      return `'${text.replace(/'/g, "''")}'`;
    };
    const commandLine = `& ${escapePowershellArg(command)} ${args.map(escapePowershellArg).join(" ")}`;
    return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", commandLine], {
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
  const command = process.platform === "win32" ? join(dirname(process.execPath), "npx.ps1") : "npx";
  return run(command, ["supabase", ...args], cwd);
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
    "| Table | Risk | Reads | Writes | Star selects | Unbounded | Client | Mount | Files |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summary.tables.map(
      (table) =>
        `| \`${table.table}\` | ${table.riskLevel} (${table.riskScore}) | ${table.readCount} | ${table.writeCount} | ${table.selectStarCount} | ${table.unboundedSelectCount} | ${table.clientExposureCount} | ${table.mountTriggeredCount} | ${table.files.length} |`,
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

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  main();
}

export {
  analyzeFile,
  aggregateTables,
  buildReport,
  formatMarkdownReport,
  listFilesRecursive,
  resolveDbUrl,
};
