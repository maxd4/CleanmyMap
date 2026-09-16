#!/usr/bin/env node

import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scanContent } from "./secret-audit.mjs";

export const PUBLIC_E2E_ARTIFACT_ROOT = "artifacts/ci-public-evidence";

const ALLOWED_FILE_RULES = [
  { pattern: /^summary\.json$/i, binary: false },
  { pattern: /^evidence\/[a-z0-9][a-z0-9._-]*\.json$/i, binary: false },
  { pattern: /^screenshots\/[a-z0-9][a-z0-9._-]*\.png$/i, binary: true },
];

const FORBIDDEN_PATH_PATTERN = /(?:^|\/)(?:clerk|storage[state_-]*|user|managed-user|cookies?|sessions?|network|headers?)(?:\/|\.|$)|(?:trace|video|recording)\.(?:zip|webm|mp4)$/i;
const FORBIDDEN_EXTENSION = new Set([
  ".env",
  ".har",
  ".log",
  ".zip",
  ".webm",
  ".mp4",
  ".jsonl",
]);
const FORBIDDEN_CONTENT_PATTERN = /\b(?:authorization|cookie|set-cookie|bearer|storageState|access_token|refresh_token|session(?:_?id|_?token)?|clerk(?:_?session)?|supabase(?:_?service)?_?role)\b/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;

function collectFiles(root, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(current, entry.name);
    if (entry.isSymbolicLink()) {
      return [{ absolutePath, relativePath: relative(root, absolutePath).replace(/\\/g, "/"), symlink: true }];
    }
    if (entry.isDirectory()) return collectFiles(root, absolutePath);
    return [{ absolutePath, relativePath: relative(root, absolutePath).replace(/\\/g, "/"), symlink: false }];
  });
}

function findRule(relativePath) {
  return ALLOWED_FILE_RULES.find(({ pattern }) => pattern.test(relativePath));
}

export function validatePublicE2EArtifact(rootPath) {
  const root = resolve(rootPath);
  const issues = [];

  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    return [`staging directory is missing: ${rootPath}`];
  }

  for (const file of collectFiles(root)) {
    const relativePath = file.relativePath;
    if (file.symlink) {
      issues.push(`${relativePath}: symbolic links are forbidden`);
      continue;
    }

    const rule = findRule(relativePath);
    if (!rule) {
      issues.push(`${relativePath}: file is outside the public evidence allowlist`);
      continue;
    }
    if (FORBIDDEN_PATH_PATTERN.test(relativePath)) {
      issues.push(`${relativePath}: path is forbidden in public evidence`);
      continue;
    }
    if (FORBIDDEN_EXTENSION.has(extname(relativePath).toLowerCase())) {
      issues.push(`${relativePath}: extension is forbidden in public evidence`);
      continue;
    }

    if (!rule.binary) {
      const content = readFileSync(file.absolutePath, "utf8");
      if (FORBIDDEN_CONTENT_PATTERN.test(content)) {
        issues.push(`${relativePath}: authentication/session material is forbidden`);
      }
      if (JWT_PATTERN.test(content)) {
        issues.push(`${relativePath}: JWT-like value is forbidden`);
      }
      const findings = scanContent(relativePath, content);
      if (findings.length > 0) {
        issues.push(`${relativePath}: secret scanner found ${findings.length} sensitive value(s)`);
      }
    }
  }

  return issues;
}

function main() {
  const rootPath = process.argv[2] ?? PUBLIC_E2E_ARTIFACT_ROOT;
  const issues = validatePublicE2EArtifact(rootPath);
  if (issues.length > 0) {
    console.error(`[public-e2e-artifact] ${issues.length} issue(s) found:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[public-e2e-artifact] OK: ${rootPath} contains only validated public evidence.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
