#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const ROOT = resolve(".");
const DEFAULT_ALLOWLIST = "scripts/secret-audit.allowlist.json";
const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
]);
const EXACT_SCANNED_FILES = new Set([".env.example"]);
const IGNORED_SEGMENTS = new Set([
  ".git",
  ".next",
  ".playwright-mcp",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "screenshots",
  "playwright-report",
  "test-results",
  "artifacts",
]);
const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "secret-audit.allowlist.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "routes-manifest-deterministic.json",
]);
const PUBLIC_EMAIL_DOMAINS = new Set([
  "basbelleville.fr",
  "cartonplein.org",
  "cleanmymap.fr",
  "cleanmymap.local",
  "example.com",
  "example.org",
  "example.net",
  "github.com",
  "gmail.com",
  "lacloche.org",
  "latextilerie.fr",
  "mail.cleanmymap.fr",
  "pikpik.org",
]);
const PUBLIC_SUPABASE_URLS = new Set(["https://mgvmuambbxmmkrjjlryo.supabase.co"]);

const SECRET_PATTERNS = [
  {
    category: "JWT token",
    severity: "high",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    category: "AWS access key",
    severity: "critical",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    category: "Clerk publishable key",
    severity: "medium",
    regex: /\bpk_(?:test|live)_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: "Clerk secret key",
    severity: "critical",
    regex: /\bsk_(?:test|live)_[A-Za-z0-9_-]{20,}\b/g,
    context: /clerk/i,
  },
  {
    category: "Stripe secret key",
    severity: "critical",
    regex: /\bsk_(?:test|live)_[A-Za-z0-9]{20,}\b/g,
    context: /stripe/i,
  },
  {
    category: "Stripe publishable key",
    severity: "medium",
    regex: /\bpk_(?:test|live)_[A-Za-z0-9]{20,}\b/g,
    context: /stripe/i,
  },
  {
    category: "Stripe webhook secret",
    severity: "critical",
    regex: /\bwhsec_[A-Za-z0-9]{20,}\b/g,
  },
  {
    category: "Resend API key",
    severity: "critical",
    regex: /\bre_[A-Za-z0-9]{20,}\b/g,
  },
  {
    category: "Sentry DSN",
    severity: "high",
    regex: /\bhttps:\/\/[a-f0-9]{16,}@[a-z0-9.-]*sentry\.io\/[0-9]+\b/gi,
  },
  {
    category: "PostHog key",
    severity: "medium",
    regex: /\bphc_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    category: "Pinecone API key",
    severity: "critical",
    regex: /\bpcsk_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: "Upstash Redis REST token",
    severity: "critical",
    regex: /\b[A-Za-z0-9_-]{32,}\b/g,
    context: /UPSTASH_REDIS_REST_TOKEN|upstash.*token/i,
  },
  {
    category: "Upstash Redis REST URL",
    severity: "high",
    regex: /\bhttps:\/\/[a-z0-9-]+\.upstash\.io\b/gi,
  },
  {
    category: "Supabase URL",
    severity: "medium",
    regex: /\bhttps:\/\/[a-z0-9]{20}\.supabase\.co\b/gi,
    validator: isSuspiciousSupabaseUrl,
  },
  {
    category: "Supabase anon/service-role key",
    severity: "critical",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    context: /SUPABASE|service[_-]?role|anon/i,
  },
  {
    category: "Email address",
    severity: "medium",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    validator: isSuspiciousEmail,
  },
  {
    category: "Sensitive URL",
    severity: "high",
    regex: /\bhttps?:\/\/[^\s"'<>`)]*(?:token|secret|key|apikey|api_key|password|pwd|signature|sig|auth|access_token|refresh_token)=[^\s"'<>`)]+/gi,
  },
  {
    category: "Hash digest",
    severity: "low",
    regex: /\b(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi,
    context: /hash|digest|checksum|signature|md5|sha1|sha256|password|token|secret/i,
  },
  {
    category: "Long base64-like string",
    severity: "medium",
    regex: /\b(?:[A-Za-z0-9+/]{80,}={0,2}|[A-Za-z0-9_-]{80,})\b/g,
    validator: isSuspiciousBase64,
  },
];

function parseArgs(argv) {
  const options = {
    allowlistPath: existsSync(resolve(ROOT, DEFAULT_ALLOWLIST))
      ? DEFAULT_ALLOWLIST
      : null,
    showHelp: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    } else if (arg.startsWith("--allowlist=")) {
      options.allowlistPath = arg.slice("--allowlist=".length);
    } else if (arg === "--no-allowlist") {
      options.allowlistPath = null;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run security:secrets -- [options]

Options:
  --allowlist=PATH   Exclude documented false positives from a JSON allowlist.
  --no-allowlist     Run without any allowlist.
  --help             Show this help.

Allowlist entries:
  { "path": "documentation/security/example.md", "category": "Email address", "contains": "contact[at]example.com", "reason": "Documented placeholder" }
`);
}

function listRepoFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldScan(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const parts = normalized.split("/");

  if (parts.some((part) => IGNORED_SEGMENTS.has(part))) {
    return false;
  }
  if (IGNORED_FILENAMES.has(parts.at(-1))) {
    return false;
  }
  if (normalized.includes("/generated/") || normalized.includes("__generated__")) {
    return false;
  }
  if (EXACT_SCANNED_FILES.has(normalized)) {
    return true;
  }

  return SCANNED_EXTENSIONS.has(extname(normalized).toLowerCase());
}

function loadAllowlist(relativePath) {
  if (!relativePath) {
    return [];
  }
  const absolutePath = resolve(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Allowlist not found: ${relativePath}`);
  }
  const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  if (!Array.isArray(parsed.allow)) {
    throw new Error(`Allowlist must contain an "allow" array: ${relativePath}`);
  }
  return parsed.allow;
}

function isPublicEmailAddress(value) {
  const normalized = value.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1).replace(/[)>.,;:'"`\]]+$/g, "");
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}

function isSuspiciousEmail(value) {
  return !isPublicEmailAddress(value);
}

function isSuspiciousSupabaseUrl(value) {
  return !PUBLIC_SUPABASE_URLS.has(value.toLowerCase());
}

function isAllowed(finding, allowlist) {
  return allowlist.some((entry) => {
    if (entry.path && entry.path !== finding.file) {
      return false;
    }
    if (entry.category && entry.category !== finding.category) {
      return false;
    }
    if (entry.line && entry.line !== finding.line) {
      return false;
    }
    if (entry.contains && !finding.raw.includes(entry.contains)) {
      return false;
    }
    return Boolean(entry.reason);
  });
}

function maskSecret(value) {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 12) {
    return `${compact.slice(0, 3)}...`;
  }
  return `${compact.slice(0, 6)}...${compact.slice(-6)}`;
}

