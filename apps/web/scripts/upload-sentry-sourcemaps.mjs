#!/usr/bin/env node
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
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

const authToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const org = process.env.SENTRY_ORG?.trim();
const project = process.env.SENTRY_PROJECT?.trim();
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
injectClientArgs.push(staticDir);
runSentryCli(injectClientArgs);

log(`Uploading ${clientMaps.length} client source map file(s) to Sentry.`);
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
  "--url-prefix",
  "~/_next/static",
];
if (release) {
  clientArgs.push("--release", release);
}
clientArgs.push(staticDir);
runSentryCli(clientArgs);
deleteFiles(clientMaps);

if (serverMaps.length > 0) {
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
  injectServerArgs.push(serverDir);
  runSentryCli(injectServerArgs);

  log(`Uploading ${serverMaps.length} server source map file(s) to Sentry.`);
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
    "--url-prefix",
    "~/_next/server",
  ];
  if (release) {
    serverArgs.push("--release", release);
  }
  serverArgs.push(serverDir);
  runSentryCli(serverArgs);
  deleteFiles(serverMaps);
} else {
  warn("No server source maps found in .next/server. Server stack traces will rely on runtime source maps only.");
}

log("Source map upload completed.");
