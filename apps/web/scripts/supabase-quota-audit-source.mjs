import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const SOURCE_ROOTS = ["src", "scripts"];
const DB_ADVISOR_TYPES = ["performance", "security"];

/**
 * @typedef {Object} SupabaseQuotaFinding
 * @property {string} type
 * @property {string} resource
 * @property {string} file
 * @property {number} line
 * @property {string} message
 */

/**
 * @param {SupabaseQuotaFinding[]} findings
 * @param {SupabaseQuotaFinding} finding
 */
function pushFinding(findings, finding) {
  findings.push(finding);
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
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

function hasChatRealtimeGuard(sourceText) {
  return (
    /NEXT_PUBLIC_ENABLE_SUPABASE_CHAT_REALTIME/.test(sourceText) ||
    /isChatRealtimeEnabled\s*\(/.test(sourceText)
  );
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

export {
  DB_ADVISOR_TYPES,
  normalizePath,
  resolveWebRoot,
  listFilesRecursive,
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
};
