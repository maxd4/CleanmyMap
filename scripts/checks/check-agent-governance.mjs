import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

export const canonicalAgentFiles = Object.freeze([
  "AGENTS.md",
  "apps/web/AGENTS.md",
  "apps/web/src/app/api/AGENTS.md",
  "apps/web/supabase/AGENTS.md",
  "apps/web/scripts/AGENTS.md",
  "apps/mobile/AGENTS.md",
  "scripts/AGENTS.md",
  ".github/AGENTS.md",
  "maintenance/python/AGENTS.md",
  "documentation/AGENTS.md",
]);

const forbiddenAgentFiles = new Set([
  "documentation/pages_site/AGENTS.md",
  "supabase/AGENTS.md",
  "supabase/migrations/AGENTS.md",
  "apps/web/src/AGENTS.md",
  "apps/web/src/app/AGENTS.md",
  "apps/web/src/components/AGENTS.md",
]);

const skippedDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "artifacts",
  "backups",
  "node_modules",
]);

const requiredMarkers = new Map([
  ["AGENTS.md", ["apps/web", "scripts", "documentation", "fichiers scoped", "workspace:start", "codex/<run-id>", "git-common-dir/cleanmymap-workspace", "intendedPaths", "AUTHZ_SECURITY", "claims", "advisory", "publication-integrate", "publication-complete"]],
  ["apps/web/AGENTS.md", ["Next.js", "Server/Client", "Leaflet"]],
  ["apps/web/src/app/api/AGENTS.md", ["AuthN", "AuthZ", "contrat de réponse propre"]],
  ["apps/web/supabase/AGENTS.md", ["apps/web/supabase/migrations/", "unique", "RLS"]],
  ["apps/web/scripts/AGENTS.md", ["dry-run", "--apply", "provenance"]],
  ["apps/mobile/AGENTS.md", ["ClerkProvider", "Third-Party Auth", "`sub` Clerk", "distance_m"]],
  ["scripts/AGENTS.md", ["audit", "cleanup", "provenance", "workspace:start", "codex/<run-id>", "git-common-dir/cleanmymap-workspace", "intendedPaths", "advisory", "AUTHZ_SECURITY", "publication-integrate"]],
  [".github/AGENTS.md", ["permissions", "CodeQL", "check:github-actions"]],
  ["maintenance/python/AGENTS.md", ["hors du", "requirements", "pytest"]],
  ["documentation/AGENTS.md", ["état actuel", "historique", "public"]],
]);

const rootForbiddenHeadings = [
  "### Supabase et données",
  "### Authentification et profils",
  "### Permissions administratives",
  "### Affichage des scores",
  "## 5. Design system",
];

function walk(view) {
  const files = [];
  const directories = view.listDirectories().filter((directory) =>
    !directory.split("/").some((part) => skippedDirectories.has(part)));
  for (const relativePath of view.listFiles()) {
    if (!relativePath.split("/").some((part) => skippedDirectories.has(part))) files.push(relativePath);
  }

  return { files, directories };
}

function readIfPresent(view, relativePath) {
  return view.exists(relativePath) ? view.readText(relativePath) : null;
}

function validateCanonicalFiles(view, findings) {
  for (const relativePath of canonicalAgentFiles) {
    if (!readIfPresent(view, relativePath)) {
      findings.push(
        `Missing canonical AGENTS.md: ${relativePath}. Create it at this exact boundary or update the governed hierarchy explicitly.`,
      );
    }
  }
}

function validateAgentLocations(view, findings) {
  const { files } = walk(view);
  const agentFiles = files.filter((file) => path.basename(file) === "AGENTS.md");
  const canonical = new Set(canonicalAgentFiles);

  for (const relativePath of agentFiles) {
    if (relativePath.startsWith(".codex/skills/")) {
      findings.push(
        `Manual AGENTS.md copy under .codex/skills is forbidden: ${relativePath}. Edit .agents/skills/ only and use the governed mirror mechanism.`,
      );
    }

    if (forbiddenAgentFiles.has(relativePath)) {
      findings.push(
        `Forbidden concurrent AGENTS.md location: ${relativePath}. Use the existing canonical boundary instead.`,
      );
    } else if (!canonical.has(relativePath)) {
      findings.push(
        `Unexpected AGENTS.md outside the canonical hierarchy: ${relativePath}. Add a boundary only through an explicit governance change.`,
      );
    }
  }
}

function validateMigrationTrees(findings, directories) {
  const migrationTrees = directories
    .filter((directory) => directory.endsWith("/supabase/migrations") || directory === "supabase/migrations")
    .sort();
  const canonicalPath = "apps/web/supabase/migrations";

  for (const migrationTree of migrationTrees) {
    if (migrationTree !== canonicalPath) {
      findings.push(
        `Second Supabase migration tree detected: ${migrationTree}. The only editable tree is ${canonicalPath}.`,
      );
    }
  }
}

function contentOutsideLegacySections(content) {
  const lines = content.split(/\r?\n/);
  const currentLines = [];
  let legacyLevel = null;

  for (const line of lines) {
    const heading = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (legacyLevel !== null && level <= legacyLevel) {
        legacyLevel = null;
      }
      if (/\b(?:migration|legacy)\b/i.test(heading[2])) {
        legacyLevel = level;
        continue;
      }
    }

    if (legacyLevel === null) {
      currentLines.push(line);
    }
  }

  return currentLines.join("\n");
}

