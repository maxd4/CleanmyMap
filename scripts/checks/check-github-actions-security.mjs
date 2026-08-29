#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ACTION_SHA_PATTERN = /^[\w.-]+\/[\w.-]+(?:\/[\w.-]+)*@[0-9a-f]{40}$/i;
const FORBIDDEN_SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
];

export function auditWorkflowContent(content, filePath = "workflow") {
  const issues = [];

  if (/^\s*pull_request_target\s*:/m.test(content)) {
    issues.push(`${filePath}: pull_request_target is forbidden for repository workflows.`);
  }

  if (/^\s*permissions:\s*(?:write-all|read-all)\s*$/m.test(content)) {
    issues.push(`${filePath}: broad workflow permissions are forbidden.`);
  }

  for (const secretName of FORBIDDEN_SECRET_NAMES) {
    if (content.includes(secretName)) {
      issues.push(`${filePath}: server secret name must not be referenced by a workflow: ${secretName}`);
    }
  }

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*([^#]+?)(?:\s+#.*)?$/);
    if (!match) continue;

    const actionReference = match[1].trim();
    if (actionReference.startsWith("./") || actionReference.startsWith("docker://")) continue;
    if (!ACTION_SHA_PATTERN.test(actionReference)) {
      issues.push(`${filePath}:${index + 1}: action must be pinned to a full commit SHA: ${actionReference}`);
    }

    if (actionReference.startsWith("actions/checkout@")) {
      const checkoutBlock = content
        .split(/\r?\n/)
        .slice(index, index + 12)
        .join("\n");
      if (!/^\s+persist-credentials:\s*false\s*$/m.test(checkoutBlock)) {
        issues.push(`${filePath}:${index + 1}: read-only checkout must set persist-credentials: false`);
      }
    }
  }

  return issues;
}

export function auditWorkflowDirectory(workflowDirectory) {
  const workflowFiles = readdirSync(workflowDirectory)
    .filter((fileName) => fileName.endsWith(".yml") || fileName.endsWith(".yaml"))
    .sort();

  return workflowFiles.flatMap((fileName) => {
    const filePath = join(workflowDirectory, fileName);
    return auditWorkflowContent(readFileSync(filePath, "utf8"), filePath);
  });
}

function main() {
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const workflowDirectory = join(repositoryRoot, ".github", "workflows");
  const issues = auditWorkflowDirectory(workflowDirectory);

  if (issues.length > 0) {
    console.error(`[github-actions-security] ${issues.length} issue(s) found:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[github-actions-security] OK: ${readdirSync(workflowDirectory).filter((fileName) => fileName.endsWith(".yml") || fileName.endsWith(".yaml")).length} workflow file(s) audited.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
