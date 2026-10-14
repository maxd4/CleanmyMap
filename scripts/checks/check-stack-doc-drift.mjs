import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

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
  "documentation/development/runtime-version-matrix.md",
  "documentation/operations/README.md",
  "documentation/operations/agent-memory-governance.md",
  "documentation/operations/data-import/README.md",
  "documentation/operations/data-import/pipeline-import.md",
  "documentation/product/README.md",
  "documentation/design-system/README.md",
  "documentation/security/README.md",
  "documentation/development/TESTING.md",
  "apps/web/AGENTS.md",
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
const RUNTIME_VERSION_MATRIX = "documentation/development/runtime-version-matrix.md";

function readText(view, relativePath) {
  try {
    return view.readText(relativePath);
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR") {
      return null;
    }
    throw error;
  }
}

function readJson(view, relativePath) {
  const content = readText(view, relativePath);
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

function isExactVersionSpecifier(specifier) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(specifier);
}

function finding(file, message, line = 0) {
  return { file, line, message };
}

function versionReferences(content, kind) {
  const label = kind === "next" ? "next" : kind === "react" ? "react" : "typescript";
  const references = [];
  let cursor = 0;
  while (cursor < content.length) {
    const labelStart = content.toLowerCase().indexOf(label, cursor);
    if (labelStart < 0) break;
    const before = content[labelStart - 1] ?? "";
    if (/[A-Za-z0-9_]/.test(before) || (kind === "next" && before === "-")) {
      cursor = labelStart + label.length;
      continue;
    }
    let labelEnd = labelStart + label.length;
    if (kind === "next" && content.slice(labelEnd, labelEnd + 3).toLowerCase() === ".js") labelEnd += 3;
    let position = labelEnd;
    while (/\s/.test(content[position] ?? "")) position += 1;
    if (content[position] === "`") position += 1;
    const separator = content[position];
    if (separator === ":" || separator === "=" || separator === "-") {
      position += 1;
      while (/\s/.test(content[position] ?? "")) position += 1;
    } else if (kind !== "typescript" && position === labelEnd) {
      cursor = labelEnd;
      continue;
    }
    if (["^", "~", "v"].includes(content[position]?.toLowerCase())) position += 1;
    const majorStart = position;
    while (/\d/.test(content[position] ?? "")) position += 1;
    if (position === majorStart) {
      cursor = labelEnd;
      continue;
    }
    const parts = [content.slice(majorStart, position)];
    for (let part = 0; part < 2 && content[position] === "."; part += 1) {
      let digitStart = position + 1;
      let digitEnd = digitStart;
      while (/\d/.test(content[digitEnd] ?? "")) digitEnd += 1;
      if (digitEnd === digitStart) break;
      parts.push(content.slice(digitStart, digitEnd));
      position = digitEnd;
    }
    references.push({ major: Number(parts[0]), version: parts.join("."), full: parts.length === 3, line: content.slice(0, labelStart).split(/\r?\n/).length });
    cursor = position;
  }
  return references;
}

