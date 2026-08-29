import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ACTIVE_DOCS = Object.freeze([
  "AGENTS.md",
  "README.md",
  "documentation/README.md",
  "documentation/architecture/README.md",
  "documentation/architecture/ARCHITECTURE.md",
  "documentation/architecture/system-overview.md",
  "documentation/architecture/data-governance.md",
  "documentation/architecture/adr/ADR-005-next-canary-policy.md",
  "documentation/architecture/master-architecture.md",
  "documentation/architecture/methodologie-fonctionnement-site.md",
  "documentation/architecture/technical-inventory.md",
  "documentation/sessions/project_context.md",
  "documentation/development/README.md",
  "documentation/development/AI_DEVELOPER_GUIDE.md",
  "documentation/development/api-standard.md",
  "documentation/development/DOCUMENTATION_POLICY.md",
  "documentation/operations/README.md",
  "documentation/operations/agent-memory-governance.md",
  "documentation/operations/data-import/README.md",
  "documentation/operations/data-import/pipeline-import.md",
  "documentation/product/README.md",
  "documentation/design-system/README.md",
  "documentation/security/README.md",
  "documentation/development/TESTING.md",
  "apps/web/README.md",
  "apps/mobile/README.md",
  "apps/mobile/architecture_gps_companion.md",
  "documentation/pages_site/INDEX.md",
  ".codex/skills/cleanmymap-repo/SKILL.md",
  ".agents/skills/cleanmymap-repo/SKILL.md",
]);

export const CANONICAL_PATHS = Object.freeze([
  "documentation/architecture/data-governance.md",
  "documentation/development/api-standard.md",
  "apps/web/supabase/migrations/",
  "scripts/checks/check-agent-skill-mirrors.mjs",
]);

const ADR_CANARY_EXCEPTION = "documentation/architecture/adr/ADR-005-next-canary-policy.md";

function absolutePath(repoRoot, relativePath) {
  return path.join(repoRoot, ...relativePath.split("/"));
}