function maskLine(line, value) {
  return line.replace(value, maskSecret(value)).trim();
}

function shannonEntropy(value) {
  const counts = new Map();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function isSuspiciousBase64(value, line) {
  if (/data:image|<svg|integrity=|sha\d-/i.test(line)) {
    return false;
  }
  if (/^[A-Fa-f0-9]+$/.test(value)) {
    return false;
  }
  return shannonEntropy(value) >= 4.4;
}

function scanLine(file, line, lineNumber) {
  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.context && !pattern.context.test(line)) {
      continue;
    }
    pattern.regex.lastIndex = 0;
    for (const match of line.matchAll(pattern.regex)) {
      const raw = match[0];
      if (pattern.validator && !pattern.validator(raw, line)) {
        continue;
      }
      findings.push({
        file,
        line: lineNumber,
        category: pattern.category,
        severity: pattern.severity,
        raw,
        excerpt: maskLine(line, raw),
      });
    }
  }

  return findings;
}

function scanFile(relativePath) {
  const absolutePath = resolve(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }
  const content = readFileSync(absolutePath, "utf8");
  const lines = content.split(/\r?\n/);
  return lines.flatMap((line, index) => scanLine(relativePath, line, index + 1));
}

function printSummary(findings, scannedCount, allowlistPath) {
  if (findings.length === 0) {
    console.log(`[secret-audit] OK: ${scannedCount} file(s) scanned, no probable secret found.`);
    if (allowlistPath) {
      console.log(`[secret-audit] allowlist: ${allowlistPath}`);
    }
    return;
  }

  console.error(`[secret-audit] ${findings.length} probable sensitive value(s) found in ${scannedCount} scanned file(s):`);
  for (const finding of findings) {
    console.error(
      ` - ${finding.file}:${finding.line} [${finding.severity}] ${finding.category}: ${finding.excerpt}`,
    );
  }
  console.error("[secret-audit] Values are masked. Rotate any real exposed secret before removing it from the repo history.");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.showHelp) {
    printHelp();
    return;
  }

  const allowlist = loadAllowlist(options.allowlistPath);
  const files = listRepoFiles().filter(shouldScan);
  const findings = files
    .flatMap(scanFile)
    .filter((finding) => !isAllowed(finding, allowlist));

  printSummary(findings, files.length, options.allowlistPath);
  if (findings.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[secret-audit] ${message}`);
  process.exit(2);
}