function validateManifest(view, findings) {
  const packagePath = "apps/web/package.json";
  const manifest = readJson(view, packagePath);
  if (!manifest) {
    findings.push(finding(packagePath, "web package manifest is missing or invalid"));
    return null;
  }

  const mobileManifest = readJson(view, "apps/mobile/package.json");
  const mobileTypescriptSpecifier = mobileManifest?.devDependencies?.typescript;
  const mobileReactSpecifier = mobileManifest?.dependencies?.react;
  const mobileTypescriptMajor = readMajor(mobileTypescriptSpecifier);
  if (mobileManifest && (typeof mobileTypescriptSpecifier !== "string" || mobileTypescriptMajor === null)) {
    findings.push(finding("apps/mobile/package.json", "mobile manifest must declare a readable TypeScript version"));
  }
  if (mobileManifest && typeof mobileReactSpecifier !== "string") {
    findings.push(finding("apps/mobile/package.json", "mobile manifest must declare a readable React version"));
  }

  const nextSpecifier = manifest.dependencies?.next;
  const reactSpecifier = manifest.dependencies?.react;
  const eslintConfigNextSpecifier = manifest.devDependencies?.["eslint-config-next"];
  const typescriptSpecifier = manifest.devDependencies?.typescript;
  const nextMajor = readMajor(nextSpecifier);
  const typescriptMajor = readMajor(typescriptSpecifier);
  if (
    typeof nextSpecifier !== "string"
    || typeof reactSpecifier !== "string"
    || typeof eslintConfigNextSpecifier !== "string"
    || typeof typescriptSpecifier !== "string"
    || !nextSpecifier.trim()
    || !eslintConfigNextSpecifier.trim()
    || !typescriptSpecifier.trim()
    || nextMajor === null
    || typescriptMajor === null
  ) {
    findings.push(finding(packagePath, "manifest must declare readable Next.js, React, eslint-config-next and TypeScript versions"));
    return null;
  }

  const nextVersion = nextSpecifier.trim();
  const eslintConfigNextVersion = eslintConfigNextSpecifier.trim();
  if (!isExactVersionSpecifier(nextVersion) || !isExactVersionSpecifier(eslintConfigNextVersion)) {
    findings.push(finding(packagePath, "Next.js and eslint-config-next must use exact pinned versions"));
  }
  if (nextVersion !== eslintConfigNextVersion) {
    findings.push(finding(
      packagePath,
      `Next.js and eslint-config-next must use the exact same version (next: ${nextVersion}; eslint-config-next: ${eslintConfigNextVersion})`,
    ));
  }
  if (/canary/i.test(nextVersion)) {
    findings.push(finding(
      packagePath,
      "Next.js canary releases cannot be used as the current runtime; use a stable release",
    ));
  }

  return {
    nextMajor,
    nextVersion,
    eslintConfigNextVersion,
    typescriptMajor,
    mobileTypescriptMajor,
    reactVersion: typeof manifest.dependencies?.react === "string" ? manifest.dependencies.react.trim() : null,
    mobileReactVersion: typeof mobileManifest?.dependencies?.react === "string" ? mobileManifest.dependencies.react.trim() : null,
  };
}

function matrixSurface(line) {
  if (/\b(?:Mobile|apps\/mobile)\b/i.test(line)) return "mobile";
  if (/\b(?:Web|apps\/web)\b/i.test(line)) return "web";
  return null;
}

function expectedTypescriptMajorForReference(relativePath, line, manifest) {
  if (relativePath === RUNTIME_VERSION_MATRIX) {
    const surface = matrixSurface(line);
    return surface === "mobile"
      ? manifest.mobileTypescriptMajor
      : surface === "web" ? manifest.typescriptMajor : null;
  }
  return relativePath.startsWith("apps/mobile/")
    ? (manifest.mobileTypescriptMajor ?? manifest.typescriptMajor)
    : manifest.typescriptMajor;
}

function expectedReactVersion(relativePath, line, manifest) {
  if (relativePath !== RUNTIME_VERSION_MATRIX) return null;
  const surface = matrixSurface(line);
  return surface === "mobile" ? manifest.mobileReactVersion : surface === "web" ? manifest.reactVersion : null;
}