const currentDoctrineContradictions = [
  [/checkout.*(?:reste|directement).*`?main`?/i, "a main checkout as the mutable run workspace"],
  [/HEAD\s*==\s*origin\/main/i, "HEAD equality with origin/main as a run or publication prerequisite"],
  [/WORKTREE_BRANCH_INVALID/i, "WORKTREE_BRANCH_INVALID as a current run rule"],
  [/UNPUBLISHED_PATH_CONFLICT/i, "UNPUBLISHED_PATH_CONFLICT as a current coordination rule"],
  [/COORDINATION_CONFLICT/i, "COORDINATION_CONFLICT as a current ordinary-claim rule"],
  [/ORPHAN_DIRTY/i, "ORPHAN_DIRTY as a current ordinary-claim rule"],
  [/LEGACY_UNOWNED/i, "LEGACY_UNOWNED outside migration compatibility"],
  [/PUBLICATION_PENDING/i, "PUBLICATION_PENDING as a current run rule"],
  [/(?:interdit|interdiction)[^\n]*(?:linked\s+)?worktree/i, "a prohibition on coordinator linked worktrees"],
  [/(?:verrou|lock)[^\n]*(?:chemin|path)[^\n]*(?:exclusif|exclusive|bloquant)/i, "exclusive locks for ordinary paths"],
];

function validateCurrentDoctrine(view, findings) {
  for (const relativePath of ["AGENTS.md", "scripts/AGENTS.md", "CHATGPT.md"]) {
    const content = readIfPresent(view, relativePath);
    if (!content) continue;

    const currentContent = contentOutsideLegacySections(content);
    for (const [pattern, description] of currentDoctrineContradictions) {
      if (pattern.test(currentContent)) {
        findings.push(`${relativePath}: current doctrine contradicts worktree-per-run coordination (${description}).`);
      }
    }
  }
}

function validateMarkers(view, findings) {
  for (const [relativePath, markers] of requiredMarkers) {
    const content = readIfPresent(view, relativePath);
    if (!content) {
      continue;
    }

    for (const marker of markers) {
      if (!content.includes(marker)) {
        findings.push(
          `${relativePath}: missing structural invariant marker \`${marker}\`. Keep the rule at this boundary.`,
        );
      }
    }
  }

  const rootContent = readIfPresent(view, "AGENTS.md");
  if (rootContent) {
    if (rootContent.includes("Il refuse aussi de créer un run mutable si")) {
      findings.push(
        "AGENTS.md: workspace:start must allow ahead-only checkouts and mark PUBLICATION_PENDING instead of refusing every HEAD != origin/main.",
      );
    }
    for (const heading of rootForbiddenHeadings) {
      if (rootContent.includes(heading)) {
        findings.push(
          `AGENTS.md retains local-only rule heading \`${heading}\`. Move it to the scoped AGENTS.md and leave a pointer if needed.`,
        );
      }
    }
  }

  validateCurrentDoctrine(view, findings);

  const supabaseContent = readIfPresent(view, "apps/web/supabase/AGENTS.md");
  if (supabaseContent && /(?<!apps\/web\/)supabase\/migrations\//.test(supabaseContent)) {
    findings.push(
      "apps/web/supabase/AGENTS.md: references a non-canonical root-level Supabase migration path.",
    );
  }

  const mobileContent = readIfPresent(view, "apps/mobile/AGENTS.md");
  if (mobileContent) {
    for (const [index, line] of mobileContent.split(/\r?\n/).entries()) {
      if (/(Supabase Auth|identité anonyme)/i.test(line) && !/(ne pas|aucune|jamais|réintroduire|historique)/i.test(line)) {
        findings.push(
          `apps/mobile/AGENTS.md:${index + 1}: legacy Supabase/anonyme identity must be explicitly rejected or marked historical.`,
        );
      }
    }
  }
}

export function validateAgentGovernance(repoRoot = process.cwd(), { view = null } = {}) {
  const findings = [];
  const repositoryView = view ?? createRepositoryView({ root: repoRoot });
  validateCanonicalFiles(repositoryView, findings);
  validateAgentLocations(repositoryView, findings);
  const { directories } = walk(repositoryView);
  validateMigrationTrees(findings, directories);
  validateMarkers(repositoryView, findings);
  return [...new Set(findings)].sort();
}

function main() {
  const ref = parseRepositoryRef();
  const findings = validateAgentGovernance(process.cwd(), {
    view: createRepositoryView({ root: process.cwd(), ref }),
  });
  if (findings.length > 0) {
    console.error("AGENTS governance check failed.");
    console.error("Expected canonical hierarchy: root → application → specialized boundary.");
    console.error("Corrective action: add the missing canonical file, remove the concurrent boundary, or move the rule to its scoped owner.");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log(`AGENTS governance check passed (${canonicalAgentFiles.length} canonical files${ref ? ` for ref ${ref}` : ""}; no concurrent boundaries or second migration tree).`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  main();
}
