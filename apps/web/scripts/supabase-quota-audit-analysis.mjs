import { relative, resolve } from "node:path";
import {
  normalizePath,
  readText,
  splitLines,
  getStatement,
  isCountOnlyStatement,
  hasExplicitLimit,
  isStarSelect,
  hasChatRealtimeGuard,
  inferOperation,
  inferStorageOperation,
  captureEffectWindow,
  pushFinding,
} from "./supabase-quota-audit-source.mjs";

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

function scoreOptimizationPriority(bucket) {
  return (
    bucket.unboundedSelectCount * 100 +
    bucket.selectStarCount * 60 +
    bucket.mountTriggeredCount * 35 +
    bucket.clientExposureCount * 20 +
    Math.max(0, bucket.files.size - 1) * 5
  );
}

function classifyOptimizationPriority(score) {
  if (score >= 100) return { level: "P1", label: "P1" };
  if (score >= 60) return { level: "P2", label: "P2" };
  if (score >= 20) return { level: "P3", label: "P3" };
  return { level: "P4", label: "P4" };
}

function analyzeFile(filePath, rootDir, sourceText) {
  const absoluteFilePath = resolve(rootDir, filePath);
  const text = typeof sourceText === "string" ? sourceText : readText(absoluteFilePath);
  const lines = splitLines(text);
  const relativePath = normalizePath(relative(rootDir, absoluteFilePath));
  const isClient = lines.slice(0, 10).some((line) => line.includes('"use client"') || line.includes("'use client'"));
  /** @type {SupabaseQuotaFinding[]} */
  const findings = [];

  const result = {
    filePath: normalizePath(filePath),
    relativePath,
    isClient,
    findings,
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

      const isChatSurface =
        /\/components\/chat\//.test(relativePath) ||
        /\/lib\/chat\//.test(relativePath) ||
        /\/app\/api\/chat\//.test(relativePath);
      if (!isChatSurface) {
        pushFinding(result.findings, {
          type: "realtime",
          resource: channel,
          file: relativePath,
          line: lineIndex + 1,
          message: `Subscription Realtime détectée: ${channel}`,
        });
      } else if (!hasChatRealtimeGuard(text)) {
        pushFinding(result.findings, {
          type: "realtime_chat_unflagged",
          resource: channel,
          file: relativePath,
          line: lineIndex + 1,
          message:
            "Realtime Supabase détecté dans le chat sans feature flag explicite. Garder cette surface désactivée par défaut.",
        });
      }
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
      const priority = scoreOptimizationPriority(entry);
      const priorityLevel = classifyOptimizationPriority(priority);
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
        priorityScore: priority,
        priorityLevel: priorityLevel.level,
        priorityLabel: priorityLevel.label,
        riskScore: scored.score,
        riskLevel: scored.level,
      };
    })
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
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

export {
  analyzeFile,
  aggregateTables,
  aggregateStorage,
  aggregateRpcs,
  aggregateRealtime,
  aggregateAuth,
};