function validateActiveFiles(view, findings, activeDocs) {
  const manifest = validateManifest(view, findings);
  if (!manifest) {
    return;
  }

  for (const relativePath of activeDocs) {
    const content = readText(view, relativePath);
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

    const lines = content.split(/\r?\n/);
    for (const reference of versionReferences(content, "react")) {
      const line = lines[reference.line - 1] ?? "";
      const expectedVersion = expectedReactVersion(relativePath, line, manifest);
      if (!expectedVersion) continue;
      if (reference.major !== readMajor(expectedVersion)) {
        findings.push(finding(
          relativePath,
          `incompatible React major ${reference.major}; manifest version is ${expectedVersion}`,
          reference.line,
        ));
      }
      if (reference.full && reference.version !== expectedVersion) {
        findings.push(finding(
          relativePath,
          `incompatible React version ${reference.version}; manifest version is ${expectedVersion}`,
          reference.line,
        ));
      }
    }

    for (const reference of versionReferences(content, "typescript")) {
      const line = lines[reference.line - 1] ?? "";
      const expectedMajor = expectedTypescriptMajorForReference(relativePath, line, manifest);
      if (expectedMajor === null) continue;
      if (reference.major !== expectedMajor) {
        findings.push(finding(
          relativePath,
          `incompatible TypeScript major ${reference.major}; manifest major is ${expectedMajor}`,
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

    const defaultTypescriptMajor = relativePath.startsWith("apps/mobile/")
      ? (manifest.mobileTypescriptMajor ?? manifest.typescriptMajor)
      : manifest.typescriptMajor;
    const staleTypescriptRules = relativePath === RUNTIME_VERSION_MATRIX ? [] : [
      ...(defaultTypescriptMajor !== 5 ? [{ regex: /\bTypeScript\s+5\b/gi, message: `stale TypeScript major; current manifest major is ${defaultTypescriptMajor}` }] : []),
      ...(defaultTypescriptMajor !== 6 ? [{ regex: /\bTypeScript\s+6\b/gi, message: `stale TypeScript major; current manifest major is ${defaultTypescriptMajor}` }] : []),
      ...(defaultTypescriptMajor !== 7 ? [{ regex: /\bTypeScript\s+7\b/gi, message: `stale TypeScript major; current manifest major is ${defaultTypescriptMajor}` }] : []),
      ...(defaultTypescriptMajor !== 5 ? [{ regex: /TypeScript-5-/gi, message: `stale TypeScript badge; current manifest major is ${defaultTypescriptMajor}` }] : []),
      ...(defaultTypescriptMajor !== 6 ? [{ regex: /TypeScript-6-/gi, message: `stale TypeScript badge; current manifest is ${defaultTypescriptMajor}` }] : []),
      ...(defaultTypescriptMajor !== 7 ? [{ regex: /TypeScript-7-/gi, message: `stale TypeScript badge; current manifest is ${defaultTypescriptMajor}` }] : []),
    ];
    for (const rule of [
      { regex: /\bNext\.js\s+15\b/gi, message: `stale Next.js major; current manifest major is ${manifest.nextMajor}` },
      ...staleTypescriptRules,
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

function validateCanonicalPaths(view, findings, canonicalPaths) {
  for (const relativePath of canonicalPaths) {
    if (!view.exists(relativePath.replace(/\/$/, ""))) {
      findings.push(finding(relativePath, "canonical structural source is missing"));
    }
  }
}

function validateDataContracts(view, findings) {
  const sources = [
    "documentation/architecture/data-governance.md",
    "documentation/operations/data-import/README.md",
    "documentation/operations/data-import/pipeline-import.md",
  ];
  for (const relativePath of sources) {
    const content = readText(view, relativePath);
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

function validateMethodology(view, findings) {
  const runtimePath = "apps/web/src/lib/ui/page-families/families/registry.ts";
  const runtime = readText(view, runtimePath);
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
  const index = readText(view, indexPath);
  if (index === null) {
    findings.push(finding(indexPath, "pages index is missing"));
    return;
  }
  const row = index.split(/\r?\n/).find((line) => line.includes("| `/methodologie` |"));
  if (!row || !/\bred\b/i.test(row) || /\bsky\b/i.test(row)) {
    findings.push(finding(indexPath, "/methodologie must be documented with the red palette, not sky"));
  }
}

function validateMissions(view, findings) {
  const runtimePath = "apps/web/src/proxy.ts";
  const runtime = readText(view, runtimePath);
  const protectedPagePrefixes = runtime?.match(
    /export const PROTECTED_APP_PAGE_ROUTE_PREFIXES\s*=\s*\[([\s\S]*?)\]\s*as const/,
  )?.[1];
  if (!protectedPagePrefixes || !/["']\/missions["']/.test(protectedPagePrefixes)) {
    findings.push(finding(runtimePath, "proxy protected app page routes must include /missions"));
  }

  const indexPath = "documentation/pages_site/INDEX.md";
  const index = readText(view, indexPath);
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
  const view = options.view ?? createRepositoryView({ root: repoRoot, ref: options.ref });
  const activeDocs = options.activeDocs ?? ACTIVE_DOCS;
  const canonicalPaths = options.canonicalPaths ?? CANONICAL_PATHS;
  validateActiveFiles(view, findings, activeDocs);
  validateCanonicalPaths(view, findings, canonicalPaths);
  validateDataContracts(view, findings);
  validateMethodology(view, findings);
  validateMissions(view, findings);
  return findings.sort((left, right) => `${left.file}:${left.line}:${left.message}`.localeCompare(`${right.file}:${right.line}:${right.message}`));
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: process.cwd(), ref });
  const findings = auditStackDocDrift(process.cwd(), { view });
  if (findings.length > 0) {
    console.error("Stack/documentation drift check failed:");
    for (const findingResult of findings) {
      const location = findingResult.line > 0 ? `:${findingResult.line}` : "";
      console.error(`- ${findingResult.file}${location}: ${findingResult.message}`);
    }
    process.exit(1);
  }

  const manifest = readJson(view, "apps/web/package.json");
  const nextMajor = readMajor(manifest?.dependencies?.next);
  const typescriptMajor = readMajor(manifest?.devDependencies?.typescript);
  console.log(`Stack/documentation drift check passed (Next.js ${nextMajor}, TypeScript ${typescriptMajor}${ref ? `; ref ${ref}` : ""}; active scope and canonical contracts verified).`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  main();
}
