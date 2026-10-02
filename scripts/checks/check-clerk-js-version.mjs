#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WEB_PACKAGE_PATH = "apps/web/package.json";
const LOCKFILE_PATH = "package-lock.json";
const ENV_TEMPLATE_PATH = "apps/web/.env.local.example";
const CLERK_JS_PACKAGE_PATH = "node_modules/@clerk/clerk-js";
const NEXTJS_PACKAGE_PATH = "node_modules/@clerk/nextjs";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function parseJson(source, relativePath) {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readEnvAssignment(source, name) {
  const match = source.match(new RegExp(`^${name}=([^#\\r\\n]*)$`, "m"));
  return match?.[1]?.trim() || undefined;
}

function exactVersion(value, label, violations) {
  if (!value || !VERSION_PATTERN.test(value)) {
    violations.push(`${label} must be an exact semantic version, got ${value || "<missing>"}`);
    return undefined;
  }
  return value;
}

export function auditClerkJsVersionContract({
  webPackageSource,
  lockfileSource,
  envTemplateSource,
  runtimeVersion,
} = {}) {
  const webPackage = parseJson(webPackageSource, WEB_PACKAGE_PATH);
  const lockfile = parseJson(lockfileSource, LOCKFILE_PATH);
  const violations = [];
  const webClerkSpec = webPackage.dependencies?.["@clerk/nextjs"];
  const nextjsLock = lockfile.packages?.[NEXTJS_PACKAGE_PATH];
  const clerkJsLock = lockfile.packages?.[CLERK_JS_PACKAGE_PATH];

  const nextjsManifestVersion = exactVersion(webClerkSpec, `${WEB_PACKAGE_PATH} @clerk/nextjs`, violations);
  const nextjsLockVersion = exactVersion(nextjsLock?.version, `${LOCKFILE_PATH} ${NEXTJS_PACKAGE_PATH}`, violations);
  const clerkJsLockVersion = exactVersion(clerkJsLock?.version, `${LOCKFILE_PATH} ${CLERK_JS_PACKAGE_PATH}`, violations);
  const templateVersion = exactVersion(
    readEnvAssignment(envTemplateSource, "NEXT_PUBLIC_CLERK_JS_VERSION"),
    `${ENV_TEMPLATE_PATH} NEXT_PUBLIC_CLERK_JS_VERSION`,
    violations,
  );

  if (nextjsManifestVersion && nextjsLockVersion && nextjsManifestVersion !== nextjsLockVersion) {
    violations.push(`@clerk/nextjs manifest/lock mismatch: ${nextjsManifestVersion} !== ${nextjsLockVersion}`);
  }
  if (templateVersion && clerkJsLockVersion && templateVersion !== clerkJsLockVersion) {
    violations.push(`ClerkJS template/lock mismatch: ${templateVersion} !== ${clerkJsLockVersion}`);
  }
  const configuredRuntimeVersion = runtimeVersion?.trim();
  if (configuredRuntimeVersion && clerkJsLockVersion && configuredRuntimeVersion !== clerkJsLockVersion) {
    violations.push(`ClerkJS runtime/lock mismatch: ${configuredRuntimeVersion} !== ${clerkJsLockVersion}`);
  }

  return {
    ok: violations.length === 0,
    expectedClerkJsVersion: clerkJsLockVersion,
    nextjsVersion: nextjsLockVersion,
    templateVersion,
    runtimeVersion: configuredRuntimeVersion || null,
    violations,
  };
}

function readRequired(view, relativePath) {
  if (!view.isFile(relativePath)) {
    throw new Error(`Missing ClerkJS version contract file: ${relativePath}`);
  }
  return view.readText(relativePath);
}

export function auditRepositoryClerkJsVersion(view, runtimeVersion = process.env.NEXT_PUBLIC_CLERK_JS_VERSION) {
  return auditClerkJsVersionContract({
    webPackageSource: readRequired(view, WEB_PACKAGE_PATH),
    lockfileSource: readRequired(view, LOCKFILE_PATH),
    envTemplateSource: readRequired(view, ENV_TEMPLATE_PATH),
    runtimeVersion,
  });
}

function parseRoot(argv) {
  const rootArgument = argv.find((argument) => argument.startsWith("--root="));
  return rootArgument ? path.resolve(rootArgument.slice("--root=".length)) : REPO_ROOT;
}

export function main(argv = process.argv.slice(2)) {
  const ref = parseRepositoryRef(argv);
  const view = createRepositoryView({ root: parseRoot(argv), ref });
  const report = auditRepositoryClerkJsVersion(view);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
