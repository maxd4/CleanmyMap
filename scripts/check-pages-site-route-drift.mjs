#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_ROOT = path.join(REPO_ROOT, "apps", "web", "src", "app");
const INDEX_PATH = path.join(REPO_ROOT, "documentation", "pages_site", "INDEX.md");
const SECTION_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "sections-registry",
  "config.ts",
);

const DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE = new Set([
  "/sections/dm",
  "/sections/guide",
]);

function normalizeRoute(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith("/")) {
    return "";
  }

  const withoutExample = trimmed.replace(/\s+\(ex\..*$/i, "").trim();
  const withoutQuery = withoutExample.split("?")[0]?.split("#")[0] ?? withoutExample;
  const collapsed = withoutQuery.replace(/\/+/g, "/");

  if (collapsed === "/") {
    return "/";
  }

  return collapsed.replace(/\/$/, "");
}

async function walkFiles(root, predicate) {
  const files = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      if (entry.isFile() && predicate(absolute, entry.name)) {
        files.push(absolute);
      }
    }
  }

  await walk(root);
  return files.sort((a, b) => a.localeCompare(b, "fr"));
}

function pageFileToRoute(filePath) {
  const relativeParts = path.relative(APP_ROOT, filePath).split(path.sep);
  const routeParts = [];

  for (const part of relativeParts) {
    if (part === "page.tsx") {
      continue;
    }

    if (part.startsWith("(") && part.endsWith(")")) {
      continue;
    }

    if (/^\[\[\.\.\..+\]\]$/.test(part)) {
      continue;
    }

    const catchAll = part.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) {
      routeParts.push(`[${catchAll[1]}]`);
      continue;
    }

    routeParts.push(part);
  }

  return normalizeRoute(`/${routeParts.join("/")}`);
}

