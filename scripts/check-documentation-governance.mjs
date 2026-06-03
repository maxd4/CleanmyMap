import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(repoRoot, "documentation");

const scanExtensions = new Set([".md", ".txt", ".yml", ".yaml", ".html", ".htm"]);
const skippedPathParts = [
  `${path.sep}documentation${path.sep}sessions${path.sep}`,
  `${path.sep}documentation${path.sep}plans${path.sep}`,
  `${path.sep}documentation${path.sep}rapport_IA${path.sep}`,
  `${path.sep}documentation${path.sep}publication-governance.md`,
  `${path.sep}documentation${path.sep}AGENTS.md`,
  `${path.sep}documentation${path.sep}project_context.md`,
  `${path.sep}documentation${path.sep}maintenance${path.sep}vercel_deployments.txt`,
  `${path.sep}documentation${path.sep}operations${path.sep}agent-memory-governance.md`,
  `${path.sep}documentation${path.sep}operations${path.sep}session-standard-runbook.md`,
];

const forbiddenReferences = [
  "AGENTS.md",
  "project_context.md",
  "sessions/",
  "sessions\\",
  "rapport_IA/",
  "rapport_IA\\",
  "maintenance/vercel_deployments.txt",
  "maintenance\\vercel_deployments.txt",
  "plans/",
  "plans\\",
  "operations/agent-memory-governance.md",
  "operations\\agent-memory-governance.md",
  "operations/session-standard-runbook.md",
  "operations\\session-standard-runbook.md",
  "backups/actions-backup-2026-04-24T07-54-44.951Z.json",
  "maintenance/python/data/cleanmymap.db",
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (scanExtensions.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function shouldSkip(filePath) {
  return skippedPathParts.some((part) => filePath.includes(part));
}

function lineSnippets(content, pattern) {
  const lines = content.split(/\r?\n/);
  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes(pattern))
    .map(({ line, index }) => ({ line: index + 1, snippet: line.trim() }));
}

const violations = [];
for (const filePath of walk(docsRoot)) {
  if (shouldSkip(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const pattern of forbiddenReferences) {
    const matches = lineSnippets(content, pattern);
    for (const match of matches) {
      violations.push({
        file: path.relative(repoRoot, filePath),
        line: match.line,
        pattern,
        snippet: match.snippet,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Documentation governance check failed.");
  console.error("The following public docs reference internal-only paths:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} -> ${violation.pattern}`);
    console.error(`  ${violation.snippet}`);
  }
  process.exit(1);
}

console.log("Documentation governance check passed.");
