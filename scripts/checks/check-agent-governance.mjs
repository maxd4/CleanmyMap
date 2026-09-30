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
  "e2e/AGENTS.md",
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
  ["AGENTS.md", ["apps/web", "scripts", "documentation", "fichiers scoped", "MAIN-ONLY / SINGLE-WRITER", "origin/main", "STAGED", "PUSH_CANDIDATE", "DYNAMIC_CANDIDATE", "pre-commit", "pre-push"]],
  ["apps/web/AGENTS.md", ["Next.js", "Server/Client", "Leaflet"]],
  ["apps/web/src/app/api/AGENTS.md", ["AuthN", "AuthZ", "contrat de réponse propre"]],
  ["apps/web/supabase/AGENTS.md", ["apps/web/supabase/migrations/", "unique", "RLS"]],
  ["apps/web/scripts/AGENTS.md", ["dry-run", "--apply", "provenance"]],
  ["apps/mobile/AGENTS.md", ["ClerkProvider", "Third-Party Auth", "`sub` Clerk", "distance_m"]],
  ["scripts/AGENTS.md", ["audit", "cleanup", "provenance", "MAIN-ONLY / SINGLE-WRITER", "origin/main", "STAGED", "PUSH_CANDIDATE", "DYNAMIC_CANDIDATE", "pre-commit", "pre-push"]],
  [".github/AGENTS.md", ["permissions", "CodeQL", "check:github-actions"]],
  ["maintenance/python/AGENTS.md", ["hors du", "requirements", "pytest"]],
  ["documentation/AGENTS.md", ["état actuel", "historique", "public"]],
  ["e2e/AGENTS.md", ["TESTING.md", "PUBLIC", "PROTECTED_SERVER_ONLY", "PROTECTED_CLERK_CLIENT", "Clerk Development", "Supabase", "storageState", "fixtures"]],
]);

const rootForbiddenHeadings = [
  "### Supabase et données",
  "### Authentification et profils",
  "### Permissions administratives",
  "### Affichage des scores",
  "## 5. Design system",
];

const legacyCoordinatorTerms = Object.freeze([
  "PUBLICATION_PENDING",
  "UNPUBLISHED_PATH_CONFLICT",
  "WORKTREE_BASE_DIVERGED",
  "checkout partagé",
  "un seul chantier peut écrire à la fois",
  "RUN_OWNED_PATHS",
  "OWNED_FILES",
]);

function headingLevel(line) {
  const match = /^(#{2,6})\s+/.exec(line);
  return match ? match[1].length : null;
}

export function contentOutsideLegacySections(content) {
  const kept = [];
  let legacyLevel = null;
  for (const line of content.split(/\r?\n/)) {
    const level = headingLevel(line);
    if (level !== null) {
      if (legacyLevel !== null && level <= legacyLevel) legacyLevel = null;
      if (legacyLevel === null && /\b(?:legacy|compatibility|historique)\b/i.test(line)) {
        legacyLevel = level;
        continue;
      }
    }
    if (legacyLevel === null) kept.push(line);
  }
  return kept.join("\n");
}

function validateCurrentCoordinatorDoctrine(view, findings) {
  for (const relativePath of ["AGENTS.md", "scripts/AGENTS.md", "CHATGPT.md"]) {
    const content = readIfPresent(view, relativePath);
    if (!content) continue;
    const currentContent = contentOutsideLegacySections(content).toLocaleLowerCase("fr-FR");
    for (const term of legacyCoordinatorTerms) {
      if (currentContent.includes(term.toLocaleLowerCase("fr-FR"))) {
        findings.push(
          `${relativePath}: legacy coordinator term \`${term}\` is allowed only under a clearly marked LEGACY / COMPATIBILITY section.`,
        );
      }
    }
  }
}

const normalPublicationPolicy = "validation → commit isolé → push main → vérification de convergence";
const rapidPublicationPolicy = "commit local selon son protocole, sans push tant que le mode reste actif";

function validateCurrentWorkflowDoctrine(view, findings) {
  const rootAgents = readIfPresent(view, "AGENTS.md");
  const chatgpt = readIfPresent(view, "CHATGPT.md");

  if (!rootAgents) findings.push("AGENTS.md: missing CURRENT workflow doctrine.");
  if (!chatgpt) findings.push("CHATGPT.md: missing CURRENT workflow doctrine.");

  const normalizeWorkflowContent = (content) => content
    .replace(/```(?:text)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedRoot = rootAgents ? normalizeWorkflowContent(rootAgents) : "";
  const normalizedChatgpt = chatgpt ? normalizeWorkflowContent(chatgpt) : "";
  const normalizedCurrentChatgpt = contentOutsideLegacySections(chatgpt ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (rootAgents && !normalizedRoot.includes("un seul writer mutable peut agir à la fois ; les analyses read-only peuvent être parallèles.")) {
    findings.push("AGENTS.md: CURRENT workflow must allow parallel read-only analysis and only one mutable writer.");
  }
  if (rootAgents && !normalizedRoot.includes("main publié = référence versionnée ;")) {
    findings.push("AGENTS.md: CURRENT workflow must identify published main as the versioned reference.");
  }
  if (rootAgents && !normalizedRoot.includes("une candidate locale explicitement fournie ou produite pour le lot courant est autoritative pour ce lot jusqu’à intégration ;")) {
    findings.push("AGENTS.md: CURRENT workflow must scope local candidate authority to the current lot.");
  }
  if (rootAgents && !normalizedRoot.includes("tout changement local préexistant doit être préservé et ne doit jamais être écrasé par une synchronisation avec Git.")) {
    findings.push("AGENTS.md: CURRENT workflow must preserve pre-existing local changes during synchronization.");
  }

  for (const [relativePath, content, normalizedContent] of [
    ["AGENTS.md", rootAgents, normalizedRoot],
    ["CHATGPT.md", chatgpt, normalizedChatgpt],
  ]) {
    if (!content) continue;
    if (!normalizedContent.includes(`Hors mode de développement rapide : ${normalPublicationPolicy}`)) {
      findings.push(`${relativePath}: missing the normal commit/push/convergence policy.`);
    }
    if (!normalizedContent.includes(`Mode de développement rapide explicitement activé : ${rapidPublicationPolicy}`)) {
      findings.push(`${relativePath}: missing the explicit rapid-mode no-push exception.`);
    }
  }

  if (/l['’]état local est prioritaire sur l['’](?:état|etat) github/i.test(normalizedRoot)) {
    findings.push("AGENTS.md: global local-over-GitHub priority is not a CURRENT rule.");
  }
  if (/push origin\/main sur demande explicite|demander commit et push le lot|committer et pousser sur main lorsque l'utilisateur l'a demandé/i.test(normalizedCurrentChatgpt)) {
    findings.push("CHATGPT.md: publication must not depend on an explicit user request outside rapid mode.");
  }
}

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
    for (const heading of rootForbiddenHeadings) {
      if (rootContent.includes(heading)) {
        findings.push(
          `AGENTS.md retains local-only rule heading \`${heading}\`. Move it to the scoped AGENTS.md and leave a pointer if needed.`,
        );
      }
    }
  }

  validateCurrentCoordinatorDoctrine(view, findings);
  validateCurrentWorkflowDoctrine(view, findings);

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