function readText(repoRoot, relativePath) {
  const filePath = absolutePath(repoRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function readJson(repoRoot, relativePath) {
  const content = readText(repoRoot, relativePath);
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function readMajor(specifier) {
  const match = String(specifier ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function finding(file, message, line = 0) {
  return { file, line, message };
}

function versionReferences(content, kind) {
  const pattern = kind === "next"
    ? /(?<![-\w])(?:Next(?:\.js)?|next)\s*(?:[:=-]\s*|\s+)v?(\d+)(?:\.(\d+)(?:\.(\d+))?)?/gi
    : /\bTypeScript\s*(?:[:=-]\s*|\s+)?(?:\^|~|v)?(\d+)(?:\.(\d+)(?:\.(\d+))?)?/gi;
  return [...content.matchAll(pattern)].map((match) => ({
    major: Number(match[1]),
    version: [match[1], match[2], match[3]].filter(Boolean).join("."),
    full: Boolean(match[2] && match[3]),
    line: content.slice(0, match.index ?? 0).split(/\r?\n/).length,
  }));
}

function validateManifest(repoRoot, findings) {
  const packagePath = "apps/web/package.json";
  const manifest = readJson(repoRoot, packagePath);
  if (!manifest) {
    findings.push(finding(packagePath, "web package manifest is missing or invalid"));
    return null;
  }

  const nextSpecifier = manifest.dependencies?.next;
  const typescriptSpecifier = manifest.devDependencies?.typescript;
  const nextMajor = readMajor(nextSpecifier);
  const typescriptMajor = readMajor(typescriptSpecifier);
  if (nextMajor === null || typescriptMajor === null) {
    findings.push(finding(packagePath, "manifest must declare readable Next.js and TypeScript versions"));
    return null;
  }

  return {
    nextMajor,
    nextVersion: String(nextSpecifier).replace(/^[~^<>= ]+/, ""),
    typescriptMajor,
  };
}

function validateActiveFiles(repoRoot, findings, activeDocs) {
  const manifest = validateManifest(repoRoot, findings);
  if (!manifest) {
    return;
  }

  for (const relativePath of activeDocs) {
    const content = readText(repoRoot, relativePath);
    if (content === null) {
      findings.push(finding(relativePath, "active documentation or canonical skill is missing"));
      continue;
    }

    for (const reference of versionReferences(content, "next")) {
      const line = content.split(/\r?\n/)[reference.line - 1] ?? "";
      const historicalCanary = relativePath === ADR_CANARY_EXCEPTION && /canary/i.test(line);
      if (reference.major !== manifest.nextMajor && !historicalCanary) {
        findings.push(finding(
          relativePath,
          `incompatible Next.js major ${reference.major}; manifest major is ${manifest.nextMajor}`,
          reference.line,
        ));
      }
      if (reference.full && !historicalCanary && reference.version !== manifest.nextVersion) {
        findings.push(finding(
          relativePath,
          `incompatible Next.js version ${reference.version}; manifest version is ${manifest.nextVersion}`,
          reference.line,
        ));
      }
    }

    for (const reference of versionReferences(content, "typescript")) {
      if (reference.major !== manifest.typescriptMajor) {
        findings.push(finding(
          relativePath,
          `incompatible TypeScript major ${reference.major}; manifest major is ${manifest.typescriptMajor}`,
          reference.line,
        ));
      }
    }

    if (relativePath === "README.md") {
      if (!content.includes(`Next.js-${manifest.nextMajor}-`)) {
        findings.push(finding(relativePath, `README badge must reflect Next.js ${manifest.nextMajor}`));
      }
      if (!content.includes(`TypeScript-${manifest.typescriptMajor}-`)) {
        findings.push(finding(relativePath, `README badge must reflect TypeScript ${manifest.typescriptMajor}`));
      }
    }

    for (const [index, line] of content.split(/\r?\n/).entries()) {
      const historicalCanaryContext = /(?:historical|historique).{0,80}\bcanary\b|\bcanary\b.{0,80}(?:historical|historique|context only|contexte historique)/i.test(line);
      const hasCanaryPin = /\b(?:next|Next(?:\.js)?)\s*[:=-].*\bcanary\b/i.test(line);
      const currentCanaryAssertion = /\b(?:current|currently|actuel|actuelle|courant|courante|par défaut|par defaut|default|runtime)\b.*\bcanary\b|\bcanary\b.*\b(?:current|currently|actuel|actuelle|courant|courante|par défaut|par defaut|default|runtime)\b/i.test(line);
      const operationalCanaryAssertion = /\b(?:use|utiliser|conserver|adopter|pinner|pin)\b.{0,80}\bcanary\b/i.test(line);
      if (relativePath !== ADR_CANARY_EXCEPTION && !historicalCanaryContext && (hasCanaryPin || currentCanaryAssertion || operationalCanaryAssertion)) {
        findings.push(finding(
          relativePath,
          "Next.js canary is presented as current/default outside the historical ADR-005 exception",
          index + 1,
        ));
      }
    }

    for (const rule of [
      { regex: /\bNext\.js\s+15\b/gi, message: `stale Next.js major; current manifest major is ${manifest.nextMajor}` },
      { regex: /\bTypeScript\s+5\b/gi, message: `stale TypeScript major; current manifest major is ${manifest.typescriptMajor}` },
      { regex: /\bTypeScript\s+6\b/gi, message: `stale TypeScript major; current manifest major is ${manifest.typescriptMajor}` },
      { regex: /TypeScript-5-/gi, message: `stale TypeScript badge; current manifest major is ${manifest.typescriptMajor}` },
      { regex: /TypeScript-6-/gi, message: `stale TypeScript badge; current manifest major is ${manifest.typescriptMajor}` },
      { regex: /2025-01-XX/g, message: "placeholder date must not remain in active documentation" },
      { regex: /documentation\/repo-docs\/ops\/INCIDENT_RUNBOOK_SHORT\.md/g, message: "stale incident runbook path" },
      { regex: /(^|[^/])src\/report_generator\.py/gm, message: "stale Python runtime path" },
    ]) {
      rule.regex.lastIndex = 0;
      for (const match of content.matchAll(rule.regex)) {
        findings.push(finding(relativePath, rule.message, content.slice(0, match.index ?? 0).split(/\r?\n/).length));
      }
    }
  }
}

function validateCanonicalPaths(repoRoot, findings, canonicalPaths) {
  for (const relativePath of canonicalPaths) {
    const absolute = absolutePath(repoRoot, relativePath.replace(/\/$/, ""));
    if (!fs.existsSync(absolute)) {
      findings.push(finding(relativePath, "canonical structural source is missing"));
    }
  }
}

function validateDataContracts(repoRoot, findings) {
  const sources = [
    "documentation/architecture/data-governance.md",
    "documentation/operations/data-import/README.md",
    "documentation/operations/data-import/pipeline-import.md",
  ];
  for (const relativePath of sources) {
    const content = readText(repoRoot, relativePath);
    if (content === null) {
      continue;
    }
    for (const marker of ["public.actions", "public.trash_spotter_spots", "public.spots"]) {
      if (!content.includes(marker)) {
        findings.push(finding(relativePath, `missing canonical data marker: ${marker}`));
      }
    }
    if (!/(archive|legacy)/i.test(content) || !/(read-only|lecture seule)/i.test(content)) {
      findings.push(finding(relativePath, "public.spots must be explicitly described as legacy/archive read-only"));
    }

    for (const [index, line] of content.split(/\r?\n/).entries()) {
      if (!/public\.spots/i.test(line)) {
        continue;
      }
      const runtimeWriteLanguage = /(?:runtime|import|écriture|write|insert|update|stockage|target|cible)/i.test(line);
      const explicitLegacyBoundary = /(?:legacy|archive|read-only|lecture seule|hors|aucune|aucun|jamais|sans|ne\s+doit|ne\s+peut)/i.test(line);
      if (runtimeWriteLanguage && !explicitLegacyBoundary) {
        findings.push(finding(
          relativePath,
          "public.spots is presented as a runtime/import write target; use public.trash_spotter_spots for new spots",
          index + 1,
        ));
      }
    }
  }
}

function validateMethodology(repoRoot, findings) {
  const runtimePath = "apps/web/src/lib/ui/page-families/families/registry.ts";
  const runtime = readText(repoRoot, runtimePath);
  if (runtime === null) {
    findings.push(finding(runtimePath, "methodology page-family runtime source is missing"));
  } else {
    const start = runtime.indexOf("METHODOLOGIE_FAMILY");
    const end = runtime.indexOf("export const", start + 1);
    const block = runtime.slice(start, end > start ? end : undefined);
    for (const marker of ['backdropToneKey: "red"', 'hero: darkHero("red")', "card: CARTO_IMPACT_RED_CARD"]) {
      if (!block.includes(marker)) {
        findings.push(finding(runtimePath, `METHODOLOGIE_FAMILY must keep ${marker}`));
      }
    }
  }

  const indexPath = "documentation/pages_site/INDEX.md";
  const index = readText(repoRoot, indexPath);
  if (index === null) {
    findings.push(finding(indexPath, "pages index is missing"));
    return;
  }
  const row = index.split(/\r?\n/).find((line) => line.includes("| `/methodologie` |"));
  if (!row || !/\bred\b/i.test(row) || /\bsky\b/i.test(row)) {
    findings.push(finding(indexPath, "/methodologie must be documented with the red palette, not sky"));
  }
}

function validateMissions(repoRoot, findings) {
  const runtimePath = "apps/web/src/lib/auth/protected-routes.ts";
  const runtime = readText(repoRoot, runtimePath);
  if (runtime === null || !/["']\/missions(?:\(\.\*\))?["']/.test(runtime)) {
    findings.push(finding(runtimePath, "runtime protected routes must include /missions"));
  }

  const indexPath = "documentation/pages_site/INDEX.md";
  const index = readText(repoRoot, indexPath);
  if (index === null) {
    return;
  }
  const row = index.split(/\r?\n/).find((line) => line.includes("| `/missions/[id]` |"));
  if (!row) {
    findings.push(finding(indexPath, "/missions/[id] documentation row is missing"));
    return;
  }
  const accessCell = row.split("|")[3] ?? "";
  if (!/\bprotected\b/i.test(accessCell)) {
    findings.push(finding(indexPath, "/missions/[id] must declare protected access"));
  }
  if (/\bdynamic\b/i.test(accessCell)) {
    findings.push(finding(indexPath, "dynamic route shape must not be used as the /missions/[id] access value"));
  }
}

export function auditStackDocDrift(repoRoot = process.cwd(), options = {}) {
  const findings = [];
  const activeDocs = options.activeDocs ?? ACTIVE_DOCS;
  const canonicalPaths = options.canonicalPaths ?? CANONICAL_PATHS;
  validateActiveFiles(repoRoot, findings, activeDocs);
  validateCanonicalPaths(repoRoot, findings, canonicalPaths);
  validateDataContracts(repoRoot, findings);
  validateMethodology(repoRoot, findings);
  validateMissions(repoRoot, findings);
  return findings.sort((left, right) => `${left.file}:${left.line}:${left.message}`.localeCompare(`${right.file}:${right.line}:${right.message}`));
}

function main() {
  const findings = auditStackDocDrift(process.cwd());
  if (findings.length > 0) {
    console.error("Stack/documentation drift check failed:");
    for (const findingResult of findings) {
      const location = findingResult.line > 0 ? `:${findingResult.line}` : "";
      console.error(`- ${findingResult.file}${location}: ${findingResult.message}`);
    }
    process.exit(1);
  }

  const manifest = readJson(process.cwd(), "apps/web/package.json");
  const nextMajor = readMajor(manifest?.dependencies?.next);
  const typescriptMajor = readMajor(manifest?.devDependencies?.typescript);
  console.log(`Stack/documentation drift check passed (Next.js ${nextMajor}, TypeScript ${typescriptMajor}; active scope and canonical contracts verified).`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  main();
}
