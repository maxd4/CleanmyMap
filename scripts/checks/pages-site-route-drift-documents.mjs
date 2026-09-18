import fs from "node:fs/promises";
import path from "node:path";

import {
  extractDocumentedAccessModes,
  normalizeRelativePath,
} from "./pages-site-route-drift-routes.mjs";

const ALLOWED_FAMILY_DIRECTORIES = new Set(["screenshots"]);
const EXACT_CURRENT_SCOPE_PLACEHOLDER = /^\s*-\s+\*\*Scope\*\*\s*:\s*à corriger\s*$/im;

export function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function walkFiles(root, predicate) {
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

export function hasExactCurrentScopePlaceholder(content) {
  return EXACT_CURRENT_SCOPE_PLACEHOLDER.test(String(content ?? ""));
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function routeDocPackageKey(readmePath, routesRoot) {
  const relativeToRoutes = normalizeRelativePath(path.relative(routesRoot, readmePath));
  const parts = relativeToRoutes.split("/");
  if (parts.length !== 3) {
    return null;
  }

  return `${parts[0]}/${parts[1]}`;
}

export async function loadCanonicalRouteDocs({
  indexEntries,
  indexPath,
  repoRoot,
  routesRoot,
}) {
  const routeDocs = [];
  const incompleteNuclei = [];
  const canonicalReadmesWithScopePlaceholder = [];
  const indexReadmeTargetsMissing = [];
  const indexReadmeTargetsOutsideRoutes = [];

  for (const entry of indexEntries) {
    if (!entry.readmePath) {
      continue;
    }

    const readmePath = path.resolve(path.dirname(indexPath), entry.readmePath);
    const relativeReadme = normalizeRelativePath(path.relative(repoRoot, readmePath));

    if (!isWithin(routesRoot, readmePath)) {
      indexReadmeTargetsOutsideRoutes.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
      continue;
    }

    if (!(await fileExists(readmePath))) {
      indexReadmeTargetsMissing.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
      continue;
    }

    const readmeContent = await fs.readFile(readmePath, "utf8");

    if (!entry.isAliasOrRedirect && !entry.isGenericDynamicPattern && hasExactCurrentScopePlaceholder(readmeContent)) {
      canonicalReadmesWithScopePlaceholder.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
    }

    routeDocs.push({
      route: entry.route,
      readme: relativeReadme,
      packageKey: routeDocPackageKey(readmePath, routesRoot),
      isAlias: entry.isAliasOrRedirect,
      isGenericDynamicPattern: entry.isGenericDynamicPattern,
      documentedAccessModes: extractDocumentedAccessModes(
        [...readmeContent.matchAll(/^\s*-\s+\*\*(Accès runtime|Statut)\*\*\s*:\s*(.*)$/gim)]
          .map((match) => match[2])
          .join(" "),
      ),
      line: entry.line,
    });

    if (entry.isAliasOrRedirect || entry.isGenericDynamicPattern) {
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
      companionNames.map((fileName) => fileExists(path.join(directory, fileName))),
    );

    if (!companionPresence.some(Boolean)) {
      continue;
    }

    const missing = [];
    for (const requiredName of [filename, ...companionNames]) {
      if (!(await fileExists(path.join(directory, requiredName)))) {
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

  return {
    routeDocs,
    incompleteNuclei,
    canonicalReadmesWithScopePlaceholder,
    indexReadmeTargetsMissing,
    indexReadmeTargetsOutsideRoutes,
  };
}

export async function loadRoutePackages({ manifestDocKeys, routesRoot, repoRoot }) {
  const packages = [];
  const unexpectedFamilyDirectories = [];
  const familyEntries = await fs.readdir(routesRoot, { withFileTypes: true });

  for (const familyEntry of familyEntries) {
    if (!familyEntry.isDirectory()) {
      continue;
    }

    const family = familyEntry.name;
    const familyPath = path.join(routesRoot, family);
    if (!manifestDocKeys.has(family)) {
      unexpectedFamilyDirectories.push(
        normalizeRelativePath(path.relative(repoRoot, familyPath)),
      );
    }
    const childEntries = await fs.readdir(familyPath, { withFileTypes: true });

    for (const childEntry of childEntries) {
      if (!childEntry.isDirectory() || ALLOWED_FAMILY_DIRECTORIES.has(childEntry.name)) {
        continue;
      }

      const packagePath = path.join(familyPath, childEntry.name);
      // Git cannot version empty directories. Ignore filesystem-only remnants
      // while still checking any directory that contains a real artifact.
      const packageFilesOnDisk = await walkFiles(packagePath, () => true);
      if (packageFilesOnDisk.length === 0) {
        continue;
      }
      const packageFiles = await fs.readdir(packagePath, { withFileTypes: true });
      const canonicalReadmes = packageFiles
        .filter((entry) => entry.isFile() && entry.name.endsWith("-README.md"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, "fr"));

      packages.push({
        key: `${family}/${childEntry.name}`,
        family,
        name: childEntry.name,
        path: normalizeRelativePath(path.relative(repoRoot, packagePath)),
        canonicalReadmes,
      });
    }
  }

  return { packages, unexpectedFamilyDirectories };
}

function extractPageFamiliesDocKeys(content) {
  const docKeys = [];
  const taxonomy = content.split("## Routage structurant", 1)[0].split("## Taxonomie")[1] ?? "";

  for (const line of taxonomy.split(/\r?\n/)) {
    const columns = line.split("|").slice(1, -1).map((column) => column.trim());
    if (columns.length < 3) {
      continue;
    }

    const docKey = columns[0].match(/^`([^`]+)`$/)?.[1];
    const runtimeId = columns[1].match(/^`([^`]+)`$/)?.[1];
    if (docKey && runtimeId) {
      docKeys.push({ docKey, runtimeId });
    }
  }

  return docKeys;
}

export async function loadPageFamilyContract({ manifestPath, pageFamiliesDocPath }) {
  const [manifestContent, pageFamiliesContent] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(pageFamiliesDocPath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestContent);
  const manifestEntries = Array.isArray(manifest) ? manifest : [];
  const manifestByRuntimeId = new Map(
    manifestEntries.map((entry) => [entry.runtimeId, entry]),
  );
  const manifestDocKeys = new Set(manifestEntries.map((entry) => entry.docKey));
  const documentedFamilies = extractPageFamiliesDocKeys(pageFamiliesContent);
  const documentedByRuntimeId = new Map(
    documentedFamilies.map((entry) => [entry.runtimeId, entry]),
  );
  const errors = [];

  if (!Array.isArray(manifest) || manifestEntries.length === 0) {
    errors.push("page-families.manifest.json doit être un tableau non vide");
  }

  if (manifestByRuntimeId.size !== manifestEntries.length) {
    errors.push("page-families.manifest.json contient des runtimeId dupliqués");
  }

  if (manifestDocKeys.size !== manifestEntries.length) {
    errors.push("page-families.manifest.json contient des docKey dupliqués");
  }

  const manifestEntriesWithoutFallback = manifestEntries.filter(
    (entry) => entry.runtimeId !== "secours",
  );

  if (documentedByRuntimeId.size !== manifestEntriesWithoutFallback.length) {
    errors.push(
      "PAGE_FAMILIES.md ne reprend pas exactement les familles documentaires du manifeste courant",
    );
  }

  for (const entry of manifestEntriesWithoutFallback) {
    const documented = documentedByRuntimeId.get(entry.runtimeId);
    if (!documented || documented.docKey !== entry.docKey) {
      errors.push(
        `PAGE_FAMILIES.md diverge du manifeste pour ${entry.runtimeId}`,
      );
    }
  }

  return { manifestByRuntimeId, manifestDocKeys, errors };
}

export async function loadRuntimePageFamilyResolver({ repoRoot, resolverPath }) {
  try {
    const { createJiti } = await import("jiti");
    const jiti = createJiti(repoRoot, {
      alias: { "@": path.join(repoRoot, "apps", "web", "src") },
    });
    const resolver = await jiti.import(resolverPath);
    if (typeof resolver.resolvePageFamily !== "function") {
      throw new Error("resolvePageFamily export introuvable");
    }
    return resolver.resolvePageFamily;
  } catch (error) {
    return {
      error:
        `Impossible de charger resolvePageFamily depuis ${normalizeRelativePath(
          path.relative(repoRoot, resolverPath),
        )}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
