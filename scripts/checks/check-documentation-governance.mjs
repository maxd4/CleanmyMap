import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const scanExtensions = new Set([".md", ".txt", ".yml", ".yaml", ".html", ".htm"]);
const skippedPathParts = [
  "documentation/ai-guides/",
  "documentation/operations/agent-memory-governance.md",
  "documentation/plans-perso/",
  "documentation/sessions/",
  "documentation/plans/",
  "documentation/rapport_IA/",
  "documentation/development/DOCUMENTATION_POLICY.md",
  "documentation/documentation-push-status.md",
  "documentation/AGENTS.md",
  "documentation/operations/session-standard-runbook.md",
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
    "documentation/features/master-pack.md",
    new Set(["sessions/", "sessions\\"]),
  ],
]);

const dependencyAdvisoryGovernancePath = "documentation/security/dependency-advisory-governance.md";
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

function validateDependencyAdvisoryGovernance(view) {
  if (!view.exists(dependencyAdvisoryGovernancePath)) {
    return ["documentation/security/dependency-advisory-governance.md is missing."];
  }

  const content = view.readText(dependencyAdvisoryGovernancePath);
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

export function validateDocumentationGovernance(view) {
  const violations = [];
  for (const filePath of view.listFiles("documentation")) {
    if (!scanExtensions.has(path.posix.extname(filePath).toLowerCase()) || shouldSkip(filePath)) {
      continue;
    }

    const content = view.readText(filePath);
    const allowedReferences = allowedReferencesByFile.get(filePath) ?? new Set();
    for (const pattern of forbiddenReferences.filter((candidate) => !allowedReferences.has(candidate))) {
      const matches = lineSnippets(content, pattern);
      for (const match of matches) {
        violations.push({
          file: filePath,
          line: match.line,
          pattern,
          snippet: match.snippet,
        });
      }
    }
  }

  for (const issue of validateDependencyAdvisoryGovernance(view)) {
    violations.push({
      file: dependencyAdvisoryGovernancePath,
      line: 1,
      pattern: "dependency advisory governance",
      snippet: issue,
    });
  }

  return violations;
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: repoRoot, ref });
  const violations = validateDocumentationGovernance(view);

  if (violations.length > 0) {
    console.error("Documentation governance check failed.");
    console.error("The following public docs reference internal-only paths:");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} -> ${violation.pattern}`);
      console.error(`  ${violation.snippet}`);
    }
    process.exit(1);
  }

  console.log(`Documentation governance check passed${ref ? ` for ref ${ref}` : ""}.`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  main();
}
