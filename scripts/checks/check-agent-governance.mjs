import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
  ["AGENTS.md", ["apps/web", "scripts", "documentation", "fichiers scoped"]],
  ["apps/web/AGENTS.md", ["Next.js", "Server/Client", "Leaflet"]],
  ["apps/web/src/app/api/AGENTS.md", ["AuthN", "AuthZ", "contrat de réponse propre"]],
  ["apps/web/supabase/AGENTS.md", ["apps/web/supabase/migrations/", "unique", "RLS"]],
  ["apps/web/scripts/AGENTS.md", ["dry-run", "--apply", "provenance"]],
  ["apps/mobile/AGENTS.md", ["ClerkProvider", "Third-Party Auth", "`sub` Clerk", "distance_m"]],
  ["scripts/AGENTS.md", ["audit", "cleanup", "provenance"]],
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

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function walk(root) {
  const files = [];
  const directories = [];

  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      const relativePath = normalize(path.relative(root, fullPath));
      if (entry.isDirectory()) {
        directories.push(relativePath);
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };

  visit(root);
  return { files, directories };
}

function readIfPresent(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null;
}

function validateCanonicalFiles(repoRoot, findings) {
  for (const relativePath of canonicalAgentFiles) {
    if (!readIfPresent(repoRoot, relativePath)) {
      findings.push(
        `Missing canonical AGENTS.md: ${relativePath}. Create it at this exact boundary or update the governed hierarchy explicitly.`,
      );
    }
  }
}

function validateAgentLocations(repoRoot, findings) {
  const { files } = walk(repoRoot);
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

function validateMigrationTrees(repoRoot, findings, directories) {
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

function validateMarkers(repoRoot, findings) {
  for (const [relativePath, markers] of requiredMarkers) {
    const content = readIfPresent(repoRoot, relativePath);
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

  const rootContent = readIfPresent(repoRoot, "AGENTS.md");
  if (rootContent) {
    for (const heading of rootForbiddenHeadings) {
      if (rootContent.includes(heading)) {
        findings.push(
          `AGENTS.md retains local-only rule heading \`${heading}\`. Move it to the scoped AGENTS.md and leave a pointer if needed.`,
        );
      }
    }
  }

  const supabaseContent = readIfPresent(repoRoot, "apps/web/supabase/AGENTS.md");
  if (supabaseContent && /(?<!apps\/web\/)supabase\/migrations\//.test(supabaseContent)) {
    findings.push(
      "apps/web/supabase/AGENTS.md: references a non-canonical root-level Supabase migration path.",
    );
  }

  const mobileContent = readIfPresent(repoRoot, "apps/mobile/AGENTS.md");
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

export function validateAgentGovernance(repoRoot = process.cwd()) {
  const findings = [];
  validateCanonicalFiles(repoRoot, findings);
  validateAgentLocations(repoRoot, findings);
  const { directories } = walk(repoRoot);
  validateMigrationTrees(repoRoot, findings, directories);
  validateMarkers(repoRoot, findings);
  return [...new Set(findings)].sort();
}

function main() {
  const findings = validateAgentGovernance(process.cwd());
  if (findings.length > 0) {
    console.error("AGENTS governance check failed.");
    console.error("Expected canonical hierarchy: root → application → specialized boundary.");
    console.error("Corrective action: add the missing canonical file, remove the concurrent boundary, or move the rule to its scoped owner.");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log(`AGENTS governance check passed (${canonicalAgentFiles.length} canonical files; no concurrent boundaries or second migration tree).`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  main();
}