function extractIndexEntries(content) {
  const entries = new Map();

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      continue;
    }

    const columns = line.split("|").slice(1, -1).map((column) => column.trim());
    if (columns.length < 3) {
      continue;
    }

    const routeMatch = columns[0].match(/`([^`]+)`/);
    if (!routeMatch) {
      continue;
    }

    const route = normalizeRoute(routeMatch[1]);
    if (!route) {
      continue;
    }

    const normalizedLine = line.toLowerCase();
    const readmeMatch = columns[1].match(/\[[^\]]+\]\(([^)]+)\)/);
    const pageType = columns[2].toLowerCase();
    const isAliasOrRedirect =
      pageType.includes("redirection") ||
      pageType.includes("alias") ||
      normalizedLine.includes("`redirect`") ||
      normalizedLine.includes("alias technique") ||
      normalizedLine.includes("redirection");

    const isAwaitingClassification =
      normalizedLine.includes("famille à arbitrer") ||
      normalizedLine.includes("à arbitrer");

    const isGenericDynamicPattern = route.includes("[sectionId]");

    entries.set(route, {
      route,
      pageType: columns[2],
      readmePath: readmeMatch ? readmeMatch[1] : null,
      isAliasOrRedirect,
      isAwaitingClassification,
      isGenericDynamicPattern,
    });
  }

  return entries;
}

function extractSectionRegistryRoutes(content) {
  const routes = new Set();
  const pattern = /route:\s*["'](\/sections\/[^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    const route = normalizeRoute(match[1]);
    if (route) {
      routes.add(route);
    }
  }

  return routes;
}

async function loadCanonicalRouteDocs(indexEntries) {
  const routeDocs = [];
  const incompleteNuclei = [];

  for (const entry of indexEntries.values()) {
    if (!entry.readmePath) {
      continue;
    }

    const readmePath = path.resolve(path.dirname(INDEX_PATH), entry.readmePath);
    try {
      const stats = await fs.stat(readmePath);
      if (!stats.isFile()) {
        continue;
      }
    } catch {
      continue;
    }

    const relativeReadme = path.relative(REPO_ROOT, readmePath).split(path.sep).join("/");
    routeDocs.push({
      route: entry.route,
      readme: relativeReadme,
      isAlias: entry.isAliasOrRedirect,
    });

    if (entry.isAliasOrRedirect) {
      continue;
    }

    const filename = path.basename(readmePath);
    const prefix = filename.slice(0, -"-README.md".length);
    const directory = path.dirname(readmePath);
    const companionNames = [
      `${prefix}-presentation-detaillee.md`,
      `${prefix}-liste-propositions-a-traiter.md`,
      `${prefix}-objectifs-non-pertinents.md`,
    ];

    const companionPresence = await Promise.all(
      companionNames.map(async (fileName) => {
        try {
          const stats = await fs.stat(path.join(directory, fileName));
          return stats.isFile();
        } catch {
          return false;
        }
      }),
    );

    if (!companionPresence.some(Boolean)) {
      continue;
    }

    const missing = [];
    for (const requiredName of [filename, ...companionNames]) {
      try {
        const stats = await fs.stat(path.join(directory, requiredName));
        if (!stats.isFile()) {
          missing.push(requiredName);
        }
      } catch {
        missing.push(requiredName);
      }
    }

    if (missing.length > 0) {
      incompleteNuclei.push({
        route: entry.route,
        readme: relativeReadme,
        missing,
      });
    }
  }

  return { routeDocs, incompleteNuclei };
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function toMarkdownList(items, emptyLabel = "Aucun.") {
  if (items.length === 0) {
    return emptyLabel;
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

export async function runPagesSiteRouteDriftAudit() {
  const [pageFiles, indexContent, sectionRegistryContent] = await Promise.all([
    walkFiles(APP_ROOT, (_absolute, name) => name === "page.tsx"),
    fs.readFile(INDEX_PATH, "utf8"),
    fs.readFile(SECTION_REGISTRY_PATH, "utf8"),
  ]);

  const indexEntries = extractIndexEntries(indexContent);
  const docs = await loadCanonicalRouteDocs(indexEntries);
  const codeRoutes = new Set(pageFiles.map(pageFileToRoute).filter(Boolean));
  const sectionRoutes = extractSectionRegistryRoutes(sectionRegistryContent);
  const indexRoutes = new Set(indexEntries.keys());
  const canonicalDocRoutes = new Set(
    docs.routeDocs.map((entry) => entry.route).filter(Boolean),
  );

  const runtimeRoutes = new Set([
    ...codeRoutes,
    ...sectionRoutes,
    ...DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE,
  ]);

  const codeRoutesMissingFromIndex = difference(codeRoutes, indexRoutes);
  const sectionRoutesMissingFromIndex = difference(sectionRoutes, indexRoutes);
  const indexRoutesMissingFromRuntime = difference(indexRoutes, runtimeRoutes);
  const routesRequiringCanonicalDoc = new Set(
    [...indexEntries.values()]
      .filter(
        (entry) =>
          !entry.isAliasOrRedirect &&
          !entry.isAwaitingClassification &&
          !entry.isGenericDynamicPattern &&
          !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(entry.route),
      )
      .map((entry) => entry.route),
  );

  const indexRoutesMissingCanonicalDoc = difference(
    routesRequiringCanonicalDoc,
    canonicalDocRoutes,
  );

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      codeRoutes: codeRoutes.size,
      sectionRoutes: sectionRoutes.size,
      indexRoutes: indexRoutes.size,
      canonicalRouteDocs: canonicalDocRoutes.size,
    },
    codeRoutesMissingFromIndex,
    sectionRoutesMissingFromIndex,
    indexRoutesMissingFromRuntime,
    indexRoutesMissingCanonicalDoc,
    incompleteNuclei: docs.incompleteNuclei,
  };
}

export function hasPagesSiteRouteDrift(report) {
  return (
    report.codeRoutesMissingFromIndex.length > 0 ||
    report.sectionRoutesMissingFromIndex.length > 0 ||
    report.indexRoutesMissingFromRuntime.length > 0 ||
    report.indexRoutesMissingCanonicalDoc.length > 0 ||
    report.incompleteNuclei.length > 0
  );
}

export function renderPagesSiteRouteDriftMarkdown(report) {
  const incompleteNuclei =
    report.incompleteNuclei.length === 0
      ? "Aucun."
      : report.incompleteNuclei
          .map(
            (entry) =>
              `- \`${entry.route}\` — \`${entry.readme}\`\n` +
              entry.missing.map((name) => `  - manque \`${name}\``).join("\n"),
          )
          .join("\n");

  return `# Audit de dérive \`pages_site\`

Généré : \`${report.generatedAt}\`

## Comptes

- routes \`page.tsx\` : ${report.counts.codeRoutes}
- routes de sections dans le registre : ${report.counts.sectionRoutes}
- routes inventoriées dans \`INDEX.md\` : ${report.counts.indexRoutes}
- fiches canoniques avec champ \`Route\` : ${report.counts.canonicalRouteDocs}

## Routes code absentes de l'index

${toMarkdownList(report.codeRoutesMissingFromIndex)}

## Routes de sections absentes de l'index

${toMarkdownList(report.sectionRoutesMissingFromIndex)}

## Routes d'index sans route runtime correspondante

${toMarkdownList(report.indexRoutesMissingFromRuntime)}

## Routes d'index sans fiche canonique dédiée

${toMarkdownList(report.indexRoutesMissingCanonicalDoc)}

## Noyaux documentaires incomplets

${incompleteNuclei}
`;
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const reportIndex = args.indexOf("--report");
  const reportPath =
    reportIndex >= 0 && args[reportIndex + 1]
      ? path.resolve(REPO_ROOT, args[reportIndex + 1])
      : null;

  const report = await runPagesSiteRouteDriftAudit();
  const markdown = renderPagesSiteRouteDriftMarkdown(report);

  process.stdout.write(`${markdown}\n`);

  if (reportPath) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, markdown, "utf8");
    console.log(`Rapport écrit dans ${path.relative(REPO_ROOT, reportPath)}`);
  }

  if (strict && hasPagesSiteRouteDrift(report)) {
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
