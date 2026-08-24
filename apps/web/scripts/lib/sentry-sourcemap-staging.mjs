import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export function collectFiles(rootDir, predicate, results = []) {
  if (!existsSync(rootDir)) {
    return results;
  }

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, predicate, results);
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

export function isUploadableArtifact(sourceFile) {
  return (
    sourceFile.endsWith(".js") ||
    sourceFile.endsWith(".jsbundle") ||
    sourceFile.endsWith(".bundle")
  );
}

function copyFileWithParents(source, destinationRoot, sourceRoot) {
  const relativePath = source.slice(sourceRoot.length + 1);
  const destination = join(destinationRoot, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

export function readSourceMappingURL(sourceFile) {
  let source;
  try {
    source = readFileSync(sourceFile, "utf8");
  } catch {
    return null;
  }

  const matches = [
    ...source.matchAll(
      /(?:\/\/|\/\*)[#@]\s*sourceMappingURL=([^\s*]+)(?:\s*\*\/)?/g,
    ),
  ];
  return matches.at(-1)?.[1] ?? null;
}

export function resolveSourceMappingURL(sourceFile, reference) {
  if (!reference || reference.startsWith("data:") || /^[a-z][a-z\d+.-]*:/i.test(reference)) {
    return null;
  }

  let decodedReference = reference;
  try {
    decodedReference = decodeURIComponent(reference);
  } catch {
    // Keep the original reference when it is not URI-encoded.
  }

  return resolve(dirname(sourceFile), decodedReference);
}

function addReference(referenceIndex, sourceFile) {
  const reference = readSourceMappingURL(sourceFile);
  const mapPath = resolveSourceMappingURL(sourceFile, reference);
  if (!mapPath) {
    return;
  }

  const key = mapPath.toLowerCase();
  const matches = referenceIndex.get(key) ?? [];
  if (!matches.includes(sourceFile)) {
    matches.push(sourceFile);
  }
  referenceIndex.set(key, matches);
}

function historicalWebpackBundle(sourceMap) {
  if (!sourceMap.endsWith(".map")) {
    return null;
  }

  const candidate = sourceMap.slice(0, -4);
  return isUploadableArtifact(candidate) && existsSync(candidate) ? candidate : null;
}

export function stageMatchedArtifacts(sourceRoot, sourceMaps) {
  const stagingRoot = mkdtempSync(join(tmpdir(), "cmm-sentry-"));
  const referenceIndex = new Map();
  const sourceFiles = collectFiles(sourceRoot, isUploadableArtifact);

  for (const sourceFile of sourceFiles) {
    addReference(referenceIndex, sourceFile);
  }

  const stagedFiles = [];
  const skippedMaps = [];

  for (const sourceMap of sourceMaps) {
    const candidates = [];
    const webpackBundle = historicalWebpackBundle(sourceMap);
    if (webpackBundle) {
      candidates.push(webpackBundle);
    }

    const referencedBundles = referenceIndex.get(sourceMap.toLowerCase()) ?? [];
    for (const sourceFile of referencedBundles) {
      if (!candidates.includes(sourceFile)) {
        candidates.push(sourceFile);
      }
    }

    if (candidates.length === 0) {
      skippedMaps.push(sourceMap);
      continue;
    }

    for (const sourceFile of candidates) {
      copyFileWithParents(sourceFile, stagingRoot, sourceRoot);
      copyFileWithParents(sourceMap, stagingRoot, sourceRoot);
      stagedFiles.push(sourceFile);
    }
  }

  return { stagingRoot, stagedFiles, skippedMaps };
}
