#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BUILD_EXIT_CODE = 1;
const IGNORE_EXIT_CODE = 0;

const BUILD_SCRIPTS = new Set([
  "apps/web/scripts/ensure-deterministic-routes-manifest.mjs",
  "apps/web/scripts/upload-sentry-sourcemaps.mjs",
  "apps/web/scripts/lib/sentry-sourcemap-staging.mjs",
]);

const IGNORED_PREFIXES = [
  ".agents/",
  ".codex/",
  ".github/",
  "apps/mobile/",
  "maintenance/",
  "scripts/",
];

const IGNORED_EXACT_PATHS = new Set([
  ".codexignore",
  ".editorconfig",
  ".gitignore",
  "apps/web/.env.local.example",
  "apps/web/vitest.config.ts",
]);

function normalizePath(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized.length > 0 ? normalized : null;
}

function isRootDocumentation(pathname) {
  return !pathname.includes("/") && /\.(?:md|mdx)$/i.test(pathname);
}

function isWebGovernanceDocumentation(pathname) {
  if (!pathname.startsWith("apps/web/")) {
    return false;
  }

  const filename = pathname.slice("apps/web/".length).split("/").pop() ?? "";
  return /^(?:AGENTS(?:\.override)?|README)\.md$/i.test(filename);
}

/**
 * Classify one Git path for Vercel's ignored build step.
 *
 * The default is deliberately "build": a new path, a malformed path, or a
 * path outside the reviewed non-web categories is treated as build-relevant.
 */
export function classifyChangedPath(value) {
  const pathname = normalizePath(value);
  if (!pathname) {
    return "build";
  }

  if (pathname.startsWith("documentation/")) {
    // The web documentation route reads this tree at runtime.
    return "build";
  }

  if (BUILD_SCRIPTS.has(pathname)) {
    return "build";
  }

  if (pathname.startsWith("apps/web/scripts/")) {
    return "ignore";
  }

  if (
    IGNORED_EXACT_PATHS.has(pathname) ||
    IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    isRootDocumentation(pathname) ||
    isWebGovernanceDocumentation(pathname)
  ) {
    return "ignore";
  }

  return "build";
}

export function evaluateChangedPaths(changedPaths) {
  if (!Array.isArray(changedPaths)) {
    return {
      action: "build",
      buildPaths: [],
      reason: "changed paths are unavailable",
    };
  }

  const buildPaths = changedPaths.filter((pathname) => classifyChangedPath(pathname) === "build");
  return {
    action: buildPaths.length > 0 ? "build" : "ignore",
    buildPaths,
    reason: buildPaths.length > 0 ? "web build input changed" : "no web build input changed",
  };
}

export function evaluateIgnoreCommand({ previousSha, currentSha, changedPaths, gitError = false }) {
  if (!previousSha || !currentSha) {
    return {
      action: "build",
      buildPaths: [],
      reason: "Vercel commit refs are unavailable",
    };
  }

  if (gitError) {
    return {
      action: "build",
      buildPaths: [],
      reason: "Git diff could not be evaluated",
    };
  }

  return evaluateChangedPaths(changedPaths);
}

function repositoryRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function changedPathsBetween(previousSha, currentSha, cwd) {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", previousSha, currentSha],
    { cwd },
  );

  return output
    .toString("utf8")
    .split("\0")
    .filter((pathname) => pathname.length > 0);
}

function main() {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
  const currentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

  let decision;
  try {
    const root = repositoryRoot();
    const changedPaths = previousSha && currentSha
      ? changedPathsBetween(previousSha, currentSha, root)
      : undefined;
    decision = evaluateIgnoreCommand({ previousSha, currentSha, changedPaths });
  } catch {
    decision = evaluateIgnoreCommand({ previousSha, currentSha, gitError: true });
  }

  const label = decision.action === "ignore" ? "IGNORE" : "BUILD";
  const details = decision.buildPaths.length > 0
    ? ` (${decision.buildPaths.join(", ")})`
    : "";
  console.log(`[vercel-ignore-build] ${label}: ${decision.reason}${details}`);
  process.exitCode = decision.action === "ignore" ? IGNORE_EXIT_CODE : BUILD_EXIT_CODE;
}

const currentFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  main();
}
