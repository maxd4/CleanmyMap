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

function analyzeFile(filePath, snapshot) {
  const relPath = toRepoRelative(filePath);
  const content = fs.readFileSync(filePath, "utf8");

  if (isApiRoute(relPath)) {
    snapshot.apiRoutes.push(relPath);
  }

  if (isPageFile(relPath)) {
    const signals = [];
    if (/export const dynamic\s*=\s*["']force-dynamic["']/.test(content)) {
      signals.push("force-dynamic");
      snapshot.forceDynamicPages.push(relPath);
    }
    if (/export const revalidate\s*=\s*0\b/.test(content)) {
      signals.push("revalidate=0");
      snapshot.revalidateZeroPages.push(relPath);
    }
    if (/\b(cookies|headers|auth)\s*\(/.test(content)) {
      signals.push("runtime-headers");
    }

    if (signals.length > 0) {
      snapshot.dynamicPages.push({ path: relPath, signals });
    }
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
  };

  for (const filePath of collectWorkspaceFiles()) {
    analyzeFile(filePath, snapshot);
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
