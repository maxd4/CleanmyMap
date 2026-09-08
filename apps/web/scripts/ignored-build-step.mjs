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

/**
 * Detect a cryptographic signature block embedded in a Git commit object.
 *
 * Vercel's build environment does not contain the developers' trusted keyring,
 * so this rule deliberately checks the commit object rather than pretending to
 * verify signer identity. Repository branch protection remains responsible
 * for requiring a trusted/verified signer.
 */
export function hasCommitSignature(commitObject) {
  if (typeof commitObject !== "string") {
    return false;
  }

  const header = commitObject.split(/\r?\n\r?\n/, 1)[0];
  return /^(?:gpgsig|gpgsig-sha256) /m.test(header);
}

/**
 * A signed Git commit is an explicit deployment request for the Vercel
 * project. Other commits retain the existing path-based decision so this
 * opt-in rule does not disable ordinary web deployments.
 */
export function evaluateSignedDeployment({ currentSha, signatureStatus, fallbackDecision }) {
  if (signatureStatus === "present" && currentSha) {
    return {
      action: "build",
      buildPaths: [],
      reason: "signed Vercel commit; deploy automatically",
    };
  }

  return fallbackDecision ?? evaluateIgnoreCommand({ previousSha: "", currentSha, changedPaths: undefined });
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

function readCommitSignatureStatus(currentSha, cwd) {
  try {
    const commitObject = execFileSync("git", ["cat-file", "commit", currentSha], {
      cwd,
      encoding: "utf8",
    });
    return hasCommitSignature(commitObject) ? "present" : "absent";
  } catch {
    return "unavailable";
  }
}

function main() {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
  const currentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

  let signatureStatus = "unavailable";
  let fallbackDecision;
  try {
    const root = repositoryRoot();
    const changedPaths = previousSha && currentSha
      ? changedPathsBetween(previousSha, currentSha, root)
      : undefined;
    fallbackDecision = evaluateIgnoreCommand({ previousSha, currentSha, changedPaths });
    signatureStatus = readCommitSignatureStatus(currentSha, root);
  } catch {
    fallbackDecision = evaluateIgnoreCommand({ previousSha, currentSha, gitError: true });
    signatureStatus = "unavailable";
  }

  const decision = evaluateSignedDeployment({ currentSha, signatureStatus, fallbackDecision });

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
