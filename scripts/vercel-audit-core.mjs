import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(repoRoot, "apps", "web", "src");

const scanRoots = [
  path.join(appRoot, "app"),
  path.join(appRoot, "components"),
  path.join(appRoot, "lib"),
];

const fileExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);
const localImportPatterns = [
  /(?:^|\n)\s*import\s+(?!type\b)[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*export\s+(?!type\b)[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
const dynamicTriggerPatterns = {
  auth: /\bauth\s*\(/,
  cookies: /\bcookies\s*\(/,
  headers: /\bheaders\s*\(/,
};
const externalFetchPattern = /fetch\s*\(\s*(?:[\s\S]*?['"]https?:\/\/|new\s+URL\s*\(\s*['"]https?:\/\/)/;

const JUSTIFICATION_KEYWORDS = [
  "justification",
  "pourquoi",
  "vercel",
  "polling",
  "cache",
  "dynamique",
  "revalidate",
  "no-store",
];

const HEAVY_IMPORT_PACKAGES = [
  "leaflet",
  "leaflet-draw",
  "react-leaflet",
  "react-leaflet-cluster",
  "framer-motion",
  "recharts",
  "xlsx",
  "html-to-image",
  "gsap",
  "swiper",
  "react-big-calendar",
  "canvas-confetti",
  "qrcode.react",
  "three",
  "pdf-lib",
  "jspdf",
  "html2canvas",
  "monaco-editor",
  "@tiptap",
  "@react-pdf/renderer",
];

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

function collectWorkspaceFiles() {
  const files = [];
  for (const root of scanRoots) {
    walk(root, files);
  }
  return files;
}

function buildFileIndex() {
  const files = collectWorkspaceFiles();
  const filesByRelPath = new Map();

  for (const filePath of files) {
    filesByRelPath.set(toRepoRelative(filePath), filePath);
  }

  return { files, filesByRelPath };
}

function isApiRoute(relPath) {
  return /\/app\/api\/.*\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(relPath);
}

function isPageFile(relPath) {
  return /\/app(?:\/.*)?\/page\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(relPath);
}

function normalizeLineContent(line) {
  return line.trim().replace(/^\/\//, "").replace(/^\*/, "").trim();
}

function hasJustificationComment(content, markerRegex) {
  const lines = content.split(/\r?\n/);
  const safeMarkerRegex = new RegExp(markerRegex.source, markerRegex.flags.replace("g", ""));

  for (let index = 0; index < lines.length; index += 1) {
    if (!safeMarkerRegex.test(lines[index])) {
      continue;
    }

    const start = Math.max(0, index - 3);
    for (let cursor = index - 1; cursor >= start; cursor -= 1) {
      const line = lines[cursor].trim();
      if (!line) {
        continue;
      }

      if (!line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")) {
        continue;
      }

      const normalized = normalizeLineContent(line).toLowerCase();
      if (JUSTIFICATION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return true;
      }
    }
  }

  return false;
}

function isLocalImportSpecifier(specifier) {
  return specifier.startsWith(".") || specifier.startsWith("@/");
}

function resolveLocalImport(filePath, specifier, filesByRelPath) {
  if (!isLocalImportSpecifier(specifier)) {
    return null;
  }

  const candidateBase = specifier.startsWith("@/")
    ? path.join(appRoot, specifier.slice(2))
    : path.resolve(path.dirname(filePath), specifier);

  const candidates = [candidateBase];

  if (!path.extname(candidateBase)) {
    for (const extension of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
      candidates.push(`${candidateBase}${extension}`);
    }

    for (const extension of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
      candidates.push(path.join(candidateBase, `index${extension}`));
    }
  }

  for (const candidate of candidates) {
    const relPath = toRepoRelative(candidate);
    if (filesByRelPath.has(relPath)) {
      return filesByRelPath.get(relPath);
    }
  }

  return null;
}

function collectLocalDependencies(filePath, content, filesByRelPath) {
  const dependencies = new Set();

  for (const pattern of localImportPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const specifier = match[1];
      const resolved = resolveLocalImport(filePath, specifier, filesByRelPath);
      if (resolved) {
        dependencies.add(resolved);
      }
    }
  }

  return Array.from(dependencies);
}

function collectDirectSignals(content) {
  const signals = new Set();

  for (const [signal, pattern] of Object.entries(dynamicTriggerPatterns)) {
    if (pattern.test(content)) {
      signals.add(signal);
    }
  }

  return Array.from(signals);
}

function extractHeavyImports(content) {
  const findings = [];
  for (const packageName of HEAVY_IMPORT_PACKAGES) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importRegex = new RegExp(
      String.raw`(?:from\s+['"]${escaped}['"]|import\s*\(\s*['"]${escaped}['"]\s*\))`,
      "m",
    );
    if (importRegex.test(content)) {
      findings.push(packageName);
    }
  }
  return findings;
}

function isPollingFile(content) {
  const hasTimer = /(?:setInterval|refetchInterval)\s*\(/.test(content);
  const hasFetch = /\bfetch\s*\(/.test(content);
  return hasTimer && hasFetch;
}

function analyzeFile(
  filePath,
  snapshot,
  filesByRelPath,
  dependencyGraph,
  runtimeSignalsByFile,
  pageSignalsByFile,
) {
  const relPath = toRepoRelative(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  dependencyGraph.set(filePath, collectLocalDependencies(filePath, content, filesByRelPath));
  runtimeSignalsByFile.set(filePath, new Set(collectDirectSignals(content)));

  if (isApiRoute(relPath)) {
    snapshot.apiRoutes.push(relPath);
  }

  const pageSignals = [];
  if (/export const dynamic\s*=\s*["']force-dynamic["']/.test(content)) {
    pageSignals.push("force-dynamic");
    snapshot.forceDynamicPages.push(relPath);
  }
  if (/export const revalidate\s*=\s*0\b/.test(content)) {
    pageSignals.push("revalidate=0");
    snapshot.revalidateZeroPages.push(relPath);
  }
  for (const signal of collectDirectSignals(content)) {
    pageSignals.push(signal);
  }

  if (isPageFile(relPath) && pageSignals.length > 0) {
    pageSignalsByFile.set(filePath, new Set(pageSignals));
  }

  if (isApiRoute(relPath) && /no-store/.test(content)) {
    snapshot.noStoreRoutes.push(relPath);
  }

  if (/\bcookies\s*\(/.test(content)) {
    snapshot.cookiesFiles.push(relPath);
  }

  if (/\bheaders\s*\(/.test(content)) {
    snapshot.headersFiles.push(relPath);
  }

  if (/\bauth\s*\(/.test(content)) {
    snapshot.authFiles.push(relPath);
  }

  const heavyImports = extractHeavyImports(content);
  if (heavyImports.length > 0) {
    for (const packageName of heavyImports) {
      snapshot.heavyImports.push({ path: relPath, packageName });
    }
  }

  if (isPollingFile(content)) {
    snapshot.pollingFiles.push(relPath);
  }

  if (externalFetchPattern.test(content)) {
    snapshot.externalFetches.push(relPath);
  }
}

export function scanVercelSurface() {
  const snapshot = {
    apiRoutes: [],
    dynamicPages: [],
    forceDynamicPages: [],
    revalidateZeroPages: [],
    noStoreRoutes: [],
    cookiesFiles: [],
    headersFiles: [],
    authFiles: [],
    heavyImports: [],
    pollingFiles: [],
    externalFetches: [],
  };

  const { files, filesByRelPath } = buildFileIndex();
  const dependencyGraph = new Map();
  const runtimeSignalsByFile = new Map();
  const pageSignalsByFile = new Map();

  for (const filePath of files) {
    analyzeFile(
      filePath,
      snapshot,
      filesByRelPath,
      dependencyGraph,
      runtimeSignalsByFile,
      pageSignalsByFile,
    );
  }

  const aggregatedSignalsCache = new Map();
  const visiting = new Set();

  function collectAggregatedSignals(filePath) {
    if (aggregatedSignalsCache.has(filePath)) {
      return aggregatedSignalsCache.get(filePath);
    }

    if (visiting.has(filePath)) {
      return new Set();
    }

    visiting.add(filePath);
    const aggregated = new Set(runtimeSignalsByFile.get(filePath) ?? []);
    const dependencies = dependencyGraph.get(filePath) ?? [];

    for (const dependency of dependencies) {
      for (const signal of collectAggregatedSignals(dependency)) {
        aggregated.add(signal);
      }
    }

    visiting.delete(filePath);
    aggregatedSignalsCache.set(filePath, aggregated);
    return aggregated;
  }

  for (const filePath of files) {
    const relPath = toRepoRelative(filePath);
    if (!isPageFile(relPath)) {
      continue;
    }

    const aggregatedSignals = new Set(pageSignalsByFile.get(filePath) ?? []);
    for (const signal of collectAggregatedSignals(filePath)) {
      aggregatedSignals.add(signal);
    }

    if (aggregatedSignals.size > 0) {
      snapshot.dynamicPages.push({
        path: relPath,
        signals: Array.from(aggregatedSignals).sort((left, right) => left.localeCompare(right)),
      });
    }
  }

  const sortStrings = (values) => values.sort((left, right) => left.localeCompare(right));

  return {
    apiRoutes: sortStrings(snapshot.apiRoutes),
    dynamicPages: snapshot.dynamicPages.sort((left, right) => left.path.localeCompare(right.path)),
    forceDynamicPages: sortStrings(snapshot.forceDynamicPages),
    revalidateZeroPages: sortStrings(snapshot.revalidateZeroPages),
    noStoreRoutes: sortStrings(snapshot.noStoreRoutes),
    cookiesFiles: sortStrings(snapshot.cookiesFiles),
    headersFiles: sortStrings(snapshot.headersFiles),
    authFiles: sortStrings(snapshot.authFiles),
    heavyImports: snapshot.heavyImports.sort((left, right) => {
      const byPath = left.path.localeCompare(right.path);
      return byPath !== 0 ? byPath : left.packageName.localeCompare(right.packageName);
    }),
    pollingFiles: sortStrings(snapshot.pollingFiles),
    externalFetches: sortStrings(snapshot.externalFetches),
  };
}

export function hasNearbyJustificationComment(filePath, markerRegex) {
  const content = fs.readFileSync(filePath, "utf8");
  return hasJustificationComment(content, markerRegex);
}

export function formatHeavyImportLabel(entry) {
  return `${entry.path} :: ${entry.packageName}`;
}

export function formatDynamicPageLabel(entry) {
  return `${entry.path} [${entry.signals.join(", ")}]`;
}

export function printList(title, values) {
  console.log(`${title}: ${values.length}`);
  for (const value of values) {
    console.log(`  - ${value}`);
  }
}
