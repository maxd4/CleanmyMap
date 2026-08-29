#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const NODE_FAMILY = "24.x";
export const MINIMUM_NODE = Object.freeze({ major: 24, minor: 3, patch: 0 });

function parseVersion(value) {
  const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Invalid Node version: ${value}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function isAtLeast(left, right) {
  return left.major > right.major ||
    (left.major === right.major && left.minor > right.minor) ||
    (left.major === right.major && left.minor === right.minor && left.patch >= right.patch);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateNodeVersionContract({
  workflowContent,
  actualNodeVersion = process.versions.node,
  contractContent,
  lockfile,
  webPackage,
}) {
  const issues = [];
  const actual = parseVersion(actualNodeVersion);
  const contract = String(contractContent).trim();

  if (contract !== NODE_FAMILY) {
    issues.push(`apps/web/.nvmrc must contain exactly ${NODE_FAMILY}; found ${JSON.stringify(contract)}`);
  }

  const workflowNodeFile = workflowContent.match(/^\s*NODE_VERSION_FILE:\s*([^\s#]+)\s*$/m)?.[1];
  if (workflowNodeFile !== "apps/web/.nvmrc") {
    issues.push(`CI must centralize Node through NODE_VERSION_FILE=apps/web/.nvmrc; found ${workflowNodeFile ?? "missing"}`);
  }

  const setupNodeUses = [...workflowContent.matchAll(/uses:\s*actions\/setup-node@[0-9a-f]{40}/gi)];
  const setupNodeFileUses = [...workflowContent.matchAll(/node-version-file:\s*\$\{\{\s*env\.NODE_VERSION_FILE\s*\}\}/g)];
  if (setupNodeUses.length === 0 || setupNodeUses.length !== setupNodeFileUses.length) {
    issues.push("every setup-node invocation must use the centralized NODE_VERSION_FILE");
  }
  if (/node-version:\s*["']?(?:20|22|>=24)(?:["']|\s|$)/.test(workflowContent)) {
    issues.push("CI must not declare a divergent Node version or a >=24 range");
  }

  if (actual.major !== MINIMUM_NODE.major || !isAtLeast(actual, MINIMUM_NODE)) {
    issues.push(`effective Node ${actualNodeVersion} must satisfy ^24.3.0`);
  }

  const packageEngine = webPackage?.engines?.node;
  if (packageEngine !== undefined && packageEngine !== NODE_FAMILY) {
    issues.push(`apps/web/package.json engines.node must be ${NODE_FAMILY} when declared; found ${packageEngine}`);
  }

  const engineRequirements = Object.entries(lockfile?.packages ?? {})
    .filter(([, entry]) => typeof entry?.engines?.node === "string" && entry.engines.node.includes("^24.3.0"));
  if (engineRequirements.length === 0) {
    issues.push("package-lock.json has no recorded dependency requiring ^24.3.0 to validate");
  }

  return { issues, actualNodeVersion, engineRequirementCount: engineRequirements.length };
}

function main() {
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const result = validateNodeVersionContract({
    repositoryRoot,
    workflowContent: readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8"),
    contractContent: readFileSync(path.join(repositoryRoot, "apps", "web", ".nvmrc"), "utf8"),
    lockfile: readJson(path.join(repositoryRoot, "package-lock.json")),
    webPackage: readJson(path.join(repositoryRoot, "apps", "web", "package.json")),
  });

  if (result.issues.length > 0) {
    console.error(`[node-version-contract] ${result.issues.length} issue(s) found:`);
    for (const issue of result.issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[node-version-contract] OK: ${result.actualNodeVersion} satisfies ${NODE_FAMILY} and ^24.3.0 dependency requirements (${result.engineRequirementCount} lockfile entries).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
