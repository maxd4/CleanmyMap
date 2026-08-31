import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docsRoot = path.join(repoRoot, "documentation");

const scanExtensions = new Set([".md", ".txt", ".yml", ".yaml", ".html", ".htm"]);
const skippedPathParts = [
  `${path.sep}documentation${path.sep}ai-guides${path.sep}`,
  `${path.sep}documentation${path.sep}operations${path.sep}agent-memory-governance.md`,
  `${path.sep}documentation${path.sep}plans-perso${path.sep}`,
  `${path.sep}documentation${path.sep}sessions${path.sep}`,
  `${path.sep}documentation${path.sep}plans${path.sep}`,
  `${path.sep}documentation${path.sep}rapport_IA${path.sep}`,
  `${path.sep}documentation${path.sep}development${path.sep}DOCUMENTATION_POLICY.md`,
  `${path.sep}documentation${path.sep}documentation-push-status.md`,
  `${path.sep}documentation${path.sep}AGENTS.md`,
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
  "plans/",
  "plans\\",
  "operations/agent-memory-governance.md",
  "operations\\agent-memory-governance.md",
  "operations/session-standard-runbook.md",
  "operations\\session-standard-runbook.md",
  "backups/actions-backup-2026-04-24T07-54-44.951Z.json",
  "maintenance/python/data/cleanmymap.db",
];

const allowedReferencesByFile = new Map([
  [
    path.join(docsRoot, "features", "master-pack.md"),
    new Set(["sessions/", "sessions\\"]),
  ],
]);

const dependencyAdvisoryGovernancePath = path.join(
  docsRoot,
  "security",
  "dependency-advisory-governance.md",
);
const requiredDependencyAdvisoryGovernanceMarkers = [
  "GHSA-w3rx-r6r6-pgpr",
  "CVE-2025-71330",
  "GHSA-5p2g-fcmc-qvqq",
  "CVE-2025-71329",
  "image-size@2.0.3",
  "apps/mobile/vendor/image-size",
  "n'est pas une release npm upstream",
  "metro@0.84.5",
  "metro@0.87.0",
  "version contenant les deux correctifs",
  "apps/web",
  "Aucun asset non fiable ne doit entrer dans un build Metro.",
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

function validateDependencyAdvisoryGovernance() {
  if (!fs.existsSync(dependencyAdvisoryGovernancePath)) {
    return ["documentation/security/dependency-advisory-governance.md is missing."];
  }

  const content = fs.readFileSync(dependencyAdvisoryGovernancePath, "utf8");
  const issues = requiredDependencyAdvisoryGovernanceMarkers
    .filter((marker) => !content.includes(marker))
    .map((marker) => `missing marker: ${marker}`);
  const obsoleteTemporaryAcceptanceMarkers = [
    "Date de décision",
    "Date de réévaluation au plus tard",
    "L'acceptation expire",
    "acceptation temporaire",
  ];
  for (const marker of obsoleteTemporaryAcceptanceMarkers) {
    if (content.includes(marker)) {
      issues.push(`obsolete temporary acceptance marker: ${marker}`);
    }
  }

  return issues;
}

const violations = [];
for (const filePath of walk(docsRoot)) {
  if (shouldSkip(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const allowedReferences = allowedReferencesByFile.get(filePath) ?? new Set();
  for (const pattern of forbiddenReferences.filter((candidate) => !allowedReferences.has(candidate))) {
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

for (const issue of validateDependencyAdvisoryGovernance()) {
  violations.push({
    file: path.relative(repoRoot, dependencyAdvisoryGovernancePath),
    line: 1,
    pattern: "dependency advisory governance",
    snippet: issue,
  });
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
