#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

function log(message) {
  console.log(`[sentry-sourcemaps] ${message}`);
}

function warn(message) {
  console.warn(`[sentry-sourcemaps] ${message}`);
}

function error(message) {
  console.error(`[sentry-sourcemaps] ${message}`);
}

function collectFiles(rootDir, predicate, results = []) {
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

function runSentryCli(args) {
  const sentryBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(sentryBin, ["sentry-cli", ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    const code = result.status ?? 1;
    throw new Error(`sentry-cli failed with exit code ${code}`);
  }
}

function deleteFiles(files) {
  for (const file of files) {
    try {
      rmSync(file, { force: true });
    } catch (err) {
      warn(`Unable to delete ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function isUploadableArtifact(sourceFile) {
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

function resolveSourceFile(source, mapPath) {
  if (!source) {
    return null;
  }

  if (source.startsWith("file://")) {
    try {
      const filePath = fileURLToPath(source);
      if (existsSync(filePath)) {
        return filePath;
      }
    } catch {
      // Fall through to the normal resolution strategy.
    }
  }

  const candidates = [];
  const rawSource = source.replace(/^webpack:\/\//, "").replace(/^\/+/, "");
  if (rawSource) {
    candidates.push(rawSource);
    const segments = rawSource.split("/");
    if (segments.length > 1 && segments[0] !== "." && segments[0] !== "..") {
      candidates.push(segments.slice(1).join("/"));
    }
    if (rawSource.startsWith("./")) {
      candidates.push(rawSource.slice(2));
    }
  }

  const searchRoots = [];
  let currentRoot = process.cwd();
  while (!searchRoots.includes(currentRoot)) {
    searchRoots.push(currentRoot);
    const parent = dirname(currentRoot);
    if (parent === currentRoot) {
      break;
    }
    currentRoot = parent;
  }

  const mapDir = dirname(mapPath);
  if (!searchRoots.includes(mapDir)) {
    searchRoots.unshift(mapDir);
  }

  for (const candidate of candidates) {
    for (const baseDir of searchRoots) {
      const resolved = resolve(baseDir, candidate);
      if (existsSync(resolved) && statSync(resolved).isFile()) {
        return resolved;
      }
    }
  }

  return null;
}

function isSyntheticWebpackRuntimeSource(source) {
  if (typeof source !== "string") {
    return false;
  }

  return (
    source.startsWith("webpack://_N_E/webpack/") ||
    source.startsWith("webpack://webpack/runtime/") ||
    source.includes("/webpack/before-startup") ||
    source.includes("/webpack/startup") ||
    source.includes("/webpack/after-startup")
  );
}

function hydrateMissingSourceContent(mapPath) {
  let map;
  try {
    map = JSON.parse(readFileSync(mapPath, "utf8"));
  } catch (err) {
    warn(`Unable to parse source map ${mapPath}: ${err instanceof Error ? err.message : String(err)}`);
    return { hydratedSources: 0 };
  }

  if (!Array.isArray(map.sources) || map.sources.length === 0) {
    return { hydratedSources: 0 };
  }

  const sourcesContent = Array.isArray(map.sourcesContent)
    ? map.sourcesContent.slice()
    : Array(map.sources.length).fill(null);

  let hydratedSources = 0;
  for (let index = 0; index < map.sources.length; index += 1) {
    if (typeof sourcesContent[index] === "string" && sourcesContent[index].length > 0) {
      continue;
    }

    const sourcePath = resolveSourceFile(map.sources[index], mapPath);
    if (!sourcePath) {
      if (map.sources[index]) {
        sourcesContent[index] = isSyntheticWebpackRuntimeSource(map.sources[index])
          ? "/* synthetic Next.js webpack runtime source */"
          : "";
      }
      continue;
    }

    try {
      sourcesContent[index] = readFileSync(sourcePath, "utf8");
      hydratedSources += 1;
    } catch (err) {
      warn(`Unable to hydrate ${map.sources[index]} from ${sourcePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (hydratedSources > 0) {
    map.sourcesContent = sourcesContent;
    writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
  }

  return { hydratedSources };
}

function hydrateSourceMaps(rootDir) {
  const maps = collectFiles(rootDir, (file) => file.endsWith(".map"));
  let hydratedSources = 0;

  for (const mapPath of maps) {
    const result = hydrateMissingSourceContent(mapPath);
    hydratedSources += result.hydratedSources;
  }

  return { mapsProcessed: maps.length, hydratedSources };
}

function stageMatchedArtifacts(sourceRoot, sourceMaps) {
  const stagingRoot = join(tmpdir(), `cmm-sentry-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(stagingRoot, { recursive: true });

  const stagedFiles = [];
  const skippedMaps = [];

  for (const sourceMap of sourceMaps) {
    const sourceFile = sourceMap.slice(0, -4);
    if (!isUploadableArtifact(sourceFile)) {
      skippedMaps.push(sourceMap);
      continue;
    }
    if (!existsSync(sourceFile)) {
      skippedMaps.push(sourceMap);
      continue;
    }

    copyFileWithParents(sourceFile, stagingRoot, sourceRoot);
    copyFileWithParents(sourceMap, stagingRoot, sourceRoot);
    stagedFiles.push(sourceFile);
  }

  return { stagingRoot, stagedFiles, skippedMaps };
}

const authToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const org = process.env.SENTRY_ORG?.trim();
const project = process.env.SENTRY_PROJECT?.trim();
const preserveOriginalMaps =
  process.env.VERCEL === "1" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview";
const release =
  process.env.SENTRY_RELEASE?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.GIT_COMMIT_SHA?.trim() ||
  process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
  "";
const buildDir = resolve(process.cwd(), ".next");
const staticDir = join(buildDir, "static");
const serverDir = join(buildDir, "server");

if (!authToken || !org || !project) {
  log("Sentry source map upload skipped: missing SENTRY_AUTH_TOKEN, SENTRY_ORG, or SENTRY_PROJECT.");
  process.exit(0);
}

if (!existsSync(buildDir)) {
  error("Missing .next build directory. Run the Next.js build before uploading source maps.");
  process.exit(1);
}

const clientMaps = collectFiles(staticDir, (file) => file.endsWith(".map"));
const serverMaps = collectFiles(serverDir, (file) => file.endsWith(".map"));

if (clientMaps.length === 0) {
  error("No client source maps found in .next/static. Enable productionBrowserSourceMaps when source map upload is enabled.");
  process.exit(1);
}

const clientStage = stageMatchedArtifacts(staticDir, clientMaps);
if (clientStage.stagedFiles.length === 0) {
  error("No client bundles with matching source maps were found in .next/static.");
  process.exit(1);
}

if (clientStage.skippedMaps.length > 0) {
  warn(`Skipped ${clientStage.skippedMaps.length} orphaned client source map(s) without a matching bundle.`);
}

try {
  log("Injecting debug IDs into client bundles.");
  const injectClientArgs = [
    "sourcemaps",
    "inject",
    "--org",
    org,
    "--project",
    project,
    "--auth-token",
    authToken,
  ];
  if (release) {
    injectClientArgs.push("--release", release);
  }
  injectClientArgs.push(clientStage.stagingRoot);
  runSentryCli(injectClientArgs);

  const clientHydration = hydrateSourceMaps(clientStage.stagingRoot);
  if (clientHydration.hydratedSources > 0) {
    log(`Hydrated ${clientHydration.hydratedSources} missing client sourceContent entr${clientHydration.hydratedSources === 1 ? "y" : "ies"} before upload.`);
  }

  log(`Uploading ${clientStage.stagedFiles.length} client source map file pair(s) to Sentry.`);
  const clientArgs = [
    "sourcemaps",
    "upload",
    "--org",
    org,
    "--project",
    project,
    "--auth-token",
    authToken,
    "--validate",
    "--wait",
    "--no-sourcemap-reference",
    "--no-rewrite",
    "--url-prefix",
    "~/_next/static",
  ];
  if (release) {
    clientArgs.push("--release", release);
  }
  clientArgs.push(clientStage.stagingRoot);
  runSentryCli(clientArgs);
} finally {
  if (preserveOriginalMaps) {
    log("Preserving client source maps on the build filesystem to avoid Vercel artifact collector errors.");
  } else {
    deleteFiles(clientMaps);
  }
  rmSync(clientStage.stagingRoot, { recursive: true, force: true });
}

if (serverMaps.length > 0) {
  const serverStage = stageMatchedArtifacts(serverDir, serverMaps);
  if (serverStage.stagedFiles.length > 0) {
    if (serverStage.skippedMaps.length > 0) {
      warn(`Skipped ${serverStage.skippedMaps.length} orphaned server source map(s) without a matching bundle.`);
    }

    try {
      log("Injecting debug IDs into server bundles.");
      const injectServerArgs = [
        "sourcemaps",
        "inject",
        "--org",
        org,
        "--project",
        project,
        "--auth-token",
        authToken,
      ];
      if (release) {
        injectServerArgs.push("--release", release);
      }
      injectServerArgs.push(serverStage.stagingRoot);
      runSentryCli(injectServerArgs);

      const serverHydration = hydrateSourceMaps(serverStage.stagingRoot);
      if (serverHydration.hydratedSources > 0) {
        log(`Hydrated ${serverHydration.hydratedSources} missing server sourceContent entr${serverHydration.hydratedSources === 1 ? "y" : "ies"} before upload.`);
      }

      log(`Uploading ${serverStage.stagedFiles.length} server source map file pair(s) to Sentry.`);
      const serverArgs = [
        "sourcemaps",
        "upload",
        "--org",
        org,
        "--project",
        project,
        "--auth-token",
        authToken,
        "--validate",
        "--wait",
        "--no-sourcemap-reference",
        "--no-rewrite",
        "--url-prefix",
        "~/_next/server",
      ];
      if (release) {
        serverArgs.push("--release", release);
      }
      serverArgs.push(serverStage.stagingRoot);
      runSentryCli(serverArgs);
    } finally {
      if (preserveOriginalMaps) {
        log("Preserving server source maps on the build filesystem to avoid Vercel artifact collector errors.");
      } else {
        deleteFiles(serverMaps);
      }
      rmSync(serverStage.stagingRoot, { recursive: true, force: true });
    }
  } else {
    warn("No server bundles with matching source maps found in .next/server. Server stack traces will rely on runtime source maps only.");
    if (preserveOriginalMaps) {
      log("Preserving server source maps on the build filesystem to avoid Vercel artifact collector errors.");
    } else {
      deleteFiles(serverMaps);
    }
    rmSync(serverStage.stagingRoot, { recursive: true, force: true });
  }
} else {
  warn("No server source maps found in .next/server. Server stack traces will rely on runtime source maps only.");
}

log("Source map upload completed.");
