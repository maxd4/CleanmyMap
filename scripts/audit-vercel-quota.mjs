#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repoRoot, "scripts", "vercel-quota-audit-baseline.json");
const appRoot = path.join(repoRoot, "apps", "web", "src");
const vercelConfigPath = path.join(repoRoot, "apps", "web", "vercel.json");
const args = new Set(process.argv.slice(2));
const writeBaseline = args.has("--write-baseline");

const scanRoots = [
  path.join(appRoot, "app"),
  path.join(appRoot, "components"),
  path.join(appRoot, "lib"),
];

const fileExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function walk(dir, output) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      walk(fullPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (/\.(test|spec)\./.test(entry.name)) {
      continue;
    }

    if (!fileExtensions.has(path.extname(entry.name))) {
      continue;
    }

    output.push(fullPath);
  }
}

function addFile(set, filePath) {
  set.add(toRepoRelative(filePath));
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch {
    return null;
  }
}

function sortedArray(set) {
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function analyzeFile(filePath, snapshot) {
  const relPath = toRepoRelative(filePath);
  const content = fs.readFileSync(filePath, "utf8");

  if (/\/app\/.*\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(relPath)) {
    addFile(snapshot.routeHandlers, filePath);
  }

  if (/\/app\/.*\.(?:csv|json)\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(relPath)) {
    addFile(snapshot.exportRoutes, filePath);
  }

  if (
    /export const dynamic\s*=\s*["']force-dynamic["']/.test(content) ||
    /export const revalidate\s*=\s*0\b/.test(content)
  ) {
    addFile(snapshot.dynamicRenders, filePath);
  }

  if (
    /cache:\s*["']no-store["']/.test(content) ||
    /"Cache-Control":\s*"no-store"/.test(content) ||
    /'Cache-Control':\s*'no-store'/.test(content)
  ) {
    addFile(snapshot.noStoreFetches, filePath);
  }

  if (/fetch\s*\([\s\S]*https?:\/\//.test(content)) {
    addFile(snapshot.externalFetches, filePath);
  }
}

function scanSnapshot() {
  const snapshot = {
    routeHandlers: new Set(),
    dynamicRenders: new Set(),
    noStoreFetches: new Set(),
    externalFetches: new Set(),
    exportRoutes: new Set(),
    cronPaths: new Set(),
  };

  const files = [];
  for (const root of scanRoots) {
    walk(root, files);
  }

  for (const filePath of files) {
    analyzeFile(filePath, snapshot);
  }

  if (fs.existsSync(vercelConfigPath)) {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));
      for (const cron of vercelConfig.crons ?? []) {
        if (cron && typeof cron.path === "string") {
          snapshot.cronPaths.add(cron.path);
        }
      }
    } catch (error) {
      throw new Error(`Impossible de lire ${toRepoRelative(vercelConfigPath)}: ${error.message}`);
    }
  }

  return {
    routeHandlers: sortedArray(snapshot.routeHandlers),
    dynamicRenders: sortedArray(snapshot.dynamicRenders),
    noStoreFetches: sortedArray(snapshot.noStoreFetches),
    externalFetches: sortedArray(snapshot.externalFetches),
    exportRoutes: sortedArray(snapshot.exportRoutes),
    cronPaths: sortedArray(snapshot.cronPaths),
  };
}

function diff(current, baseline) {
  const baselineSet = new Set(baseline ?? []);
  return current.filter((item) => !baselineSet.has(item));
}

function printSection(title, values) {
  console.log(`${title}: ${values.length}`);
  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

const current = scanSnapshot();
const baseline = loadBaseline();

if (writeBaseline) {
  const payload = {
    generatedAt: new Date().toISOString(),
    routeHandlers: current.routeHandlers,
    dynamicRenders: current.dynamicRenders,
    noStoreFetches: current.noStoreFetches,
    externalFetches: current.externalFetches,
    exportRoutes: current.exportRoutes,
    cronPaths: current.cronPaths,
  };

  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Baseline mis à jour: ${toRepoRelative(baselinePath)}`);
  process.exit(0);
}

if (!baseline) {
  console.error("Aucune baseline Vercel trouvée.");
  console.error(
    `Génère-la avec: node ${toRepoRelative(path.join(repoRoot, "scripts", "audit-vercel-quota.mjs"))} --write-baseline`,
  );
  process.exit(1);
}

const newRouteHandlers = diff(current.routeHandlers, baseline.routeHandlers);
const newDynamicRenders = diff(current.dynamicRenders, baseline.dynamicRenders);
const newNoStoreFetches = diff(current.noStoreFetches, baseline.noStoreFetches);
const newExternalFetches = diff(current.externalFetches, baseline.externalFetches);
const newExportRoutes = diff(current.exportRoutes, baseline.exportRoutes);
const newCronPaths = diff(current.cronPaths, baseline.cronPaths);
const regressions = [
  newRouteHandlers.length,
  newDynamicRenders.length,
  newNoStoreFetches.length,
  newExternalFetches.length,
  newExportRoutes.length,
  newCronPaths.length,
].some(Boolean);

console.log("Audit Vercel CleanMyMap");
printSection("Route handlers", current.routeHandlers);
printSection("Rendus dynamiques", current.dynamicRenders);
printSection("Fetchs no-store", current.noStoreFetches);
printSection("Fetchs externes", current.externalFetches);
printSection("Exports", current.exportRoutes);
printSection("Crons", current.cronPaths);

if (!regressions) {
  console.log("");
  console.log("OK: aucun nouveau hotspot par rapport au baseline.");
  process.exit(0);
}

console.log("");
console.log("Nouveaux hotspots détectés:");
if (newRouteHandlers.length > 0) {
  printSection("Nouveaux route handlers", newRouteHandlers);
}
if (newDynamicRenders.length > 0) {
  printSection("Nouveaux rendus dynamiques", newDynamicRenders);
}
if (newNoStoreFetches.length > 0) {
  printSection("Nouveaux fetchs no-store", newNoStoreFetches);
}
if (newExternalFetches.length > 0) {
  printSection("Nouveaux fetchs externes", newExternalFetches);
}
if (newExportRoutes.length > 0) {
  printSection("Nouveaux exports", newExportRoutes);
}
if (newCronPaths.length > 0) {
  printSection("Nouveaux crons", newCronPaths);
}

process.exit(1);
